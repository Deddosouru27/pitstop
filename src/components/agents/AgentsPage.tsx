import { useState } from 'react'
import { Users, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAgents } from '../../hooks/useAgents'
import type { Agent, AgentStatus } from '../../hooks/useAgents'

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}с назад`
  if (diff < 3600)  return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_CFG: Record<AgentStatus, { label: string; cls: string; pulse: boolean }> = {
  idle:    { label: 'Свободен',  cls: 'bg-slate-700 text-slate-400',          pulse: false },
  working: { label: 'Работает',  cls: 'bg-emerald-900/60 text-emerald-400',   pulse: true  },
  stuck:   { label: 'Застрял',   cls: 'bg-yellow-900/50 text-yellow-400',     pulse: false },
  failed:  { label: 'Ошибка',    cls: 'bg-red-900/50 text-red-400',           pulse: false },
  offline: { label: 'Офлайн',    cls: 'bg-slate-800 text-slate-600',          pulse: false },
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.offline
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'working' ? 'bg-emerald-400 animate-pulse' :
        status === 'stuck'   ? 'bg-yellow-400' :
        status === 'failed'  ? 'bg-red-400' :
        status === 'idle'    ? 'bg-slate-400' : 'bg-slate-600'
      }`} />
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

// ── Agent card ─────────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: Agent }) {
  const heartbeat = agent.last_heartbeat ? timeAgo(agent.last_heartbeat) : 'Нет данных'

  return (
    <div className={`bg-white/5 rounded-2xl border p-4 space-y-3 ${
      agent.status === 'failed' ? 'border-red-500/30' :
      agent.status === 'stuck'  ? 'border-yellow-500/20' :
      agent.status === 'working' ? 'border-emerald-500/20' :
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
      <span className={active > 0 ? 'text-emerald-400' : 'text-slate-600'}>
        {active} работают
      </span>
      <span className="text-slate-700">·</span>
      <span className={stuck > 0 ? 'text-yellow-400' : 'text-slate-600'}>
        {stuck} застряли
      </span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

type AutorunState = 'idle' | 'loading' | 'success' | 'error'

export default function AgentsPage() {
  const { agents, loading, refresh } = useAgents()
  const [autorunState, setAutorunState] = useState<AutorunState>('idle')
  const [refreshing, setRefreshing]     = useState(false)

  const handleStartAutorun = async () => {
    setAutorunState('loading')
    const { error } = await supabase.from('agent_jobs').insert({
      type:    'autorun_start',
      payload: { project: 'MAOS' },
      status:  'pending',
    })
    if (error) {
      setAutorunState('error')
      setTimeout(() => setAutorunState('idle'), 3000)
    } else {
      setAutorunState('success')
      setTimeout(() => setAutorunState('idle'), 4000)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const autorunLabel: Record<AutorunState, string> = {
    idle:    '🚀 Запустить Autorun',
    loading: 'Отправка...',
    success: '✅ Команда отправлена',
    error:   '❌ Ошибка',
  }

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
          disabled={autorunState === 'loading' || autorunState === 'success'}
          className={`w-full font-semibold rounded-xl py-3 text-sm transition-colors ${
            autorunState === 'success'
              ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/40'
              : autorunState === 'error'
              ? 'bg-red-900/40 text-red-400 border border-red-700/30'
              : 'bg-purple-700/30 hover:bg-purple-700/50 text-purple-300 border border-purple-600/30'
          } disabled:opacity-60`}
        >
          {autorunLabel[autorunState]}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 py-20 text-slate-500 text-sm">
          Загрузка...
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
