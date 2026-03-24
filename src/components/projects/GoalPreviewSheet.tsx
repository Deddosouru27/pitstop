import { X, Loader2 } from 'lucide-react'

export interface ProposedTask {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  tasks: ProposedTask[]
  goalText: string
  isConfirming: boolean
}

const PRIORITY_DOT: Record<ProposedTask['priority'], string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
}

const PRIORITY_BADGE: Record<ProposedTask['priority'], string> = {
  low: 'bg-success/20 text-green-400',
  medium: 'bg-warning/20 text-yellow-400',
  high: 'bg-danger/20 text-red-400',
}

const PRIORITY_LABEL: Record<ProposedTask['priority'], string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

export default function GoalPreviewSheet({ isOpen, onClose, onConfirm, tasks, goalText, isConfirming }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Sheet */}
      <div className="relative mt-auto bg-[#13131a] rounded-t-2xl flex flex-col max-h-[92dvh] animate-slide-up">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-4 py-3 shrink-0">
          <div className="flex-1">
            <h2 className="font-bold text-slate-100">Предпросмотр задач</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Claude предлагает {tasks.length} задач для вашей цели
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors mt-0.5"
          >
            <X size={20} />
          </button>
        </div>

        {/* Goal card */}
        <div className="px-4 pb-3 shrink-0">
          <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
            <p className="text-xs text-accent font-semibold mb-1">Цель</p>
            <p className="text-sm text-slate-300 leading-relaxed">{goalText}</p>
          </div>
        </div>

        {/* Tasks list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {tasks.map((task, idx) => (
            <div key={idx} className="bg-[#1c1c27] rounded-2xl px-4 py-3 space-y-1.5">
              <div className="flex items-start gap-2.5">
                {/* Priority dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                  style={{ background: PRIORITY_DOT[task.priority] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 leading-snug">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{task.description}</p>
                  )}
                </div>
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[task.priority]}`}>
                  {PRIORITY_LABEL[task.priority]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="shrink-0 px-4 pb-8 pt-3 border-t border-white/[0.06] flex gap-2">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 bg-surface hover:bg-white/10 disabled:opacity-40 text-slate-300 font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming || tasks.length === 0}
            className="flex-1 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isConfirming ? (
              <><Loader2 size={14} className="animate-spin" /> Создаю...</>
            ) : (
              `Добавить ${tasks.length} задач →`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
