import { useState } from 'react'
import { X } from 'lucide-react'
import type { Priority, Project } from '../../types'

interface Props {
  projects: Project[]
  onClose: () => void
  onCreate: (input: { title: string; priority: Priority; due_date: string | null; project_id: string | null }) => Promise<void>
}

const PRIORITIES: { value: Priority; label: string; activeClass: string }[] = [
  { value: 'none', label: 'None', activeClass: 'bg-slate-600 text-slate-100' },
  { value: 'low', label: 'Low', activeClass: 'bg-accent-blue text-white' },
  { value: 'medium', label: 'Medium', activeClass: 'bg-warning text-black' },
  { value: 'high', label: 'High', activeClass: 'bg-danger text-white' },
]

export default function CreateTaskModal({ projects, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('none')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await onCreate({
      title: title.trim(),
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

          {/* Priority chips */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(({ value, label, activeClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    priority === value ? activeClass : 'bg-surface text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
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
