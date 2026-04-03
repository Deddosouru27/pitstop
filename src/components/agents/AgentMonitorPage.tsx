import { useState, useEffect, useCallback } from 'react'
import { Bot, RefreshCw, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActionLog {
  id: string
  agent: string | null
  action: string | null
  status: string | null
  details: Record<string, unknown> | null
  task_id: string | null
  created_at: string
}

interface IntakeEntry {
  id: string
  title: string | null
  source_url: string | null
  source_type: string | null
  knowledge_count: number | null
  created_at: string
}

interface UnifiedEntry {
  id: string
  kind: 'agent' | 'intake'
  agent: string | null
  action: string | null
  status: string | null
  details: Record<string, unknown> | null
  task_id: string | null
  task_title: string | null
  // intake-only
  source_url: string | null
  knowledge_count: number | null
  source_title: string | null
  source_type: string | null
  created_at: string
}

type FilterMode = 'all' | 'tasks' | 'intake' | 'heartbeat'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}с`
  if (diff < 3600)  return `${Math.floor(diff / 60)}м`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`
  return `${Math.floor(diff / 86400)}д`
}

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function agentLabel(agent: string | null): string {
  const a = (agent ?? '').toLowerCase()
  if (a.includes('autorun'))   return 'autorun'
  if (a.includes('heartbeat')) return 'heartbeat'
  if (a.includes('runner'))    return 'runner'
  if (a.includes('intake'))    return 'intake'
  return agent ?? '?'
}

function agentCls(agent: string | null): string {
  const a = (agent ?? '').toLowerCase()
  if (a.includes('autorun'))   return 'text-blue-400 bg-blue-900/40'
  if (a.includes('heartbeat')) return 'text-emerald-400 bg-emerald-900/40'
  if (a.includes('runner'))    return 'text-purple-400 bg-purple-900/40'
  if (a.includes('intake'))    return 'text-amber-400 bg-amber-900/40'
  return 'text-slate-400 bg-white/5'
}

function statusIcon(entry: UnifiedEntry): string {
  if (entry.kind === 'intake') return '📥'
  const s = (entry.status ?? '').toLowerCase()
  const a = (entry.action ?? '').toLowerCase()
  if (s.includes('error') || s.includes('fail') || a.includes('fail')) return '❌'
  if (s === 'reverted' || a.includes('revert')) return '↩️'
  if (s === 'ok' || s === 'success' || s === 'done' || s === 'complete' || a.includes('complete')) return '✅'
  if (a.includes('start')) return '🔵'
  if (a.includes('health') || a.includes('heartbeat')) return '💓'
  return '·'
}

function rowBorder(entry: UnifiedEntry): string {
  if (entry.kind === 'intake') return 'border-l-2 border-amber-500/40 bg-amber-900/5'
  const s = (entry.status ?? '').toLowerCase()
  const a = (entry.action ?? '').toLowerCase()
  if (s.includes('error') || s.includes('fail') || a.includes('fail')) return 'border-l-2 border-red-500/60 bg-red-900/10'
  if (s === 'reverted' || a.includes('revert')) return 'border-l-2 border-amber-500/60 bg-amber-900/10'
  if (s === 'ok' || s === 'success' || s === 'done' || s === 'complete' || a.includes('complete'))
    return 'border-l-2 border-emerald-500/40 bg-emerald-900/5'
  return 'border-l-2 border-white/5'
}

function entryMatchesFilter(entry: UnifiedEntry, filter: FilterMode): boolean {
  if (filter === 'all') return true
  if (filter === 'intake') return entry.kind === 'intake'
  const a = (entry.action ?? '').toLowerCase()
  const ag = (entry.agent ?? '').toLowerCase()
  if (filter === 'heartbeat') return ag.includes('heartbeat') || a.includes('health_check') || a.includes('heartbeat')
  if (filter === 'tasks') return a.includes('task_') || a.includes('session_')
  return true
}

function entryTitle(entry: UnifiedEntry): string {
  if (entry.kind === 'intake') {
    if (entry.source_title) return entry.source_title
    if (entry.source_url) {
      try { return new URL(entry.source_url).hostname.replace(/^www\./, '') } catch { return entry.source_url }
    }
    return 'Ingestion'
  }
  if (entry.task_title) return entry.task_title
  const d = entry.details ?? {}
  if (d.title) return String(d.title)
  return entry.action ?? '—'
}

// ── Details renderer ──────────────────────────────────────────────────────────

function EntryDetails({ entry }: { entry: UnifiedEntry }) {
  if (entry.kind === 'intake') {
    return (
      <div className="px-4 pb-3 space-y-1.5 border-t border-white/[0.04] pt-2">
        {entry.source_url && (
          <p className="text-[11px] text-slate-400 break-all">
            <span className="text-slate-600">URL: </span>{entry.source_url}
          </p>
        )}
        {entry.source_type && (
          <p className="text-[11px] text-slate-400">
            <span className="text-slate-600">Тип: </span>{entry.source_type}
          </p>
        )}
        {entry.knowledge_count != null && (
          <p className="text-[11px] text-slate-400">
            <span className="text-slate-600">Знания: </span>
            <span className="text-emerald-400 font-semibold">{entry.knowledge_count}</span>
          </p>
        )}
      </div>
    )
  }

  const d = entry.details ?? {}
  const a = (entry.action ?? '').toLowerCase()

  if (Object.keys(d).length === 0) {
    return (
      <div className="px-4 pb-3 border-t border-white/[0.04] pt-2">
        <p className="text-[11px] text-slate-600 italic">details отсутствуют</p>
      </div>
    )
  }

  const isFail = a.includes('fail') || (entry.status ?? '').toLowerCase().includes('fail')

  // task_fail: show error + tester prominently
  if (isFail) {
    return (
      <div className="px-4 pb-3 space-y-2 border-t border-red-900/30 pt-2">
        {entry.task_title && (
          <p className="text-[11px] text-slate-400">
            <span className="text-slate-600">Задача: </span>{entry.task_title}
          </p>
        )}
        {d.error != null && (
          <pre className="text-[11px] text-red-400 bg-red-900/15 border border-red-900/40 rounded-lg px-3 py-2 whitespace-pre-wrap overflow-x-auto max-h-40 font-mono leading-relaxed">
            {String(d.error)}
          </pre>
        )}
        {d.tester != null && (
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Tester output</p>
            <pre className="text-[11px] text-slate-400 bg-white/5 rounded-lg px-3 py-2 whitespace-pre-wrap overflow-x-auto max-h-40 font-mono leading-relaxed">
              {typeof d.tester === 'string' ? d.tester : JSON.stringify(d.tester, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  // session_end: summarise stats
  if (a === 'session_end') {
    return (
      <div className="px-4 pb-3 space-y-1 border-t border-white/[0.04] pt-2">
        {d.completed != null && (
          <p className="text-[11px] text-emerald-400">
            ✅ Выполнено: <span className="font-semibold">{String(d.completed)}</span>
          </p>
        )}
        {d.failed != null && (
          <p className="text-[11px] text-red-400">
            ❌ Ошибки: <span className="font-semibold">{String(d.failed)}</span>
          </p>
        )}
        {d.commits != null && (
          <p className="text-[11px] text-slate-400">
            📦 Коммитов: {String(d.commits)}
          </p>
        )}
        {d.backupBranch != null && (
          <p className="text-[11px] text-slate-500 font-mono">backup: {String(d.backupBranch)}</p>
        )}
      </div>
    )
  }

  // session_start: show plan
  if (a === 'session_start') {
    return (
      <div className="px-4 pb-3 space-y-1 border-t border-white/[0.04] pt-2">
        {d.project != null && <p className="text-[11px] text-slate-300">📁 {String(d.project)}</p>}
        {d.tasks != null && (
          <p className="text-[11px] text-slate-400">
            Задач в сессии: <span className="text-slate-200 font-semibold">{String(d.tasks)}</span>
            {d.maxTasks ? ` / ${String(d.maxTasks)}` : ''}
          </p>
        )}
        {d.backupBranch != null && (
          <p className="text-[11px] text-slate-500 font-mono">backup: {String(d.backupBranch)}</p>
        )}
      </div>
    )
  }

  // task_start / task_completed: show task info + commits
  if (a === 'task_start' || a === 'task_completed') {
    return (
      <div className="px-4 pb-3 space-y-1.5 border-t border-white/[0.04] pt-2">
        {(entry.task_title != null || d.title != null) && (
          <p className="text-[11px] text-slate-200 font-medium">
            {entry.task_title ?? String(d.title)}
          </p>
        )}
        {d.description != null && (
          <p className="text-[11px] text-slate-500 line-clamp-3">{String(d.description)}</p>
        )}
        {d.commits != null && (
          <p className="text-[11px] text-slate-400">📦 commits: {String(d.commits)}</p>
        )}
        {d.tester != null && (
          <pre className="text-[11px] text-slate-400 bg-white/5 rounded-lg px-3 py-2 whitespace-pre-wrap overflow-x-auto max-h-32 font-mono leading-relaxed">
            {typeof d.tester === 'string' ? d.tester : JSON.stringify(d.tester, null, 2)}
          </pre>
        )}
      </div>
    )
  }

  // health_check
  if (a.includes('health_check')) {
    return (
      <div className="px-4 pb-3 space-y-1 border-t border-white/[0.04] pt-2">
        {d.pending != null && (
          <p className="text-[11px] text-slate-400">⏳ pending: {String(d.pending)}</p>
        )}
        {d.knowledge_count != null && (
          <p className="text-[11px] text-slate-400">🧠 knowledge: {String(d.knowledge_count)}</p>
        )}
        {d.entity_count != null && (
          <p className="text-[11px] text-slate-400">🕸 entities: {String(d.entity_count)}</p>
        )}
      </div>
    )
  }

  // Default: raw JSON
  return (
    <div className="px-4 pb-3 border-t border-white/[0.04] pt-2">
      <pre className="text-[11px] text-slate-300 bg-white/5 rounded-xl px-3 py-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-48">
        {JSON.stringify(d, null, 2)}
      </pre>
    </div>
  )
}

// ── Log card ──────────────────────────────────────────────────────────────────

function LogCard({ entry, index }: { entry: UnifiedEntry; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const isFail = entry.kind === 'agent' && (
    (entry.status ?? '').toLowerCase().includes('fail') ||
    (entry.status ?? '').toLowerCase().includes('error') ||
    (entry.action ?? '').toLowerCase().includes('fail')
  )

  return (
    <div className={`${rowBorder(entry)} ${index > 0 ? 'border-t border-white/[0.04]' : ''}`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:bg-white/5 transition-colors"
      >
        <span className="text-sm shrink-0">{statusIcon(entry)}</span>
        <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${agentCls(entry.agent)}`}>
          {agentLabel(entry.agent)}
        </span>
        <p className={`flex-1 text-xs truncate ${isFail ? 'text-red-300' : 'text-slate-300'}`}>
          {entryTitle(entry)}
        </p>
        <span className="shrink-0 text-[10px] text-slate-600 font-mono">{fmt(entry.created_at)}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && <EntryDetails entry={entry} />}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentMonitorPage() {
  const [entries, setEntries] = useState<UnifiedEntry[]>([])
  const [lastAutorun, setLastAutorun] = useState<ActionLog | null>(null)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [filter, setFilter] = useState<FilterMode>('all')

  const load = useCallback(async () => {
    const [autorunRes, logsRes, intakeRes, pendingRes] = await Promise.all([
      supabase
        .from('agent_action_log')
        .select('id, agent, action, status, details, task_id, created_at')
        .eq('agent', 'autorun')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('agent_action_log')
        .select('id, agent, action, status, details, task_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('ingested_content')
        .select('id, title, source_url, source_type, knowledge_count, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'todo')
        .ilike('description', '%AUTORUN%'),
    ])

    const logs = (logsRes.data ?? []) as ActionLog[]

    // Batch fetch task titles for known task_ids
    const taskIds = [...new Set(logs.map(l => l.task_id).filter(Boolean))] as string[]
    const taskTitleMap = new Map<string, string>()
    if (taskIds.length > 0) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title')
        .in('id', taskIds)
      for (const t of tasks ?? []) taskTitleMap.set(t.id, t.title)
    }

    const agentEntries: UnifiedEntry[] = logs.map(l => ({
      id: `agent-${l.id}`,
      kind: 'agent',
      agent: l.agent,
      action: l.action,
      status: l.status,
      details: l.details,
      task_id: l.task_id,
      task_title: l.task_id ? (taskTitleMap.get(l.task_id) ?? null) : null,
      source_url: null,
      knowledge_count: null,
      source_title: null,
      source_type: null,
      created_at: l.created_at,
    }))

    const intakeEntries: UnifiedEntry[] = ((intakeRes.data ?? []) as IntakeEntry[]).map(i => ({
      id: `intake-${i.id}`,
      kind: 'intake',
      agent: 'intake',
      action: 'ingestion',
      status: 'ok',
      details: null,
      task_id: null,
      task_title: null,
      source_url: i.source_url,
      knowledge_count: i.knowledge_count,
      source_title: i.title,
      source_type: i.source_type,
      created_at: i.created_at,
    }))

    const merged = [...agentEntries, ...intakeEntries]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setLastAutorun((autorunRes.data?.[0] as ActionLog) ?? null)
    setEntries(merged)
    setPendingCount(pendingRes.count ?? 0)
    setLoading(false)
    setLastRefresh(Date.now())
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  const autorunRunning = lastAutorun?.action?.toLowerCase().includes('session_start') ||
    (lastAutorun && (Date.now() - new Date(lastAutorun.created_at).getTime()) < 5 * 60 * 1000 &&
      !lastAutorun.action?.toLowerCase().includes('session_end'))

  const filtered = entries.filter(e => entryMatchesFilter(e, filter))

  const FILTERS: { key: FilterMode; label: string }[] = [
    { key: 'all',       label: 'Все' },
    { key: 'tasks',     label: 'Задачи' },
    { key: 'intake',    label: 'Intake' },
    { key: 'heartbeat', label: 'Heartbeat' },
  ]

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-purple-400 shrink-0" strokeWidth={1.75} />
          <h1 className="flex-1 text-2xl font-bold text-slate-100">Agent Monitor</h1>
          <button
            onClick={load}
            disabled={loading}
            className="text-slate-500 active:text-slate-300 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-[11px] text-slate-600 mt-0.5">
          {timeAgo(new Date(lastRefresh).toISOString())} назад · auto 30с
        </p>
      </div>

      <div className="px-4 space-y-3">
        {/* Autorun status card */}
        <div className="bg-white/5 rounded-2xl border border-white/[0.06] px-4 py-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${autorunRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <p className="text-sm font-semibold text-slate-200">
              Autorun:{' '}
              <span className={autorunRunning ? 'text-emerald-400' : 'text-slate-500'}>
                {autorunRunning ? '🟢 RUNNING' : '⚪ IDLE'}
              </span>
            </p>
            {pendingCount > 0 && (
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400">
                {pendingCount} pending
              </span>
            )}
          </div>
          {lastAutorun && (
            <p className="text-xs text-slate-500 pl-4">
              {lastAutorun.action}
              {' · '}{new Date(lastAutorun.created_at).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                filter === f.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-slate-400 active:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Log list */}
        {loading && (
          <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
            Загрузка...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 space-y-2 text-center">
            <p className="text-3xl">🤖</p>
            <p className="text-sm text-slate-500">Логов нет</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-white/[0.06]">
            {filtered.map((entry, i) => (
              <LogCard key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
