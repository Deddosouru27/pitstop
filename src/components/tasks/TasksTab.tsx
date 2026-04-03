import { useState, useMemo, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import TaskItem from './TaskItem'
import CreateTaskModal from './CreateTaskModal'
import type { Task } from '../../types'

function useGroupedTasks(tasks: Task[]) {
  return useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdue: Task[] = []
    const todayList: Task[] = []
    const upcoming: Task[] = []
    const noDate: Task[] = []
    const done: Task[] = []

    for (const task of tasks) {
      if (task.is_completed) { done.push(task); continue }
      if (!task.due_date) { noDate.push(task); continue }

      const due = new Date(task.due_date)
      due.setHours(0, 0, 0, 0)
      const diff = (due.getTime() - today.getTime()) / 86400000

      if (diff < 0) overdue.push(task)
      else if (diff === 0) todayList.push(task)
      else upcoming.push(task)
    }

    // Sort each group by date
    const byDate = (a: Task, b: Task) => {
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      return 0
    }
    overdue.sort(byDate)
    todayList.sort(byDate)
    upcoming.sort(byDate)

    return { overdue, today: todayList, upcoming, noDate, done }
  }, [tasks])
}

interface GroupProps {
  label: string
  labelClass: string
  tasks: Task[]
  projects: ReturnType<typeof useApp>['projects']
  onToggle: (id: string, completed: boolean) => void
  onOpen: (id: string) => void
}

function TaskGroup({ label, labelClass, tasks, projects, onToggle, onOpen }: GroupProps) {
  if (tasks.length === 0) return null
  const getProject = (id: string | null) => id ? projects.find(p => p.id === id) : undefined
  return (
    <div className="space-y-1.5">
      <p className={`text-xs font-semibold uppercase tracking-wider px-1 ${labelClass}`}>{label}</p>
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          project={getProject(task.project_id)}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}

export default function TasksTab() {
  const { tasks, tasksLoading, projects, completeTask, openTask } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [toast, setToast] = useState(false)
  const groups = useGroupedTasks(tasks)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(false), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const activeCount = groups.overdue.length + groups.today.length + groups.upcoming.length + groups.noDate.length

  if (tasksLoading) {
    return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-100">Tasks</h1>
        <p className="text-sm text-slate-500 mt-0.5">{activeCount} active</p>
      </div>

      <div className="px-4 space-y-5 flex-1">
        {activeCount === 0 && groups.done.length === 0 && (
          <div className="flex flex-col items-center py-16 text-slate-500">
            <p className="text-sm">No tasks yet</p>
            <p className="text-xs mt-1 text-slate-600">Tap + to add one</p>
          </div>
        )}

        <TaskGroup
          label="Overdue"
          labelClass="text-danger"
          tasks={groups.overdue}
          projects={projects}
          onToggle={completeTask}
          onOpen={openTask}
        />
        <TaskGroup
          label="Today"
          labelClass="text-warning"
          tasks={groups.today}
          projects={projects}
          onToggle={completeTask}
          onOpen={openTask}
        />
        <TaskGroup
          label="Upcoming"
          labelClass="text-slate-400"
          tasks={groups.upcoming}
          projects={projects}
          onToggle={completeTask}
          onOpen={openTask}
        />
        <TaskGroup
          label="No date"
          labelClass="text-slate-500"
          tasks={groups.noDate}
          projects={projects}
          onToggle={completeTask}
          onOpen={openTask}
        />

        {groups.done.length > 0 && (
          <div className="space-y-1.5">
            <button
              onClick={() => setShowDone(v => !v)}
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 px-1"
            >
              Done ({groups.done.length}) {showDone ? '▲' : '▼'}
            </button>
            {showDone && groups.done.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                project={task.project_id ? projects.find(p => p.id === task.project_id) : undefined}
                onToggle={completeTask}
                onOpen={openTask}
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-accent hover:bg-accent/90 active:scale-95 text-white rounded-2xl shadow-lg shadow-accent/30 flex items-center justify-center transition-all z-40"
      >
        <Plus size={26} strokeWidth={2} />
      </button>

      {showModal && (
        <CreateTaskModal
          onClose={() => setShowModal(false)}
          onCreated={() => setToast(true)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-900/90 border border-emerald-700/50 text-emerald-300 text-sm font-medium px-4 py-2.5 rounded-2xl shadow-xl animate-fade-in whitespace-nowrap">
          ✅ Задача создана
        </div>
      )}
    </div>
  )
}
