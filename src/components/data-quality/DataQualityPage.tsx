import { Activity } from 'lucide-react'
import { useDataQuality } from '../../hooks/useDataQuality'
import type { IdeasHealth, KnowledgeHealth, EntityHealth, IngestionHealth } from '../../hooks/useDataQuality'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}с назад`
  if (diff < 3600)  return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

type HealthLevel = 'green' | 'yellow' | 'red'

function indicatorCls(level: HealthLevel) {
  return level === 'green'
    ? 'bg-emerald-500'
    : level === 'yellow'
    ? 'bg-yellow-500'
    : 'bg-red-500'
}

function valueCls(level: HealthLevel) {
  return level === 'green'
    ? 'text-emerald-400'
    : level === 'yellow'
    ? 'text-yellow-400'
    : 'text-red-400'
}

// ── Stat row ──────────────────────────────────────────────────────────────────

function StatRow({
  label, value, level, tooltip,
}: {
  label: string
  value: string | number
  level?: HealthLevel
  tooltip?: string
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-t border-white/[0.04] first:border-0">
      <p
        className={`flex-1 text-xs text-slate-400 ${tooltip ? 'underline decoration-dotted decoration-slate-600 cursor-help' : ''}`}
        title={tooltip}
      >
        {label}
      </p>
      <p className={`text-xs font-semibold ${level ? valueCls(level) : 'text-slate-200'}`}>
        {value}
      </p>
      {level && <span className={`w-2 h-2 rounded-full shrink-0 ${indicatorCls(level)}`} />}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({
  icon, title, overallLevel, children,
}: {
  icon: string
  title: string
  overallLevel: HealthLevel
  children: React.ReactNode
}) {
  return (
    <div className={`bg-white/5 rounded-2xl border px-4 py-4 space-y-1 ${
      overallLevel === 'red' ? 'border-red-500/30' : overallLevel === 'yellow' ? 'border-yellow-500/20' : 'border-white/[0.06]'
    }`}>
      <div className="flex items-center gap-2 pb-1">
        <span className="text-base">{icon}</span>
        <p className="flex-1 text-sm font-semibold text-slate-200">{title}</p>
        <span className={`w-2.5 h-2.5 rounded-full ${indicatorCls(overallLevel)}`} />
      </div>
      {children}
    </div>
  )
}

// ── Ideas section ─────────────────────────────────────────────────────────────

function IdeasSection({ d }: { d: IdeasHealth }) {
  const hotLevel: HealthLevel = d.hotRatio > 50 ? 'red' : d.hotRatio > 40 ? 'yellow' : 'green'
  const overall: HealthLevel = hotLevel === 'red' ? 'red' : hotLevel === 'yellow' ? 'yellow' : 'green'
  return (
    <Section icon="💡" title="Идеи" overallLevel={overall}>
      <StatRow label="Всего идей" value={d.total} />
      <StatRow label="Активных (не разобрано)" value={d.active} />
      <StatRow label="Отклонено" value={d.rejected} level={d.rejected > d.total * 0.3 ? 'yellow' : 'green'} />
      <StatRow
        label="Доля горящих"
        value={`${d.hot} / ${d.active} = ${d.hotRatio}%`}
        level={hotLevel}
        tooltip="Идеи с высоким приоритетом. Норма < 40%"
      />
      <StatRow label="Превращено в задачи" value={d.convertedToTask} level={d.convertedToTask > 0 ? 'green' : 'yellow'} />
    </Section>
  )
}

// ── Knowledge section ─────────────────────────────────────────────────────────

function KnowledgeSection({ d }: { d: KnowledgeHealth }) {
  const clusterPct = d.total > 0 ? Math.round(d.withoutCluster / d.total * 100) : 0
  const clusterLevel: HealthLevel = clusterPct > 50 ? 'red' : clusterPct > 20 ? 'yellow' : 'green'
  const lowPct = d.total > 0 ? Math.round(d.lowScore / d.total * 100) : 0
  const lowLevel: HealthLevel = lowPct > 30 ? 'red' : lowPct > 10 ? 'yellow' : 'green'
  const overall: HealthLevel = clusterLevel === 'red' || lowLevel === 'red' ? 'red' : clusterLevel === 'yellow' || lowLevel === 'yellow' ? 'yellow' : 'green'
  return (
    <Section icon="🧠" title="База знаний" overallLevel={overall}>
      <StatRow label="Всего знаний" value={d.total} />
      <StatRow
        label="Без темы"
        value={`${d.withoutCluster} (${clusterPct}%)`}
        level={clusterLevel}
        tooltip="Знания которые система не смогла отнести к теме"
      />
      <StatRow
        label="Без оценки важности"
        value={`${d.lowScore} (${lowPct}%)`}
        level={lowLevel}
        tooltip="Знания без заполненного поля business_value. Зелёный < 10%, жёлтый 10–30%, красный > 30%."
      />
    </Section>
  )
}

// ── Entity graph section ──────────────────────────────────────────────────────

function EntitySection({ d }: { d: EntityHealth }) {
  const orphanPct = d.nodes > 0 ? Math.round(d.orphanNodes / d.nodes * 100) : 0
  const orphanLevel: HealthLevel = orphanPct > 30 ? 'red' : orphanPct > 10 ? 'yellow' : 'green'
  const overall: HealthLevel = d.nodes === 0 ? 'yellow' : orphanLevel
  return (
    <Section icon="🕸" title="Граф связей" overallLevel={overall}>
      <StatRow
        label="Сущности"
        value={d.nodes}
        level={d.nodes > 0 ? 'green' : 'yellow'}
        tooltip="Люди, технологии, проекты упомянутые в знаниях"
      />
      <StatRow
        label="Связи"
        value={d.edges}
        tooltip="Как сущности связаны между собой"
      />
      <StatRow label="Среднее связей на сущность" value={d.nodes > 0 ? ((d.edges * 2) / d.nodes).toFixed(1) : '—'} />
      <StatRow
        label="Одиночки"
        value={`${d.orphanNodes} (${orphanPct}%)`}
        level={orphanLevel}
        tooltip="Сущности без единой связи. Небольшое количество — норма."
      />
    </Section>
  )
}

// ── Ingestion section ─────────────────────────────────────────────────────────

function IngestionSection({ d }: { d: IngestionHealth }) {
  const sinceIngestion = d.lastIngestedAt
    ? (Date.now() - new Date(d.lastIngestedAt).getTime()) / 1000 / 3600
    : Infinity
  const freshLevel: HealthLevel = sinceIngestion > 48 ? 'red' : sinceIngestion > 24 ? 'yellow' : 'green'
  const failLevel: HealthLevel = d.failedCount > 5 ? 'red' : d.failedCount > 0 ? 'yellow' : 'green'
  const overall: HealthLevel = freshLevel === 'red' || failLevel === 'red' ? 'red' : freshLevel === 'yellow' || failLevel === 'yellow' ? 'yellow' : 'green'
  return (
    <Section icon="📥" title="Входящие данные" overallLevel={overall}>
      <StatRow label="Последнее" value={d.lastIngestedAt ? timeAgo(d.lastIngestedAt) : '—'} level={freshLevel} />
      <StatRow label="Ошибок" value={d.failedCount} level={failLevel} />
      <StatRow label="За 7 дней" value={d.thisWeekCount} level={d.thisWeekCount > 0 ? 'green' : 'yellow'} />
    </Section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DataQualityPage() {
  const { data, loading } = useDataQuality()

  return (
    <div className="flex flex-col min-h-full pb-8">
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-slate-100">Data Quality</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">Мониторинг здоровья данных MAOS Brain</p>
        <p className="text-xs text-slate-600 mt-2">
          🟢 Норма · 🟡 Требует внимания · 🔴 Проблема
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 py-20 text-slate-500 text-sm">
          Загрузка...
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center flex-1 py-20 text-slate-500 text-sm">
          Нет данных
        </div>
      ) : (
        <div className="px-4 space-y-3">
          <IdeasSection d={data.ideas} />
          <KnowledgeSection d={data.knowledge} />
          <EntitySection d={data.entity} />
          <IngestionSection d={data.ingestion} />
        </div>
      )}
    </div>
  )
}
