import { useNavigate } from 'react-router-dom'
import { Bell, Lightbulb, ClipboardList, AlertTriangle, ArrowRight } from 'lucide-react'
import { usePendingChanges } from '../../hooks/usePendingChanges'

const RELEVANCE_LABEL: Record<string, string> = {
  hot:      'Горячая',
  strategic: 'Стратег.',
}

const RELEVANCE_COLOR: Record<string, string> = {
  hot:      'text-orange-400 bg-orange-500/10',
  strategic: 'text-blue-400 bg-blue-500/10',
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600)  return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

const MISSING_LABEL: Record<string, string> = {
  goal:          'Цель',
  scope:         'Scope',
  done_criteria: 'Готово когда',
}

export default function PendingPage() {
  const navigate = useNavigate()
  const { ideas, ideasTotal, contextGapTasks, staleAgents, loading } = usePendingChanges()

  const hasIdeas = ideas.length > 0
  const hasGaps  = contextGapTasks.length > 0
  const hasStale = staleAgents.length > 0
  const allEmpty = !hasIdeas && !hasGaps && !hasStale

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <Bell size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Требует внимания</h1>
          <p className="text-xs text-slate-500 mt-0.5">Идеи, задачи и агенты</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-surface rounded-2xl animate-pulse" />)}
        </div>
      ) : allEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-2 text-center">
          <span className="text-3xl">✅</span>
          <p className="text-sm text-slate-400 font-medium">Всё в порядке</p>
          <p className="text-xs text-slate-600">Нет незакрытых пунктов</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Section 1: Unreviewed ideas */}
          {hasIdeas && (
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Lightbulb size={13} className="text-yellow-400" />
                  <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Идеи без разбора
                  </h2>
                </div>
                <span className="text-xs font-semibold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                  {ideasTotal}
                </span>
              </div>

              <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
                {ideas.map(idea => (
                  <div key={idea.id} className="px-4 py-3 flex items-start gap-3">
                    {idea.relevance && RELEVANCE_LABEL[idea.relevance] && (
                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5 ${RELEVANCE_COLOR[idea.relevance] ?? 'text-slate-400 bg-slate-500/10'}`}>
                        {RELEVANCE_LABEL[idea.relevance]}
                      </span>
                    )}
                    <p className="flex-1 text-sm text-slate-300 line-clamp-2 leading-snug">
                      {idea.content}
                    </p>
                    <span className="shrink-0 text-xs text-slate-600 mt-0.5">{timeAgo(idea.created_at)}</span>
                  </div>
                ))}

                <button
                  onClick={() => navigate('/ideas-triage')}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                >
                  Разобрать все <ArrowRight size={12} />
                </button>
              </div>
            </section>
          )}

          {/* Section 2: Tasks missing context */}
          {hasGaps && (
            <section>
              <div className="flex items-center gap-2 mb-3 px-1">
                <ClipboardList size={13} className="text-slate-500" />
                <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Задачи без контекста
                </h2>
              </div>

              <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
                {contextGapTasks.map(task => (
                  <div key={task.id} className="px-4 py-3 space-y-1">
                    <p className="text-sm text-slate-200 font-medium leading-snug line-clamp-1">{task.title}</p>
                    <p className="text-xs text-slate-500">
                      ❌ {task.missing.map(m => MISSING_LABEL[m] ?? m).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 3: Stale agents */}
          {hasStale && (
            <section>
              <div className="flex items-center gap-2 mb-3 px-1">
                <AlertTriangle size={13} className="text-amber-400" />
                <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Агенты без heartbeat
                </h2>
              </div>

              <div className="bg-amber-900/20 border border-amber-700/30 rounded-2xl overflow-hidden divide-y divide-amber-700/20">
                {staleAgents.map(agent => (
                  <div key={agent.name} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{agent.name}</p>
                      <p className="text-xs text-slate-500">{agent.role}</p>
                    </div>
                    <p className="text-xs text-amber-400">
                      {agent.last_heartbeat ? timeAgo(agent.last_heartbeat) : 'Нет данных'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  )
}
