import { useState, useEffect, useRef, useCallback } from 'react'
import { Users, RefreshCw, Play, Square, Pause } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAgents } from '../../hooks/useAgents'
import type { Agent, AgentStatus } from '../../hooks/useAgents'
import PipelineTab from './PipelineTab'
import type { Task } from '../../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}с назад`
  if (diff < 3600)  return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

// ── Status badge ───────────────────────────────────────────────────────────────



// ── Repo badge ─────────────────────────────────────────────────────────────────

const REPO_CFG: Record<string, string> = {
  pitstop:       'bg-purple-900/40 text-purple-400',
  'maos-intake': 'bg-blue-900/40 text-blue-400',
  'maos-runner': 'bg-green-900/40 text-green-400',
  chat:          'bg-cyan-900/40 text-cyan-400',
}

function RepoBadge({ repo }: { repo: string | null }) {
  if (!repo) return null
  const cls = REPO_CFG[repo] ?? 'bg-slate-800 text-slate-400'
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{repo}</span>
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
  task_completed:{ dot: 'bg-emerald-500', text: 'text-emerald-300' },
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
        .limit(10)
      setEvents((data ?? []) as AgentEvent[])
      setLoading(false)
    }
    setOpen(v => !v)
  }

  return (
    <div className="border-t border-white/[0.04] pt-2">
      <button onClick={toggle} className="flex items-center justify-between w-full text-left">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Последние события</p>
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

// ── Agent stats section (lazy-loaded) ─────────────────────────────────────────

interface AgentStats {
  done: number
  reviewPassed: number
  reviewFailed: number
}

function AgentStatsSection({ agentId }: { agentId: string }) {
  const [open, setOpen]       = useState(false)
  const [stats, setStats]     = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (!open && stats === null) {
      setLoading(true)
      const { data } = await supabase
        .from('agent_events')
        .select('event_type')
        .eq('agent_id', agentId)
        .in('event_type', ['task_completed', 'review_passed', 'review_failed'])
      const rows = (data ?? []) as { event_type: string }[]
      setStats({
        done:          rows.filter(r => r.event_type === 'task_completed').length,
        reviewPassed:  rows.filter(r => r.event_type === 'review_passed').length,
        reviewFailed:  rows.filter(r => r.event_type === 'review_failed').length,
      })
      setLoading(false)
    }
    setOpen(v => !v)
  }

  const passRate = stats
    ? stats.reviewPassed + stats.reviewFailed > 0
      ? Math.round(stats.reviewPassed / (stats.reviewPassed + stats.reviewFailed) * 100)
      : null
    : null

  return (
    <div className="border-t border-white/[0.04] pt-2">
      <button onClick={toggle} className="flex items-center justify-between w-full text-left">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Статистика</p>
        <span className="text-[10px] text-slate-600">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-2">
          {loading ? (
            <p className="text-[11px] text-slate-600">Загрузка...</p>
          ) : stats ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-sm font-bold text-emerald-400">{stats.done}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">выполнено</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-300">
                  {passRate !== null ? `${passRate}%` : '—'}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">review pass</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-red-400">{stats.reviewFailed}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">review fail</p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ── Agent card — virtual office character ─────────────────────────────────────

const ROLE_AVATAR: Record<string, string> = {
  frontend:  '🍞',
  baker:     '🍞',
  пекарь:    '🍞',
  intake:    '📬',
  intaker:   '📬',
  runner:    '💻',
  developer: '💻',
  dev:       '💻',
  ai:        '🤖',
  opus:      '🧠',
  sonnet:    '✨',
  haiku:     '🌸',
  analyst:   '📊',
  tester:    '🔬',
  manager:   '📋',
  artur:     '👤',
}

function agentAvatar(name: string, role: string): string {
  const needle = (name + ' ' + role).toLowerCase()
  for (const [key, emoji] of Object.entries(ROLE_AVATAR)) {
    if (needle.includes(key)) return emoji
  }
  return '🤖'
}

const OFFICE_STATUS: Record<AgentStatus, {
  ring: string
  glow: string
  bg: string
  border: string
  badge: string
  badgeDot: string
  desc: string
}> = {
  working: {
    ring:   'ring-2 ring-emerald-500/60',
    glow:   'shadow-[0_0_20px_rgba(52,211,153,0.25)]',
    bg:     'bg-[#0f1f17]',
    border: 'border-emerald-500/30',
    badge:  'bg-emerald-900/60 text-emerald-400',
    badgeDot: 'bg-emerald-400 animate-pulse',
    desc:   'Работает',
  },
  idle: {
    ring:   '',
    glow:   '',
    bg:     'bg-white/[0.04]',
    border: 'border-white/[0.07]',
    badge:  'bg-slate-800/80 text-slate-400',
    badgeDot: 'bg-slate-500',
    desc:   'Ожидает',
  },
  stuck: {
    ring:   'ring-1 ring-amber-500/40',
    glow:   '',
    bg:     'bg-[#1f1800]',
    border: 'border-amber-600/25',
    badge:  'bg-amber-900/50 text-amber-400',
    badgeDot: 'bg-amber-400',
    desc:   'Застрял',
  },
  failed: {
    ring:   'ring-1 ring-red-500/50',
    glow:   '',
    bg:     'bg-[#1f0a0a]',
    border: 'border-red-500/30',
    badge:  'bg-red-900/50 text-red-400',
    badgeDot: 'bg-red-400 animate-pulse',
    desc:   'Ошибка',
  },
  offline: {
    ring:   '',
    glow:   '',
    bg:     'bg-white/[0.02]',
    border: 'border-white/[0.04]',
    badge:  'bg-slate-900 text-slate-600',
    badgeDot: 'bg-slate-700',
    desc:   'Офлайн',
  },
}

function AgentCard({ agent }: { agent: Agent }) {
  const heartbeat = agent.last_heartbeat ? timeAgo(agent.last_heartbeat) : null
  const avatar    = agentAvatar(agent.name, agent.role)
  const cfg       = OFFICE_STATUS[agent.status] ?? OFFICE_STATUS.offline

  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all ${cfg.bg} ${cfg.border} ${cfg.ring} ${cfg.glow}`}>

      {/* Character header */}
      <div className="flex items-center gap-3">
        {/* Avatar circle */}
        <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
          agent.status === 'working' ? 'bg-emerald-900/40' :
          agent.status === 'failed'  ? 'bg-red-900/30'     :
          agent.status === 'stuck'   ? 'bg-amber-900/30'   :
          agent.status === 'offline' ? 'bg-slate-900/60'   :
          'bg-white/[0.06]'
        }`}>
          <span className={agent.status === 'offline' ? 'opacity-40 grayscale' : ''}>{avatar}</span>
          {/* Status indicator dot */}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0d1a] ${cfg.badgeDot}`} />
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold leading-tight truncate ${agent.status === 'offline' ? 'text-slate-600' : 'text-slate-100'}`}>
            {agent.name}
          </p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">{agent.role}</p>
          {agent.repo && <RepoBadge repo={agent.repo} />}
        </div>

        {/* Status badge */}
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${cfg.badge}`}>
          {cfg.desc}
        </span>
      </div>

      {/* Current task — most prominent for "working" state */}
      <div className={`rounded-xl px-3 py-2.5 space-y-0.5 ${
        agent.current_task_id
          ? agent.status === 'working'
            ? 'bg-emerald-900/20 border border-emerald-700/20'
            : 'bg-white/[0.04] border border-white/[0.06]'
          : 'bg-white/[0.02] border border-white/[0.04]'
      }`}>
        <p className="text-[9px] text-slate-600 uppercase tracking-wider font-medium">
          {agent.status === 'working' ? '⚡ Выполняет' : 'Задача'}
        </p>
        {agent.current_task_id != null ? (
          <p className={`text-xs leading-snug line-clamp-2 ${agent.status === 'working' ? 'text-emerald-300 font-medium' : 'text-slate-300'}`}>
            {agent.current_task_title ?? agent.current_task_id}
          </p>
        ) : (
          <p className="text-xs text-slate-600 italic">
            {agent.status === 'offline' ? 'Недоступен' : 'Свободен'}
          </p>
        )}
      </div>

      {/* Capabilities (compact) */}
      {agent.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.slice(0, 4).map(cap => (
            <span key={cap} className="text-[10px] text-slate-600 bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-full">
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 4 && (
            <span className="text-[10px] text-slate-700 px-1.5 py-0.5">+{agent.capabilities.length - 4}</span>
          )}
        </div>
      )}

      {/* Heartbeat */}
      <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
        <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">Heartbeat</p>
        <p className={`text-[11px] font-medium ${heartbeat ? 'text-slate-500' : 'text-slate-700'}`}>
          {heartbeat ?? '—'}
        </p>
      </div>

      <AgentStatsSection agentId={agent.id} />
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
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'агента'
    return 'агентов'
  }

  return (
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <span>{agents.length} {agentWord(agents.length)}</span>
      <span className="text-slate-700">·</span>
      <span className={active > 0 ? 'text-green-400' : 'text-slate-600'}>{active} работают</span>
      <span className="text-slate-700">·</span>
      <span className={stuck > 0 ? 'text-red-400' : 'text-slate-600'}>{stuck} застряли</span>
    </div>
  )
}

// ── Autorun Control Panel ──────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1, none: 0 }

function AutorunPanel() {
  const [queue, setQueue]       = useState<Task[]>([])
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState<string | null>(null) // 'stop' | 'pause'
  const [lastAction, setLastAction] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchQueue = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, status, priority, assignee, phase_number, work_type, context_readiness')
      .eq('status', 'todo')
      .eq('context_readiness', 'agent_ready')
      .order('created_at', { ascending: true })
      .limit(30)
    if (data) {
      const sorted = [...(data as Task[])].sort(
        (a, b) => (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0)
      )
      setQueue(sorted)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchQueue()
    intervalRef.current = setInterval(fetchQueue, 10_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchQueue])

  const sendCommand = async (type: 'autorun_stop' | 'autorun_pause') => {
    setSending(type === 'autorun_stop' ? 'stop' : 'pause')
    const { error } = await supabase
      .from('agent_jobs')
      .insert({ type, payload: {}, status: 'pending' })
    setSending(null)
    if (!error) {
      setLastAction(type === 'autorun_stop' ? 'Команда Stop отправлена' : 'Команда Pause отправлена')
      setTimeout(() => setLastAction(null), 4000)
    }
  }

  const PRIORITY_DOT: Record<string, string> = {
    high:   'bg-red-500',
    medium: 'bg-amber-500',
    low:    'bg-emerald-500',
    none:   'bg-slate-600',
  }

  const ASSIGNEE_ICON: Record<string, string> = {
    autorun: '🤖', pekar: '🍞', intaker: '🔧', nout: '🖥️', opus: '🧠', sonnet: '✨', artur: '👤',
  }

  return (
    <div className="px-4 space-y-4 pb-8">
      {/* Control buttons */}
      <div className="bg-white/5 rounded-2xl border border-white/[0.06] p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🎛 Управление Autorun</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => sendCommand('autorun_stop')}
            disabled={sending !== null}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm border bg-red-900/20 text-red-400 border-red-700/30 hover:bg-red-900/30 disabled:opacity-50 transition-colors"
          >
            <Square size={14} />
            {sending === 'stop' ? 'Отправка...' : 'Stop'}
          </button>
          <button
            onClick={() => sendCommand('autorun_pause')}
            disabled={sending !== null}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm border bg-amber-900/20 text-amber-400 border-amber-700/30 hover:bg-amber-900/30 disabled:opacity-50 transition-colors"
          >
            <Pause size={14} />
            {sending === 'pause' ? 'Отправка...' : 'Pause'}
          </button>
        </div>
        {lastAction && (
          <p className="text-xs text-emerald-400 text-center">✅ {lastAction}</p>
        )}
        <p className="text-[10px] text-slate-600 text-center">
          Команды отправляются через agent_jobs. Бот проверяет очередь при следующем цикле.
        </p>
      </div>

      {/* Task queue */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            📋 Очередь задач
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-600">{queue.length} задач</span>
            <button
              onClick={fetchQueue}
              className="text-slate-600 hover:text-slate-400 transition-colors"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600 text-center py-6">Загрузка...</p>
        ) : queue.length === 0 ? (
          <div className="bg-white/[0.03] rounded-2xl border border-white/[0.05] px-4 py-8 text-center">
            <p className="text-sm text-slate-600">Очередь пуста</p>
            <p className="text-xs text-slate-700 mt-1">Задач со статусом todo + agent_ready нет</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {queue.map((task, i) => (
              <div key={task.id} className="flex items-center gap-3 bg-white/[0.03] rounded-xl border border-white/[0.05] px-3 py-2.5">
                <span className="text-[10px] text-slate-700 font-mono w-4 shrink-0">{i + 1}</span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-slate-600'}`} />
                <p className="flex-1 text-xs text-slate-300 line-clamp-1">{task.title}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {task.assignee && ASSIGNEE_ICON[task.assignee] && (
                    <span className="text-xs">{ASSIGNEE_ICON[task.assignee]}</span>
                  )}
                  {task.phase_number != null && (
                    <span className="text-[9px] text-slate-700">P{task.phase_number}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

type AutorunPhase = 'idle' | 'inserting' | 'pending' | 'processing' | 'completed' | 'failed'
type TabView = 'cards' | 'pipeline' | 'autorun'

export default function AgentsPage() {
  const { agents, loading, refresh } = useAgents()
  const [tab, setTab]               = useState<TabView>('cards')
  const [phase, setPhase]           = useState<AutorunPhase>('idle')
  const [jobId, setJobId]           = useState<string | null>(null)
  const [jobError, setJobError]     = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll agent_jobs until terminal state
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
    poll()
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
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
  const phaseCfg = PHASE_CFG[phase]

  const TABS: { key: TabView; label: string }[] = [
    { key: 'cards',    label: 'Карточки' },
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'autorun',  label: '🎛 Управление' },
  ]

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
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {!loading && <SummaryBar agents={agents} />}

        {/* Autorun start button */}
        <button
          onClick={handleStartAutorun}
          disabled={phase !== 'idle'}
          className={`w-full flex items-center justify-center gap-2 font-semibold rounded-xl py-3 text-sm transition-colors border ${phaseCfg.cls} disabled:opacity-70`}
        >
          {phase === 'idle' && <Play size={14} />}
          {phaseCfg.label}
        </button>
        {jobError && <p className="text-xs text-red-400 px-1">{jobError}</p>}

        {/* Tab switcher */}
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-white/10 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center justify-center flex-1 py-20 text-slate-500 text-sm">Загрузка...</div>
      ) : tab === 'pipeline' ? (
        <div className="px-4">
          <PipelineTab agents={agents} />
        </div>
      ) : tab === 'autorun' ? (
        <AutorunPanel />
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
