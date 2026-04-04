import { useState, useMemo } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import CreateTaskModal from './CreateTaskModal'
import EditTaskModal from './EditTaskModal'
import type { Task, TaskStatus } from '../../types'

// ── Status group config ───────────────────────────────────────────────────────

const STATUS_GROUPS: {
  key: TaskStatus
  label: string
  labelCls: string
}[] = [
  { key: 'in_progress', label: '🔵 В работе', labelCls: 'text-blue-400' },
  { key: 'blocked',     label: '🚫 Blocked',   labelCls: 'text-red-400' },
  { key: 'review',      label: '👀 Review',    labelCls: 'text-purple-400' },
  { key: 'todo',        label: '📋 Todo',      labelCls: 'text-slate-400' },
]

const ASSIGNEE_BADGE: Record<string, string> = {
  autorun: '🤖', pekar: '🍞', intaker: '🔧',
  nout: '🖥️', opus: '🧠', sonnet: '✨', artur: '👤',
}

// ── TaskRow ───────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onEdit,
  onToggle,
}: {
  task: Task
  onEdit: (t: Task) => void
  onToggle: (id: string, done: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
      <button
        onClick={() => onToggle(task.id, !task.is_completed)}
        className="shrink-0 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: task.is_completed ? '#7c3aed' : '#334155',
          background:  task.is_completed ? '#7c3aed' : 'transparent',
        }}
      >
        {task.is_completed && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
        <p className={`text-sm leading-snug line-clamp-1 ${task.is_completed ? 'line-through text-slate-600' : 'text-slate-100'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.assignee && ASSIGNEE_BADGE[task.assignee] && (
            <span className="text-[11px]">{ASSIGNEE_BADGE[task.assignee]}</span>
          )}
          {task.work_type && (
            <span className="text-[10px] text-slate-600">{task.work_type}</span>
          )}
          {task.phase_number != null && (
            <span className="text-[10px] text-slate-700">P{task.phase_number}</span>
          )}
        </div>
      </div>

      <button
        onClick={() => onEdit(task)}
        className="shrink-0 p-1.5 text-slate-700 active:text-slate-400 transition-colors"
      >
        <Pencil size={13} />
      </button>
    </div>
  )
}

// ── StatusGroup ───────────────────────────────────────────────────────────────

function StatusGroup({
  label, labelCls, tasks, onEdit, onToggle,
}: {
  label: string
  labelCls: string
  tasks: Task[]
  onEdit: (t: Task) => void
  onToggle: (id: string, done: boolean) => void
}) {
  if (tasks.length === 0) return null
  return (
    <div className="space-y-1.5">
      <p className={`text-xs font-semibold uppercase tracking-wider px-1 flex items-center gap-2 ${labelCls}`}>
        {label}
        <span className="font-normal text-slate-600 normal-case tracking-normal">{tasks.length}</span>
      </p>
      {tasks.map(t => (
        <TaskRow key={t.id} task={t} onEdit={onEdit} onToggle={onToggle} />
      ))}
    </div>
  )
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

type FilterKey = 'active' | TaskStatus

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'active',      label: 'Активные' },
  { key: 'todo',        label: 'Todo' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'blocked',     label: 'Blocked' },
  { key: 'done',        label: 'Done' },
]

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TasksTab() {
  const { tasks, tasksLoading, completeTask } = useApp()
  const [filter, setFilter]         = useState<FilterKey>('active')
  const [showCreate, setShowCreate] = useState(false)
  const [editTask, setEditTask]     = useState<Task | null>(null)
  const [toastMsg, setToastMsg]     = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const grouped = useMemo(() => {
    const g: Record<TaskStatus, Task[]> = {
      backlog: [], todo: [], in_progress: [], review: [],
      blocked: [], done: [], cancelled: [],
    }
    for (const t of tasks) {
      const s = (t.status ?? 'todo') as TaskStatus
      if (s in g) g[s].push(t)
    }
    return g
  }, [tasks])

  const totalActive = STATUS_GROUPS.reduce((s, g) => s + grouped[g.key].length, 0)

  if (tasksLoading) {
    return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Загрузка...</div>
  }

  return (
    <div className="flex flex-col min-h-full pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-slate-100">Tasks</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {totalActive} активных · {grouped.done.length} выполнено
        </p>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {FILTER_TABS.map(tab => {
          const count = tab.key === 'active'
            ? totalActive
            : grouped[tab.key as TaskStatus]?.length ?? 0
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                filter === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-slate-400 active:bg-white/10'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
                filter === tab.key ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'
              }`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Task groups */}
      <div className="px-4 space-y-5 flex-1">
        {filter === 'active' && STATUS_GROUPS.map(g => (
          <StatusGroup
            key={g.key}
            label={g.label}
            labelCls={g.labelCls}
            tasks={grouped[g.key]}
            onEdit={setEditTask}
            onToggle={completeTask}
          />
        ))}

        {filter !== 'active' && filter !== 'done' && (
          <StatusGroup
            label={STATUS_GROUPS.find(g => g.key === filter)?.label ?? filter}
            labelCls={STATUS_GROUPS.find(g => g.key === filter)?.labelCls ?? 'text-slate-400'}
            tasks={grouped[filter as TaskStatus] ?? []}
            onEdit={setEditTask}
            onToggle={completeTask}
          />
        )}

        {filter === 'done' && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider px-1 text-slate-600 flex items-center gap-2">
              ✅ Done
              <span className="font-normal text-slate-700 normal-case">{grouped.done.length}</span>
            </p>
            {grouped.done.map(t => (
              <TaskRow key={t.id} task={t} onEdit={setEditTask} onToggle={completeTask} />
            ))}
          </div>
        )}

        {filter === 'active' && totalActive === 0 && (
          <div className="flex flex-col items-center py-16 text-slate-600">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm">Все активные задачи выполнены!</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-2xl shadow-lg shadow-purple-900/40 flex items-center justify-center transition-all z-40"
      >
        <Plus size={26} strokeWidth={2} />
      </button>

      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); showToast('✅ Задача создана') }}
        />
      )}

      {editTask && (
        <EditTaskModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSaved={() => showToast('✅ Сохранено')}
          onDeleted={() => showToast('🗑 Удалено')}
        />
      )}

      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1c1c2e] border border-white/10 text-slate-200 text-sm font-medium px-4 py-2.5 rounded-2xl shadow-xl whitespace-nowrap">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
