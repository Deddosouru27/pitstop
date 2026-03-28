import { X } from 'lucide-react'
import type { WorkPackage } from '../../types/workPackage'

interface WorkPackageModalProps {
  isOpen: boolean
  onClose: () => void
  workPackage: WorkPackage | null
  onCopy: () => void
  isCopied: boolean
}

const PRIORITY_LABEL: Record<string, string> = {
  none: 'None',
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

const PRIORITY_BADGE: Record<string, string> = {
  none: 'bg-slate-600/30 text-slate-400',
  low: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-red-500/20 text-red-400',
}

export default function WorkPackageModal({ isOpen, onClose, workPackage: wp, onCopy, isCopied }: WorkPackageModalProps) {
  if (!isOpen || !wp) return null

  const hasContext = wp.context.projectState || wp.context.whereStoped

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0f] animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-100 text-lg leading-tight">{wp.title}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[wp.priority] ?? PRIORITY_BADGE.none}`}>
              {PRIORITY_LABEL[wp.priority] ?? wp.priority}
            </span>
            <span className="text-xs text-slate-500">Пакет задачи · {wp.context.projectName}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 mt-0.5">
          <X size={20} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-6">
        {/* What to do + Expected outcome */}
        <div className="bg-[#1c1c27] rounded-2xl px-4 py-4 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Что сделать</p>
            <p className="text-sm text-slate-200 leading-relaxed">{wp.description || wp.title}</p>
          </div>
          <div className="border-t border-white/[0.06] pt-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Ожидаемый результат</p>
            <p className="text-sm text-slate-200 leading-relaxed">{wp.expectedOutcome}</p>
          </div>
        </div>

        {/* Context */}
        <div className="bg-[#1c1c27] rounded-2xl px-4 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Контекст проекта</p>
          {hasContext ? (
            <div className="space-y-2">
              {wp.context.projectState && (
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{wp.context.projectState}</p>
              )}
              {wp.context.whereStoped && (
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Где остановились:</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{wp.context.whereStoped}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Контекст не определён. Обновите контекст проекта.</p>
          )}
        </div>

        {/* Subtasks (optional) */}
        {wp.subtasks && wp.subtasks.length > 0 && (
          <div className="bg-[#1c1c27] rounded-2xl px-4 py-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Подзадачи · {wp.subtasks.filter(s => s.is_completed).length}/{wp.subtasks.length}
            </p>
            <div className="space-y-2">
              {wp.subtasks.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div
                    className="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center"
                    style={{
                      borderColor: s.is_completed ? '#7c3aed' : '#334155',
                      background: s.is_completed ? '#7c3aed' : 'transparent',
                    }}
                  >
                    {s.is_completed && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${s.is_completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goal (optional) */}
        {wp.goal && (
          <div className="bg-[#1c1c27] rounded-2xl px-4 py-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Цель</p>
            <p className="text-sm text-slate-200 leading-relaxed italic">{wp.goal}</p>
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="shrink-0 px-4 pb-8 pt-3 border-t border-white/[0.06]">
        <button
          onClick={onCopy}
          className={`w-full font-semibold rounded-2xl py-3.5 text-sm transition-colors flex items-center justify-center gap-2 ${
            isCopied
              ? 'bg-success/20 text-success'
              : 'bg-accent hover:bg-accent/90 text-white'
          }`}
        >
          {isCopied ? '✓ Скопировано' : 'Скопировать пакет'}
        </button>
      </div>
    </div>
  )
}
