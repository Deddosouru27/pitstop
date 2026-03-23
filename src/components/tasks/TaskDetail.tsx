import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Plus } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useSubtasks } from '../../hooks/useSubtasks'
import type { Priority } from '../../types'

const PRIORITIES: { value: Priority; label: string; activeClass: string }[] = [
  { value: 'none', label: 'None', activeClass: 'bg-slate-600 text-slate-100' },
  { value: 'low', label: 'Low', activeClass: 'bg-accent-blue text-white' },
  { value: 'medium', label: 'Medium', activeClass: 'bg-warning text-black' },
  { value: 'high', label: 'High', activeClass: 'bg-danger text-white' },
]

interface Props {
  taskId: string
  onClose: () => void
}

export default function TaskDetail({ taskId, onClose }: Props) {
  const { tasks, projects, updateTask, deleteTask } = useApp()
  const { subtasks, addSubtask, toggleSubtask, deleteSubtask } = useSubtasks(taskId)
  const task = tasks.find(t => t.id === taskId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('none')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [newSubtask, setNewSubtask] = useState('')

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setPriority(task.priority)
      setDueDate(task.due_date?.slice(0, 10) ?? '')
      setProjectId(task.project_id ?? '')
    }
  }, [taskId]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (overrides?: Partial<{ priority: Priority; dueDate: string; projectId: string }>) => {
    if (!task) return
    await updateTask(task.id, {
      title: title.trim() || task.title,
      description: description || null,
      priority: overrides?.priority ?? priority,
      due_date: overrides?.dueDate !== undefined ? (overrides.dueDate || null) : (dueDate || null),
      project_id: overrides?.projectId !== undefined ? (overrides.projectId || null) : (projectId || null),
    })
  }, [task, title, description, priority, dueDate, projectId, updateTask])

  const handleDelete = async () => {
    if (!task) return
    await deleteTask(task.id)
    onClose()
  }

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubtask.trim()) return
    await addSubtask(newSubtask.trim())
    setNewSubtask('')
  }

  if (!task) return null

  const completedCount = subtasks.filter(s => s.is_completed).length

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-surface-el rounded-t-2xl max-h-[92dvh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2">
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
            <X size={20} />
          </button>
          <div className="flex-1" />
          <button onClick={handleDelete} className="text-slate-600 hover:text-danger p-1 transition-colors">
            <Trash2 size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => save()}
            className="w-full bg-transparent text-slate-100 text-xl font-semibold outline-none pb-2 border-b border-white/10 focus:border-accent transition-colors"
            placeholder="Task title"
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => save()}
            placeholder="Add a note..."
            rows={2}
            className="w-full bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent resize-none"
          />

          {/* Priority chips */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(({ value, label, activeClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setPriority(value); save({ priority: value }) }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    priority === value ? activeClass : 'bg-surface text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Due date + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => { setDueDate(e.target.value); save({ dueDate: e.target.value }) }}
                className="w-full bg-surface text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500">Project</label>
              <select
                value={projectId}
                onChange={e => { setProjectId(e.target.value); save({ projectId: e.target.value }) }}
                className="w-full bg-surface text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                <option value="">None</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500">
              Subtasks{subtasks.length > 0 ? ` · ${completedCount}/${subtasks.length}` : ''}
            </label>

            <div className="space-y-1.5">
              {subtasks.map(s => (
                <div key={s.id} className="flex items-center gap-2.5 bg-surface rounded-xl px-3 py-2.5">
                  <button
                    onClick={() => toggleSubtask(s.id, !s.is_completed)}
                    className="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: s.is_completed ? '#7c3aed' : '#334155',
                      background: s.is_completed ? '#7c3aed' : 'transparent',
                    }}
                  >
                    {s.is_completed && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${s.is_completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                    {s.title}
                  </span>
                  <button onClick={() => deleteSubtask(s.id)} className="text-slate-700 hover:text-danger transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                placeholder="Add subtask..."
                className="flex-1 bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={!newSubtask.trim()}
                className="bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-xl px-3 transition-colors"
              >
                <Plus size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
