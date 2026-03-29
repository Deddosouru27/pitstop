import { useState, useEffect } from 'react'
import { X, Trash2, ArrowRight, Plus, Loader2 } from 'lucide-react'
import type { Idea } from '../../types'
import QuickAddIdeaSheet from './QuickAddIdeaSheet'

// ── Category config ────────────────────────────────────────────────────────────

const CATEGORY_RU: Record<string, string> = {
  feature: 'Функционал',
  ux: 'Интерфейс',
  marketing: 'Маркетинг',
  bug: 'Ошибка',
  other: 'Другое',
  '': 'Без категории',
}

const CATEGORY_CHIP_STYLE: Record<string, string> = {
  feature: 'bg-accent-blue/20 text-blue-400',
  ux: 'bg-accent/20 text-purple-400',
  marketing: 'bg-success/20 text-green-400',
  bug: 'bg-danger/20 text-red-400',
  other: 'bg-white/10 text-slate-400',
  '': 'bg-white/10 text-slate-400',
}

// Order for filter chips
const FILTER_KEYS = ['all', 'feature', 'ux', 'marketing', 'bug', 'other', ''] as const
type FilterKey = (typeof FILTER_KEYS)[number]

const FILTER_LABEL: Record<FilterKey, string> = {
  all: 'Все',
  feature: 'Функционал',
  ux: 'Интерфейс',
  marketing: 'Маркетинг',
  bug: 'Ошибка',
  other: 'Другое',
  '': 'Без категории',
}

// ── Idea row ──────────────────────────────────────────────────────────────────

interface IdeaRowProps {
  idea: Idea
  onConvert: (idea: Idea) => void
  onDelete: (id: string) => void
}

function IdeaRow({ idea, onConvert, onDelete }: IdeaRowProps) {
  const catKey = idea.ai_category || ''
  const isCategorizing = idea.ai_category === ''

  return (
    <div className="bg-[#1c1c27] rounded-2xl px-4 py-3 space-y-2">
      <p className="text-sm text-slate-100 leading-relaxed line-clamp-2 overflow-hidden">{idea.content}</p>
      <div className="flex items-center gap-2">
        {isCategorizing ? (
          <span className="flex items-center gap-1 text-[11px] text-slate-600">
            <Loader2 size={10} className="animate-spin" /> категоризирую...
          </span>
        ) : (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_CHIP_STYLE[catKey] ?? CATEGORY_CHIP_STYLE['']}`}>
            {CATEGORY_RU[catKey] ?? 'Без категории'}
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
        <button
          onClick={() => onDelete(idea.id)}
          className="text-slate-600 hover:text-danger transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  ideas: Idea[]
  onAdd: (content: string) => void
  onConvert: (idea: Idea) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function IdeasModal({ ideas, onAdd, onConvert, onDelete, onClose }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !showQuickAdd) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, showQuickAdd])

  const visible = ideas.filter(i => !i.converted_to_task)

  const filtered = filter === 'all'
    ? visible
    : visible.filter(i => (i.ai_category || '') === filter)

  // Only show filter keys that have ideas (plus 'all')
  const activeFilters: FilterKey[] = ['all', ...FILTER_KEYS.filter(k =>
    k !== 'all' && visible.some(i => (i.ai_category || '') === k)
  )]

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col animate-fade-in">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />

        {/* Sheet */}
        <div className="relative mt-auto bg-[#13131a] rounded-t-2xl flex flex-col max-h-[90dvh] animate-slide-up">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0">
            <h2 className="flex-1 font-bold text-slate-100">Идеи</h2>
            {visible.length > 0 && (
              <span className="text-xs bg-white/10 text-slate-400 px-2 py-0.5 rounded-full">
                {visible.length}
              </span>
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
              <X size={20} />
            </button>
          </div>

          {/* Filter chips */}
          {activeFilters.length > 2 && (
            <div className="px-4 pb-3 shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                {activeFilters.map(key => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                      filter === key
                        ? 'bg-accent text-white'
                        : 'bg-[#1c1c27] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {FILTER_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ideas list */}
          <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2">
            {filtered.length === 0 && (
              <p className="text-sm text-slate-600 text-center py-8">Идей нет</p>
            )}
            {filtered.map(idea => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                onConvert={onConvert}
                onDelete={onDelete}
              />
            ))}
          </div>

          {/* FAB */}
          <button
            onClick={() => setShowQuickAdd(true)}
            className="absolute bottom-6 right-4 w-12 h-12 bg-accent hover:bg-accent/90 active:scale-95 text-white rounded-2xl shadow-lg shadow-accent/30 flex items-center justify-center transition-all z-10"
          >
            <Plus size={22} strokeWidth={2} />
          </button>
        </div>
      </div>

      {showQuickAdd && (
        <div className="relative z-[60]">
          <QuickAddIdeaSheet
            onAdd={onAdd}
            onClose={() => setShowQuickAdd(false)}
          />
        </div>
      )}
    </>
  )
}
