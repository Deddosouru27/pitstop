import { useState } from 'react'
import { Target, Plus, Pencil, Trash2, X } from 'lucide-react'
import { useKnowledgeDomains } from '../../hooks/useKnowledgeDomains'
import type { KnowledgeDomain } from '../../types'

const PRIORITY_CFG = {
  critical: { label: 'Critical', cls: 'bg-red-900/50 text-red-400 border-red-500/30' },
  high:     { label: 'High',     cls: 'bg-orange-900/50 text-orange-400 border-orange-500/30' },
  medium:   { label: 'Medium',   cls: 'bg-yellow-900/50 text-yellow-400 border-yellow-500/30' },
  low:      { label: 'Low',      cls: 'bg-slate-800 text-slate-400 border-white/10' },
} as const

const PRIORITY_OPTIONS: Array<{ value: KnowledgeDomain['priority']; label: string }> = [
  { value: 'critical', label: 'Critical — мастхэв' },
  { value: 'high',     label: 'High — важно' },
  { value: 'medium',   label: 'Medium — полезно' },
  { value: 'low',      label: 'Low — справочно' },
]

type FormState = { name: string; description: string; priority: string }
const emptyForm: FormState = { name: '', description: '', priority: 'medium' }

function DomainModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: FormState & { id?: string }
  onSave: (data: FormState) => Promise<boolean>
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(
    initial ? { name: initial.name, description: initial.description, priority: initial.priority } : emptyForm
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSave() {
    if (!form.name.trim()) { setErr('Название обязательно'); return }
    setSaving(true)
    const ok = await onSave(form)
    setSaving(false)
    if (ok) onClose()
    else setErr('Ошибка сохранения')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[90dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <p className="text-slate-100 font-semibold">
            {initial?.id ? 'Редактировать домен' : 'Добавить домен'}
          </p>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-medium block mb-1">
              Название *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Например: Системное мышление"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-medium block mb-1">
              Описание
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Чем этот домен важен для проектов..."
              style={{ minHeight: '100px' }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-medium block mb-1">
              Приоритет
            </label>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-purple-500/50 transition-colors appearance-none"
            >
              {PRIORITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value} className="bg-[#1c1c27]">
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {err && <p className="text-red-400 text-xs">{err}</p>}

          <button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="w-full bg-purple-600 active:bg-purple-700 disabled:opacity-40 text-white font-semibold rounded-2xl py-3 text-sm transition-colors"
          >
            {saving ? 'Сохранение...' : initial?.id ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DomainCard({
  domain,
  onEdit,
  onDelete,
}: {
  domain: KnowledgeDomain
  onEdit: (d: KnowledgeDomain) => void
  onDelete: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const pcfg = PRIORITY_CFG[domain.priority] ?? PRIORITY_CFG.low

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/[0.06] space-y-2">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-slate-100 text-sm font-semibold leading-snug">{domain.name}</p>
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pcfg.cls}`}>
          {pcfg.label}
        </span>
      </div>

      {domain.description && (
        <p className="text-slate-400 text-xs leading-relaxed">{domain.description}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-slate-600">
          {new Date(domain.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <div className="flex items-center gap-1">
          {confirmDelete ? (
            <>
              <button
                onClick={() => onDelete(domain.id)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-red-900/50 text-red-400 active:bg-red-900/80 transition-colors"
              >
                Удалить
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-white/5 text-slate-400 active:bg-white/10 transition-colors"
              >
                Отмена
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEdit(domain)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 active:text-slate-300 active:bg-white/5 transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 active:text-red-400 active:bg-red-900/20 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DomainsPage() {
  const { domains, loading, error, addDomain, updateDomain, deleteDomain } = useKnowledgeDomains()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<KnowledgeDomain | null>(null)

  const counts = {
    critical: domains.filter(d => d.priority === 'critical').length,
    high:     domains.filter(d => d.priority === 'high').length,
    medium:   domains.filter(d => d.priority === 'medium').length,
    low:      domains.filter(d => d.priority === 'low').length,
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <Target size={28} strokeWidth={1.5} className="text-slate-600" />
        <p className="text-sm text-slate-500">Не удалось загрузить домены</p>
        <p className="text-xs text-slate-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-purple-400 shrink-0" strokeWidth={1.75} />
          <h1 className="flex-1 text-2xl font-bold text-slate-100">Домены знаний</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent hover:bg-accent/90 text-white transition-colors"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-4 pb-4 flex gap-2">
        {(Object.entries(counts) as Array<[keyof typeof PRIORITY_CFG, number]>).map(([key, count]) => (
          <div key={key} className="flex-1 bg-white/5 rounded-xl px-2 py-2 border border-white/[0.06] text-center">
            <p className={`text-xs font-bold ${PRIORITY_CFG[key].cls.split(' ')[1]}`}>{count}</p>
            <p className="text-[10px] text-slate-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="px-4 space-y-2 flex-1">
        {domains.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center space-y-1">
            <Target size={32} strokeWidth={1.5} className="text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">Домены не заданы</p>
            <p className="text-xs text-slate-600">Нажми + чтобы добавить первый домен</p>
          </div>
        ) : (
          domains.map(d => (
            <DomainCard
              key={d.id}
              domain={d}
              onEdit={setEditing}
              onDelete={deleteDomain}
            />
          ))
        )}
      </div>

      {showAdd && (
        <DomainModal
          onSave={addDomain}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editing && (
        <DomainModal
          initial={{ id: editing.id, name: editing.name, description: editing.description ?? '', priority: editing.priority }}
          onSave={data => updateDomain(editing.id, data)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
