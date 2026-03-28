import { X, ArrowRight, Trash2 } from 'lucide-react'
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
}

export default function IdeaDetailModal({ idea, project, onClose, onConvert, onDelete }: Props) {
  const categoryClass = CATEGORY_COLORS[idea.ai_category] ?? CATEGORY_COLORS.other
  const label = idea.ai_category
    ? idea.ai_category.charAt(0).toUpperCase() + idea.ai_category.slice(1)
    : 'Idea'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#13131a] rounded-t-3xl p-6 pb-10 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryClass}`}>
            {label}
          </span>
          <button
            onClick={onClose}
            className="text-slate-500 active:text-slate-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <p className="text-slate-100 text-base leading-relaxed">{idea.content}</p>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {project && (
            <>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: project.color }}
              />
              <span>{project.name}</span>
              <span>·</span>
            </>
          )}
          <span>{new Date(idea.created_at).toLocaleDateString()}</span>
        </div>

        {/* Actions */}
        {idea.converted_to_task ? (
          <div className="text-center text-sm text-emerald-400/70 py-2">
            Converted to task
          </div>
        ) : (
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { onConvert(idea.id); onClose() }}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 active:bg-purple-700 text-white text-sm font-medium py-3 rounded-2xl transition-colors"
            >
              <ArrowRight size={16} />
              Convert to task
            </button>
            <button
              onClick={() => { onDelete(idea.id); onClose() }}
              className="flex items-center justify-center w-12 bg-white/5 active:bg-red-900/30 text-slate-400 active:text-red-400 rounded-2xl transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
