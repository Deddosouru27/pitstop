import { useState, useMemo } from 'react'
import { Brain, Search, X } from 'lucide-react'
import { useAllSnapshots } from '../../hooks/useContextSnapshots'
import type { ContextSnapshot } from '../../hooks/useContextSnapshots'

// ── Type config ────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<string, { icon: string; label: string; cls: string }> = {
  ai_summary:        { icon: '🤖', label: 'AI Summary',   cls: 'bg-purple-900/50 text-purple-400' },
  task_completed:    { icon: '✅', label: 'Task Done',    cls: 'bg-emerald-900/50 text-emerald-400' },
  task_created:      { icon: '➕', label: 'Task Created', cls: 'bg-blue-900/50 text-blue-400' },
  idea_added:        { icon: '💡', label: 'Idea',         cls: 'bg-amber-900/50 text-amber-400' },
  idea_converted:    { icon: '🔄', label: 'Converted',    cls: 'bg-cyan-900/50 text-cyan-400' },
  priority_inferred: { icon: '🎯', label: 'Priority',     cls: 'bg-orange-900/50 text-orange-400' },
  feature_added:     { icon: '⭐', label: 'Feature',      cls: 'bg-yellow-900/50 text-yellow-400' },
  manual_note:       { icon: '📝', label: 'Note',         cls: 'bg-slate-800 text-slate-400' },
  agent_job:         { icon: '🤖', label: 'Agent Job',    cls: 'bg-purple-900/50 text-purple-400' },
  decision:          { icon: '🧭', label: 'Decision',     cls: 'bg-blue-900/50 text-blue-400' },
  lesson:            { icon: '📚', label: 'Lesson',       cls: 'bg-emerald-900/50 text-emerald-400' },
  system_rule:       { icon: '⚙️', label: 'Rule',         cls: 'bg-slate-700 text-slate-400' },
}

function typeCfg(type: string) {
  return TYPE_CFG[type] ?? { icon: '📌', label: type, cls: 'bg-slate-800 text-slate-400' }
}

// ── Content helpers ────────────────────────────────────────────────────────────

function getTitle(s: ContextSnapshot): string {
  const c = s.content as unknown as Record<string, unknown>
  switch (s.snapshot_type) {
    case 'ai_summary':        return 'AI Context Update'
    case 'task_completed':
    case 'task_created':      return String(c.title ?? s.snapshot_type)
    case 'idea_added':        return String(c.content ?? '').slice(0, 80)
    case 'idea_converted':    return String(c.taskTitle ?? '')
    case 'priority_inferred': return String(c.taskTitle ?? '')
    case 'feature_added':
    case 'manual_note':       return String(c.text ?? '').slice(0, 80)
    default: {
      const text = c.title ?? c.text ?? c.content ?? c.summary ?? c.description ?? c.name
      return text ? String(text).slice(0, 80) : s.snapshot_type
    }
  }
}

function getSubtitle(s: ContextSnapshot): string | null {
  const c = s.content as unknown as Record<string, unknown>
  switch (s.snapshot_type) {
    case 'ai_summary':        return String(c.what_done ?? '').slice(0, 120) || null
    case 'task_completed':
    case 'task_created':      return c.priority ? `Приоритет: ${c.priority}` : null
    case 'idea_converted':    return String(c.ideaContent ?? '').slice(0, 80) || null
    case 'priority_inferred': return `${c.inferredPriority} · ${String(c.reason ?? '').slice(0, 60)}`
    default: {
      // For unknown types, show remaining fields as compact text
      const known = new Set(['title', 'text', 'content', 'summary', 'description', 'name'])
      const extras = Object.entries(c)
        .filter(([k]) => !known.has(k))
        .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
        .slice(0, 3)
        .join(' · ')
      return extras || null
    }
  }
}

// ── Snapshot detail modal ──────────────────────────────────────────────────────

function SnapshotModal({ snap, onClose }: { snap: ContextSnapshot; onClose: () => void }) {
  const cfg = typeCfg(snap.snapshot_type)
  const c = snap.content as unknown as Record<string, unknown>

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[85dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${cfg.cls}`}>
            {cfg.icon} {cfg.label}
          </span>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
          <p className="text-slate-100 text-base font-semibold leading-snug">{getTitle(snap)}</p>

          {/* Render each content field */}
          <div className="space-y-2">
            {Object.entries(c).map(([key, val]) => {
              if (val == null || val === '') return null
              const str = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)
              return (
                <div key={key}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-0.5">{key}</p>
                  <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{str}</p>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-slate-600 border-t border-white/[0.06] pt-3">
            {new Date(snap.created_at).toLocaleString('ru-RU', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Snapshot card ──────────────────────────────────────────────────────────────

function SnapshotCard({ snap, onOpen }: { snap: ContextSnapshot; onOpen: (s: ContextSnapshot) => void }) {
  const cfg = typeCfg(snap.snapshot_type)
  const title = getTitle(snap)
  const subtitle = getSubtitle(snap)
  const dateStr = new Date(snap.created_at).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  return (
    <button
      onClick={() => onOpen(snap)}
      className="w-full text-left bg-white/5 rounded-2xl p-4 space-y-2 border border-white/[0.06] active:opacity-60 transition-opacity"
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-slate-100 text-sm font-medium leading-snug line-clamp-2">{title}</p>
        <span className="shrink-0 text-[10px] text-slate-600 mt-0.5 whitespace-nowrap">{dateStr}</span>
      </div>

      {subtitle && (
        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{subtitle}</p>
      )}

      <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
        {cfg.icon} {cfg.label}
      </span>
    </button>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MemoryViewer() {
  const { snapshots, loading, error } = useAllSnapshots()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ContextSnapshot | null>(null)

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of snapshots) {
      counts[s.snapshot_type] = (counts[s.snapshot_type] ?? 0) + 1
    }
    return counts
  }, [snapshots])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return snapshots.filter(s => {
      if (typeFilter !== 'all' && s.snapshot_type !== typeFilter) return false
      if (q) {
        const title = getTitle(s).toLowerCase()
        const sub = (getSubtitle(s) ?? '').toLowerCase()
        if (!title.includes(q) && !sub.includes(q)) return false
      }
      return true
    })
  }, [snapshots, typeFilter, search])

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm gap-2">
        <Brain size={28} strokeWidth={1.5} className="opacity-30" />
        <p>Не удалось загрузить снапшоты</p>
        <p className="text-xs text-slate-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="flex-1 text-2xl font-bold text-slate-100">Memory</h1>
          <span className="text-sm text-slate-500">{snapshots.length}</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по содержимому..."
            className="w-full bg-white/5 border border-white/[0.06] rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Type filter chips */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setTypeFilter('all')}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
            typeFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
          }`}
        >
          Все
        </button>
        {Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => {
            const cfg = typeCfg(type)
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  typeFilter === type ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
                }`}
              >
                {cfg.icon} {cfg.label} ({count})
              </button>
            )
          })}
      </div>

      {/* List */}
      <div className="px-4 space-y-2 flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center space-y-1">
            <p className="text-3xl">🧠</p>
            <p className="text-sm text-slate-500">
              {snapshots.length === 0 ? 'Память пуста' : 'Записей не найдено'}
            </p>
            <p className="text-xs text-slate-600">
              {snapshots.length === 0 ? 'Действия Пекаря будут сохраняться здесь' : 'Попробуй другой фильтр'}
            </p>
          </div>
        ) : (
          filtered.map(s => <SnapshotCard key={s.id} snap={s} onOpen={setSelected} />)
        )}
      </div>

      {selected && <SnapshotModal snap={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
