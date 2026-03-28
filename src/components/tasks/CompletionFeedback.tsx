import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Task } from '../../types'

interface Props {
  streak: number
  velocity: number
  nextTask: Task | null
  onStartNextTask: () => void
  onUpdateContext: () => void
  onDismiss: () => void
}

export default function CompletionFeedback({
  streak,
  nextTask,
  onStartNextTask,
  onUpdateContext,
  onDismiss,
}: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 4000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss])

  const getMessage = () => {
    if (streak >= 3) return `🔥 ${streak} задач подряд!`
    if (streak === 2) return '✅ 2 подряд — хороший темп'
    return '✅ Выполнено'
  }

  return (
    <div className="animate-slide-up-sm bg-[#1c1c27] border-t border-white/10 px-4 py-3 flex items-center gap-3 shadow-2xl">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200">{getMessage()}</p>
        {streak >= 3 && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {nextTask && (
              <button
                onClick={onStartNextTask}
                className="text-xs text-purple-300 border border-purple-500/30 rounded-lg px-2.5 py-1 hover:bg-purple-500/10 transition-colors truncate max-w-[160px]"
              >
                → {nextTask.title.length > 30 ? `${nextTask.title.slice(0, 30)}…` : nextTask.title}
              </button>
            )}
            <button
              onClick={onUpdateContext}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors shrink-0"
            >
              Обновить контекст
            </button>
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  )
}
