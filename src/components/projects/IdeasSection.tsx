import { useState } from 'react'
import { Send, ArrowRight, X, Loader2 } from 'lucide-react'
import type { Idea } from '../../types'

const CATEGORY_RU: Record<string, string> = {
  feature: 'Функционал',
  ux: 'Интерфейс',
  marketing: 'Маркетинг',
  bug: 'Ошибка',
  other: 'Другое',
}

const CATEGORY_STYLE: Record<string, string> = {
  feature: 'bg-accent-blue/20 text-blue-400',
  ux: 'bg-accent/20 text-purple-400',
  marketing: 'bg-success/20 text-green-400',
  bug: 'bg-danger/20 text-red-400',
  other: 'bg-white/10 text-slate-400',
}

const CATEGORY_ORDER = ['feature', 'ux', 'marketing', 'bug', 'other', '']

interface Props {
  ideas: Idea[]
  onAdd: (content: string) => Promise<void>
  onConvert: (idea: Idea) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function IdeaCard({ idea, onConvert, onDelete }: { idea: Idea; onConvert: (i: Idea) => void; onDelete: (id: string) => void }) {
  const isCategorizing = !idea.ai_category

  return (
    <div className="bg-surface-el rounded-2xl px-4 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm text-slate-200 leading-relaxed line-clamp-2 overflow-hidden">{idea.content}</p>
        <button
          onClick={() => onDelete(idea.id)}
          className="text-slate-600 hover:text-danger transition-colors shrink-0 mt-0.5"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        {isCategorizing && (
          <span className="flex items-center gap-1 text-[11px] text-slate-600">
            <Loader2 size={10} className="animate-spin" /> категоризирую...
          </span>
        )}
        <span className="text-xs text-slate-600 ml-auto">
          {new Date(idea.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={() => onConvert(idea)}
          className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
        >
          <ArrowRight size={12} />
          В задачу
        </button>
      </div>
    </div>
  )
}

export default function IdeasSection({ ideas, onAdd, onConvert, onDelete }: Props) {
  const [input, setInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = input.trim()
    if (!content) return
    setInput('')
    await onAdd(content)
  }

  const visible = ideas.filter(i => !i.converted_to_task)

  // Group by ai_category; uncategorized (empty string) goes last as 'Без категории'
  const groups = new Map<string, Idea[]>()
  for (const idea of visible) {
    const key = idea.ai_category || ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(idea)
  }

  // Sort groups in defined order
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Идеи {visible.length > 0 && `· ${visible.length}`}
      </h2>

      {visible.length === 0 && (
        <p className="text-sm text-slate-600 text-center py-3">Идей пока нет</p>
      )}

      {sortedKeys.map(key => {
        const groupIdeas = groups.get(key)!
        const label = key === '' ? 'Без категории' : (CATEGORY_RU[key] ?? key)
        const styleClass = CATEGORY_STYLE[key] ?? 'bg-white/10 text-slate-400'

        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${styleClass}`}>
                {label}
              </span>
              <span className="text-xs text-slate-700">{groupIdeas.length}</span>
            </div>
            {groupIdeas.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onConvert={onConvert}
                onDelete={onDelete}
              />
            ))}
          </div>
        )
      })}

      <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Записать идею..."
          className="flex-1 bg-surface-el text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-xl px-4 transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
