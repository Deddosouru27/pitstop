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
