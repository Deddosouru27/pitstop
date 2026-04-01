import { useState, useMemo } from 'react'
import { BookOpen, X, ExternalLink, Search } from 'lucide-react'
import { useExtractedKnowledge } from '../../hooks/useExtractedKnowledge'
import type { ExtractedKnowledge } from '../../types'

const ROUTED_COLORS: Record<string, string> = {
  hot:       'bg-red-900/50 text-red-400',
  knowledge: 'bg-blue-900/50 text-blue-400',
  discard:   'bg-slate-800 text-slate-500',
}

const TYPE_COLORS: Record<string, string> = {
  pattern:     'bg-purple-900/50 text-purple-400',
  insight:     'bg-amber-900/50 text-amber-400',
  decision:    'bg-emerald-900/50 text-emerald-400',
  bug:         'bg-red-900/50 text-red-400',
  feature:     'bg-blue-900/50 text-blue-400',
  code:        'bg-cyan-900/50 text-cyan-400',
}

const SOURCE_TYPE_CFG: Record<string, { label: string; cls: string }> = {
  youtube:       { label: '▶ YouTube',    cls: 'bg-red-900/50 text-red-400' },
  instagram:     { label: '◈ Instagram',  cls: 'bg-pink-900/50 text-pink-400' },
  link:          { label: '🔗 Link',       cls: 'bg-blue-900/50 text-blue-400' },
  text:          { label: '📄 Text',       cls: 'bg-slate-800 text-slate-400' },
  'manual-paste':{ label: '📋 Paste',      cls: 'bg-slate-800 text-slate-400' },
}

function sourceTypeBadge(sourceType: string | null) {
  if (!sourceType) return null
  const cfg = SOURCE_TYPE_CFG[sourceType] ?? { label: sourceType, cls: 'bg-slate-800 text-slate-400' }
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function scoreBar(value: number | null, color: string) {
  if (value == null || isNaN(value)) return <span className="text-[10px] text-slate-600">—</span>
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 w-6 text-right">{pct}</span>
    </div>
  )
}

function KnowledgeModal({ item, onClose }: { item: ExtractedKnowledge; onClose: () => void }) {
  const typeColor = (item.knowledge_type && TYPE_COLORS[item.knowledge_type]) ?? 'bg-slate-800 text-slate-400'
  const routedColor = (item.routed_to && ROUTED_COLORS[item.routed_to]) ?? 'bg-slate-800 text-slate-400'

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[85dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {sourceTypeBadge(item.source_type)}
            {item.knowledge_type && (
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${typeColor}`}>
                {item.knowledge_type}
              </span>
            )}
            {item.routed_to && (
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${routedColor}`}>
                {item.routed_to}
              </span>
            )}
            {item.has_ready_code && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cyan-900/50 text-cyan-400">
                ready code
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
          <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>

          {item.business_value ? (
            <p className="text-slate-400 text-xs leading-relaxed">🎯 {item.business_value}</p>
          ) : (
            <p className="text-slate-600 text-xs italic">Появится при следующем анализе</p>
          )}

          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Immediate relevance</p>
              {scoreBar(item.immediate_relevance, 'bg-amber-500')}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Strategic relevance</p>
              {scoreBar(item.strategic_relevance, 'bg-blue-500')}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Novelty</p>
              {scoreBar(item.novelty, 'bg-purple-500')}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Effort</p>
              {scoreBar(item.effort, 'bg-red-500')}
            </div>
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map(tag => (
                <span key={tag} className="text-xs text-slate-400 bg-white/5 border border-white/[0.06] px-2.5 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-400 active:text-blue-300"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={12} />
              <span className="truncate">{item.source_url}</span>
            </a>
          )}

          <p className="text-xs text-slate-600 border-t border-white/[0.06] pt-3">
            {new Date(item.created_at).toLocaleString('ru-RU', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  )
}

function KnowledgeCard({ item, onOpen }: { item: ExtractedKnowledge; onOpen: (i: ExtractedKnowledge) => void }) {
  const typeColor = (item.knowledge_type && TYPE_COLORS[item.knowledge_type]) ?? 'bg-slate-800 text-slate-400'
  const routedColor = (item.routed_to && ROUTED_COLORS[item.routed_to]) ?? 'bg-slate-800 text-slate-400'
  const dateStr = new Date(item.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <button
      onClick={() => onOpen(item)}
      className="w-full text-left bg-white/5 rounded-2xl p-4 space-y-2 border border-white/[0.06] active:opacity-60 transition-opacity"
    >
      {/* Content + date top-right */}
      <div className="flex items-start gap-2">
        <p className="flex-1 text-slate-100 text-sm leading-relaxed line-clamp-3 overflow-hidden">{item.content}</p>
        <span className="shrink-0 text-[10px] text-slate-600 mt-0.5">{dateStr}</span>
      </div>

      {/* business_value */}
      {item.business_value ? (
        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">🎯 {item.business_value}</p>
      ) : (
        <p className="text-slate-700 text-xs italic">Появится при следующем анализе</p>
      )}

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {sourceTypeBadge(item.source_type)}
        {item.knowledge_type && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
            {item.knowledge_type}
          </span>
        )}
        {item.routed_to && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${routedColor}`}>
            {item.routed_to}
          </span>
        )}
        {item.has_ready_code && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-900/50 text-cyan-400">
            code
          </span>
        )}
        {item.immediate_relevance != null && item.immediate_relevance >= 0.7 && (
          <span className="text-[10px] font-medium text-amber-400">⚡{Math.round(item.immediate_relevance * 10)}</span>
        )}
        {item.strategic_relevance != null && item.strategic_relevance >= 0.7 && (
          <span className="text-[10px] font-medium text-blue-400">🎯{Math.round(item.strategic_relevance * 10)}</span>
        )}
      </div>

      {/* source_url on card */}
      {item.source_url && (
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-blue-400 active:text-blue-300 w-fit"
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={10} />
          <span className="truncate max-w-[200px]">{item.source_url}</span>
        </a>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {item.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="text-[10px] text-slate-600">+{item.tags.length - 3}</span>
          )}
        </div>
      )}
    </button>
  )
}

const INTAKE_URL = 'https://maos-intake.vercel.app/process'

function PasteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed) return
    setStatus('loading')
    try {
      const res = await fetch(INTAKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'manual-paste',
          text: trimmed,
          title: title.trim() || undefined,
          source_type: sourceType.trim() || 'text',
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('ok')
      setTimeout(() => { onSuccess(); onClose() }, 1500)
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Неизвестная ошибка')
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[90dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <p className="text-slate-100 font-semibold">📥 Вставить текст</p>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Заголовок (опционально)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
          />
          <input
            type="text"
            value={sourceType}
            onChange={e => setSourceType(e.target.value)}
            placeholder="Источник: YouTube видео, Instagram Reel, Статья..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
          />
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Вставь текст, транскрипт, конспект..."
            style={{ minHeight: '200px' }}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors resize-none"
          />

          {status === 'ok' && (
            <p className="text-emerald-400 text-sm font-medium text-center py-1">✅ Отправлено</p>
          )}
          {status === 'error' && (
            <p className="text-red-400 text-sm text-center py-1">❌ Ошибка: {errMsg}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!text.trim() || status === 'loading' || status === 'ok'}
            className="w-full bg-purple-600 active:bg-purple-700 disabled:opacity-40 text-white font-semibold rounded-2xl py-3 text-sm transition-colors"
          >
            {status === 'loading' ? 'Отправка...' : 'Отправить в Brain'}
          </button>
        </div>
      </div>
    </div>
  )
}

type SortKey = 'date' | 'immediate' | 'strategic'

export default function KnowledgePage() {
  const { items, loading, error, refresh } = useExtractedKnowledge()
  const [showPaste, setShowPaste] = useState(false)
  const [tabFilter, setTabFilter] = useState<'all' | 'hot_backlog' | 'knowledge_base'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [routeFilter, setRouteFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('date')
  const [selected, setSelected] = useState<ExtractedKnowledge | null>(null)

  const types = useMemo(() => {
    const s = new Set<string>()
    for (const i of items) if (i.knowledge_type) s.add(i.knowledge_type)
    return Array.from(s)
  }, [items])

  const stats = useMemo(() => {
    const hot = items.filter(i => i.routed_to === 'hot').length
    const strategic = items.filter(i => i.strategic_relevance != null && i.strategic_relevance >= 0.7).length
    return { total: items.length, hot, strategic }
  }, [items])

  const routeCounts = useMemo(() => {
    const counts: Record<string, number> = { hot: 0, knowledge: 0, discard: 0 }
    for (const i of items) if (i.routed_to && counts[i.routed_to] !== undefined) counts[i.routed_to]++
    return counts
  }, [items])

  const tabCounts = useMemo(() => ({
    hot_backlog:    items.filter(i => i.routed_to?.includes('hot_backlog')).length,
    knowledge_base: items.filter(i => i.routed_to?.includes('knowledge_base')).length,
  }), [items])

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const i of items) {
      const key = i.source_type ?? 'text'
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [items])

  const filtered = useMemo(() => {
    let result = items.filter(i => {
      if (tabFilter !== 'all' && !i.routed_to?.includes(tabFilter)) return false
      if (typeFilter !== 'all' && i.knowledge_type !== typeFilter) return false
      if (routeFilter !== 'all' && i.routed_to !== routeFilter) return false
      if (sourceFilter !== 'all' && (i.source_type ?? 'text') !== sourceFilter) return false
      if (search.trim() && !i.content.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    if (sortBy === 'immediate') {
      result = [...result].sort((a, b) => (b.immediate_relevance ?? 0) - (a.immediate_relevance ?? 0))
    } else if (sortBy === 'strategic') {
      result = [...result].sort((a, b) => (b.strategic_relevance ?? 0) - (a.strategic_relevance ?? 0))
    }
    // default: date order preserved from fetch
    return result
  }, [items, tabFilter, typeFilter, routeFilter, sourceFilter, search, sortBy])

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm gap-2">
        <BookOpen size={28} strokeWidth={1.5} className="opacity-30" />
        <p>Не удалось загрузить knowledge</p>
        <p className="text-xs text-slate-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-purple-400 shrink-0" strokeWidth={1.75} />
          <h1 className="flex-1 text-2xl font-bold text-slate-100">Knowledge</h1>
          <button
            onClick={() => setShowPaste(true)}
            className="flex items-center gap-1.5 bg-purple-600/20 active:bg-purple-600/40 text-purple-300 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
          >
            📥 Вставить текст
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3">
        <div className="flex bg-white/5 rounded-2xl p-1 border border-white/[0.06]">
          {([
            { key: 'all',            label: 'Все',       count: items.length },
            { key: 'hot_backlog',    label: '🔥 Горячее', count: tabCounts.hot_backlog },
            { key: 'knowledge_base', label: '📚 Архив',   count: tabCounts.knowledge_base },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setTabFilter(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                tabFilter === tab.key
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 active:text-slate-300'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] ${tabFilter === tab.key ? 'text-purple-200' : 'text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-2xl px-3 py-3 border border-white/[0.06]">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Всего</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-3 py-3 border border-white/[0.06]">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Hot</p>
            <p className="text-2xl font-bold text-red-400 mt-0.5">{stats.hot}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-3 py-3 border border-white/[0.06]">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Strategic</p>
            <p className="text-2xl font-bold text-blue-400 mt-0.5">{stats.strategic}</p>
          </div>
        </div>
      </div>

      {/* Search + sort row */}
      <div className="px-4 pb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full bg-white/5 border border-white/[0.06] rounded-xl pl-8 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-slate-400 outline-none"
        >
          <option value="date">По дате</option>
          <option value="immediate">По immediate</option>
          <option value="strategic">По strategic</option>
        </select>
      </div>

      {/* Route filter chips with counts */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setRouteFilter('all')}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
            routeFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
          }`}
        >
          Все
        </button>
        {(['hot', 'knowledge', 'discard'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRouteFilter(r)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              routeFilter === r ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            {r} ({routeCounts[r]})
          </button>
        ))}
      </div>

      {/* Source type filter chips */}
      {Object.keys(sourceCounts).length > 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSourceFilter('all')}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              sourceFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            Все
          </button>
          {(['youtube', 'instagram', 'link', 'text', 'manual-paste'] as const)
            .filter(s => sourceCounts[s] > 0)
            .map(s => {
              const cfg = SOURCE_TYPE_CFG[s]
              return (
                <button
                  key={s}
                  onClick={() => setSourceFilter(s)}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                    sourceFilter === s ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
                  }`}
                >
                  {cfg.label} ({sourceCounts[s]})
                </button>
              )
            })
          }
          {/* Any unknown source_types not in the preset list */}
          {Object.keys(sourceCounts)
            .filter(s => !['youtube', 'instagram', 'link', 'text', 'manual-paste'].includes(s))
            .map(s => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  sourceFilter === s ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
                }`}
              >
                {s} ({sourceCounts[s]})
              </button>
            ))
          }
        </div>
      )}

      {/* Type filter chips */}
      {types.length > 0 && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {['all', ...types].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                typeFilter === t ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
              }`}
            >
              {t === 'all' ? 'Тип: все' : t}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="px-4 space-y-2 flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center space-y-1">
            <BookOpen size={32} strokeWidth={1.5} className="text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">
              {items.length === 0 ? 'Knowledge база пуста' : 'Записей не найдено'}
            </p>
            <p className="text-xs text-slate-600">
              {items.length === 0 ? 'Запусти /autorun чтобы система начала извлекать знания' : 'Попробуй другой фильтр'}
            </p>
          </div>
        ) : (
          filtered.map(i => <KnowledgeCard key={i.id} item={i} onOpen={setSelected} />)
        )}
      </div>

      {selected && <KnowledgeModal item={selected} onClose={() => setSelected(null)} />}

      {showPaste && (
        <PasteModal
          onClose={() => setShowPaste(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
