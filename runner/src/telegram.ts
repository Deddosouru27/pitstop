import { supabase } from './supabase.js'

const TELEGRAM_BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN']
const TELEGRAM_CHAT_ID = process.env['TELEGRAM_CHAT_ID']

function isTelegramConfigured(): boolean {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
}

export async function sendTelegramMessage(text: string): Promise<void> {
  if (!isTelegramConfigured()) {
    console.error('[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping notification')
    return
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`[telegram] Failed to send message: ${response.status} ${body}`)
  }
}

// --- Telegram command types ---

export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; first_name: string }
    chat: { id: number; type: string }
    date: number
    text?: string
  }
}

export type TelegramCommand = 'autorun' | 'stop' | 'status' | 'ping' | 'unknown'

interface ParsedCommand {
  command: TelegramCommand
  chatId: number
  args: string
}

function parseTelegramCommand(update: TelegramUpdate): ParsedCommand | null {
  const message = update.message
  if (!message?.text) return null

  const text = message.text.trim()
  const chatId = message.chat.id

  if (text.startsWith('/autorun')) {
    return { command: 'autorun', chatId, args: text.slice('/autorun'.length).trim() }
  }
  if (text.startsWith('/stop')) {
    return { command: 'stop', chatId, args: text.slice('/stop'.length).trim() }
  }
  if (text.startsWith('/status')) {
    return { command: 'status', chatId, args: text.slice('/status'.length).trim() }
  }
  if (text.startsWith('/ping')) {
    return { command: 'ping', chatId, args: text.slice('/ping'.length).trim() }
  }

  return null
}

// --- Command handlers ---

async function handleAutorunCommand(chatId: number, _args: string): Promise<void> {
  // Check if there's already a running autorun
  const { data: existingJobs } = await supabase
    .from('agent_jobs')
    .select('id')
    .eq('type', 'autorun')
    .eq('status', 'running')
    .limit(1)

  if (existingJobs && existingJobs.length > 0) {
    await sendTelegramMessage('⚠️ Autorun уже запущен. Используй /stop для остановки.')
    return
  }

  // Create agent_job with type='autorun'
  const { data: job, error } = await supabase
    .from('agent_jobs')
    .insert({
      type: 'autorun',
      status: 'pending',
      payload: { chat_id: String(chatId), source: 'telegram' },
    })
    .select('id')
    .single()

  if (error) {
    await sendTelegramMessage(`❌ Не удалось создать задачу: ${error.message}`)
    return
  }

  await sendTelegramMessage(`📋 Autorun задача создана (job: ${job.id}). Runner подхватит её автоматически.`)
}

async function handleStopCommand(_chatId: number, _args: string): Promise<void> {
  const { data: runningJobs, error: queryError } = await supabase
    .from('agent_jobs')
    .select('id')
    .eq('type', 'autorun')
    .in('status', ['running', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (queryError) {
    await sendTelegramMessage(`❌ Ошибка запроса: ${queryError.message}`)
    return
  }

  if (!runningJobs || runningJobs.length === 0) {
    await sendTelegramMessage('ℹ️ Нет запущенных autorun задач.')
    return
  }

  const jobId = runningJobs[0].id
  const { error } = await supabase
    .from('agent_jobs')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', jobId)

  if (error) {
    await sendTelegramMessage(`❌ Не удалось остановить: ${error.message}`)
    return
  }

  await sendTelegramMessage(`🛑 Autorun остановлен (job: ${jobId})`)
}

function formatTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${day}.${month} ${hours}:${minutes} UTC`
}

async function handleStatusCommand(_chatId: number, _args: string): Promise<void> {
  const now = new Date()
  const timestamp = formatTimestamp(now)

  const { data: runningJobs } = await supabase
    .from('agent_jobs')
    .select('id, status, created_at, result')
    .eq('type', 'autorun')
    .in('status', ['running', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (!runningJobs || runningJobs.length === 0) {
    // Count backlog tasks
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('status', ['backlog', 'todo'])

    await sendTelegramMessage(
      `ℹ️ Autorun не запущен.\n` +
      `📋 Задач в очереди: ${count ?? 0}\n` +
      `🕐 ${timestamp}`
    )
    return
  }

  const job = runningJobs[0]
  const elapsed = Math.round((now.getTime() - new Date(job.created_at).getTime()) / 60000)

  const { count } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .in('status', ['backlog', 'todo'])

  await sendTelegramMessage(
    `🔄 Autorun: <b>${job.status}</b>\n` +
    `🆔 Job: ${job.id}\n` +
    `⏱ Работает: ${elapsed} мин\n` +
    `📋 Задач в очереди: ${count ?? 0}\n` +
    `🕐 ${timestamp}`
  )
}

async function handlePingCommand(_chatId: number, _args: string): Promise<void> {
  const start = Date.now()

  const { error } = await supabase
    .from('agent_jobs')
    .select('id', { count: 'exact', head: true })
    .limit(1)

  const latencyMs = Date.now() - start
  const dbStatus = error ? `❌ ${error.message}` : `✅ ${latencyMs}ms`

  await sendTelegramMessage(
    `🏓 <b>Pong!</b>\n` +
    `📡 Telegram: ✅\n` +
    `🗄 Supabase: ${dbStatus}`
  )
}

// --- Polling loop ---

export async function startTelegramPolling(): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[telegram] TELEGRAM_BOT_TOKEN not set, cannot start polling')
    process.exit(1)
  }

  console.log('[telegram] Starting long-polling for commands...')
  let offset = 0

  while (true) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`
      const response = await fetch(url)

      if (!response.ok) {
        console.error(`[telegram] getUpdates failed: ${response.status}`)
        await sleep(5000)
        continue
      }

      const body = await response.json() as { ok: boolean; result: TelegramUpdate[] }

      if (!body.ok || !body.result) {
        await sleep(5000)
        continue
      }

      for (const update of body.result) {
        offset = update.update_id + 1

        const parsed = parseTelegramCommand(update)
        if (!parsed) continue

        // Only respond to the configured chat
        if (TELEGRAM_CHAT_ID && String(parsed.chatId) !== TELEGRAM_CHAT_ID) {
          console.log(`[telegram] Ignoring command from chat ${parsed.chatId} (expected ${TELEGRAM_CHAT_ID})`)
          continue
        }

        console.log(`[telegram] Received command: /${parsed.command}`)

        switch (parsed.command) {
          case 'autorun':
            await handleAutorunCommand(parsed.chatId, parsed.args)
            break
          case 'stop':
            await handleStopCommand(parsed.chatId, parsed.args)
            break
          case 'status':
            await handleStatusCommand(parsed.chatId, parsed.args)
            break
          case 'ping':
            await handlePingCommand(parsed.chatId, parsed.args)
            break
          default:
            break
        }
      }
    } catch (err) {
      console.error('[telegram] Polling error:', err)
      await sleep(5000)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function formatTaskReport(
  taskTitle: string,
  status: 'success' | 'failed' | 'skipped',
  durationMs: number,
  error: string | null,
  queuePosition: number,
  totalProcessed: number,
): string {
  const icon = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⏭'
  const durationSec = Math.round(durationMs / 1000)

  let msg = `${icon} <b>Task #${totalProcessed}</b>\n`
  msg += `📋 ${escapeHtml(taskTitle)}\n`
  msg += `⏱ ${durationSec}s | Queue: ${queuePosition} left`

  if (error) {
    msg += `\n⚠️ ${escapeHtml(error.slice(0, 200))}`
  }

  return msg
}

export function formatAutorunSummary(
  stopReason: string,
  totalProcessed: number,
  successCount: number,
  failCount: number,
  durationMs: number,
): string {
  const durationMin = Math.round(durationMs / 60000)

  let msg = `🏁 <b>Autorun завершён</b>\n\n`
  msg += `📊 Обработано: ${totalProcessed}\n`
  msg += `✅ Успешно: ${successCount}\n`
  msg += `❌ Ошибок: ${failCount}\n`
  msg += `⏱ Время: ${durationMin} мин\n`
  msg += `🛑 Причина остановки: ${formatStopReason(stopReason)}`

  return msg
}

function formatStopReason(reason: string): string {
  const reasons: Record<string, string> = {
    no_tasks: 'задачи закончились',
    max_errors: '3 ошибки подряд',
    timeout: 'таймаут (2 часа)',
    user_stop: 'остановлено пользователем',
    completed: 'все задачи выполнены',
  }
  return reasons[reason] ?? reason
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
