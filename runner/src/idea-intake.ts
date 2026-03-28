import { execFile } from 'node:child_process'
import { createReadStream, existsSync } from 'node:fs'
import { unlink, mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { supabase } from './supabase.js'
import type { VideoIdeaResult } from './types.js'

const OPENAI_API_KEY = process.env['OPENAI_API_KEY']
const ANTHROPIC_API_KEY = process.env['ANTHROPIC_API_KEY']

const WHISPER_MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB Whisper limit
const YOUTUBE_URL_REGEX = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/

export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_URL_REGEX.test(url)
}

function execAsync(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${command} failed: ${stderr || error.message}`))
        return
      }
      resolve({ stdout: stdout.toString(), stderr: stderr.toString() })
    })
  })
}

export async function checkYtDlp(): Promise<boolean> {
  try {
    await execAsync('yt-dlp', ['--version'])
    return true
  } catch {
    return false
  }
}

export async function getVideoTitle(url: string): Promise<string> {
  const { stdout } = await execAsync('yt-dlp', [
    '--get-title',
    '--no-warnings',
    url,
  ])
  return stdout.trim()
}

export async function downloadAudio(url: string): Promise<{ filePath: string; tmpDir: string }> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'pitstop-idea-'))
  const outputTemplate = join(tmpDir, 'audio.%(ext)s')

  await execAsync('yt-dlp', [
    '-x',                          // extract audio only
    '--audio-format', 'mp3',       // convert to mp3 (Whisper-compatible)
    '--audio-quality', '5',        // medium quality (smaller file)
    '--no-playlist',               // single video only
    '--no-warnings',
    '--max-filesize', '100m',      // skip huge videos
    '-o', outputTemplate,
    url,
  ])

  // Find the downloaded file
  const files = await readdir(tmpDir)
  const audioFile = files.find(f => f.startsWith('audio.'))

  if (!audioFile) {
    throw new Error('yt-dlp did not produce an audio file')
  }

  return { filePath: join(tmpDir, audioFile), tmpDir }
}

export async function transcribeAudio(filePath: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set — cannot transcribe')
  }

  // Check file size
  const { stat } = await import('node:fs/promises')
  const fileStats = await stat(filePath)

  if (fileStats.size > WHISPER_MAX_FILE_SIZE) {
    throw new Error(`Audio file too large: ${Math.round(fileStats.size / 1024 / 1024)}MB (max 25MB)`)
  }

  // Build multipart form data manually for Whisper API
  const formData = new FormData()
  const fileBuffer = await import('node:fs/promises').then(fs => fs.readFile(filePath))
  const blob = new Blob([fileBuffer], { type: 'audio/mpeg' })
  formData.append('file', blob, 'audio.mp3')
  formData.append('model', 'whisper-1')
  formData.append('language', 'ru') // default Russian, Whisper auto-detects if wrong
  formData.append('response_format', 'text')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Whisper API error ${response.status}: ${body}`)
  }

  return (await response.text()).trim()
}

export async function extractIdea(transcript: string, videoTitle: string): Promise<{ content: string; category: string }> {
  if (!ANTHROPIC_API_KEY) {
    // Fallback: return raw transcript as idea
    return {
      content: `[${videoTitle}]\n\n${transcript}`,
      category: 'video',
    }
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Ты — ассистент предпринимателя. Из транскрипта видео извлеки ключевую идею.

Видео: "${videoTitle}"

Транскрипт:
${transcript.slice(0, 8000)}

Ответь строго в JSON:
{"content": "краткое описание идеи (2-4 предложения, суть + почему это ценно)", "category": "одно из: feature, ux, marketing, bug, other"}`,
      }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Claude API error ${response.status}: ${body}`)
  }

  const result = await response.json() as {
    content: Array<{ type: string; text: string }>
  }

  const text = result.content[0]?.text ?? ''

  try {
    // Extract JSON from response (Claude may wrap in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { content: `[${videoTitle}]\n\n${transcript.slice(0, 500)}`, category: 'video' }
    }
    const parsed = JSON.parse(jsonMatch[0]) as { content: string; category: string }
    const validCategories = ['feature', 'ux', 'marketing', 'bug', 'other']
    return {
      content: parsed.content || `[${videoTitle}]`,
      category: validCategories.includes(parsed.category) ? parsed.category : 'other',
    }
  } catch {
    return { content: `[${videoTitle}]\n\n${transcript.slice(0, 500)}`, category: 'video' }
  }
}

async function cleanupTmpDir(tmpDir: string): Promise<void> {
  try {
    const files = await readdir(tmpDir)
    for (const file of files) {
      await unlink(join(tmpDir, file))
    }
    const { rmdir } = await import('node:fs/promises')
    await rmdir(tmpDir)
  } catch {
    // Best-effort cleanup
  }
}

export async function processVideoIdea(
  url: string,
  projectId?: string,
): Promise<VideoIdeaResult> {
  const steps: string[] = []

  // 1. Get video title
  steps.push('Получаю название видео...')
  const videoTitle = await getVideoTitle(url)
  steps.push(`Видео: ${videoTitle}`)

  let tmpDir: string | null = null

  try {
    // 2. Download audio
    steps.push('Скачиваю аудио...')
    const download = await downloadAudio(url)
    tmpDir = download.tmpDir
    steps.push('Аудио скачано')

    // 3. Transcribe
    steps.push('Транскрибирую через Whisper...')
    const transcript = await transcribeAudio(download.filePath)
    steps.push(`Транскрипт: ${transcript.length} символов`)

    // 4. Extract idea with Claude
    steps.push('Извлекаю идею через Claude...')
    const idea = await extractIdea(transcript, videoTitle)
    steps.push(`Идея извлечена (${idea.category})`)

    // 5. Save to Supabase
    const ideaContent = `🎬 ${videoTitle}\n\n${idea.content}\n\n📎 ${url}`

    const insertData: Record<string, unknown> = {
      content: ideaContent,
      category: 'video',
      ai_category: idea.category,
      converted_to_task: false,
    }

    if (projectId) {
      insertData['project_id'] = projectId
    }

    const { data: saved, error } = await supabase
      .from('ideas')
      .insert(insertData)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`)
    }

    steps.push('Сохранено в ideas')

    return {
      status: 'success',
      ideaId: saved.id,
      videoTitle,
      content: idea.content,
      category: idea.category,
      transcriptLength: transcript.length,
      steps,
    }
  } finally {
    if (tmpDir) {
      await cleanupTmpDir(tmpDir)
    }
  }
}
