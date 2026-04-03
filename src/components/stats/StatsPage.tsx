import { BarChart2 } from 'lucide-react'
import { useStatsData } from '../../hooks/useStatsData'
import type { DayCount, RelevanceStat, EntityStats, SourceStat } from '../../hooks/useStatsData'

// ── Palette ───────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  link:      'Ссылки',
  article:   'Статьи',
  text:      'Текст',
}

const SOURCE_COLORS: Record<string, string> = {
  youtube:        '#ef4444',
  instagram:      '#ec4899',
  telegram:       '#3b82f6',
  link:           '#6366f1',
  text:           '#64748b',
  article:        '#0ea5e9',
  'manual-paste': '#8b5cf6',
  unknown:        '#475569',
}

const PIE_FALLBACK = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#ef4444']

function sourceColor(st: string, idx: number) {
  return SOURCE_COLORS[st] ?? PIE_FALLBACK[idx % PIE_FALLBACK.length]
}

// ── Line Chart ────────────────────────────────────────────────────────────────

function LineChart({ data }: { data: DayCount[] }) {
  if (data.length === 0 || data.every(d => d.count === 0)) {
    return <EmptyState label="нет данных за 14 дней" />
  }

  const W = 320
  const H = 100
  const PAD_L = 28
  const PAD_B = 20
  const PAD_T = 8
  const PAD_R = 8

  const maxVal = Math.max(...data.map(d => d.count), 1)
  const xStep = (W - PAD_L - PAD_R) / (data.length - 1)

  function cx(i: number) { return PAD_L + i * xStep }
  function cy(v: number) { return PAD_T + (H - PAD_T - PAD_B) * (1 - v / maxVal) }

  const linePts = data.map((d, i) => `${cx(i)},${cy(d.count)}`).join(' ')
  const areaPath = `M ${cx(0)},${cy(data[0].count)} ` +
    data.slice(1).map((d, i) => `L ${cx(i + 1)},${cy(d.count)}`).join(' ') +
    ` L ${cx(data.length - 1)},${H - PAD_B} L ${cx(0)},${H - PAD_B} Z`

  // Y axis labels: 0 and max
  const yLabels = [
    { y: cy(0),      label: '0' },
    { y: cy(maxVal), label: String(maxVal) },
  ]

  // X axis: show every ~3 days
  const xLabels = data
    .map((d, i) => ({ i, label: d.date.slice(5) })) // "MM-DD"
    .filter((_, i) => i % 3 === 0 || i === data.length - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.5, 1].map(frac => {
        const y = PAD_T + (H - PAD_T - PAD_B) * frac
        return <line key={frac} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#ffffff08" strokeWidth="1" />
      })}
      {/* Area */}
      <path d={areaPath} fill="url(#areaGrad)" />
      {/* Line */}
      <polyline points={linePts} fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots for non-zero */}
      {data.map((d, i) => d.count > 0 && (
        <circle key={i} cx={cx(i)} cy={cy(d.count)} r="2.5" fill="#7c3aed" />
      ))}
      {/* Y labels */}
      {yLabels.map(({ y, label }) => (
        <text key={label} x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize="8" fill="#475569">{label}</text>
      ))}
      {/* X labels */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={cx(i)} y={H} textAnchor="middle" fontSize="8" fill="#475569">{label}</text>
      ))}
    </svg>
  )
}

// ── Bar Chart (Ideas by relevance) ────────────────────────────────────────────

function RelevanceBar({ data }: { data: RelevanceStat[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <EmptyState label="нет ideas" />

  const BAR_COLORS = ['#f97316', '#3b82f6', '#475569']
  const W = 320
  const H = 90
  const PAD_L = 80
  const PAD_R = 8
  const barH = 18
  const gap = 10
  const maxVal = Math.max(...data.map(d => d.count), 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
      {data.map((d, i) => {
        const y = i * (barH + gap)
        const bw = Math.max(2, ((W - PAD_L - PAD_R) * d.count) / maxVal)
        return (
          <g key={d.label}>
            <text x={PAD_L - 6} y={y + barH * 0.7} textAnchor="end" fontSize="9" fill="#94a3b8">{d.label}</text>
            <rect x={PAD_L} y={y} width={bw} height={barH} rx="4" fill={BAR_COLORS[i]} opacity="0.85" />
            <text x={PAD_L + bw + 5} y={y + barH * 0.72} fontSize="9" fill="#64748b">
              {d.count} · {d.pct}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Entity stat cards ─────────────────────────────────────────────────────────

function EntityStatsCards({ stats }: { stats: EntityStats }) {
  const cards = [
    { label: 'Сущностей', value: stats.nodes, icon: '🕸' },
    { label: 'Связей', value: stats.edges, icon: '🔗' },
    { label: 'Средних связей', value: stats.avgConnections, icon: '📊' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map(c => (
        <div key={c.label} className="bg-white/[0.04] rounded-xl px-3 py-3 text-center space-y-1 border border-white/[0.06]">
          <p className="text-lg">{c.icon}</p>
          <p className="text-xl font-bold text-slate-100">{c.value}</p>
          <p className="text-[10px] text-slate-500">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Donut chart (Ingestion sources) ──────────────────────────────────────────

function DonutChart({ data }: { data: SourceStat[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0 || data.length === 0) return <EmptyState label="нет ingestion данных" />

  const R = 38
  const CX = 50
  const CY = 50

  function polarToXY(angle: number, r: number) {
    const rad = (angle - 90) * (Math.PI / 180)
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
  }

  const slices: { path: string; color: string; label: string; count: number; pct: number }[] = []
  let startAngle = 0
  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const pct = d.count / total
    const sweep = pct * 360
    const endAngle = startAngle + sweep
    const largeArc = sweep > 180 ? 1 : 0
    const start = polarToXY(startAngle, R)
    const end = polarToXY(endAngle, R)
    const innerR = R * 0.55
    const startIn = polarToXY(startAngle, innerR)
    const endIn = polarToXY(endAngle, innerR)
    const path = [
      `M ${start.x} ${start.y}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      `L ${endIn.x} ${endIn.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${startIn.x} ${startIn.y}`,
      'Z',
    ].join(' ')
    slices.push({ path, color: sourceColor(d.source_type, i), label: d.source_type, count: d.count, pct: Math.round(pct * 100) })
    startAngle = endAngle
  }

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="shrink-0" style={{ width: 100, height: 100 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity="0.9" />
        ))}
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="bold">{total}</text>
      </svg>
      <div className="flex-1 space-y-1 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-[10px] text-slate-400 truncate flex-1">{SOURCE_LABELS[s.label] ?? s.label}</span>
            <span className="text-[10px] text-slate-600 shrink-0">{s.count} · {s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-16 text-slate-600 text-xs">{label}</div>
  )
}

// ── Widget wrapper ────────────────────────────────────────────────────────────

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/[0.06] px-4 py-4 space-y-3">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { data, loading } = useStatsData()

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <BarChart2 size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-slate-100">Stats</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">MAOS Brain — состояние системы</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 text-slate-500 text-sm py-20">
          Загрузка...
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center flex-1 text-slate-500 text-sm py-20">
          Нет данных
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {/* 1. Knowledge over time */}
          <Widget title="📚 Знания по времени (14 дней)">
            <LineChart data={data.knowledgeByDay} />
            <p className="text-[10px] text-slate-600 text-right">
              итого за период: {data.knowledgeByDay.reduce((s, d) => s + d.count, 0)}
            </p>
          </Widget>

          {/* 2. Ideas by relevance */}
          <Widget title="💡 Идеи по приоритету">
            <RelevanceBar data={data.relevanceStats} />
          </Widget>

          {/* 3. Entity graph */}
          <Widget title="🕸 Граф сущностей">
            <EntityStatsCards stats={data.entityStats} />
          </Widget>

          {/* 4. Ingestion sources */}
          <Widget title="📥 Источники данных">
            <DonutChart data={data.ingestionSources} />
          </Widget>
        </div>
      )}
    </div>
  )
}
