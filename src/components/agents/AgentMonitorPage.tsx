import { useState, useEffect, useCallback } from 'react'
import { Bot, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}с назад`
  if (diff < 3600)  return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function todayMidnight(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentRow {
  id: string
  name: string
  status: string | null
  agent_role: string | null
  current_task_id: string | null
  last_heartbeat: string | null
}

interface AgentCard extends AgentRow {
  currentTaskTitle: string | null
  minutesSinceHeartbeat: number | null
  doneToday: number
  inProgress: number
}

// ── Role badge config ─────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { cls: string; label: string }> = {
  ceo:          { cls: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/30', label: 'CEO' },
  coder:        { cls: 'bg-blue-900/50 text-blue-400 border border-blue-700/30',         label: 'Coder' },
  tester:       { cls: 'bg-orange-900/50 text-orange-400 border border-orange-700/30',   label: 'Tester' },
  orchestrator: { cls: 'bg-purple-900/50 text-purple-400 border border-purple-700/30',   label: 'Orchestrator' },
  strategist:   { cls: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/30',   label: 'Strategist' },
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null
  const cfg = ROLE_BADGE[role.toLowerCase()]
  if (!cfg) return null
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

interface AgentEvent {
  id: string
  agent_id: string | null
  event_type: string
  details: Record<string, unknown> | null
  created_at: string
  agentName: string
}

interface CyclePhaseTask {
  id: string
  title: string
  status: string
  phase_number: number | null
}

interface CycleInfo {
  id: string
  name: string
  activePhase: number | null
  done: number
  total: number
  phaseTasks: CyclePhaseTask[]
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { dot: string; label: string; border: string }> = {
  idle:    { dot: 'bg-slate-500',                  label: 'Ожидает', border: 'border-white/[0.06]' },
  working: { dot: 'bg-emerald-400 animate-pulse',  label: 'Работает', border: 'border-emerald-500/25' },
  stuck:   { dot: 'bg-amber-400',                  label: 'Застрял', border: 'border-amber-500/25' },
  failed:  { dot: 'bg-red-400 animate-pulse',      label: 'Ошибка',  border: 'border-red-500/30' },
  offline: { dot: 'bg-slate-700',                  label: 'Офлайн',  border: 'border-white/[0.04]' },
}

function statusCfg(s: string | null) {
  return STATUS_CFG[s ?? 'offline'] ?? STATUS_CFG.offline
}

// ── Event type config ─────────────────────────────────────────────────────────

const EVENT_CFG: Record<string, { icon: string; cls: string }> = {
  task_started:      { icon: '🔵', cls: 'text-blue-400' },
  task_completed:    { icon: '✅', cls: 'text-emerald-400' },
  task_failed:       { icon: '❌', cls: 'text-red-400' },
  phase_completed:   { icon: '🏁', cls: 'text-purple-400' },
  error:             { icon: '🚨', cls: 'text-red-400' },
  finding:           { icon: '🔍', cls: 'text-amber-400' },
  heartbeat:         { icon: '💓', cls: 'text-slate-500' },
  review_passed:     { icon: '👍', cls: 'text-emerald-400' },
  review_failed:     { icon: '👎', cls: 'text-red-400' },
  task_received:     { icon: '📩', cls: 'text-blue-300' },
}

function eventCfg(type: string) {
  return EVENT_CFG[type] ?? { icon: '·', cls: 'text-slate-500' }
}

function eventDescription(ev: AgentEvent): string {
  const d = ev.details ?? {}
  const title = d.task_title ?? d.title ?? d.message ?? d.summary ?? d.description
  if (title) return String(title).slice(0, 80)
  return ev.event_type.replace(/_/g, ' ')
}

// ── Agent card ─────────────────────────────────────────────────────────────────

function AgentCardRow({ agent }: { agent: AgentCard }) {
  const cfg = statusCfg(agent.status)

  return (
    <div className={`bg-white/[0.03] rounded-2xl border ${cfg.border} p-4 space-y-2.5`}>
      {/* Header: name + role badge + status */}
      <div className="flex items-center gap-2.5">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
        <p className="flex-1 text-sm font-bold text-slate-200 truncate">{agent.name}</p>
        <RoleBadge role={agent.agent_role} />
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          agent.status === 'working' ? 'bg-emerald-900/50 text-emerald-400' :
          agent.status === 'failed'  ? 'bg-red-900/50 text-red-400' :
          agent.status === 'stuck'   ? 'bg-amber-900/50 text-amber-400' :
          'bg-white/5 text-slate-500'
        }`}>
          {cfg.label}
        </span>
      </div>

      {/* Current task */}
      <div className={`rounded-xl px-3 py-2 ${
        agent.currentTaskTitle
          ? agent.status === 'working'
            ? 'bg-emerald-900/15 border border-emerald-700/20'
            : 'bg-white/[0.03] border border-white/[0.06]'
          : 'bg-white/[0.02]'
      }`}>
        <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">
          {agent.status === 'working' ? '⚡ Выполняет' : 'Задача'}
        </p>
        <p className={`text-xs leading-snug line-clamp-2 ${
          agent.currentTaskTitle
            ? agent.status === 'working' ? 'text-emerald-300 font-medium' : 'text-slate-300'
            : 'text-slate-600 italic'
        }`}>
          {agent.currentTaskTitle ?? 'Нет активной задачи'}
        </p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px]">
        <div className="flex items-center gap-1 text-slate-500">
          <span className="text-slate-600">⏱</span>
          <span>{agent.minutesSinceHeartbeat !== null ? `${agent.minutesSinceHeartbeat}м назад` : '—'}</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-500">
          <span>✅</span>
          <span className="font-semibold">{agent.doneToday}</span>
          <span className="text-slate-600">сегодня</span>
        </div>
        <div className="flex items-center gap-1 text-blue-400">
          <span>🔄</span>
          <span className="font-semibold">{agent.inProgress}</span>
          <span className="text-slate-600">в работе</span>
        </div>
      </div>
    </div>
  )
}

// ── Event log ─────────────────────────────────────────────────────────────────

function EventLogSection({ events }: { events: AgentEvent[] }) {
  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          ⚡ Последние события
        </p>
      </div>
      {events.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-600">Нет событий</div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {events.map(ev => {
            const cfg = eventCfg(ev.event_type)
            const desc = eventDescription(ev)
            return (
              <div key={ev.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <span className="text-sm shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${cfg.cls}`}>{desc}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {ev.agentName} · {ev.event_type.replace(/_/g, ' ')}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-slate-700 font-mono">{fmt(ev.created_at)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Cycle progress section ────────────────────────────────────────────────────

const TASK_STATUS_DOT: Record<string, string> = {
  done:        'bg-emerald-500',
  in_progress: 'bg-blue-400 animate-pulse',
  review:      'bg-amber-400',
  blocked:     'bg-red-400',
  todo:        'bg-slate-600',
}

function CycleSection({ cycle }: { cycle: CycleInfo }) {
  const pct = cycle.total > 0 ? Math.round(cycle.done / cycle.total * 100) : 0
  const activePhaseTasks = cycle.activePhase !== null
    ? cycle.phaseTasks.filter(t => t.phase_number === cycle.activePhase)
    : []

  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">🔄 Текущий цикл</p>
        <span className="text-[11px] text-slate-500">{cycle.done}/{cycle.total} · {pct}%</span>
      </div>

      <div>
        <p className="text-sm font-bold text-slate-200">{cycle.name}</p>
        {cycle.activePhase !== null && (
          <p className="text-xs text-purple-400 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block mr-1.5 animate-pulse" />
            Phase {cycle.activePhase} активна
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-purple-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Active phase tasks */}
      {activePhaseTasks.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-white/[0.04]">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">
            Задачи Phase {cycle.activePhase}
          </p>
          {activePhaseTasks.slice(0, 8).map(t => (
            <div key={t.id} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TASK_STATUS_DOT[t.status] ?? 'bg-slate-700'}`} />
              <p className={`flex-1 text-xs leading-snug line-clamp-1 ${
                t.status === 'done' ? 'text-slate-600 line-through' :
                t.status === 'in_progress' ? 'text-blue-300 font-medium' :
                'text-slate-400'
              }`}>{t.title}</p>
              <span className="text-[9px] text-slate-700 shrink-0">{t.status}</span>
            </div>
          ))}
          {activePhaseTasks.length > 8 && (
            <p className="text-[10px] text-slate-700 pl-3.5">+{activePhaseTasks.length - 8} ещё</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AgentMonitorPage() {
  const [agents, setAgents]   = useState<AgentCard[]>([])
  const [events, setEvents]   = useState<AgentEvent[]>([])
  const [cycle, setCycle]     = useState<CycleInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const load = useCallback(async () => {
    const today = todayMidnight()

    // 1. Agents
    const { data: agentRows } = await supabase
      .from('agents')
      .select('id, name, status, agent_role, current_task_id, last_heartbeat')
      .order('name')

    const rawAgents = (agentRows ?? []) as AgentRow[]
    const agentNameMap: Record<string, string> = {}
    for (const a of rawAgents) agentNameMap[a.id] = a.name

    // 2. Resolve current task titles
    const taskIds = rawAgents.map(a => a.current_task_id).filter((id): id is string => id != null)
    let taskTitleMap: Record<string, string> = {}
    if (taskIds.length > 0) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title')
        .in('id', taskIds)
      for (const t of tasks ?? []) taskTitleMap[t.id as string] = t.title as string
    }

    // 3. Fetch parallel: events (last 20), done-today per agent, in-progress per agent
    const [eventsRes, doneTodayRes, inProgressRes, cycleRes] = await Promise.all([
      supabase
        .from('agent_events')
        .select('id, agent_id, event_type, details, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      // tasks done today — we'll group client-side by matching agent assignee
      supabase
        .from('agent_events')
        .select('agent_id')
        .eq('event_type', 'task_completed')
        .gte('created_at', today),
      supabase
        .from('tasks')
        .select('assignee')
        .eq('status', 'in_progress'),
      supabase
        .from('cycle_plans')
        .select('id, name, phases')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle(),
    ])

    // 4. Build done-today counts per agent_id
    const doneTodayMap: Record<string, number> = {}
    for (const row of (doneTodayRes.data ?? []) as { agent_id: string | null }[]) {
      if (row.agent_id) doneTodayMap[row.agent_id] = (doneTodayMap[row.agent_id] ?? 0) + 1
    }

    // 5. Build in-progress counts per assignee name → match by name
    const inProgressByName: Record<string, number> = {}
    for (const row of (inProgressRes.data ?? []) as { assignee: string | null }[]) {
      if (row.assignee) inProgressByName[row.assignee] = (inProgressByName[row.assignee] ?? 0) + 1
    }

    // 6. Compose agent cards
    const now = Date.now()
    const agentCards: AgentCard[] = rawAgents.map(a => {
      const hb = a.last_heartbeat
      const minutesSinceHeartbeat = hb ? Math.round((now - new Date(hb).getTime()) / 60_000) : null
      return {
        ...a,
        currentTaskTitle: a.current_task_id ? (taskTitleMap[a.current_task_id] ?? null) : null,
        minutesSinceHeartbeat,
        doneToday: doneTodayMap[a.id] ?? 0,
        inProgress: inProgressByName[a.name.toLowerCase()] ?? 0,
      }
    })

    // 7. Enrich events with agent names
    const enrichedEvents: AgentEvent[] = ((eventsRes.data ?? []) as {
      id: string; agent_id: string | null; event_type: string; details: Record<string, unknown> | null; created_at: string
    }[]).map(ev => ({
      ...ev,
      agentName: ev.agent_id ? (agentNameMap[ev.agent_id] ?? ev.agent_id.slice(0, 8)) : '?',
    }))

    // 8. Cycle info
    let cycleInfo: CycleInfo | null = null
    if (cycleRes.data) {
      const plan = cycleRes.data as { id: string; name: string; phases: { number: number; status: string }[] | null }
      const phases = plan.phases ?? []
      const activePhase = phases.find(p => p.status === 'active')?.number ?? null

      const [totalRes, doneRes, phaseTasksRes] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true })
          .eq('cycle_plan_id', plan.id).neq('status', 'cancelled'),
        supabase.from('tasks').select('*', { count: 'exact', head: true })
          .eq('cycle_plan_id', plan.id).eq('status', 'done'),
        supabase.from('tasks').select('id, title, status, phase_number')
          .eq('cycle_plan_id', plan.id)
          .not('status', 'in', '("done","cancelled")')
          .order('phase_number'),
      ])

      // Include some done tasks for context
      const { data: donePhaseTasks } = await supabase
        .from('tasks')
        .select('id, title, status, phase_number')
        .eq('cycle_plan_id', plan.id)
        .eq('status', 'done')
        .eq('phase_number', activePhase ?? -1)
        .limit(5)

      const allPhaseTasks = [
        ...((phaseTasksRes.data ?? []) as CyclePhaseTask[]),
        ...((donePhaseTasks ?? []) as CyclePhaseTask[]),
      ]

      cycleInfo = {
        id:          plan.id,
        name:        plan.name,
        activePhase,
        done:        doneRes.count ?? 0,
        total:       totalRes.count ?? 0,
        phaseTasks:  allPhaseTasks,
      }
    }

    setAgents(agentCards)
    setEvents(enrichedEvents)
    setCycle(cycleInfo)
    setLoading(false)
    setLastRefresh(Date.now())
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  const working = agents.filter(a => a.status === 'working').length
  const failed  = agents.filter(a => a.status === 'failed' || a.status === 'stuck').length

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-purple-400 shrink-0" strokeWidth={1.75} />
          <h1 className="flex-1 text-2xl font-bold text-slate-100">Agent Monitor</h1>
          <button
            onClick={() => { void load() }}
            disabled={loading}
            className="text-slate-500 active:text-slate-300 disabled:opacity-40 p-1"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[11px] text-slate-600">
            {timeAgo(new Date(lastRefresh).toISOString())} · auto 30с
          </p>
          {!loading && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-700">·</span>
              <span className={working > 0 ? 'text-emerald-500' : 'text-slate-600'}>
                {working} работают
              </span>
              {failed > 0 && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="text-red-400">{failed} проблем</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 text-sm">Загрузка...</div>
      ) : (
        <div className="px-4 space-y-4">

          {/* 1. Agent cards */}
          {agents.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-sm">Нет агентов</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents.map(agent => <AgentCardRow key={agent.id} agent={agent} />)}
            </div>
          )}

          {/* 2. Current cycle */}
          {cycle && <CycleSection cycle={cycle} />}

          {/* 3. Event log */}
          <EventLogSection events={events} />

        </div>
      )}
    </div>
  )
}
