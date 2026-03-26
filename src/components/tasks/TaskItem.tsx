import { memo } from 'react'
import type { Task, Project, TaskStatus } from '../../types'
import { formatDueDate } from '../../utils/dateFormat'

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-[#10b981]',
  medium: 'bg-[#f59e0b]',
  high: 'bg-[#ef4444]',
}

const STATUS_CONFIG: Record<TaskStatus, { icon: string; label: string; className: string }> = {
  backlog: { icon: '\u{1F4CB}', label: 'Backlog', className: 'text-slate-500' },
  todo: { icon: '\u2705', label: 'To Do', className: 'text-slate-400' },
  in_progress: { icon: '\u2699\uFE0F', label: 'In Progress', className: 'text-blue-400' },
  review: { icon: '\u{1F440}', label: 'Review', className: 'text-yellow-400' },
  blocked: { icon: '\u{1F6AB}', label: 'Blocked', className: 'text-red-400' },
  done: { icon: '\u2714\uFE0F', label: 'Done', className: 'text-green-400' },
}

interface Props {
  task: Task
  project?: Project
  onToggle: (id: string, completed: boolean) => void
  onOpen: (id: string) => void
}

const TaskItem = memo(function TaskItem({ task, project, onToggle, onOpen }: Props) {
  const due = task.due_date ? formatDueDate(task.due_date) : null

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 bg-surface rounded-2xl active:opacity-60 cursor-pointer"
      onClick={() => onOpen(task.id)}
    >
      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onToggle(task.id, !task.is_completed) }}
        className="shrink-0 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: task.is_completed ? '#7c3aed' : '#334155',
          background: task.is_completed ? '#7c3aed' : 'transparent',
        }}
      >
        {task.is_completed && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {project && (
          <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: project.color }} />
        )}
        <span
          className={`truncate text-sm ${
            task.is_completed ? 'line-through text-slate-500' : 'text-slate-100'
          }`}
        >
          {task.title}
        </span>
      </div>

      {/* Right: status + priority + due date */}
      <div className="flex items-center gap-2 shrink-0">
        {task.status && !task.is_completed && (
          <span
            className={`text-xs ${STATUS_CONFIG[task.status].className}`}
            title={STATUS_CONFIG[task.status].label}
          >
            {STATUS_CONFIG[task.status].icon}
          </span>
        )}
        {task.priority !== 'none' && !task.is_completed && (
          <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
        )}
        {due && !task.is_completed && (
          <span className={`text-xs ${due.className}`}>{due.label}</span>
        )}
      </div>
    </div>
  )
})

export default TaskItem
