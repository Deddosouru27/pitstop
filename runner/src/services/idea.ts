import Anthropic from '@anthropic-ai/sdk'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { IdeaAnalysis, IdeaInput } from '../types.js'

const URL_REGEX = /^https?:\/\//i

export class IdeaService {
  private anthropic: Anthropic
  private supabase: SupabaseClient

  constructor(anthropicKey: string, supabaseUrl: string, supabaseKey: string) {
    this.anthropic = new Anthropic({ apiKey: anthropicKey })
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Определяет тип входных данных: URL или текст
   */
  parseInput(raw: string): IdeaInput {
    const trimmed = raw.trim()
    if (URL_REGEX.test(trimmed)) {
      return { type: 'url', content: trimmed }
    }
    return { type: 'text', content: trimmed }
  }

  /**
   * Извлекает текст из HTML-страницы по URL
   */
  async fetchUrlContent(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PitStop-Runner/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      throw new Error(`Не удалось загрузить URL: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    return extractTextFromHtml(html)
  }

  /**
   * Анализирует текст через Claude Haiku
   */
  async analyze(text: string): Promise<IdeaAnalysis> {
    const truncated = text.length > 10_000 ? text.slice(0, 10_000) + '\n...[обрезано]' : text

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Проанализируй текст. Вытащи суть, идеи, фичи, оцени релевантность для продуктовой разработки.

Ответь СТРОГО в JSON формате (без markdown):
{"summary": "краткое описание сути", "ideas": ["идея 1", "идея 2"], "relevance": "hot|interesting|noise"}

- hot = прямо применимо, нужно делать
- interesting = стоит запомнить, может пригодиться
- noise = нерелевантно

Текст:
${truncated}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Парсим JSON из ответа (может быть обёрнут в ```json)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Claude не вернул JSON')
    }

    const parsed = JSON.parse(jsonMatch[0]) as IdeaAnalysis

    // Валидация
    if (!parsed.summary || !Array.isArray(parsed.ideas) || !['hot', 'interesting', 'noise'].includes(parsed.relevance)) {
      throw new Error('Некорректный формат ответа от Claude')
    }

    return parsed
  }

  /**
   * Сохраняет идею в таблицу ideas
   */
  async saveIdea(analysis: IdeaAnalysis, projectId: string | null): Promise<void> {
    const content = `${analysis.summary}\n\n${analysis.ideas.map(i => `• ${i}`).join('\n')}`

    const { error } = await this.supabase
      .from('ideas')
      .insert({
        content,
        category: analysis.relevance,
        ai_category: analysis.relevance,
        converted_to_task: false,
        ...(projectId ? { project_id: projectId } : {}),
      })

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`)
    }
  }
}

/**
 * Извлекает читаемый текст из HTML, убирая теги, скрипты, стили
 */
function extractTextFromHtml(html: string): string {
  let text = html
    // Удаляем script и style блоки
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    // Заменяем блочные теги на переносы
    .replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Удаляем все оставшиеся теги
    .replace(/<[^>]+>/g, ' ')
    // HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    // Чистим пробелы
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()

  // Обрезаем до разумного размера
  if (text.length > 15_000) {
    text = text.slice(0, 15_000)
  }

  return text
}
