import { useState } from 'react'
import { X } from 'lucide-react'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#7c3aed', '#a855f7', '#ec4899',
  '#64748b', '#f1f5f9',
]

interface Props {
  onClose: () => void
  onCreate: (input: { name: string; color: string; github_repo?: string | null; deploy_url?: string | null }) => Promise<void>
}

export default function CreateProjectModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#7c3aed')
  const [githubRepo, setGithubRepo] = useState('')
  const [deployUrl, setDeployUrl] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onCreate({
      name: name.trim(),
      color,
      github_repo: githubRepo.trim() || null,
      deploy_url: deployUrl.trim() || null,
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
          <h2 className="text-base font-semibold">New Project</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            type="text"
            placeholder="Название проекта"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
          />

          <div className="space-y-1">
            <input
              type="text"
              placeholder="Deddosouru27/pitstop"
              value={githubRepo}
              onChange={e => setGithubRepo(e.target.value)}
              className="w-full bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-[11px] text-slate-600 px-1">
              Используется для autorun — агент будет коммитить в этот репо
            </p>
          </div>

          <div className="space-y-1">
            <input
              type="text"
              placeholder="pitstop-dusky.vercel.app"
              value={deployUrl}
              onChange={e => setDeployUrl(e.target.value)}
              className="w-full bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-[11px] text-slate-600 px-1">
              URL где задеплоен проект
            </p>
          </div>

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
                    outline: color === c ? `2px solid white` : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            Create Project
          </button>
        </form>
      </div>
    </div>
  )
}
