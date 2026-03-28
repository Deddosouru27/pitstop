import { memo } from 'react'
import type { Task, Project, TaskStatus } from '../../types'
import { formatDueDate } from '../../utils/dateFormat'

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-[#10b981]',
  medium: 'bg-[#f59e0b]',
  high: 'bg-[#ef4444]',
}

const ASSIGNEE_BADGE: Record<string, string> = {
  baker: '🍞',
  runner: '🖥️',
  intake: '🔧',
}

const STATUS_DOT: Record<TaskStatus, { color: string; label: string }> = {
  backlog: { color: 'bg-slate-500', label: 'Backlog' },
  todo: { color: 'bg-blue-500', label: 'To Do' },
  in_progress: { color: 'bg-yellow-500', label: 'In Progress' },
  review: { color: 'bg-purple-400', label: 'Review' },
  blocked: { color: 'bg-red-500', label: 'Blocked' },
  done: { color: 'bg-green-500', label: 'Done' },
  cancelled: { color: 'bg-slate-600', label: 'Cancelled' },
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

      {/* Right: assignee + status + priority + due date */}
      <div className="flex items-center gap-2 shrink-0">
        {task.assignee && ASSIGNEE_BADGE[task.assignee] && !task.is_completed && (
          <span className="text-sm" title={task.assignee}>
            {ASSIGNEE_BADGE[task.assignee]}
          </span>
        )}
        {task.status && !task.is_completed && STATUS_DOT[task.status] && (
          <span
            className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[task.status].color}`}
            title={STATUS_DOT[task.status].label}
          />
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
