import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDueDate } from '../../utils/dateFormat'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-accent-blue',
  medium: 'bg-warning',
  high: 'bg-danger',
}

export default function CalendarTab() {
  const { tasks, projects, openTask } = useApp()
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)

  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<string>(todayISO)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const tasksByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) {
      if (t.due_date && !t.is_completed) {
        const d = t.due_date.slice(0, 10)
        map[d] = (map[d] ?? 0) + 1
      }
    }
    return map
  }, [tasks])

  const selectedTasks = useMemo(() =>
    tasks.filter(t => t.due_date?.slice(0, 10) === selectedDate && !t.is_completed),
    [tasks, selectedDate]
  )

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-100">Calendar</h1>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between px-4 mb-4">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-2 text-slate-500 hover:text-slate-300"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold text-slate-100">{MONTHS[month]} {year}</span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-2 text-slate-500 hover:text-slate-300"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 px-2 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs text-slate-600 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 px-2 gap-y-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === todayISO
          const isSelected = dateStr === selectedDate
          const count = tasksByDate[dateStr] ?? 0

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex flex-col items-center py-2 rounded-xl transition-colors ${
                isSelected
                  ? 'bg-accent text-white'
                  : isToday
                  ? 'bg-white/10 text-slate-100'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <span className="text-sm font-medium">{day}</span>
              {count > 0 && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white/70' : 'bg-accent'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day tasks */}
      <div className="px-4 mt-6 space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {selectedDate === todayISO ? 'Today' : formatDueDate(selectedDate).label}
          {' · '}{selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
        </h2>

        {selectedTasks.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-4">No tasks for this day</p>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map(task => {
              const project = task.project_id ? projects.find(p => p.id === task.project_id) : undefined
              return (
                <button
                  key={task.id}
                  onClick={() => openTask(task.id)}
                  className="w-full flex items-center gap-3 bg-surface rounded-2xl px-4 py-3.5 text-left active:opacity-60"
                >
                  {project && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: project.color }} />
                  )}
                  <span className="flex-1 text-sm text-slate-100 truncate">{task.title}</span>
                  {task.priority !== 'none' && (
                    <span className={`shrink-0 w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority] ?? ''}`} />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
