import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Priority, Project } from '../../types'
import { useApp } from '../../context/AppContext'
import { inferPriority } from '../../utils/inferPriority'
import { addSnapshot } from '../../hooks/useContextSnapshots'

interface Props {
  projects: Project[]
  recentIdeas?: { content: string }[]
  onClose: () => void
  onCreate: (input: { title: string; description?: string | null; priority: Priority; due_date: string | null; project_id: string | null }) => Promise<void>
}

const PRIORITIES: { value: Priority; label: string; activeClass: string }[] = [
  { value: 'none', label: 'None', activeClass: 'bg-slate-600 text-slate-100' },
  { value: 'low', label: 'Low', activeClass: 'bg-accent-blue text-white' },
  { value: 'medium', label: 'Medium', activeClass: 'bg-warning text-black' },
  { value: 'high', label: 'High', activeClass: 'bg-danger text-white' },
]

export default function CreateTaskModal({ projects, recentIdeas = [], onClose, onCreate }: Props) {
  const { tasks } = useApp()
  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('none')
  const [isAutoInferred, setIsAutoInferred] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')

  // Debounced priority inference
  useEffect(() => {
    if (!title.trim() || !projectId) {
      setIsAutoInferred(false)
      return
    }
    const timer = setTimeout(() => {
      const project = projects.find(p => p.id === projectId)
      if (!project) return

      const activeTasks = tasksRef.current
        .filter(t => t.project_id === projectId && !t.is_completed)
        .map(t => ({ title: t.title, priority: t.priority }))

      const inferred = inferPriority(title, {
        nextStep: project.ai_next_step ?? '',
        whereStoped: project.ai_where_stopped ?? '',
        activeTasks,
        recentIdeas,
      })

      setPriority(inferred)
      setIsAutoInferred(true)

      // Log non-trivial inferences
      if (inferred !== 'low') {
        addSnapshot(projectId, 'priority_inferred', {
          taskTitle: title,
          inferredPriority: inferred,
          reason: 'auto',
        })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [title, projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await onCreate({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      project_id: projectId || null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-surface-el rounded-t-2xl p-5 pb-10 space-y-4 shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">New Task</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            type="text"
            placeholder="What needs to be done?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
          />

          <div className="space-y-1">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Опиши задачу для агента: что сделать, в каком репо, ожидаемый результат"
              rows={3}
              className="w-full bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent resize-none"
            />
            {!description.trim() && (
              <p className="text-[11px] text-slate-600 px-1">
                Без описания — autorun пропустит задачу
              </p>
            )}
          </div>

          {/* Priority chips */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(({ value, label, activeClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setPriority(value); setIsAutoInferred(false) }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    priority === value ? activeClass : 'bg-surface text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {isAutoInferred && (
              <p className="text-[11px] text-slate-400">Приоритет определён автоматически</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-surface text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]"
              />
            </div>

            {projects.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Project</label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full bg-surface text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">None</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            Add Task
          </button>
        </form>
      </div>
    </div>
  )
}
