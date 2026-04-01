import { X, ArrowRight, Trash2, ExternalLink } from 'lucide-react'
import type { Idea, Project } from '../../types'

const CATEGORY_COLORS: Record<string, string> = {
  feature:   'bg-blue-900/50 text-blue-400',
  ux:        'bg-purple-900/50 text-purple-400',
  marketing: 'bg-amber-900/50 text-amber-400',
  bug:       'bg-red-900/50 text-red-400',
  other:     'bg-slate-800 text-slate-400',
}

interface Props {
  idea: Idea
  project: Project | undefined
  onClose: () => void
  onConvert: (id: string) => void
  onDelete: (id: string) => void
  onUpdateStatus: (ids: string[], status: 'accepted' | 'dismissed' | 'deferred' | 'pending') => Promise<void>
}

export default function IdeaDetailModal({ idea, project, onClose, onConvert, onDelete, onUpdateStatus }: Props) {
  const categoryClass = CATEGORY_COLORS[idea.ai_category] ?? CATEGORY_COLORS.other
  const label = idea.ai_category
    ? idea.ai_category.charAt(0).toUpperCase() + idea.ai_category.slice(1)
    : 'Idea'
  const currentStatus = idea.status ?? 'pending'

  async function setStatus(status: 'accepted' | 'dismissed' | 'deferred' | 'pending') {
    await onUpdateStatus([idea.id], status)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#13131a] rounded-t-3xl pb-10 flex flex-col max-h-[90dvh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryClass}`}>{label}</span>
            {idea.relevance === 'hot' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/30">
                🔥 Hot
              </span>
            )}
            {currentStatus !== 'pending' && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                currentStatus === 'accepted'  ? 'bg-emerald-900/40 text-emerald-400' :
                currentStatus === 'deferred'  ? 'bg-amber-900/40 text-amber-400' :
                'bg-red-900/40 text-red-400'
              }`}>
                {currentStatus === 'accepted' ? '✅ В работу' : currentStatus === 'deferred' ? '📌 Позже' : '🗑 Отклонено'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 space-y-4">
          {/* Title */}
          {idea.summary && idea.summary.trim() && (
            <p className="text-slate-100 text-base font-semibold leading-snug">{idea.summary}</p>
          )}

          {/* Full content */}
          <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{idea.content}</p>

          {/* Source link */}
          {idea.source && (
            <a
              href={idea.source}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-400 active:text-blue-300"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={12} />
              <span className="truncate">{idea.source}</span>
            </a>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-slate-500 pb-2">
            {project && (
              <>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: project.color }} />
                <span>{project.name}</span>
                <span>·</span>
              </>
            )}
            <span>{new Date(idea.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pt-3 space-y-2 shrink-0">
          {/* Triage row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setStatus('accepted')}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl text-xs font-medium transition-colors ${
                currentStatus === 'accepted'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/5 text-slate-400 active:bg-emerald-600/20'
              }`}
            >
              <span className="text-base">✅</span>
              В работу
            </button>
            <button
              onClick={() => setStatus('deferred')}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl text-xs font-medium transition-colors ${
                currentStatus === 'deferred'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                  : 'bg-white/5 text-slate-400 active:bg-amber-600/20'
              }`}
            >
              <span className="text-base">📌</span>
              Позже
            </button>
            <button
              onClick={() => setStatus('dismissed')}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl text-xs font-medium transition-colors ${
                currentStatus === 'dismissed'
                  ? 'bg-red-600/30 text-red-300 border border-red-500/40'
                  : 'bg-white/5 text-slate-400 active:bg-red-600/20'
              }`}
            >
              <span className="text-base">🗑</span>
              Отклонить
            </button>
          </div>

          {/* Convert + delete row */}
          {!idea.converted_to_task ? (
            <div className="flex gap-2">
              <button
                onClick={() => { onConvert(idea.id); onClose() }}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 active:bg-purple-700 text-white text-sm font-medium py-3 rounded-2xl transition-colors"
              >
                <ArrowRight size={16} />
                Создать задачу
              </button>
              <button
                onClick={() => { onDelete(idea.id); onClose() }}
                className="flex items-center justify-center w-12 bg-white/5 active:bg-red-900/30 text-slate-400 active:text-red-400 rounded-2xl transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <div className="text-center text-sm text-emerald-400/70 py-2">
              ✅ Задача создана
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
