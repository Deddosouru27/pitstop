import { useState } from 'react'
import { X } from 'lucide-react'
import type { Project } from '../../types'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#7c3aed', '#a855f7', '#ec4899',
  '#64748b', '#f1f5f9',
]

interface Props {
  project: Project
  onSave: (updates: { name: string; color: string }) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

export default function EditProjectModal({ project, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(project.name)
  const [color, setColor] = useState(project.color)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), color })
    onClose()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete()
    // onDelete navigates away, no need to close
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#1c1c27] rounded-t-2xl p-5 pb-10 shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-100">Настройки проекта</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500">Название</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Цвет</label>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-9 h-9 rounded-full transition-all active:scale-90"
                  style={{
                    background: c,
                    outline: color === c ? '2px solid white' : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            Сохранить
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 border-t border-white/[0.06]" />

        {/* Delete */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full border border-danger/40 hover:bg-danger/10 text-danger font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            Удалить проект
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-300 text-center leading-relaxed">
              Удалить проект и все его задачи?<br />
              <span className="text-slate-500">Это действие нельзя отменить.</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 bg-surface hover:bg-white/10 text-slate-300 font-semibold rounded-xl py-3 text-sm transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-danger hover:bg-danger/90 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
              >
                {deleting ? 'Удаляю...' : 'Удалить навсегда'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
