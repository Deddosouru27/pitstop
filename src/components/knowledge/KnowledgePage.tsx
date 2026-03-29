import { useState, useMemo } from 'react'
import { BookOpen, X, ExternalLink } from 'lucide-react'
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

function scoreBar(value: number | null, color: string) {
  if (value == null) return null
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

  return (
    <button
      onClick={() => onOpen(item)}
      className="w-full text-left bg-white/5 rounded-2xl p-4 space-y-2 border border-white/[0.06] active:opacity-60 transition-opacity"
    >
      <p className="text-slate-100 text-sm leading-relaxed line-clamp-3 overflow-hidden">{item.content}</p>

      {item.business_value && (
        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">🎯 {item.business_value}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
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
        <span className="text-[10px] text-slate-600 ml-auto">
          {new Date(item.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </span>
      </div>

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

export default function KnowledgePage() {
  const { items, loading, error } = useExtractedKnowledge()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [routeFilter, setRouteFilter] = useState<string>('all')
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

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (typeFilter !== 'all' && i.knowledge_type !== typeFilter) return false
      if (routeFilter !== 'all' && i.routed_to !== routeFilter) return false
      return true
    })
  }, [items, typeFilter, routeFilter])

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
          <BookOpen size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-slate-100">Knowledge</h1>
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

      {/* Filters */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {['all', 'hot', 'knowledge', 'discard'].map(r => (
          <button
            key={r}
            onClick={() => setRouteFilter(r)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              routeFilter === r ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            {r === 'all' ? 'Все' : r}
          </button>
        ))}
      </div>

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
    </div>
  )
}
