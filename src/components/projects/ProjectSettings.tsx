import { useState } from 'react'
import { X, Plus, Trash2, Github, Globe, Zap, CheckSquare } from 'lucide-react'
import type { Project } from '../../types'

interface Props {
  project: Project
  onSave: (updates: Partial<Project>) => Promise<void>
  onClose: () => void
}

export default function ProjectSettings({ project, onSave, onClose }: Props) {
  const [githubRepo, setGithubRepo] = useState(project.github_repo ?? '')
  const [deployUrl, setDeployUrl] = useState(project.deploy_url ?? '')
  const [autorunEnabled, setAutorunEnabled] = useState(project.autorun_enabled ?? true)
  const [dodItems, setDodItems] = useState<string[]>(project.dod_items ?? [])
  const [newDodItem, setNewDodItem] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      github_repo: githubRepo.trim() || null,
      deploy_url: deployUrl.trim() || null,
      autorun_enabled: autorunEnabled,
      dod_items: dodItems.filter(d => d.trim()),
    })
    setSaving(false)
    onClose()
  }

  const addDodItem = () => {
    const trimmed = newDodItem.trim()
    if (!trimmed) return
    setDodItems(prev => [...prev, trimmed])
    setNewDodItem('')
  }

  const removeDodItem = (idx: number) => {
    setDodItems(prev => prev.filter((_, i) => i !== idx))
  }

  const updateDodItem = (idx: number, value: string) => {
    setDodItems(prev => prev.map((item, i) => i === idx ? value : item))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[90dvh] flex flex-col shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h2 className="text-base font-semibold text-slate-100">Настройки проекта</h2>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-6">

          {/* ── Интеграции ───────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe size={13} className="text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Интеграции</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 flex items-center gap-1.5">
                <Github size={12} />
                GitHub репо
              </label>
              <input
                type="text"
                value={githubRepo}
                onChange={e => setGithubRepo(e.target.value)}
                placeholder="owner/repo"
                className="w-full bg-white/5 border border-white/[0.06] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 transition-colors"
              />
              <p className="text-[11px] text-slate-600 px-1">
                Агент коммитит в этот репо
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 flex items-center gap-1.5">
                <Globe size={12} />
                Deploy URL
              </label>
              <input
                type="text"
                value={deployUrl}
                onChange={e => setDeployUrl(e.target.value)}
                placeholder="https://your-app.vercel.app"
                className="w-full bg-white/5 border border-white/[0.06] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>
          </section>

          {/* ── Autorun ──────────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Autorun</h3>
            </div>

            <div className="flex items-center justify-between bg-white/5 border border-white/[0.06] rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Включить autorun</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Агент будет автоматически брать задачи из этого проекта
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutorunEnabled(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  autorunEnabled ? 'bg-purple-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    autorunEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* ── Definition of Done ───────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckSquare size={13} className="text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Definition of Done
              </h3>
            </div>

            <div className="space-y-2">
              {dodItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs">☐</span>
                  <input
                    type="text"
                    value={item}
                    onChange={e => updateDodItem(idx, e.target.value)}
                    className="flex-1 bg-white/5 border border-white/[0.06] text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors"
                  />
                  <button
                    onClick={() => removeDodItem(idx)}
                    className="text-slate-600 active:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDodItem}
                  onChange={e => setNewDodItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addDodItem() }}
                  placeholder="Добавить критерий..."
                  className="flex-1 bg-white/5 border border-white/[0.06] text-slate-100 placeholder-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors"
                />
                <button
                  onClick={addDodItem}
                  disabled={!newDodItem.trim()}
                  className="bg-white/5 active:bg-white/10 disabled:opacity-30 text-slate-400 rounded-xl px-3 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {dodItems.length === 0 && (
                <p className="text-xs text-slate-600 px-1">
                  Пример: "npm run build ✅", "Написан тест", "Обновлена документация"
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Save button */}
        <div className="shrink-0 px-5 pt-3 pb-8 border-t border-white/[0.06]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-purple-600 active:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-2xl py-3 text-sm transition-colors"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
