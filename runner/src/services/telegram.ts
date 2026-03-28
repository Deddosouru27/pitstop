import TelegramBot from 'node-telegram-bot-api'
import type { RunnerStatus } from '../types.js'

export class TelegramService {
  private bot: TelegramBot

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true })
  }

  getBot(): TelegramBot {
    return this.bot
  }

  async sendStatus(chatId: number, status: RunnerStatus, details?: string): Promise<number> {
    const text = details ? `${status}\n\n${details}` : status
    const msg = await this.bot.sendMessage(chatId, text, { parse_mode: 'HTML' })
    return msg.message_id
  }

  async updateStatus(chatId: number, messageId: number, status: RunnerStatus, details?: string): Promise<void> {
    const text = details ? `${status}\n\n${details}` : status
    try {
      await this.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
      })
    } catch {
      // Сообщение могло быть удалено или не изменилось — игнорируем
    }
  }

  async sendError(chatId: number, error: string): Promise<void> {
    const truncated = error.length > 3000 ? error.slice(0, 3000) + '...' : error
    await this.bot.sendMessage(chatId, `❌ Ошибка\n\n<pre>${escapeHtml(truncated)}</pre>`, {
      parse_mode: 'HTML',
    })
  }

  async sendIdeaResult(chatId: number, summary: string, relevance: string, saved: boolean): Promise<void> {
    const relevanceEmoji = relevance === 'hot' ? '🔥' : relevance === 'interesting' ? '💡' : '🔇'
    const savedText = saved ? '\n\n✅ Сохранено в PitStop' : ''
    await this.bot.sendMessage(
      chatId,
      `${relevanceEmoji} <b>${relevance.toUpperCase()}</b>\n\n${escapeHtml(summary)}${savedText}`,
      { parse_mode: 'HTML' }
    )
  }

  stop(): void {
    this.bot.stopPolling()
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
