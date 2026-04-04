import { useNavigate } from 'react-router-dom'
import { ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react'
import { useAudit } from '../../hooks/useAudit'

// ── Helpers ───────────────────────────────────────────────────────────────────

type Level = 'green' | 'yellow' | 'red'

function fmtTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}с назад`
  if (diff < 3600)  return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

// ── Components ────────────────────────────────────────────────────────────────

const LEVEL_DOT: Record<Level, string> = {
  green:  'bg-emerald-500',
  yellow: 'bg-amber-500',
  red:    'bg-red-500',
}
const LEVEL_TEXT: Record<Level, string> = {
  green:  'text-emerald-400',
  yellow: 'text-amber-400',
  red:    'text-red-400',
}
const LEVEL_BORDER: Record<Level, string> = {
  green:  'border-white/[0.06]',
  yellow: 'border-amber-600/20',
  red:    'border-red-500/30',
}

function CheckRow({ label, value, level, sub }: { label: string; value: string; level: Level; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-t border-white/[0.04] first:border-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${LEVEL_DOT[level]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
      <p className={`text-xs font-semibold shrink-0 ${LEVEL_TEXT[level]}`}>{value}</p>
    </div>
  )
}

function Card({
  icon, title, level, children,
}: {
  icon: string; title: string; level: Level; children: React.ReactNode
}) {
  return (
    <div className={`bg-white/[0.04] rounded-2xl border px-4 py-4 space-y-0.5 ${LEVEL_BORDER[level]}`}>
      <div className="flex items-center gap-2 pb-2">
        <span>{icon}</span>
        <p className="flex-1 text-sm font-semibold text-slate-200">{title}</p>
        <span className={`w-2.5 h-2.5 rounded-full ${LEVEL_DOT[level]}`} />
      </div>
      {children}
    </div>
  )
}

// ── Suggestions ───────────────────────────────────────────────────────────────

interface Suggestion {
  id: string
  priority: number  // higher = more critical
  icon: string
  text: string
  action?: { label: string; to: string }
}

function buildSuggestions(d: NonNullable<ReturnType<typeof useAudit>['data']>): Suggestion[] {
  const list: Suggestion[] = []

  if (d.openBlockers.length > 0) {
    list.push({
      id: 'blockers',
      priority: 10,
      icon: '🚫',
      text: `Нерешённые блокеры (${d.openBlockers.length}): ${d.openBlockers.slice(0, 2).map(b => b.title).join(', ')}${d.openBlockers.length > 2 ? '…' : ''}`,
      action: { label: 'Перейти к задачам', to: '/tasks' },
    })
  }

  const staleAgents = d.agents.filter(
    a => a.minutesSinceHeartbeat === null || a.minutesSinceHeartbeat > 60
  )
  for (const a of staleAgents) {
    list.push({
      id: `agent-${a.id}`,
      priority: 9,
      icon: '🤖',
      text: `Агент ${a.name} не отвечает${a.minutesSinceHeartbeat ? ` (${a.minutesSinceHeartbeat}м без heartbeat)` : ' (никогда не выходил на связь)'}`,
      action: { label: 'Перейти к агентам', to: '/agents' },
    })
  }

  if (d.hoursSinceSnapshot !== null && d.hoursSinceSnapshot > 24) {
    list.push({
      id: 'stale-snapshot',
      priority: 8,
      icon: '🧠',
      text: `Мозг не обновлялся больше суток (${d.hoursSinceSnapshot}ч без нового snapshot)`,
      action: { label: 'Dashboard', to: '/dashboard' },
    })
  }

  if (d.staleIdeas > 50) {
    list.push({
      id: 'stale-ideas',
      priority: 6,
      icon: '💡',
      text: `${d.staleIdeas} непросмотренных идей. Запустите разбор.`,
      action: { label: 'Ideas Triage', to: '/ideas-triage' },
    })
  }

  const noEntityPct = d.knowledgeTotal > 0
    ? Math.round(d.noEntityCount / d.knowledgeTotal * 100)
    : 0
  if (noEntityPct > 20) {
    list.push({
      id: 'no-entities',
      priority: 5,
      icon: '🕸',
      text: `${noEntityPct}% знаний без связей (entities). Запустите entity extraction.`,
      action: { label: 'Data Quality', to: '/data-quality' },
    })
  }

  const noBusinessPct = d.knowledgeTotal > 0
    ? Math.round(d.noBusinessValueCount / d.knowledgeTotal * 100)
    : 0
  if (noBusinessPct > 30) {
    list.push({
      id: 'no-business',
      priority: 4,
      icon: '💼',
      text: `${noBusinessPct}% знаний без business_value. Оцените ценность записей.`,
      action: { label: 'База знаний', to: '/knowledge' },
    })
  }

  return list.sort((a, b) => b.priority - a.priority)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const navigate = useNavigate()
  const { data, loading, lastUpdated, refresh } = useAudit()

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-purple-400" strokeWidth={1.75} />
            <h1 className="text-2xl font-bold text-slate-100">System Audit</h1>
          </div>
          <button
            onClick={() => void refresh()}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          Здоровье MAOS Brain · {lastUpdated ? `обновлено ${fmtTime(lastUpdated.toISOString())}` : 'обновляется…'}
        </p>
        <p className="text-xs text-slate-600 mt-1">Автообновление каждые 60с</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 py-20 text-slate-500 text-sm">Загрузка...</div>
      ) : !data ? null : (
        <div className="px-4 space-y-4">

          {/* Planning */}
          {(() => {
            const blockerLevel: Level = data.openBlockers.length > 0 ? 'red' : 'green'
            const idleRatio = data.totalIdeas > 0 ? data.staleIdeas / data.totalIdeas : 0
            const ideasLevel: Level = idleRatio > 0.7 ? 'red' : idleRatio > 0.4 ? 'yellow' : 'green'
            const overall: Level = blockerLevel === 'red' ? 'red' : ideasLevel === 'red' ? 'red' : ideasLevel === 'yellow' ? 'yellow' : 'green'
            return (
              <Card icon="📋" title="Планирование" level={overall}>
                <CheckRow
                  label="Открытые блокеры"
                  value={data.openBlockers.length === 0 ? '0 ✅' : String(data.openBlockers.length)}
                  level={blockerLevel}
                  sub={data.openBlockers.length > 0 ? data.openBlockers.slice(0, 2).map(b => b.title).join(' · ') : undefined}
                />
                <CheckRow
                  label="Непросмотренные идеи"
                  value={`${data.staleIdeas} / ${data.totalIdeas}`}
                  level={ideasLevel}
                />
                <CheckRow
                  label="Задач в очереди (todo)"
                  value={String(data.todoTasks)}
                  level={data.todoTasks > 20 ? 'yellow' : 'green'}
                />
                <CheckRow
                  label="Готовы для Autorun"
                  value={String(data.autorunReady)}
                  level={data.autorunReady > 0 ? 'green' : 'yellow'}
                />
              </Card>
            )
          })()}

          {/* Context */}
          {(() => {
            const snapLevel: Level = data.hoursSinceSnapshot === null
              ? 'yellow'
              : data.hoursSinceSnapshot > 48 ? 'red'
              : data.hoursSinceSnapshot > 24 ? 'yellow' : 'green'
            return (
              <Card icon="🧠" title="Контекст" level={snapLevel}>
                <CheckRow
                  label="Последний snapshot"
                  value={data.lastSnapshotAt ? fmtTime(data.lastSnapshotAt) : '—'}
                  level={snapLevel}
                  sub={data.hoursSinceSnapshot !== null && data.hoursSinceSnapshot > 24
                    ? `${data.hoursSinceSnapshot}ч без обновления`
                    : undefined}
                />
                <CheckRow
                  label="База знаний"
                  value={`${data.knowledgeTotal} записей`}
                  level={data.knowledgeTotal > 0 ? 'green' : 'yellow'}
                />
              </Card>
            )
          })()}

          {/* Agents */}
          {(() => {
            const stale = data.agents.filter(
              a => a.minutesSinceHeartbeat === null || a.minutesSinceHeartbeat > 60
            )
            const overall: Level = stale.length > 2 ? 'red' : stale.length > 0 ? 'yellow' : 'green'
            return (
              <Card icon="🤖" title="Агенты" level={overall}>
                {data.agents.length === 0 ? (
                  <CheckRow label="Нет данных об агентах" value="—" level="yellow" />
                ) : data.agents.map(a => {
                  const m = a.minutesSinceHeartbeat
                  const lvl: Level = m === null ? 'yellow' : m > 60 ? 'red' : m > 15 ? 'yellow' : 'green'
                  return (
                    <CheckRow
                      key={a.id}
                      label={`${a.name} (${a.role})`}
                      value={a.lastHeartbeat ? fmtTime(a.lastHeartbeat) : 'нет данных'}
                      level={lvl}
                    />
                  )
                })}
              </Card>
            )
          })()}

          {/* Knowledge quality */}
          {(() => {
            const t = data.knowledgeTotal
            const noBusinessPct = t > 0 ? Math.round(data.noBusinessValueCount / t * 100) : 0
            const noEntityPct   = t > 0 ? Math.round(data.noEntityCount / t * 100) : 0
            const bLevel: Level = noBusinessPct > 30 ? 'red' : noBusinessPct > 10 ? 'yellow' : 'green'
            const eLevel: Level = noEntityPct > 50 ? 'red' : noEntityPct > 20 ? 'yellow' : 'green'
            const overall: Level = bLevel === 'red' || eLevel === 'red' ? 'red' : bLevel === 'yellow' || eLevel === 'yellow' ? 'yellow' : 'green'
            return (
              <Card icon="📚" title="Качество знаний" level={overall}>
                <CheckRow
                  label="Без business_value"
                  value={`${data.noBusinessValueCount} (${noBusinessPct}%)`}
                  level={bLevel}
                />
                <CheckRow
                  label="Без entities (связей)"
                  value={`${data.noEntityCount} (${noEntityPct}%)`}
                  level={eLevel}
                />
              </Card>
            )
          })()}

          {/* Suggestions */}
          {(() => {
            const suggestions = buildSuggestions(data)
            return (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                  💡 Предложения
                </p>
                {suggestions.length === 0 ? (
                  <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-2xl px-4 py-4 text-center">
                    <p className="text-sm font-semibold text-emerald-400">✅ Система в порядке</p>
                    <p className="text-xs text-emerald-600 mt-1">Всё работает нормально</p>
                  </div>
                ) : (
                  suggestions.map(s => (
                    <div
                      key={s.id}
                      className={`bg-white/[0.04] rounded-2xl border px-4 py-3 space-y-2 ${
                        s.priority >= 9 ? 'border-red-500/30' : s.priority >= 7 ? 'border-amber-600/20' : 'border-white/[0.06]'
                      }`}
                    >
                      <p className="text-sm text-slate-300 leading-snug">
                        {s.icon} {s.text}
                      </p>
                      {s.action && (
                        <button
                          onClick={() => navigate(s.action!.to)}
                          className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          <ExternalLink size={11} />
                          {s.action.label}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )
          })()}

        </div>
      )}
    </div>
  )
}
