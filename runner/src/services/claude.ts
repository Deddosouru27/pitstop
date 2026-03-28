import { exec } from 'node:child_process'
import type { ClaudeCodeResult } from '../types.js'

/**
 * Запускает Claude Code CLI в указанной директории.
 * Парсит результат и возвращает структурированный ответ.
 */
export class ClaudeService {
  private timeoutMs: number

  constructor(timeoutMs: number) {
    this.timeoutMs = timeoutMs
  }

  async run(prompt: string, cwd: string): Promise<ClaudeCodeResult> {
    const escapedPrompt = prompt.replace(/'/g, "'\\''")
    const cmd = `claude -p '${escapedPrompt}' --output-format json`

    return new Promise((resolve) => {
      exec(cmd, { cwd, maxBuffer: 50 * 1024 * 1024, timeout: this.timeoutMs }, (error, stdout, stderr) => {
        if (error) {
          const friendlyError = parseClaudeError(error.message, stderr)
          resolve({ success: false, output: '', error: friendlyError })
          return
        }

        // Пытаемся распарсить JSON-ответ claude
        try {
          const parsed = JSON.parse(stdout) as { result?: string; error?: string }
          if (parsed.error) {
            resolve({ success: false, output: '', error: parseClaudeError(parsed.error) })
          } else {
            resolve({ success: true, output: parsed.result ?? stdout })
          }
        } catch {
          // Если не JSON — возвращаем как текст (claude может вывести plain text)
          resolve({ success: true, output: stdout.trim() })
        }
      })
    })
  }
}

/**
 * Парсит ошибку Claude Code и возвращает понятное сообщение
 */
function parseClaudeError(error: string, stderr?: string): string {
  const combined = `${error}\n${stderr ?? ''}`

  if (combined.includes('ETIMEDOUT') || combined.includes('timeout') || combined.includes('SIGTERM')) {
    return 'Claude Code таймаут — задача слишком долгая. Попробуй разбить на части.'
  }
  if (combined.includes('rate limit') || combined.includes('429')) {
    return 'Claude Code rate limit — слишком много запросов. Подожди пару минут.'
  }
  if (combined.includes('authentication') || combined.includes('401') || combined.includes('API key')) {
    return 'Claude Code ошибка авторизации — проверь ANTHROPIC_API_KEY.'
  }
  if (combined.includes('ENOENT') || combined.includes('not found')) {
    return 'Claude Code CLI не найден — проверь что `claude` установлен и доступен в PATH.'
  }
  if (combined.includes('ENOMEM') || combined.includes('out of memory')) {
    return 'Недостаточно памяти для Claude Code.'
  }
  if (combined.includes('npm') && combined.includes('ERR')) {
    return `npm ошибка при выполнении: ${extractLastLines(combined, 3)}`
  }
  if (combined.includes('TypeScript') || combined.includes('tsc')) {
    return `TypeScript ошибка: ${extractLastLines(combined, 5)}`
  }

  // Общая ошибка — берём последние строки
  return `Ошибка Claude Code: ${extractLastLines(combined, 5)}`
}

function extractLastLines(text: string, n: number): string {
  const lines = text.trim().split('\n').filter(l => l.trim())
  return lines.slice(-n).join('\n')
}
