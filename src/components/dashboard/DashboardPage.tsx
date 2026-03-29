import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BarChart2, ChevronDown, X } from 'lucide-react'
import { useAgentStats } from '../../hooks/useAgentStats'
import { useCyclePlan } from '../../hooks/useCyclePlan'
import type { CyclePlanPhase, Task } from '../../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function CycleWidget() {
  const { plan, tasksByPhase, loading } = useCyclePlan()
  const phases = plan?.phases ?? []
  const activePhaseNum = phases.find(p => p.status === 'active')?.number ?? null
  const [expanded, setExpanded] = useState<number | null>(null)
  const [initialised, setInitialised] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Set default expansion once when plan first loads
  useEffect(() => {
    if (!initialised && activePhaseNum !== null) {
      setExpanded(activePhaseNum)
      setInitialised(true)
    }
  }, [initialised, activePhaseNum])

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
  const doneTasks = allTasks.filter(t => t.status === 'done' || t.is_completed).length

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
          const phaseDone = phaseTasks.filter(t => t.status === 'done' || t.is_completed).length

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
                <div className="px-3 pb-3">
                  {isActive && phase.description && (
                    <p className="text-xs text-slate-500 mb-2 leading-relaxed">{phase.description}</p>
                  )}
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

      <div className="px-4 space-y-6">
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
      </div>
    </div>
  )
}
