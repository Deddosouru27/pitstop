import type { Task } from '../../types'

interface Props {
  completedTasks: Task[]
  totalTasks: number
}

function isToday(iso: string | null): boolean {
  if (!iso) return false
  return new Date(iso).toDateString() === new Date().toDateString()
}

export default function VelocityWidget({ completedTasks, totalTasks }: Props) {
  const todayCount = completedTasks.filter(t => isToday(t.completed_at)).length
  const percentage = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0

  return (
    <div className="bg-[#13131a] rounded-2xl px-4 py-4 space-y-3 mb-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Прогресс</span>
        {todayCount > 0 && (
          <span className="text-xs text-emerald-500 font-medium">+{todayCount} сегодня</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">
          Выполнено:{' '}
          <span className="text-slate-200 font-semibold">{completedTasks.length}</span>
          {' '}/ {totalTasks}
        </span>
        <span className="text-xs text-slate-500">{Math.round(percentage)}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
