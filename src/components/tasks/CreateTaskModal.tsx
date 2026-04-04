import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const MAOS_PROJECT_ID  = 'f2896db9-8eeb-4a15-a49f-7b8571f09dfe'
const ACTIVE_CYCLE_PLAN_ID = '417af120-da13-4807-bec0-44d87e1cf2d3'

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

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function CreateTaskModal({ onClose, onCreated }: Props) {
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee]       = useState('autorun')
  const [workType, setWorkType]       = useState('product')
  const [phaseNumber, setPhaseNumber] = useState(3)
  const [autorunSafe, setAutorunSafe] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    const finalDescription = autorunSafe
      ? `AUTORUN SAFE: REPO: pitstop. ${description.trim()}`
      : description.trim()

    const { error: insertError } = await supabase.from('tasks').insert({
      title:        title.trim(),
      description:  finalDescription,
      assignee,
      work_type:    workType,
      phase_number: phaseNumber,
      project_id:        MAOS_PROJECT_ID,
      cycle_plan_id:     ACTIVE_CYCLE_PLAN_ID,
      context_readiness: 'agent_ready',
      is_completed:      false,
      priority:          'none',
      due_date:          null,
      status:            'todo',
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    onCreated()
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
          <h2 className="text-base font-semibold text-slate-100">Создать задачу</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Title */}
          <input
            autoFocus
            type="text"
            placeholder="Название задачи *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Описание — что сделать, в каком репо, ожидаемый результат *"
            rows={3}
            className="w-full bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent resize-none"
          />

          {/* AUTORUN SAFE */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setAutorunSafe(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative ${autorunSafe ? 'bg-emerald-600' : 'bg-white/10'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autorunSafe ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <div>
              <p className="text-sm text-slate-200 font-medium">AUTORUN SAFE</p>
              <p className="text-[11px] text-slate-500">Добавит префикс «AUTORUN SAFE: REPO: pitstop.»</p>
            </div>
          </label>

          {/* Assignee + Work type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Исполнитель</label>
              <select
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                className="w-full bg-surface text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent"
              >
                {ASSIGNEES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Тип работы</label>
              <select
                value={workType}
                onChange={e => setWorkType(e.target.value)}
                className="w-full bg-surface text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent"
              >
                {WORK_TYPES.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phase number */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Phase</label>
            <input
              type="number"
              min={1}
              max={10}
              value={phaseNumber}
              onChange={e => setPhaseNumber(Number(e.target.value))}
              className="w-full bg-surface text-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {submitting ? 'Создаём...' : 'Создать задачу'}
          </button>
        </form>
      </div>
    </div>
  )
}
