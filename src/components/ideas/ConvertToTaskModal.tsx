import { useState } from 'react'
import { X, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Idea } from '../../types'

const ASSIGNEES = [
  { value: 'pekar',   label: 'Пекарь' },
  { value: 'intaker', label: 'Интакер' },
  { value: 'nout',    label: 'Ноут' },
  { value: 'artur',   label: 'Артур' },
  { value: 'autorun', label: 'Autorun' },
  { value: 'opus',    label: 'Opus' },
]

const WORK_TYPES = [
  { value: 'blocker',        label: '🚫 Blocker' },
  { value: 'critical_fix',   label: '🔥 Critical Fix' },
  { value: 'enabling',       label: '⚡ Enabling' },
  { value: 'product',        label: '📦 Product' },
  { value: 'nice_to_have',   label: '✨ Nice to Have' },
]

interface Props {
  idea: Idea
  onClose: () => void
  onCreated: () => void
}

export default function ConvertToTaskModal({ idea, onClose, onCreated }: Props) {
  const [title, setTitle] = useState(idea.summary?.trim() || idea.content.slice(0, 100))
  const [description, setDescription] = useState(idea.content)
  const [assignee, setAssignee] = useState('')
  const [workType, setWorkType] = useState('product')
  const [phaseNumber, setPhaseNumber] = useState('2')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      const { error: insertError } = await supabase.from('tasks').insert({
        title: title.trim(),
        description: description.trim() || null,
        project_id: idea.project_id ?? null,
        priority: 'medium',
        due_date: null,
        status: 'todo',
        is_completed: false,
        assignee: assignee || null,
        work_type: workType || null,
        phase_number: phaseNumber ? Number(phaseNumber) : null,
      })
      if (insertError) throw insertError
      await supabase
        .from('ideas')
        .update({ converted_to_task: true, status: 'accepted' })
        .eq('id', idea.id)
      setSuccess(true)
      setTimeout(() => { onCreated(); onClose() }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка создания задачи')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[90dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <p className="text-slate-200 text-sm font-semibold">🔄 Создать задачу из идеи</p>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
          {success && (
            <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-700/40 rounded-xl px-4 py-3">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300 font-medium">Задача создана!</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Название</label>
            <textarea
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none outline-none focus:border-purple-500/50 h-20"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Описание</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-400 placeholder-slate-600 resize-none outline-none focus:border-purple-500/50 h-28"
            />
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Исполнитель</label>
            <select
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-purple-500/50 appearance-none"
            >
              <option value="">— не назначен —</option>
              {ASSIGNEES.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Work type + Phase row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Тип работы</label>
              <select
                value={workType}
                onChange={e => setWorkType(e.target.value)}
                className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3 py-3 text-xs text-slate-200 outline-none focus:border-purple-500/50 appearance-none"
              >
                {WORK_TYPES.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Фаза</label>
              <input
                type="number"
                min="1"
                max="10"
                value={phaseNumber}
                onChange={e => setPhaseNumber(e.target.value)}
                className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-purple-500/50"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving || success || !title.trim()}
            className="w-full py-3.5 rounded-2xl bg-purple-600 text-white text-sm font-semibold active:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Создаю...' : 'Создать задачу'}
          </button>
        </div>
      </div>
    </div>
  )
}
