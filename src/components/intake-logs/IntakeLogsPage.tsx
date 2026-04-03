import { useState, useMemo } from 'react'
import { ExternalLink, ChevronDown, ChevronRight, Inbox } from 'lucide-react'
import { useIngestedContent } from '../../hooks/useIngestedContent'
import type { IngestedContent } from '../../types'

const SOURCE_LABELS: Record<string, string> = {
  youtube:   '▶ YouTube',
  instagram: '📸 Instagram',
  article:   '📄 Article',
  text:      '📝 Manual',
  thread:    '🐦 Thread',
}

const SOURCE_COLORS: Record<string, string> = {
  youtube:   'bg-red-900/50 text-red-300',
  instagram: 'bg-pink-900/50 text-pink-300',
  article:   'bg-blue-900/50 text-blue-300',
  text:      'bg-slate-700/50 text-slate-300',
  thread:    'bg-sky-900/50 text-sky-300',
}

function SourceBadge({ type }: { type: string | null }) {
  const key = type ?? 'text'
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${SOURCE_COLORS[key] ?? 'bg-slate-700/50 text-slate-400'}`}>
      {SOURCE_LABELS[key] ?? key}
    </span>
  )
}

function ScoreDot({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-slate-600 text-xs">—</span>
  const color = value >= 0.7 ? 'text-green-400' : value >= 0.4 ? 'text-yellow-400' : 'text-slate-500'
  return <span className={`text-xs font-mono ${color}`}>{value.toFixed(2)}</span>
}

function formatRouting(r: IngestedContent['routing_result']): string {
  if (!r) return ''
  if (typeof r === 'string') return r
  return Object.entries(r).map(([k, v]) => `${k}:${v}`).join(' ')
}

function LogRow({ item }: { item: IngestedContent }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(item.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  const displayUrl = item.source_url
    ? item.source_url.replace(/^https?:\/\//, '').slice(0, 55)
    : item.title ?? '—'

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left active:bg-white/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? <ChevronDown size={13} className="text-slate-500 shrink-0" /> : <ChevronRight size={13} className="text-slate-500 shrink-0" />}
        <SourceBadge type={item.source_type} />
        <span className="flex-1 text-xs text-slate-300 truncate">{displayUrl}</span>
        <span className="text-[10px] text-slate-500 shrink-0">{item.knowledge_count ?? 0}к</span>
        <ScoreDot value={item.overall_immediate} />
        <span className="text-[10px] text-slate-600 shrink-0">{date}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 space-y-2 border-t border-white/[0.04]">
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-400 break-all"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={11} className="shrink-0" />
              {item.source_url}
            </a>
          )}
          <div className="flex gap-4 text-xs text-slate-400">
            <span>Знаний: <span className="text-slate-200">{item.knowledge_count ?? 0}</span></span>
            <span>Immediate: <span className="text-slate-200">{item.overall_immediate?.toFixed(2) ?? '—'}</span></span>
            <span>Strategic: <span className="text-slate-200">{item.overall_strategic?.toFixed(2) ?? '—'}</span></span>
            <span className={`${item.processing_status === 'done' ? 'text-green-400' : 'text-yellow-400'}`}>{item.processing_status}</span>
          </div>
          {item.routing_result && (
            <p className="text-[11px] text-slate-500 font-mono">{formatRouting(item.routing_result)}</p>
          )}
          {item.summary && (
            <p className="text-xs text-slate-300 leading-relaxed">{item.summary}</p>
          )}
        </div>
      )}
    </div>
  )
}

const ALL_SOURCES = ['all', 'youtube', 'instagram', 'article', 'text', 'thread'] as const

export default function IntakeLogsPage() {
  const { items, loading, error } = useIngestedContent()
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const i of items) {
      const k = i.source_type ?? 'text'
      counts[k] = (counts[k] ?? 0) + 1
    }
    return counts
  }, [items])

  const filtered = useMemo(() =>
    sourceFilter === 'all' ? items : items.filter(i => (i.source_type ?? 'text') === sourceFilter)
  , [items, sourceFilter])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Inbox size={18} className="text-slate-400" />
          <h1 className="text-base font-semibold text-slate-100">Intake Logs</h1>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <p className="text-xs text-slate-500">История обработки контента через pipeline</p>
      </div>

      {/* Source filter */}
      <div className="px-4 pb-3 flex gap-1.5 flex-wrap shrink-0">
        {ALL_SOURCES.filter(s => s === 'all' || (sourceCounts[s] ?? 0) > 0).map(s => (
          <button
            key={s}
            onClick={() => setSourceFilter(s)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              sourceFilter === s
                ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                : 'bg-white/5 border-white/[0.06] text-slate-400 active:bg-white/10'
            }`}
          >
            {s === 'all' ? `Все (${items.length})` : `${SOURCE_LABELS[s] ?? s} (${sourceCounts[s] ?? 0})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
        {loading && <p className="text-sm text-slate-500 py-8 text-center">Загрузка...</p>}
        {error && <p className="text-sm text-red-400 py-8 text-center">{error}</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center">Нет записей</p>
        )}
        {filtered.map(item => <LogRow key={item.id} item={item} />)}
      </div>
    </div>
  )
}
