import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BarChart2, ChevronDown, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAgentStats } from '../../hooks/useAgentStats'
import { useCyclePlan } from '../../hooks/useCyclePlan'
import { useKnowledgeStats } from '../../hooks/useKnowledgeStats'
import type { CyclePlanPhase, Task } from '../../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff} сек назад`
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  return `${Math.floor(diff / 86400)} дн назад`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}с`
  if (seconds < 3600) return `${Math.round(seconds / 60)}м`
  return `${(seconds / 3600).toFixed(1)}ч`
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  sub?: string
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white/5 rounded-2xl px-4 py-4 border border-white/[0.06] space-y-1">
      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

// ── Custom tooltip for BarChart ───────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c27] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200">
      <p className="font-medium">{label}</p>
      <p className="text-slate-400">{payload[0].value} задач</p>
    </div>
  )
}

// ── Knowledge stats widget ────────────────────────────────────────────────────

function KnowledgeStatsWidget() {
  const { stats, loading } = useKnowledgeStats()
  if (loading || !stats) return null
  return (
    <div className="bg-white/5 rounded-2xl px-4 py-4 border border-white/[0.06] space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">🧠 Knowledge Base</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-xl font-bold text-slate-100">{stats.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">знаний</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-red-400">{stats.hot}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">🔥 горячих</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-blue-400">{stats.archive}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">📚 архив</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <span className="text-[11px] text-slate-600">{stats.withEmbedding} с embedding</span>
        {stats.lastIngestedAt && (
          <span className="text-[11px] text-slate-600">📥 {timeAgo(stats.lastIngestedAt)}</span>
        )}
      </div>
    </div>
  )
}

// ── Autorun status ────────────────────────────────────────────────────────────

function AutorunStatus() {
  const [lastLog, setLastLog] = useState<{
    action: string | null
    status: string | null
    created_at: string
    details: Record<string, unknown> | null
  } | null>(null)
  const [todoCount, setTodoCount] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase
        .from('agent_action_log')
        .select('action, status, created_at, details')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'todo'),
    ]).then(([logRes, todoRes]) => {
      if (cancelled) return
      setLastLog((logRes.data?.[0] as typeof lastLog) ?? null)
      setTodoCount(todoRes.count ?? 0)
    })
    return () => { cancelled = true }
  }, [])

  const isActive = lastLog
    ? (Date.now() - new Date(lastLog.created_at).getTime()) < 30 * 60 * 1000
    : false

  const lastTaskTitle =
    (lastLog?.details as Record<string, unknown> | null)?.task_title as string | undefined ??
    lastLog?.action ??
    null

  const lastOk = lastLog?.status
    ? !lastLog.status.toLowerCase().includes('fail') && !lastLog.status.toLowerCase().includes('error')
    : true

  return (
    <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/[0.06] space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
        <p className="text-xs font-semibold text-slate-300">
          🤖 Autorun: <span className={isActive ? 'text-emerald-400' : 'text-slate-500'}>{isActive ? 'активен' : 'остановлен'}</span>
        </p>
        {todoCount > 0 && (
          <span className="ml-auto text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            {todoCount} в очереди
          </span>
        )}
      </div>
      {lastTaskTitle && (
        <p className="text-xs text-slate-500 pl-4">
          Последняя: <span className="text-slate-300">{lastTaskTitle}</span>{' '}
          {lastOk ? '✅' : '❌'}
        </p>
      )}
    </div>
  )
}

// ── Entity graph stats ────────────────────────────────────────────────────────

function EntityGraphStats({ compact }: { compact?: boolean }) {
  const [stats, setStats] = useState<{ nodes: number; edges: number; bindings: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('entity_nodes').select('*', { count: 'exact', head: true }),
      supabase.from('entity_edges').select('*', { count: 'exact', head: true }),
      supabase.from('knowledge_entities').select('*', { count: 'exact', head: true }),
    ]).then(([nodesRes, edgesRes, bindingsRes]) => {
      if (cancelled) return
      const nodes = nodesRes.count ?? 0
      const edges = edgesRes.count ?? 0
      const bindings = bindingsRes.count ?? 0
      if (nodes > 0 || edges > 0 || bindings > 0) {
        setStats({ nodes, edges, bindings })
      }
    })
    return () => { cancelled = true }
  }, [])

  if (!stats) return null

  const text = (
    <p className={`${compact ? 'text-[11px] text-amber-400/80' : 'text-xs text-slate-500'}`}>
      🕸 <span className={compact ? 'text-amber-300 font-medium' : 'text-slate-300 font-medium'}>{stats.nodes}</span> сущностей
      <span className={compact ? 'text-amber-600' : 'text-slate-700'}> · </span>
      <span className={compact ? 'text-amber-300 font-medium' : 'text-slate-300 font-medium'}>{stats.edges}</span> связей
      <span className={compact ? 'text-amber-600' : 'text-slate-700'}> · </span>
      <span className={compact ? 'text-amber-300 font-medium' : 'text-slate-300 font-medium'}>{stats.bindings}</span> привязок
    </p>
  )

  if (compact) return text

  return (
    <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/[0.06]">
      {text}
    </div>
  )
}

// ── Cycle widget ──────────────────────────────────────────────────────────────

const PHASE_ICON: Record<CyclePlanPhase['status'], string> = {
  completed: '✅',
  active:    '🔵',
  pending:   '⬜',
}

const TASK_STATUS_CFG: Record<string, { icon: string; cls: string }> = {
  done:        { icon: '✅', cls: 'line-through text-slate-600' },
  cancelled:   { icon: '❌', cls: 'line-through text-red-900' },
  in_progress: { icon: '🔵', cls: 'text-purple-300 font-medium' },
  review:      { icon: '👀', cls: 'text-amber-400' },
  blocked:     { icon: '🚫', cls: 'text-red-400' },
  todo:        { icon: '⬜', cls: 'text-slate-400' },
  backlog:     { icon: '📋', cls: 'text-slate-600' },
}

const ASSIGNEE_LABEL: Record<string, string> = {
  baker:  'Пекарь',
  intake: 'Интакер',
  runner: 'Ноут',
  user:   'Артур',
}

function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const cfg = TASK_STATUS_CFG[task.status ?? 'backlog'] ?? TASK_STATUS_CFG.backlog
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[75dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{cfg.icon}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/5 ${cfg.cls}`}>
              {task.status ?? 'backlog'}
            </span>
            {task.assignee && ASSIGNEE_LABEL[task.assignee] && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                {ASSIGNEE_LABEL[task.assignee]}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
          <p className="text-slate-100 text-base font-semibold leading-snug">{task.title}</p>
          {task.description ? (
            <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
          ) : (
            <p className="text-slate-600 text-sm italic">Описание не указано</p>
          )}
        </div>
      </div>
    </div>
  )
}

function PhaseTaskList({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  if (tasks.length === 0) {
    return <p className="text-xs text-slate-600 py-1 pl-1">Задач нет</p>
  }
  return (
    <div className="space-y-1 pt-1">
      {tasks.map(task => {
        const cfg = TASK_STATUS_CFG[task.status ?? 'backlog'] ?? TASK_STATUS_CFG.backlog
        return (
          <button
            key={task.id}
            onClick={() => onOpen(task)}
            className="w-full flex items-start gap-2 text-left active:opacity-60 transition-opacity"
          >
            <span className="text-xs shrink-0 mt-0.5">{cfg.icon}</span>
            <p className={`flex-1 text-xs leading-snug line-clamp-1 ${cfg.cls}`}>{task.title}</p>
            {task.assignee && ASSIGNEE_LABEL[task.assignee] && (
              <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/5 text-slate-500">
                {ASSIGNEE_LABEL[task.assignee]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Trigger config for phases that have a numeric progress target
const PHASE_TRIGGER: Record<number, { label: string; target: number; fetch: () => Promise<number> }> = {
  3: {
    label: 'знаний',
    target: 300,
    fetch: async () => {
      const { count } = await supabase
        .from('extracted_knowledge')
        .select('*', { count: 'exact', head: true })
      return count ?? 0
    },
  },
}

function CycleWidget() {
  const { plan, tasksByPhase, loading } = useCyclePlan()
  const phases = plan?.phases ?? []
  const activePhaseNum = phases.find(p => p.status === 'active')?.number ?? null
  const [expanded, setExpanded] = useState<number | null>(null)
  const [initialised, setInitialised] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [triggerCounts, setTriggerCounts] = useState<Record<number, number>>({})

  // Set default expansion once when plan first loads
  useEffect(() => {
    if (!initialised && activePhaseNum !== null) {
      setExpanded(activePhaseNum)
      setInitialised(true)
    }
  }, [initialised, activePhaseNum])

  // Fetch trigger counts for active phases that have a trigger
  useEffect(() => {
    if (!phases.length) return
    const activeTriggerPhases = phases.filter(p => p.status === 'active' && PHASE_TRIGGER[p.number])
    if (!activeTriggerPhases.length) return
    Promise.all(
      activeTriggerPhases.map(async p => {
        const count = await PHASE_TRIGGER[p.number].fetch()
        return [p.number, count] as [number, number]
      })
    ).then(results => {
      setTriggerCounts(Object.fromEntries(results))
    })
  }, [phases.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null

  if (!plan) {
    return (
      <div className="bg-white/5 rounded-2xl px-4 py-5 border border-white/[0.06] text-center space-y-1">
        <p className="text-sm text-slate-500">Нет активного цикла</p>
        <p className="text-xs text-slate-600">Создай cycle_plan со статусом active</p>
      </div>
    )
  }

  const allTasks = Object.values(tasksByPhase).flat()
  // cancelled counts as resolved — doesn't block phase completion display
  const doneTasks = allTasks.filter(t => t.status === 'done' || t.status === 'cancelled' || t.is_completed).length

  return (
    <div className="bg-white/5 rounded-2xl px-4 py-4 border border-white/[0.06] space-y-1">
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          🔄 <span className="text-slate-200 normal-case font-semibold">{plan.name}</span>
        </p>
        {allTasks.length > 0 && (
          <span className="text-[11px] text-slate-500">{doneTasks}/{allTasks.length} выполнено</span>
        )}
      </div>

      <div className="space-y-1">
        {phases.map(phase => {
          const isActive = phase.status === 'active'
          const isDone = phase.status === 'completed'
          const isOpen = expanded === phase.number
          const phaseTasks = tasksByPhase[phase.number] ?? []
          const phaseDone = phaseTasks.filter(t => t.status === 'done' || t.status === 'cancelled' || t.is_completed).length

          return (
            <div
              key={phase.number}
              className={`rounded-xl overflow-hidden transition-colors ${
                isActive ? 'bg-purple-600/10 border border-purple-500/20' : 'bg-white/[0.02]'
              }`}
            >
              {/* Phase header — clickable */}
              <button
                onClick={() => setExpanded(prev => prev === phase.number ? null : phase.number)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
              >
                <span className="text-sm shrink-0">{PHASE_ICON[phase.status]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${
                    isDone ? 'line-through text-slate-600' : isActive ? 'text-slate-100' : 'text-slate-500'
                  }`}>
                    Phase {phase.number}: {phase.name}
                    {isActive && (
                      <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse align-middle" />
                    )}
                  </p>
                  {isActive && phase.description && !isOpen && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-1">{phase.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {phaseTasks.length > 0 && (
                    <span className="text-[10px] text-slate-600">{phaseDone}/{phaseTasks.length}</span>
                  )}
                  <ChevronDown
                    size={14}
                    className={`text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Tasks — expanded */}
              {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {isActive && phase.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">{phase.description}</p>
                  )}
                  {/* Trigger progress bar */}
                  {PHASE_TRIGGER[phase.number] && triggerCounts[phase.number] != null && (() => {
                    const current = triggerCounts[phase.number]
                    const { target, label } = PHASE_TRIGGER[phase.number]
                    const unlocked = current >= target
                    return unlocked ? (
                      <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-3 py-2">
                        <span className="text-sm">✅</span>
                        <span className="text-xs font-semibold text-emerald-400">
                          {current}/{target} {label} — Phase {phase.number} разблокирована
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                            Прогресс к триггеру
                          </span>
                          <span className="text-[10px] font-semibold text-slate-300">
                            {current}/{target} {label}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-500 transition-all"
                            style={{ width: `${Math.min(100, Math.round(current / target * 100))}%` }}
                          />
                        </div>
                      </div>
                    )
                  })()}
                  <PhaseTaskList tasks={phaseTasks} onOpen={setSelectedTask} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  )
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

interface FeedItem {
  id: string
  icon: string
  text: string
  sub: string | null
  ts: string
}

function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase
        .from('context_snapshots')
        .select('id, snapshot_type, content, created_at')
        .in('snapshot_type', ['task_completed', 'ai_summary'])
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('tasks')
        .select('id, title, completed_at, status')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10),
    ]).then(([snapsRes, tasksRes]) => {
      if (cancelled) return

      const feed: FeedItem[] = []

      for (const s of snapsRes.data ?? []) {
        const c = s.content as Record<string, unknown>
        if (s.snapshot_type === 'task_completed') {
          feed.push({
            id: `snap-${s.id}`,
            icon: '✅',
            text: `Задача: ${String(c.title ?? '—')}`,
            sub: null,
            ts: s.created_at,
          })
        } else if (s.snapshot_type === 'ai_summary') {
          const url = String(c.source_url ?? c.what_done ?? '')
          const kCount = c.knowledge_count != null ? `${c.knowledge_count} знаний` : null
          feed.push({
            id: `snap-${s.id}`,
            icon: '📥',
            text: url ? `Обработано: ${url.length > 60 ? url.slice(0, 60) + '…' : url}` : String(c.what_done ?? 'AI summary'),
            sub: kCount,
            ts: s.created_at,
          })
        }
      }

      for (const t of tasksRes.data ?? []) {
        if (!t.completed_at) continue
        feed.push({
          id: `task-${t.id}`,
          icon: '✔️',
          text: `Закрыто: ${t.title}`,
          sub: null,
          ts: t.completed_at,
        })
      }

      // Deduplicate by id and sort by date desc, take top 10
      const seen = new Set<string>()
      const merged = feed
        .filter(f => { if (seen.has(f.id)) return false; seen.add(f.id); return true })
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
        .slice(0, 10)

      setItems(merged)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) return null
  if (items.length === 0) return null

  return (
    <div className="bg-white/5 rounded-2xl px-4 py-4 border border-white/[0.06] space-y-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-1">
        ⚡ Последние события
      </p>
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-2.5 py-1.5 border-t border-white/[0.04] first:border-0">
          <span className="text-sm shrink-0 mt-0.5">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-300 leading-snug truncate">{item.text}</p>
            {item.sub && <p className="text-[10px] text-slate-600 mt-0.5">{item.sub}</p>}
          </div>
          <span className="text-[10px] text-slate-600 shrink-0 font-mono">
            {timeAgo(item.ts)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Cycle 2 widget ────────────────────────────────────────────────────────────

function CycleTwoWidget() {
  const [phaseStats, setPhaseStats] = useState<Record<number, { done: number; total: number }>>({})
  const [blockers, setBlockers] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status, is_completed, phase_number, work_type')
        .in('phase_number', [1, 2, 3])
        .neq('status', 'cancelled'),
      supabase
        .from('tasks')
        .select('id, title, status, work_type, phase_number, priority')
        .eq('work_type', 'blocker')
        .eq('status', 'todo'),
    ]).then(([tasksRes, blockersRes]) => {
      if (cancelled) return
      const stats: Record<number, { done: number; total: number }> = {
        1: { done: 0, total: 0 },
        2: { done: 0, total: 0 },
        3: { done: 0, total: 0 },
      }
      for (const t of tasksRes.data ?? []) {
        const p = t.phase_number as number
        if (p >= 1 && p <= 3) {
          stats[p].total++
          if (t.status === 'done' || t.is_completed) stats[p].done++
        }
      }
      setPhaseStats(stats)
      setBlockers((blockersRes.data ?? []) as Task[])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) return null

  const total = Object.values(phaseStats).reduce((s, p) => s + p.total, 0)
  if (total === 0 && blockers.length === 0) return null

  return (
    <div className="bg-white/5 rounded-2xl px-4 py-4 border border-white/[0.06] space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        🔄 <span className="text-slate-200 normal-case font-semibold">Automation & Quality</span>
      </p>

      {[1, 2, 3].map(phase => {
        const { done, total: phaseTotal } = phaseStats[phase] ?? { done: 0, total: 0 }
        const pct = phaseTotal > 0 ? Math.round(done / phaseTotal * 100) : 0
        return (
          <div key={phase} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Phase {phase}</span>
              {phaseTotal === 0 ? (
                <span className="text-[10px] text-slate-600">Нет задач</span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-300">
                  {done}/{phaseTotal} · {pct}%
                </span>
              )}
            </div>
            {phaseTotal > 0 && (
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        )
      })}

      {blockers.length > 0 && (
        <div className="pt-2 border-t border-white/[0.04] space-y-1.5">
          <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">🚫 Blockers</p>
          {blockers.map(b => (
            <div key={b.id} className="flex items-start gap-2">
              <span className="text-[10px] text-red-500 shrink-0 mt-0.5">●</span>
              <p className="flex-1 text-xs text-red-300 line-clamp-1">{b.title}</p>
              {b.phase_number != null && (
                <span className="text-[9px] text-slate-600 shrink-0">P{b.phase_number}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { stats, loading } = useAgentStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Loading...
      </div>
    )
  }

  if (!stats) return null

  const maxCount = Math.max(...stats.jobsByDay.map(d => d.count), 1)

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <BarChart2 size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">Активность агента</p>
      </div>

      {/* Cycle 1 complete banner */}
      <div className="px-4 pb-2">
        <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/20 border border-amber-700/30 rounded-2xl px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-amber-300">
            🏆 Cycle 1: MAOS Brain — COMPLETE
          </p>
          <p className="text-xs text-amber-500/80">29.03 → 02.04</p>
          <EntityGraphStats compact />
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Autorun status */}
        <AutorunStatus />

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="Success rate"
            value={`${stats.successRate}%`}
            sub="за 7 дней"
          />
          <StatCard
            label="Выполнено"
            value={String(stats.completedLast7Days)}
            sub="за 7 дней"
          />
          <StatCard
            label="Среднее"
            value={stats.avgDurationSeconds > 0 ? formatDuration(stats.avgDurationSeconds) : '—'}
            sub="на задачу"
          />
          <StatCard
            label="Память"
            value={stats.memoryCount != null ? String(stats.memoryCount) : '—'}
            sub="записей"
          />
        </div>

        {/* Knowledge stats */}
        <KnowledgeStatsWidget />

        {/* Bar chart */}
        <div className="bg-white/5 rounded-2xl px-4 pt-4 pb-2 border border-white/[0.06]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Активность за 14 дней
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={stats.jobsByDay} barCategoryGap="30%">
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide allowDecimals={false} domain={[0, maxCount + 1]} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.jobsByDay.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.count > 0 ? '#7c3aed' : '#1e1e2e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cycle widget */}
        <CycleWidget />

        {/* Cycle 2 progress */}
        <CycleTwoWidget />

        {/* Activity feed */}
        <ActivityFeed />
      </div>
    </div>
  )
}
