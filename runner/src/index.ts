import { loadConfig } from './config.js'
import { GitService } from './services/git.js'
import { TelegramService } from './services/telegram.js'
import { ClaudeService } from './services/claude.js'
import { IdeaService } from './services/idea.js'
import type { TaskPayload } from './types.js'

const config = loadConfig()
const git = new GitService(config.repoUrl, config.workDir)
const telegram = new TelegramService(config.telegramToken)
const claude = new ClaudeService(config.claudeCodeTimeout)
const ideaService = new IdeaService(config.anthropicKey, config.supabaseUrl, config.supabaseKey)
const bot = telegram.getBot()

// Очередь задач — обрабатываем по одной
let busy = false
const queue: TaskPayload[] = []

function isAllowed(chatId: number): boolean {
  return config.allowedChatIds.length === 0 || config.allowedChatIds.includes(chatId)
}

/**
 * Обработка команды /idea
 */
async function handleIdea(chatId: number, text: string): Promise<void> {
  if (!text.trim()) {
    await bot.sendMessage(chatId, '⚠️ Использование: /idea текст или ссылка')
    return
  }

  const statusMsgId = await telegram.sendStatus(chatId, '📥 Принял задачу', 'Анализирую идею...')

  try {
    const input = ideaService.parseInput(text)
    let content: string

    if (input.type === 'url') {
      await telegram.updateStatus(chatId, statusMsgId, '🤖 Claude Code работает...', `Загружаю ${input.content}...`)
      content = await ideaService.fetchUrlContent(input.content)
    } else {
      content = input.content
    }

    await telegram.updateStatus(chatId, statusMsgId, '🤖 Claude Code работает...', 'Анализирую через Claude Haiku...')
    const analysis = await ideaService.analyze(content)

    const saved = analysis.relevance !== 'noise'
    if (saved) {
      await ideaService.saveIdea(analysis, null)
    }

    await telegram.sendIdeaResult(chatId, analysis.summary, analysis.relevance, saved)
    // Удаляем статусное сообщение — результат уже отправлен отдельно
    try { await bot.deleteMessage(chatId, statusMsgId) } catch { /* ignore */ }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await telegram.updateStatus(chatId, statusMsgId, '❌ Ошибка', message)
  }
}

/**
 * Основной pipeline: clone → claude code → commit → push → merge → deploy
 */
async function processTask(task: TaskPayload): Promise<void> {
  const { chatId, branch, prompt } = task
  const statusMsgId = await telegram.sendStatus(chatId, '📥 Принял задачу')
  let repoPath: string | undefined

  try {
    // 1. Clone
    await telegram.updateStatus(chatId, statusMsgId, '📦 Клонирую репо...')
    repoPath = await git.cloneRepo(branch)

    // 2. Claude Code
    await telegram.updateStatus(chatId, statusMsgId, '🤖 Claude Code работает...')
    const result = await claude.run(prompt, repoPath)

    if (!result.success) {
      await telegram.updateStatus(chatId, statusMsgId, '❌ Ошибка', result.error)
      return
    }

    // 3. Commit
    await telegram.updateStatus(chatId, statusMsgId, '💾 Коммичу...')
    const commitHash = await git.commitAll(repoPath, `feat: ${prompt.slice(0, 72)}`)

    if (!commitHash) {
      await telegram.updateStatus(chatId, statusMsgId, '❌ Ошибка', 'Claude Code не внёс изменений в код.')
      return
    }

    // 4. Push branch
    await git.pushBranch(repoPath, branch)

    // 5. Auto-merge в main
    await telegram.updateStatus(chatId, statusMsgId, '🔀 Мержу...')
    const mergeResult = await git.autoMerge(repoPath, branch)

    if (!mergeResult.success) {
      await telegram.updateStatus(chatId, statusMsgId, '❌ Ошибка', `Merge failed: ${mergeResult.error}`)
      return
    }

    // 6. Успех
    await telegram.updateStatus(chatId, statusMsgId, '✅ Задеплоено', `Коммит: <code>${commitHash}</code>\nВетка: ${branch} → main`)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await telegram.sendError(chatId, message)
  } finally {
    if (repoPath) {
      await git.cleanup(repoPath)
    }
  }
}

async function processQueue(): Promise<void> {
  if (busy || queue.length === 0) return
  busy = true

  const task = queue.shift()!
  try {
    await processTask(task)
  } finally {
    busy = false
    // Обрабатываем следующую задачу
    void processQueue()
  }
}

// Обработчик сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id
  const text = msg.text ?? ''

  if (!isAllowed(chatId)) return

  // Команда /idea
  if (text.startsWith('/idea')) {
    const ideaText = text.replace(/^\/idea\s*/, '')
    void handleIdea(chatId, ideaText)
    return
  }

  // Команда /start
  if (text === '/start') {
    void bot.sendMessage(chatId, '🏎️ PitStop Runner готов!\n\nОтправь задачу текстом или используй /idea для анализа идей.')
    return
  }

  // Команда /status
  if (text === '/status') {
    const queueInfo = queue.length > 0 ? `В очереди: ${queue.length}` : 'Очередь пуста'
    const busyInfo = busy ? '🔄 Работаю над задачей' : '💤 Свободен'
    void bot.sendMessage(chatId, `${busyInfo}\n${queueInfo}`)
    return
  }

  // Обычное сообщение — задача для Claude Code
  if (!text.startsWith('/')) {
    const branch = `runner/${Date.now()}`
    const payload: TaskPayload = {
      chatId,
      messageId: msg.message_id,
      prompt: text,
      branch,
    }
    queue.push(payload)
    void processQueue()
  }
})

// Graceful shutdown
function shutdown(): void {
  console.error('Shutting down...')
  telegram.stop()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.error('🏎️ PitStop Runner started')
