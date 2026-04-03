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


const STATUS_BADGE: Partial<Record<TaskStatus, { text: string; cls: string }>> = {
  todo:        { text: 'Todo',      cls: 'bg-slate-800 text-slate-400' },
  in_progress: { text: 'В работе', cls: 'bg-yellow-900/40 text-yellow-400' },
  done:        { text: 'Готово',   cls: 'bg-green-900/40 text-green-400' },
  cancelled:   { text: 'Отклонено', cls: 'bg-red-900/40 text-red-400' },
  blocked:     { text: 'Blocked',  cls: 'bg-red-900/50 text-red-500' },
  review:      { text: 'Review',   cls: 'bg-purple-900/40 text-purple-400' },
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
        {task.status && !task.is_completed && STATUS_BADGE[task.status] && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_BADGE[task.status]!.cls}`}>
            {STATUS_BADGE[task.status]!.text}
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
