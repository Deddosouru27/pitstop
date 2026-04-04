import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Task, TaskStatus } from '../../types'

// ── Constants (shared with CreateTaskModal) ───────────────────────────────────

const ASSIGNEES = [
  { value: 'autorun', label: 'Autorun' },
  { value: 'pekar',   label: 'Пекарь' },
  { value: 'intaker', label: 'Интакер' },
  { value: 'nout',    label: 'Ноут' },
  { value: 'opus',    label: 'Opus' },
  { value: 'sonnet',  label: 'Sonnet' },
  { value: 'artur',   label: 'Артур' },
]

const WORK_TYPES = [
  { value: 'blocker',       label: 'Blocker' },
  { value: 'critical_fix',  label: 'Critical Fix' },
  { value: 'enabling',      label: 'Enabling' },
  { value: 'product',       label: 'Product' },
  { value: 'nice_to_have',  label: 'Nice to Have' },
  { value: 'exploration',   label: 'Exploration' },
]

const STATUSES: { value: TaskStatus; label: string; cls: string }[] = [
  { value: 'todo',        label: 'Todo',      cls: 'bg-slate-700/60 text-slate-300' },
  { value: 'in_progress', label: 'В работе',  cls: 'bg-blue-900/50 text-blue-300' },
  { value: 'review',      label: 'Review',    cls: 'bg-purple-900/50 text-purple-300' },
  { value: 'blocked',     label: 'Blocked',   cls: 'bg-red-900/50 text-red-300' },
  { value: 'done',        label: 'Done',      cls: 'bg-emerald-900/50 text-emerald-300' },
  { value: 'cancelled',   label: 'Cancelled', cls: 'bg-slate-800 text-slate-500' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  task: Task
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditTaskModal({ task, onClose, onSaved, onDeleted }: Props) {
  const { updateTask, deleteTask } = useApp()

  const [title, setTitle]                   = useState(task.title)
  const [description, setDescription]       = useState(task.description ?? '')
  const [assignee, setAssignee]             = useState(task.assignee ?? 'autorun')
  const [workType, setWorkType]             = useState(task.work_type ?? 'product')
  const [phaseNumber, setPhaseNumber]       = useState(task.phase_number ?? 3)
  const [status, setStatus]                 = useState<TaskStatus>((task.status ?? 'todo') as TaskStatus)
  const [submitting, setSubmitting]         = useState(false)
  const [confirmDelete, setConfirmDelete]   = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  const canSubmit = title.trim().length > 0 && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    const isDone = status === 'done'
    const result = await updateTask(task.id, {
      title:        title.trim(),
      description:  description.trim() || null,
      assignee:     assignee || null,
      work_type:    workType || null,
      phase_number: phaseNumber || null,
      status,
      is_completed:  isDone,
      completed_at:  isDone ? new Date().toISOString() : null,
    })

    if (result) {
      onSaved()
      onClose()
    } else {
      setError('Не удалось сохранить. Попробуй ещё раз.')
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSubmitting(true)
    await deleteTask(task.id)
    onDeleted()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[92dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-white/[0.04]">
          <h2 className="text-base font-semibold text-slate-100">Редактировать задачу</h2>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 pb-10 space-y-4">

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Название *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Название задачи"
              className="w-full bg-white/5 border border-white/[0.08] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          {/* Status chips */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Статус</label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                    status === s.value
                      ? `${s.cls} border-current/30 ring-1 ring-current/20`
                      : 'bg-white/5 text-slate-500 border-white/[0.06] active:bg-white/10'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Описание</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Что нужно сделать, ожидаемый результат..."
              rows={3}
              className="w-full bg-white/5 border border-white/[0.08] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500/50 resize-none transition-colors"
            />
          </div>

          {/* Assignee + Work type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-medium">Исполнитель</label>
              <select
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                className="w-full bg-white/5 border border-white/[0.08] text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-500/50 [color-scheme:dark]"
              >
                {ASSIGNEES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-medium">Тип работы</label>
              <select
                value={workType}
                onChange={e => setWorkType(e.target.value)}
                className="w-full bg-white/5 border border-white/[0.08] text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-500/50 [color-scheme:dark]"
              >
                {WORK_TYPES.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phase */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Phase</label>
            <input
              type="number"
              min={1}
              max={10}
              value={phaseNumber}
              onChange={e => setPhaseNumber(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 [color-scheme:dark]"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Save */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {submitting ? 'Сохраняем...' : 'Сохранить'}
          </button>

          {/* Delete (two-tap confirm) */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className={`w-full flex items-center justify-center gap-2 font-medium rounded-xl py-3 text-sm transition-colors border ${
              confirmDelete
                ? 'bg-red-900/40 text-red-300 border-red-600/40'
                : 'text-red-500/50 border-white/[0.06] hover:border-red-500/20 hover:text-red-500/70'
            }`}
          >
            <Trash2 size={14} />
            {confirmDelete ? '⚠ Подтвердить удаление' : 'Удалить задачу'}
          </button>
        </form>
      </div>
    </div>
  )
}
