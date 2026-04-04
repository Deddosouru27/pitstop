import { useState, useEffect, useRef } from 'react'
import { Users, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAgents } from '../../hooks/useAgents'
import type { Agent, AgentStatus } from '../../hooks/useAgents'
import PipelineTab from './PipelineTab'

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}с назад`
  if (diff < 3600)  return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_CFG: Record<AgentStatus, { label: string; cls: string; dot: string }> = {
  idle:    { label: 'Свободен',  cls: 'bg-gray-700 text-gray-400',          dot: 'bg-gray-500' },
  working: { label: 'Работает',  cls: 'bg-green-900/60 text-green-400',     dot: 'bg-green-500 animate-pulse' },
  stuck:   { label: 'Застрял',   cls: 'bg-red-900/50 text-red-400',         dot: 'bg-red-500' },
  failed:  { label: 'Ошибка',    cls: 'bg-red-900/50 text-red-400',         dot: 'bg-red-500' },
  offline: { label: 'Офлайн',    cls: 'bg-slate-800 text-slate-600',        dot: 'bg-slate-600' },
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.offline
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Repo badge ─────────────────────────────────────────────────────────────────

const REPO_CFG: Record<string, string> = {
  pitstop:      'bg-purple-900/40 text-purple-400',
  'maos-intake': 'bg-blue-900/40 text-blue-400',
  'maos-runner': 'bg-green-900/40 text-green-400',
  chat:          'bg-cyan-900/40 text-cyan-400',
}

function RepoBadge({ repo }: { repo: string | null }) {
  if (!repo) return null
  const cls = REPO_CFG[repo] ?? 'bg-slate-800 text-slate-400'
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {repo}
    </span>
  )
}

// ── Agent events section ───────────────────────────────────────────────────────

interface AgentEvent {
  event_type: string
  details: Record<string, unknown> | null
  created_at: string
}

const EVENT_CFG: Record<string, { dot: string; text: string }> = {
  review_passed: { dot: 'bg-emerald-400', text: 'text-emerald-400' },
  review_failed: { dot: 'bg-red-400',     text: 'text-red-400'     },
  task_received: { dot: 'bg-blue-400',    text: 'text-blue-400'    },
}

function EventsSection({ agentId }: { agentId: string }) {
  const [open, setOpen]     = useState(false)
  const [events, setEvents] = useState<AgentEvent[] | null>(null)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (!open && events === null) {
      setLoading(true)
      const { data } = await supabase
        .from('agent_events')
        .select('event_type, details, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(5)
      setEvents((data ?? []) as AgentEvent[])
      setLoading(false)
    }
    setOpen(v => !v)
  }

  return (
    <div className="border-t border-white/[0.04] pt-2">
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full text-left"
      >
        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">
          Последние события
        </p>
        <span className="text-[10px] text-slate-600">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {loading ? (
            <p className="text-[11px] text-slate-600">Загрузка...</p>
          ) : !events || events.length === 0 ? (
            <p className="text-[11px] text-slate-600 italic">Нет событий</p>
          ) : events.map((ev, i) => {
            const cfg = EVENT_CFG[ev.event_type]
            return (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg?.dot ?? 'bg-slate-600'}`} />
                <span className={`flex-1 text-[11px] font-medium truncate ${cfg?.text ?? 'text-slate-500'}`}>
                  {ev.event_type.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-slate-700 shrink-0">{timeAgo(ev.created_at)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Agent card ─────────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: Agent }) {
  const heartbeat = agent.last_heartbeat ? timeAgo(agent.last_heartbeat) : '—'

  return (
    <div className={`bg-white/5 rounded-2xl border p-4 space-y-3 ${
      agent.status === 'failed' ? 'border-red-500/30' :
      agent.status === 'stuck'  ? 'border-red-500/20' :
      agent.status === 'working' ? 'border-green-500/20' :
      'border-white/[0.06]'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-100 leading-tight">{agent.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{agent.role}</p>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Repo */}
      <div className="flex items-center gap-2">
        <RepoBadge repo={agent.repo} />
      </div>

      {/* Capabilities */}
      {agent.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.map(cap => (
            <span
              key={cap}
              className="text-[10px] text-slate-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full"
            >
              {cap}
            </span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-white/[0.04]" />

      {/* Current task */}
      <div className="space-y-1">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Текущая задача</p>
        {agent.current_task_id != null ? (
          <p className="text-xs text-slate-300 leading-snug line-clamp-2">
            {agent.current_task_title ?? agent.current_task_id}
          </p>
        ) : (
          <p className="text-xs text-slate-600 italic">Свободен</p>
        )}
      </div>

      {/* Last heartbeat */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Heartbeat</p>
        <p className={`text-xs font-medium ${
          agent.last_heartbeat ? 'text-slate-400' : 'text-slate-700'
        }`}>
          {heartbeat}
        </p>
      </div>

      {/* Events */}
      <EventsSection agentId={agent.id} />
    </div>
  )
}

// ── Summary bar ────────────────────────────────────────────────────────────────

function SummaryBar({ agents }: { agents: Agent[] }) {
  const active = agents.filter(a => a.status === 'working').length
  const stuck  = agents.filter(a => a.status === 'stuck' || a.status === 'failed').length

  function agentWord(n: number) {
    if (n % 10 === 1 && n % 100 !== 11) return 'агент'
    if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'агента'
    return 'агентов'
  }

  return (
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <span>{agents.length} {agentWord(agents.length)}</span>
      <span className="text-slate-700">·</span>
      <span className={active > 0 ? 'text-green-400' : 'text-slate-600'}>
        {active} работают
      </span>
      <span className="text-slate-700">·</span>
      <span className={stuck > 0 ? 'text-red-400' : 'text-slate-600'}>
        {stuck} застряли
      </span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

type AutorunPhase = 'idle' | 'inserting' | 'pending' | 'processing' | 'completed' | 'failed'

type TabView = 'cards' | 'pipeline'

export default function AgentsPage() {
  const { agents, loading, refresh } = useAgents()
  const [tab, setTab]             = useState<TabView>('cards')
  const [phase, setPhase]         = useState<AutorunPhase>('idle')
  const [jobId, setJobId]         = useState<string | null>(null)
  const [jobError, setJobError]   = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Poll agent_jobs row until terminal state ──────────────────────────────
  useEffect(() => {
    if (!jobId || phase === 'idle' || phase === 'completed' || phase === 'failed') return

    const poll = async () => {
      const { data } = await supabase
        .from('agent_jobs')
        .select('status, result')
        .eq('id', jobId)
        .single()
      if (!data) return

      const s = data.status as string
      if (s === 'processing') {
        setPhase('processing')
      } else if (s === 'completed') {
        setPhase('completed')
        refresh()
        setTimeout(() => { setPhase('idle'); setJobId(null) }, 5000)
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      } else if (s === 'failed') {
        const result = data.result as Record<string, unknown> | null
        setJobError(String(result?.error ?? result?.message ?? 'Неизвестная ошибка'))
        setPhase('failed')
        setTimeout(() => { setPhase('idle'); setJobId(null); setJobError(null) }, 5000)
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      }
    }

    pollRef.current = setInterval(poll, 5_000)
    poll() // immediate first check
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartAutorun = async () => {
    setPhase('inserting')
    setJobError(null)

    const { data, error } = await supabase
      .from('agent_jobs')
      .insert({ type: 'autorun_start', payload: { project: 'MAOS' }, status: 'pending' })
      .select('id')
      .single()

    if (error || !data) {
      setJobError(error?.message ?? 'Не удалось создать задачу')
      setPhase('failed')
      setTimeout(() => { setPhase('idle'); setJobError(null) }, 4000)
      return
    }

    setJobId(data.id as string)
    setPhase('pending')
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const PHASE_CFG: Record<AutorunPhase, { label: string; cls: string }> = {
    idle:       { label: '🚀 Запустить Autorun',  cls: 'bg-purple-700/30 hover:bg-purple-700/50 text-purple-300 border-purple-600/30' },
    inserting:  { label: 'Отправка...',            cls: 'bg-slate-800 text-slate-400 border-slate-700/30' },
    pending:    { label: '⏳ Ожидание Runner...',  cls: 'bg-amber-900/30 text-amber-400 border-amber-700/30' },
    processing: { label: '🔄 Autorun работает...', cls: 'bg-blue-900/30 text-blue-400 border-blue-700/30' },
    completed:  { label: '✅ Autorun завершён',    cls: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/40' },
    failed:     { label: '❌ Ошибка',              cls: 'bg-red-900/40 text-red-400 border-red-700/30' },
  }
  const cfg = PHASE_CFG[phase]
  const btnDisabled = phase !== 'idle'

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-purple-400" strokeWidth={1.75} />
            <h1 className="text-2xl font-bold text-slate-100">Агенты</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors p-1"
            title="Обновить статусы"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        {!loading && <SummaryBar agents={agents} />}
        {/* Autorun trigger */}
        <button
          onClick={handleStartAutorun}
          disabled={btnDisabled}
          className={`w-full font-semibold rounded-xl py-3 text-sm transition-colors border ${cfg.cls} disabled:opacity-70`}
        >
          {cfg.label}
        </button>
        {jobError && (
          <p className="text-xs text-red-400 px-1">{jobError}</p>
        )}
        {/* Tab switcher */}
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
          {(['cards', 'pipeline'] as TabView[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t ? 'bg-white/10 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'cards' ? 'Карточки' : 'Pipeline'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 py-20 text-slate-500 text-sm">
          Загрузка...
        </div>
      ) : tab === 'pipeline' ? (
        <div className="px-4">
          <PipelineTab agents={agents} />
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-20 space-y-2">
          <p className="text-3xl">🤖</p>
          <p className="text-sm text-slate-500">Нет агентов</p>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
