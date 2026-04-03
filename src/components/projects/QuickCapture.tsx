import { useState, useRef, useMemo } from 'react'
import { Zap, Loader2, Link, List, X } from 'lucide-react'

const INTAKE_URL = import.meta.env.VITE_INTAKE_URL as string | undefined
import { supabase } from '../../lib/supabase'
import { callClaude } from '../../lib/anthropic'
import { addSnapshot } from '../../hooks/useContextSnapshots'
import { useBatchCapture, parseUrlLines } from '../../hooks/useBatchCapture'
import type { Project } from '../../types'

const CLASSIFY_PROMPT = `You are a project classifier. Given a user's idea/note and a list of existing projects, determine which project this idea belongs to and what category it is.

Return ONLY valid JSON without markdown:
{"project_id": "<id of the best matching project or null if none match>", "category": "<one of: feature, ux, marketing, bug, other>"}

If the idea doesn't clearly match any project, set project_id to null.
Be generous in matching — if the idea is somewhat related to a project's domain, assign it.`

interface QuickCaptureProps {
  projects: Project[]
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

export default function QuickCapture({ projects }: QuickCaptureProps) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [batchText, setBatchText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { status: batchStatus, progress, results, run: runBatch, reset: resetBatch } = useBatchCapture()

  const batchUrls = useMemo(() => parseUrlLines(batchText), [batchText])

  const switchMode = (toMode: boolean) => {
    setBatchMode(toMode)
    setText('')
    setBatchText('')
    resetBatch()
  }

  const urlDetected = isUrl(text)

  const showFlash = (msg: string) => {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setFlash(msg)
    flashTimer.current = setTimeout(() => setFlash(null), 3000)
  }

  const handleSubmit = async () => {
    const content = text.trim()
    if (!content || saving) return

    setSaving(true)
    setText('')

    try {
      // Step 1: Ask AI to classify the idea
      const projectList = projects
        .map(p => `- id: "${p.id}", name: "${p.name}"`)
        .join('\n')

      const userMessage = `Projects:\n${projectList}\n\nIdea: "${content}"`

      let projectId: string | null = null
      let category = 'other'

      try {
        const raw = await callClaude(CLASSIFY_PROMPT, userMessage)
        const match = raw.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0]) as { project_id: string | null; category: string }
          // Validate project_id exists
          if (parsed.project_id && projects.some(p => p.id === parsed.project_id)) {
            projectId = parsed.project_id
          }
          const validCategories = ['feature', 'ux', 'marketing', 'bug', 'other']
          if (validCategories.includes(parsed.category)) {
            category = parsed.category
          }
        }
      } catch {
        // AI classification failed — save without classification
      }

      // Step 2: If no project matched, use the first project as fallback
      if (!projectId && projects.length > 0) {
        projectId = projects[0].id
      }

      if (!projectId) {
        showFlash('No projects to save idea to')
        return
      }

      // Step 3: Insert idea into Supabase
      const { data } = await supabase
        .from('ideas')
        .insert({
          project_id: projectId,
          content,
          ai_category: category,
          ...(isUrl(content) ? { source: 'url' } : {}),
        })
        .select()
        .single()

      if (data) {
        addSnapshot(projectId, 'idea_added', {
          idea_id: data.id,
          content,
          category,
        })

        const project = projects.find(p => p.id === projectId)
        if (project) {
          showFlash(`Идея сохранена в проект «${project.name}»`)
        } else {
          showFlash('Идея сохранена без проекта')
        }
      }
    } catch (err) {
      console.error('Quick capture failed:', err)
      showFlash('Error saving idea')
    } finally {
      setSaving(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (batchMode) {
    const isRunning = batchStatus === 'running'
    const isDone = batchStatus === 'done'
    const okCount = results.filter(r => r.ok).length
    const errCount = results.filter(r => !r.ok).length

    return (
      <div className="px-4 pb-3 space-y-2">
        {/* Mode toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <List size={12} /> Пакетный режим
          </span>
          <button onClick={() => switchMode(false)} className="text-[11px] text-slate-500 flex items-center gap-1 active:text-slate-300">
            <X size={11} /> Один URL
          </button>
        </div>

        {/* Textarea */}
        {!isDone && (
          <textarea
            value={batchText}
            onChange={e => setBatchText(e.target.value)}
            disabled={isRunning}
            rows={5}
            placeholder={'Вставь URL по одному на строку:\nhttps://youtube.com/...\nhttps://instagram.com/...'}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-purple-500/40 resize-none disabled:opacity-50"
          />
        )}

        {/* Counter / progress */}
        {!isDone && !isRunning && batchUrls.length > 0 && (
          <p className="text-[11px] text-slate-400">{batchUrls.length} URL готово к отправке</p>
        )}
        {isRunning && (
          <div className="flex items-center gap-2">
            <Loader2 size={13} className="text-purple-400 animate-spin shrink-0" />
            <p className="text-[11px] text-slate-400">Обрабатывается {progress.current}/{progress.total}...</p>
          </div>
        )}

        {/* Results */}
        {isDone && (
          <div className="space-y-1.5">
            <p className="text-[12px] font-medium text-slate-200">
              {okCount > 0 && <span className="text-green-400">✓ {okCount} добавлено</span>}
              {okCount > 0 && errCount > 0 && <span className="text-slate-500">, </span>}
              {errCount > 0 && <span className="text-red-400">✗ {errCount} ошибка</span>}
            </p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span className={r.ok ? 'text-green-400' : 'text-red-400'}>{r.ok ? '✓' : '✗'}</span>
                  <span className="text-slate-500 truncate flex-1">{r.url.replace(/^https?:\/\//, '').slice(0, 50)}</span>
                  {r.notification && <span className="text-slate-400 shrink-0">{r.notification}</span>}
                  {r.error && <span className="text-red-400 shrink-0">{r.error}</span>}
                </div>
              ))}
            </div>
            <button onClick={() => { setBatchText(''); resetBatch() }} className="text-[11px] text-purple-400 active:text-purple-300">
              Ещё пакет
            </button>
          </div>
        )}

        {/* Send button */}
        {!isDone && (
          <button
            disabled={batchUrls.length === 0 || isRunning || !INTAKE_URL}
            onClick={() => runBatch(batchUrls)}
            className="w-full py-2.5 rounded-xl bg-purple-600 text-sm font-medium text-white disabled:opacity-40 active:bg-purple-700 transition-colors"
          >
            {isRunning ? 'Отправка...' : `Отправить пакет (${batchUrls.length})`}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 pb-3">
      <div className="relative">
        {/* Mode toggle */}
        <button
          onClick={() => switchMode(true)}
          className="absolute -top-5 right-0 text-[10px] text-slate-600 flex items-center gap-0.5 active:text-slate-400"
        >
          <List size={10} /> Пакет
        </button>

        <div className="flex items-center gap-2 bg-white/5 backdrop-blur border border-white/10 rounded-2xl px-4 py-3">
          {saving ? (
            <Loader2 size={16} className="text-purple-400 animate-spin shrink-0" />
          ) : urlDetected ? (
            <Link size={16} className="text-blue-400 shrink-0" />
          ) : (
            <Zap size={16} className="text-purple-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quick idea... AI picks the project"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
            disabled={saving}
          />
          {urlDetected && (
            <span className="shrink-0 text-[11px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-0.5">
              🔗 URL
            </span>
          )}
        </div>

        {urlDetected && INTAKE_URL && (
          <p className="text-[11px] text-slate-500 mt-1.5 px-1">
            Будет обработан через Intake
          </p>
        )}

        {flash && (
          <div className="absolute -bottom-7 left-0 right-0 text-center">
            <span className="text-xs text-purple-400 animate-pulse">{flash}</span>
          </div>
        )}
      </div>
    </div>
  )
}
