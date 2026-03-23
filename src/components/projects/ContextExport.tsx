import { useState } from 'react'
import { Copy, Download, Check } from 'lucide-react'
import { getSnapshots } from '../../hooks/useContextSnapshots'
import type { AiSummaryContent, TaskCompletedContent, IdeaAddedContent } from '../../hooks/useContextSnapshots'
import type { Project, Task, Idea } from '../../types'

interface Props {
  project: Project
  activeTasks: Task[]
  ideas: Idea[]
}

const CATEGORY_RU: Record<string, string> = {
  feature: 'Функционал',
  ux: 'Интерфейс',
  marketing: 'Маркетинг',
  bug: 'Ошибка',
  other: 'Другое',
}


async function buildMarkdown(project: Project, activeTasks: Task[], ideas: Idea[]): Promise<string> {
  const snapshots = await getSnapshots(project.id)
  const now = new Date().toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const historyLines = snapshots.map(s => {
    const d = new Date(s.created_at).toLocaleDateString('ru-RU')
    switch (s.snapshot_type) {
      case 'task_completed': {
        const c = s.content as TaskCompletedContent
        return `- [${d}] ✅ Задача выполнена: ${c.title} (приоритет: ${c.priority})`
      }
      case 'ai_summary': {
        const c = s.content as AiSummaryContent
        return `- [${d}] 🤖 AI резюме: ${c.what_done}`
      }
      case 'idea_added': {
        const c = s.content as IdeaAddedContent
        return `- [${d}] 💡 Идея добавлена: ${c.content} (${c.category})`
      }
      default:
        return `- [${d}] ${s.snapshot_type}`
    }
  })

  const taskLines = activeTasks.length > 0
    ? activeTasks.map(t => `- ${t.title} (приоритет: ${t.priority}${t.due_date ? `, срок: ${t.due_date}` : ''})`).join('\n')
    : '_Нет активных задач_'

  const visibleIdeas = ideas.filter(i => !i.converted_to_task)
  const ideaLines = visibleIdeas.length > 0
    ? visibleIdeas.map(i => `- ${i.content}${i.ai_category ? ` (${CATEGORY_RU[i.ai_category] ?? i.ai_category})` : ''}`).join('\n')
    : '_Нет идей_'

  return [
    `# Контекст проекта: ${project.name}`,
    `Обновлено: ${now}`,
    '',
    '## Текущее состояние',
    `**Что сделано:** ${project.ai_what_done || '_не заполнено_'}`,
    `**Где остановились:** ${project.ai_where_stopped || '_не заполнено_'}`,
    `**Следующий шаг:** ${project.ai_next_step || '_не заполнено_'}`,
    '',
    '## История действий',
    historyLines.length > 0 ? historyLines.join('\n') : '_История пуста_',
    '',
    '## Активные задачи',
    taskLines,
    '',
    '## Идеи',
    ideaLines,
  ].join('\n')
}

export default function ContextExport({ project, activeTasks, ideas }: Props) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const getMarkdown = async (): Promise<string> => {
    setLoading(true)
    try {
      return await buildMarkdown(project, activeTasks, ideas)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    const md = await getMarkdown()
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = async () => {
    const md = await getMarkdown()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'CONTEXT.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopy}
        disabled={loading}
        className="flex-1 flex items-center justify-center gap-1.5 bg-surface-el hover:bg-white/10 disabled:opacity-50 text-slate-400 hover:text-slate-200 text-xs font-medium px-3 py-2.5 rounded-xl transition-colors"
      >
        {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
        {copied ? 'Скопировано!' : 'Скопировать контекст'}
      </button>

      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex-1 flex items-center justify-center gap-1.5 bg-surface-el hover:bg-white/10 disabled:opacity-50 text-slate-400 hover:text-slate-200 text-xs font-medium px-3 py-2.5 rounded-xl transition-colors"
      >
        <Download size={13} />
        Скачать CONTEXT.md
      </button>
    </div>
  )
}
