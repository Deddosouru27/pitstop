import { useState, useRef } from 'react'
import { Brain, Search, X } from 'lucide-react'
import { useSnapshotsBrowse } from '../../hooks/useSnapshotsBrowse'
import type { BrowseSnapshot } from '../../hooks/useSnapshotsBrowse'

// ── Type config ────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<string, { icon: string; label: string; cls: string }> = {
  // Legacy types
  ai_summary:             { icon: '🤖', label: 'AI Summary',    cls: 'bg-purple-900/50 text-purple-400' },
  task_completed:         { icon: '✅', label: 'Task Done',     cls: 'bg-emerald-900/50 text-emerald-400' },
  task_created:           { icon: '➕', label: 'Task Created',  cls: 'bg-blue-900/50 text-blue-400' },
  idea_added:             { icon: '💡', label: 'Idea',          cls: 'bg-amber-900/50 text-amber-400' },
  idea_converted:         { icon: '🔄', label: 'Converted',     cls: 'bg-cyan-900/50 text-cyan-400' },
  priority_inferred:      { icon: '🎯', label: 'Priority',      cls: 'bg-orange-900/50 text-orange-400' },
  feature_added:          { icon: '⭐', label: 'Feature',       cls: 'bg-yellow-900/50 text-yellow-400' },
  manual_note:            { icon: '📝', label: 'Note',          cls: 'bg-slate-800 text-slate-400' },
  // Current types
  job_outcome:            { icon: '⚙️', label: 'Job',           cls: 'bg-indigo-900/50 text-indigo-400' },
  session_log:            { icon: '🖥', label: 'Session',       cls: 'bg-violet-900/50 text-violet-400' },
  decision_log:           { icon: '🧭', label: 'Решение',       cls: 'bg-blue-900/50 text-blue-400' },
  system_rule:            { icon: '⚙️', label: 'Правило',       cls: 'bg-slate-700 text-slate-300' },
  intake_processing_log:  { icon: '📥', label: 'Intake',        cls: 'bg-sky-900/50 text-sky-400' },
  calibration_data:       { icon: '📐', label: 'Calibration',   cls: 'bg-teal-900/50 text-teal-400' },
}

function typeCfg(type: string) {
  return TYPE_CFG[type] ?? { icon: '📌', label: type, cls: 'bg-slate-800 text-slate-400' }
}

// ── Content helpers ────────────────────────────────────────────────────────────

function getTitle(s: BrowseSnapshot): string {
  const c = s.content
  switch (s.snapshot_type) {
    case 'ai_summary':
      return String(c.what_done ?? 'AI Context Update').slice(0, 100)
    case 'task_completed':
    case 'task_created':
      return String(c.title ?? s.snapshot_type)
    case 'idea_added':
      return String(c.content ?? '').slice(0, 80)
    case 'idea_converted':
      return String(c.taskTitle ?? '')
    case 'priority_inferred':
      return String(c.taskTitle ?? '')
    case 'feature_added':
    case 'manual_note':
      return String(c.text ?? '').slice(0, 80)
    case 'job_outcome':
      return String(c.task_title ?? c.action ?? c.title ?? c.summary ?? 'Job').slice(0, 100)
    case 'session_log':
      return String(c.summary ?? c.session_id ?? 'Session log').slice(0, 100)
    case 'decision_log':
      return String(c.decision ?? c.title ?? c.what ?? 'Decision').slice(0, 100)
    case 'system_rule':
      return String(c.rule ?? c.title ?? c.name ?? 'System rule').slice(0, 100)
    case 'intake_processing_log':
      return String(c.source_url ?? c.url ?? c.title ?? 'Intake').slice(0, 100)
    case 'calibration_data':
      return String(c.topic ?? c.title ?? 'Calibration').slice(0, 100)
    default: {
      const first = c.title ?? c.text ?? c.content ?? c.summary ?? c.description ?? c.name ?? c.what_done
      return first ? String(first).slice(0, 80) : s.snapshot_type
    }
  }
}

function getSubtitle(s: BrowseSnapshot): string | null {
  const c = s.content
  switch (s.snapshot_type) {
    case 'ai_summary':
      return String(c.where_stopped ?? '').slice(0, 120) || null
    case 'task_completed':
    case 'task_created':
      return c.priority ? `Приоритет: ${c.priority}` : null
    case 'idea_converted':
      return String(c.ideaContent ?? '').slice(0, 80) || null
    case 'priority_inferred':
      return `${c.inferredPriority} · ${String(c.reason ?? '').slice(0, 60)}`
    case 'job_outcome': {
      const parts: string[] = []
      if (c.status)    parts.push(String(c.status))
      if (c.result)    parts.push(String(c.result).slice(0, 60))
      if (c.duration)  parts.push(`${c.duration}с`)
      return parts.join(' · ') || null
    }
    case 'session_log': {
      const parts: string[] = []
      if (c.actions_count != null) parts.push(`${c.actions_count} действий`)
      if (c.duration)              parts.push(String(c.duration))
      return parts.join(' · ') || null
    }
    case 'decision_log':
      return String(c.context ?? c.reason ?? c.rationale ?? '').slice(0, 100) || null
    case 'system_rule':
      return String(c.description ?? c.reason ?? '').slice(0, 100) || null
    case 'intake_processing_log': {
      const k = c.knowledge_count ?? c.items_count ?? c.count
      return k != null ? `${k} знаний` : null
    }
    default: {
      const known = new Set(['title', 'text', 'content', 'summary', 'description', 'name', 'what_done'])
      const extras = Object.entries(c)
        .filter(([k]) => !known.has(k))
        .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
        .slice(0, 2)
        .join(' · ')
      return extras || null
    }
  }
}

// ── Snapshot detail modal ──────────────────────────────────────────────────────

function SnapshotModal({ snap, onClose }: { snap: BrowseSnapshot; onClose: () => void }) {
  const cfg = typeCfg(snap.snapshot_type)

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
          <div className="space-y-2">
            {Object.entries(snap.content).map(([key, val]) => {
              if (val == null || val === '') return null
              const str = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)
              return (
                <div key={key}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-0.5">{key}</p>
                  <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap break-words">{str}</p>
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

function SnapshotCard({ snap, onOpen }: { snap: BrowseSnapshot; onOpen: (s: BrowseSnapshot) => void }) {
  const cfg      = typeCfg(snap.snapshot_type)
  const title    = getTitle(snap)
  const subtitle = getSubtitle(snap)
  const dateStr  = new Date(snap.created_at).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  return (
    <button
      onClick={() => onOpen(snap)}
      className="w-full text-left bg-white/[0.04] rounded-2xl p-3.5 space-y-2 border border-white/[0.06] active:opacity-60 transition-opacity"
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-slate-100 text-sm font-medium leading-snug line-clamp-2">{title}</p>
        <span className="shrink-0 text-[10px] text-slate-600 mt-0.5 whitespace-nowrap">{dateStr}</span>
      </div>
      {subtitle && (
        <p className="text-slate-500 text-xs leading-relaxed line-clamp-1">{subtitle}</p>
      )}
      <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
        {cfg.icon} {cfg.label}
      </span>
    </button>
  )
}

// ── Tab definitions ────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',          label: 'Все'      },
  { key: 'job_outcome',  label: '⚙️ Jobs'  },
  { key: 'decision_log', label: '🧭 Решения' },
  { key: 'system_rule',  label: '📋 Правила' },
]

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MemoryViewer() {
  const [tab, setTab]         = useState('all')
  const [inputVal, setInputVal] = useState('')
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState<BrowseSnapshot | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { items, loading, loadingMore, hasMore, total, loadMore } = useSnapshotsBrowse({
    type: tab,
    search,
  })

  function handleSearchChange(val: string) {
    setInputVal(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(val), 500)
  }

  function clearSearch() {
    setInputVal('')
    setSearch('')
  }

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="flex-1 text-2xl font-bold text-slate-100">Memory</h1>
          {total != null && (
            <span className="text-sm text-slate-500">{total} записей</span>
          )}
        </div>
        <p className="text-xs text-slate-600 mt-0.5">context_snapshots · Pitstop DB</p>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={inputVal}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Поиск по содержимому..."
            className="w-full bg-white/5 border border-white/[0.06] rounded-xl pl-8 pr-9 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-purple-500/50 transition-colors"
          />
          {inputVal && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 active:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Type tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                tab === t.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 border border-white/[0.06] text-slate-400 active:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 flex-1 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
            Загрузка...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center space-y-2">
            <Brain size={32} strokeWidth={1.25} className="text-slate-700" />
            <p className="text-sm text-slate-500">
              {search ? 'Ничего не найдено' : 'Записей нет'}
            </p>
            {search && (
              <p className="text-xs text-slate-600">Попробуй другой запрос</p>
            )}
          </div>
        ) : (
          <>
            {items.map(s => (
              <SnapshotCard key={s.id} snap={s} onOpen={setSelected} />
            ))}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 text-sm text-slate-400 bg-white/5 rounded-2xl border border-white/[0.06] active:opacity-70 transition-opacity disabled:opacity-40"
              >
                {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
              </button>
            )}
          </>
        )}
      </div>

      {selected && <SnapshotModal snap={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
