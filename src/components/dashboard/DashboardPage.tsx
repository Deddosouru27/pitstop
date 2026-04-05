import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BarChart2, ChevronDown, X, Plus, Inbox, Lightbulb, TrendingUp, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAgentStats } from '../../hooks/useAgentStats'
import { useCyclePlan } from '../../hooks/useCyclePlan'
import { useKnowledgeStats } from '../../hooks/useKnowledgeStats'
import CycleVelocity from './CycleVelocity'
import type { CyclePlanPhase, Task, GoalChain } from '../../types'

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

      {/* Row 1: total / hot / archive */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-xl font-bold text-slate-100">{stats.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">знаний</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-red-400">{stats.hot}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">🔥 hot ({stats.hotPct}%)</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-blue-400">{stats.archive}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">📚 архив</p>
        </div>
      </div>

      {/* Row 2: entities / edges */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.04]">
        <div className="text-center">
          <p className="text-base font-bold text-emerald-400">{stats.entities}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">🕸 entities</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-cyan-400">{stats.edges}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">↔ edges</p>
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

// ── Agent count widget ────────────────────────────────────────────────────────

function AgentCountWidget() {
  const [total, setTotal] = useState<number>(0)
  const [active, setActive] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('agents').select('*', { count: 'exact', head: true }),
      supabase.from('agents').select('*', { count: 'exact', head: true }).neq('status', 'idle'),
    ]).then(([totalRes, activeRes]) => {
      if (cancelled) return
      setTotal(totalRes.count ?? 0)
      setActive(activeRes.count ?? 0)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/[0.06] flex items-center gap-3">
      <Users size={16} className="text-purple-400 shrink-0" strokeWidth={1.75} />
      <p className="text-xs font-medium text-slate-300">
        Агенты: <span className="text-slate-100 font-bold">{total}</span>
        <span className="text-slate-600 mx-1.5">|</span>
        Активных: <span className={active > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>{active}</span>
      </p>
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

// ── Goal chain breadcrumb ─────────────────────────────────────────────────────

const GOAL_CHAIN_STEPS: Array<{ key: keyof GoalChain; label: string }> = [
  { key: 'mission', label: 'Mission' },
  { key: 'block',   label: 'Block' },
  { key: 'cycle',   label: 'Cycle' },
  { key: 'phase',   label: 'Phase' },
  { key: 'task',    label: 'Task' },
]

function GoalChainBreadcrumb({ chain }: { chain: GoalChain }) {
  const steps = GOAL_CHAIN_STEPS.filter(s => chain[s.key])
  if (steps.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1
        return (
          <div key={s.key} className="flex items-center gap-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isLast
                ? 'bg-purple-600/30 text-purple-300 border border-purple-600/40'
                : 'bg-white/[0.06] text-slate-500 border border-white/[0.06]'
            }`}>
              {chain[s.key]}
            </span>
            {!isLast && <span className="text-[9px] text-slate-700">›</span>}
          </div>
        )
      })}
    </div>
  )
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

          {/* Goal chain breadcrumb */}
          {task.context?.goal_chain && (
            <GoalChainBreadcrumb chain={task.context.goal_chain} />
          )}

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

// ── Cycle history widget ──────────────────────────────────────────────────────

interface CycleSummary {
  id: string
  name: string
  status: string
  done: number
  total: number
  updatedAt: string
}

interface CycleDoneTask {
  id: string
  title: string
  work_type: string | null
  phase_number: number | null
}

const WORK_TYPE_ICON: Record<string, string> = {
  blocker:       '🚫',
  critical_fix:  '🔥',
  enabling:      '⚙️',
  product:       '📦',
  nice_to_have:  '✨',
  exploration:   '🔬',
}

function CycleTasksExpanded({ cycleId }: { cycleId: string }) {
  const [tasks, setTasks]     = useState<CycleDoneTask[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('tasks')
      .select('id, title, work_type, phase_number')
      .eq('cycle_plan_id', cycleId)
      .eq('status', 'done')
      .order('phase_number', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setTasks((data ?? []) as CycleDoneTask[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [cycleId])

  if (loading) return <p className="text-xs text-slate-600 py-2 pl-1">Загрузка...</p>
  if (!tasks || tasks.length === 0) return <p className="text-xs text-slate-600 italic py-2 pl-1">Нет выполненных задач</p>

  return (
    <div className="space-y-1 pt-2 max-h-52 overflow-y-auto">
      {tasks.map(t => (
        <div key={t.id} className="flex items-start gap-2 py-0.5">
          <span className="text-[11px] shrink-0 mt-0.5">{WORK_TYPE_ICON[t.work_type ?? ''] ?? '✅'}</span>
          <p className="flex-1 text-xs text-slate-400 leading-snug line-clamp-1">{t.title}</p>
          {t.phase_number != null && (
            <span className="shrink-0 text-[9px] text-slate-700">P{t.phase_number}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function CycleTwoWidget() {
  const [cycles, setCycles]   = useState<CycleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: plans } = await supabase
        .from('cycle_plans')
        .select('id, name, status, updated_at')
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: true })
      if (cancelled) return

      if (!plans || plans.length === 0) { setLoading(false); return }

      const summaries = await Promise.all(
        (plans as { id: string; name: string; status: string; updated_at: string }[]).map(async p => {
          const [totalRes, doneRes] = await Promise.all([
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('cycle_plan_id', p.id).neq('status', 'cancelled'),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('cycle_plan_id', p.id).eq('status', 'done'),
          ])
          return {
            id:        p.id,
            name:      p.name,
            status:    p.status,
            done:      doneRes.count ?? 0,
            total:     totalRes.count ?? 0,
            updatedAt: p.updated_at,
          }
        })
      )
      if (!cancelled) {
        setCycles(summaries)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return null
  if (cycles.length === 0) return null

  const active    = cycles.find(c => c.status === 'active')
  const completed = cycles.filter(c => c.status === 'completed')

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
        🔄 Циклы
      </p>

      {/* Active cycle — highlighted at top */}
      {active && (
        <div className="bg-purple-600/10 rounded-2xl border border-purple-500/25 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">{active.name}</p>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-purple-600/30 text-purple-300 uppercase tracking-wider">
              🔄 Активный
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{active.done}/{active.total} задач</span>
              <span className="text-xs font-semibold text-slate-300">
                {active.total > 0 ? Math.round(active.done / active.total * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{ width: `${active.total > 0 ? Math.round(active.done / active.total * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Completed cycles */}
      {completed.length > 0 && (
        <div className="bg-white/[0.04] rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden">
          {completed.map(c => {
            const isOpen = expanded === c.id
            const pct = c.total > 0 ? Math.round(c.done / c.total * 100) : 100
            return (
              <div key={c.id}>
                <button
                  onClick={() => setExpanded(prev => prev === c.id ? null : c.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/5 transition-colors"
                >
                  {/* Trophy */}
                  <span className="text-base shrink-0">🏆</span>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {c.done}/{c.total} задач · {fmtDate(c.updatedAt)}
                    </p>
                  </div>

                  {/* Badge + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-400 uppercase tracking-wider">
                      ✅ {pct}%
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {/* Expanded task list */}
                {isOpen && (
                  <div className="px-4 pb-3 border-t border-white/[0.04]">
                    <CycleTasksExpanded cycleId={c.id} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Quick Capture Modal ───────────────────────────────────────────────────────

function QuickCaptureModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl]       = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleProcess = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    try {
      const parsed = new URL(trimmed)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
    } catch {
      setStatus('error')
      setMessage('Невалидный URL. Должен начинаться с http:// или https://')
      return
    }

    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('https://maos-intake.vercel.app/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, source_type: 'manual' }),
      })
      const json = await res.json().catch(() => ({})) as Record<string, unknown>
      if (!res.ok) {
        setStatus('error')
        setMessage(String(json.message ?? json.error ?? `HTTP ${res.status}`))
        return
      }
      const count = json.knowledge_count ?? json.items_count ?? json.count ?? null
      setStatus('success')
      setMessage(count != null ? `Обработано: ${count} knowledge items` : 'Обработано')
      setUrl('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Сетевая ошибка')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-surface-el rounded-t-2xl p-5 pb-10 space-y-4 shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">📥 Quick Capture URL</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            autoFocus
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setStatus('idle'); setMessage('') }}
            onKeyDown={e => e.key === 'Enter' && handleProcess()}
            placeholder="https://..."
            className="flex-1 bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent min-w-0"
          />
          <button
            onClick={handleProcess}
            disabled={!url.trim() || status === 'loading'}
            className="bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-colors shrink-0"
          >
            {status === 'loading' ? '⏳' : 'Обработать'}
          </button>
        </div>
        {status === 'success' && (
          <p className="text-sm text-emerald-400">✅ {message}</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-400">❌ Ошибка: {message}</p>
        )}
      </div>
    </div>
  )
}

// ── Today widget ──────────────────────────────────────────────────────────────

interface TodayStats {
  tasksDone: number
  snapshots: number
  ideasProcessed: number
  agentEvents: number
}

function TodayWidget() {
  const [data, setData]     = useState<TodayStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // today in ISO date string (local midnight → UTC range handled server-side via gte/lt)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const iso = todayStart.toISOString()

      const [tasksDoneRes, snapsRes, ideasRes, eventsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'done')
          .gte('updated_at', iso),
        supabase
          .from('context_snapshots')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', iso),
        supabase
          .from('ideas')
          .select('*', { count: 'exact', head: true })
          .not('status', 'in', '("new","pending")')
          .gte('updated_at', iso),
        supabase
          .from('agent_events')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', iso),
      ])

      if (cancelled) return

      setData({
        tasksDone:      tasksDoneRes.count ?? 0,
        snapshots:      snapsRes.count ?? 0,
        ideasProcessed: ideasRes.count ?? 0,
        agentEvents:    eventsRes.count ?? 0,
      })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return null

  const d = data!
  const totalActivity = d.tasksDone + d.snapshots + d.ideasProcessed + d.agentEvents
  const quiet = totalActivity === 0

  const items = [
    { icon: '✅', label: 'задач закрыто',   value: d.tasksDone      },
    { icon: '📸', label: 'снапшотов',       value: d.snapshots      },
    { icon: '💡', label: 'идей обработано', value: d.ideasProcessed },
    { icon: '⚡', label: 'agent events',    value: d.agentEvents    },
  ]

  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  return (
    <div className="bg-white/[0.04] rounded-2xl border border-white/[0.06] px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          🌅 Сегодня
        </p>
        <span className="text-[11px] text-slate-600">{today}</span>
      </div>

      {quiet ? (
        <p className="text-sm text-slate-600 italic py-1">Тихий день 🌙</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-base">{item.icon}</span>
              <div>
                <p className={`text-lg font-bold leading-none ${item.value > 0 ? 'text-slate-100' : 'text-slate-700'}`}>
                  {item.value}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Agent Status widget ───────────────────────────────────────────────────────

interface AgentEventRow {
  id: string
  agent_id: string | null
  event_type: string
  details: Record<string, unknown> | null
  created_at: string
  agentName: string
}

function AgentStatusWidget() {
  const [rows, setRows]     = useState<AgentEventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [eventsRes, agentsRes] = await Promise.all([
        supabase
          .from('agent_events')
          .select('id, agent_id, event_type, details, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('agents')
          .select('id, name'),
      ])
      if (cancelled) return

      const nameMap: Record<string, string> = {}
      for (const a of (agentsRes.data ?? []) as { id: string; name: string }[]) {
        nameMap[a.id] = a.name
      }

      const enriched: AgentEventRow[] = ((eventsRes.data ?? []) as {
        id: string; agent_id: string | null; event_type: string
        details: Record<string, unknown> | null; created_at: string
      }[]).map(ev => ({
        ...ev,
        agentName: ev.agent_id ? (nameMap[ev.agent_id] ?? ev.agent_id.slice(0, 8)) : '—',
      }))

      setRows(enriched)
      setLoading(false)
    }

    load()
    const interval = setInterval(load, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (loading) return null
  if (rows.length === 0) return null

  return (
    <div className="bg-white/5 rounded-2xl border border-white/[0.06] overflow-hidden">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 pt-4 pb-2">
        🤖 Agent Status
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">Время</th>
            <th className="text-left px-4 py-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">Агент</th>
            <th className="text-left px-4 py-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">Действие</th>
            <th className="text-left px-4 py-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">Статус</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map(ev => {
            const isOk = ev.event_type.includes('completed') || ev.event_type.includes('passed')
            const isErr = ev.event_type.includes('failed') || ev.event_type.includes('error') || ev.event_type.includes('blocked')
            return (
              <tr key={ev.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-2 text-slate-600 font-mono whitespace-nowrap">
                  {new Date(ev.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-2 text-slate-300 truncate max-w-[80px]">{ev.agentName}</td>
                <td className="px-4 py-2 text-slate-400 truncate max-w-[120px]">
                  {ev.event_type.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-[10px] font-semibold ${
                    isOk  ? 'text-emerald-400' :
                    isErr ? 'text-red-400' :
                    'text-slate-500'
                  }`}>
                    {isOk ? '✓' : isErr ? '✗' : '·'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── CEO Briefing widget ───────────────────────────────────────────────────────

interface CeoBriefingData {
  system_health?: string | null
  active_cycle?: {
    name?: string | null
    done?: number
    total?: number
    todo?: number
  } | null
  top_findings?: Array<{ summary?: string; type?: string }> | null
  blocked_tasks?: Array<{ title?: string; reason?: string }> | null
  recent_completed?: Array<{ title?: string; completed_at?: string }> | null
  planning_health?: string | null
}

function CeoBriefingWidget() {
  const [data, setData]     = useState<CeoBriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: result, error: err } = await supabase.rpc('ceo_briefing')
      if (cancelled) return
      if (err || !result) { setError(true); setLoading(false); return }
      setData(result as CeoBriefingData)
      setLoading(false)
    }

    load()
    const interval = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (loading || error || !data) return null

  const cycle = data.active_cycle
  const cyclePct = cycle && cycle.total && cycle.total > 0
    ? Math.round((cycle.done ?? 0) / cycle.total * 100)
    : null

  const healthColor =
    data.system_health === 'healthy'  ? 'text-emerald-400' :
    data.system_health === 'degraded' ? 'text-amber-400' :
    data.system_health === 'critical' ? 'text-red-400' :
    'text-slate-400'

  const recent = (data.recent_completed ?? []).slice(0, 3)
  const blocked = (data.blocked_tasks ?? [])
  const findings = (data.top_findings ?? [])

  return (
    <div className="bg-white/[0.04] rounded-2xl border border-white/[0.06] px-4 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          👑 CEO Briefing
        </p>
        {data.system_health && (
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${healthColor}`}>
            {data.system_health}
          </span>
        )}
      </div>

      {/* Cycle progress */}
      {cycle && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-300 font-medium truncate">{cycle.name ?? 'Active cycle'}</p>
            <span className="text-[11px] text-slate-500 shrink-0 ml-2">
              {cycle.done ?? 0}/{cycle.total ?? 0} · {cyclePct ?? 0}%
            </span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all"
              style={{ width: `${cyclePct ?? 0}%` }}
            />
          </div>
          {(cycle.todo ?? 0) > 0 && (
            <p className="text-[10px] text-slate-600">{cycle.todo} задач в очереди</p>
          )}
        </div>
      )}

      {/* Stats row: findings + blocked */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-sm">🔍</span>
          <div>
            <p className={`text-sm font-bold leading-none ${findings.length > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
              {findings.length}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">findings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">🚫</span>
          <div>
            <p className={`text-sm font-bold leading-none ${blocked.length > 0 ? 'text-red-400' : 'text-slate-600'}`}>
              {blocked.length}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">заблокировано</p>
          </div>
        </div>
      </div>

      {/* Recent completed */}
      {recent.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-white/[0.04]">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">Недавно завершено</p>
          {recent.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] mt-0.5 shrink-0">✅</span>
              <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">{t.title ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Blocked tasks preview */}
      {blocked.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-white/[0.04]">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">Блокеры</p>
          {blocked.slice(0, 2).map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] mt-0.5 shrink-0">🚫</span>
              <p className="text-[11px] text-red-400/80 leading-snug line-clamp-1">{t.title ?? '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

// ── Quick Actions ─────────────────────────────────────────────────────────────

function QuickActions({ onOpenCapture }: { onOpenCapture: () => void }) {
  const navigate = useNavigate()

  const actions = [
    { icon: Plus,        label: 'Добавить задачу', onClick: () => navigate('/tasks') },
    { icon: Inbox,       label: 'Quick Capture',   onClick: onOpenCapture },
    { icon: Lightbulb,   label: 'Разобрать идеи',  onClick: () => navigate('/ideas-triage') },
    { icon: TrendingUp,  label: '📊 Статистика',   onClick: () => navigate('/stats') },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map(({ icon: Icon, label, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          className="flex items-center gap-2.5 bg-transparent border border-white/[0.10] hover:border-accent/40 hover:bg-accent/5 active:bg-accent/10 rounded-2xl px-4 py-3 text-left transition-colors"
        >
          <Icon size={16} className="text-accent shrink-0" strokeWidth={1.75} />
          <span className="text-sm text-slate-300 leading-tight">{label}</span>
        </button>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { stats, loading } = useAgentStats()
  const [captureOpen, setCaptureOpen] = useState(false)

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

      <div className="px-4 space-y-6">
        {/* Autorun status + agent count */}
        <AutorunStatus />
        <AgentCountWidget />

        {/* Today's activity */}
        <TodayWidget />

        {/* Agent Status */}
        <AgentStatusWidget />

        {/* CEO Briefing */}
        <CeoBriefingWidget />

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

        {/* Quick actions */}
        <QuickActions onOpenCapture={() => setCaptureOpen(true)} />

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

        {/* Cycle velocity */}
        <CycleVelocity />

        {/* Activity feed */}
        <ActivityFeed />
      </div>

      {captureOpen && <QuickCaptureModal onClose={() => setCaptureOpen(false)} />}

      <p className="text-center text-[11px] text-slate-600 pt-6 pb-2">
        MAOS v0.3 — Cycle 3
      </p>
    </div>
  )
}
