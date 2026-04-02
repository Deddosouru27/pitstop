import { useState, useEffect, useMemo } from 'react'
import { BookOpen, X, ExternalLink, Search, FileText, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { supabaseMemory } from '../../lib/supabaseMemory'
import { useExtractedKnowledge } from '../../hooks/useExtractedKnowledge'
import { useGuides } from '../../hooks/useGuides'
import type { ExtractedKnowledge, MemoryHistory, IngestedContent } from '../../types'

const ROUTED_COLORS: Record<string, string> = {
  hot:            'bg-red-900/50 text-red-400',
  hot_backlog:    'bg-red-900/50 text-red-400',
  knowledge:      'bg-blue-900/50 text-blue-400',
  knowledge_base: 'bg-blue-900/50 text-blue-400',
  discard:        'bg-slate-800 text-slate-500',
  discarded:      'bg-slate-800 text-slate-500',
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
  instagram:     { label: '📸 Instagram',  cls: 'bg-gradient-to-r from-pink-900/60 to-purple-900/60 text-pink-300' },
  link:          { label: '📰 Article',    cls: 'bg-slate-700/60 text-slate-300' },
  article:       { label: '📰 Article',    cls: 'bg-slate-700/60 text-slate-300' },
  text:          { label: '📝 Text',       cls: 'bg-slate-800 text-slate-400' },
  'manual-paste':{ label: '📋 Paste',      cls: 'bg-slate-800 text-slate-400' },
  telegram:      { label: '✈ Telegram',   cls: 'bg-blue-900/50 text-blue-400' },
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

function toRouteArr(rt: string | string[] | null | undefined): string[] {
  if (!rt) return []
  if (Array.isArray(rt)) return rt
  try { const p = JSON.parse(rt); return Array.isArray(p) ? p : [rt] } catch { return [rt] }
}

function routedContains(rt: string | string[] | null | undefined, value: string): boolean {
  return toRouteArr(rt).some(r => r.includes(value))
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


type SimilarItem = { id: string; content: string; similarity: number; knowledge_type: string | null }

function KnowledgeModal({ item, onClose, onOpenItem }: {
  item: ExtractedKnowledge
  onClose: () => void
  onOpenItem: (id: string) => void
}) {
  const typeColor = (item.knowledge_type && TYPE_COLORS[item.knowledge_type]) ?? 'bg-slate-800 text-slate-400'
  const [rawText, setRawText] = useState<string | null>(null)
  const [rawLoading, setRawLoading] = useState(false)
  const [similar, setSimilar] = useState<SimilarItem[] | null>(null)
  const [similarLoading, setSimilarLoading] = useState(false)
  const [similarError, setSimilarError] = useState<string | null>(null)
  const [history, setHistory] = useState<MemoryHistory[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  async function loadRaw() {
    if (!item.ingested_content_id) return
    setRawLoading(true)
    const { data } = await supabase
      .from('ingested_content')
      .select('raw_text')
      .eq('id', item.ingested_content_id)
      .single()
    setRawText(data?.raw_text ?? null)
    setRawLoading(false)
  }

  async function loadSimilar() {
    setSimilarLoading(true)
    setSimilarError(null)
    try {
      // Fetch embedding for this item only
      const { data: embData, error: embErr } = await supabase
        .from('extracted_knowledge')
        .select('embedding')
        .eq('id', item.id)
        .single()
      if (embErr) throw new Error(embErr.message)
      const embedding = (embData as { embedding: unknown }).embedding
      if (!embedding) { setSimilar([]); setSimilarLoading(false); return }

      const { data: matches, error: rpcErr } = await supabase.rpc('match_knowledge', {
        query_embedding: embedding,
        match_threshold: 0.65,
        match_count: 4,
      })
      if (rpcErr) throw new Error(rpcErr.message)
      const results = ((matches as SimilarItem[]) ?? [])
        .filter(m => m.id !== item.id)
        .slice(0, 3)
      setSimilar(results)
    } catch (e) {
      setSimilarError(e instanceof Error ? e.message : 'Ошибка')
      setSimilar([])
    }
    setSimilarLoading(false)
  }

  async function loadHistory() {
    setHistoryLoading(true)
    const { data } = await supabaseMemory
      .from('memory_history')
      .select('*')
      .eq('knowledge_id', item.id)
      .order('created_at', { ascending: false })
    setHistory(data ?? [])
    setHistoryLoading(false)
  }

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
            {toRouteArr(item.routed_to).map(r => (
              <span key={r} className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${ROUTED_COLORS[r] ?? 'bg-slate-800 text-slate-400'}`}>
                {r}
              </span>
            ))}
            {item.has_ready_code && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cyan-900/50 text-cyan-400">
                ready code
              </span>
            )}
            {item.superseded_by && (
              <button
                onClick={() => { onClose(); onOpenItem(item.superseded_by!) }}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-900/50 text-amber-400 active:bg-amber-800/50"
              >
                ⚠️ Заменено →
              </button>
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

          {/* Similar knowledge */}
          <div>
            {similar === null && (
              <button
                onClick={loadSimilar}
                disabled={similarLoading}
                className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 active:bg-white/10 disabled:opacity-40 px-3 py-2 rounded-xl transition-colors w-fit"
              >
                🔗 {similarLoading ? 'Поиск...' : '🔗 Связанные'}
              </button>
            )}
            {similar !== null && similar.length === 0 && !similarError && (
              <p className="text-xs text-slate-600 mt-2 italic">Похожих не найдено</p>
            )}
            {similarError && (
              <p className="text-xs text-red-400 mt-2">{similarError}</p>
            )}
            {similar && similar.length > 0 && (
              <div className="mt-2 space-y-2">
                {similar.map(s => (
                  <div key={s.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 space-y-1">
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{s.content}</p>
                    <div className="flex items-center gap-2">
                      {s.knowledge_type && (
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[s.knowledge_type] ?? 'bg-slate-800 text-slate-400'}`}>
                          {s.knowledge_type}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-600 ml-auto">
                        {Math.round(s.similarity * 100)}% похожесть
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Memory history */}
          <div>
            {history === null && (
              <button
                onClick={loadHistory}
                disabled={historyLoading}
                className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 active:bg-white/10 disabled:opacity-40 px-3 py-2 rounded-xl transition-colors w-fit"
              >
                {historyLoading ? 'Загрузка...' : '📜 История'}
              </button>
            )}
            {history !== null && history.length === 0 && (
              <p className="text-xs text-slate-600 mt-2 italic">Изменений не найдено</p>
            )}
            {history !== null && history.length > 0 && (
              <div className="mt-2 space-y-2">
                {history.map(h => {
                  const actionCls =
                    h.action?.toUpperCase() === 'ADD' ? 'bg-emerald-900/50 text-emerald-400' :
                    h.action?.toUpperCase() === 'UPDATE' ? 'bg-amber-900/50 text-amber-400' :
                    'bg-slate-800 text-slate-500'
                  return (
                    <div key={h.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${actionCls}`}>
                          {h.action}
                        </span>
                        <span className="text-[9px] text-slate-600 ml-auto">
                          {new Date(h.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {h.reason && (
                        <p className="text-xs text-slate-400 leading-relaxed">{h.reason}</p>
                      )}
                      {(h.prev_value || h.new_value) && (
                        <div className="space-y-1">
                          {h.prev_value && (
                            <p className="text-[10px] text-slate-600 font-mono line-clamp-2">
                              − {h.prev_value.slice(0, 100)}
                            </p>
                          )}
                          {h.new_value && (
                            <p className="text-[10px] text-emerald-600 font-mono line-clamp-2">
                              + {h.new_value.slice(0, 100)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {item.ingested_content_id && rawText === null && (
            <button
              onClick={loadRaw}
              disabled={rawLoading}
              className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 active:bg-white/10 disabled:opacity-40 px-3 py-2 rounded-xl transition-colors w-fit"
            >
              <FileText size={13} />
              {rawLoading ? 'Загрузка...' : '📄 Исходник'}
            </button>
          )}

          {rawText !== null && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">
                Raw text · {rawText.length} chars
              </p>
              <textarea
                readOnly
                value={rawText}
                style={{ minHeight: '200px', maxHeight: '360px' }}
                className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-slate-400 resize-none outline-none font-mono leading-relaxed"
              />
            </div>
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
        {toRouteArr(item.routed_to).map(r => (
          <span key={r} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ROUTED_COLORS[r] ?? 'bg-slate-800 text-slate-500'}`}>
            {r}
          </span>
        ))}
        {item.has_ready_code && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-900/50 text-cyan-400">
            code
          </span>
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

// ── Guide card ────────────────────────────────────────────────────────────────

function GuideCard({ guide }: { guide: IngestedContent }) {
  const [expanded, setExpanded] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  return (
    <div className="bg-white/5 rounded-2xl border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left p-4 space-y-2 active:opacity-70 transition-opacity"
      >
        <div className="flex items-start gap-2">
          <p className="flex-1 text-slate-100 text-sm font-semibold leading-snug">
            {guide.title ?? guide.source_url ?? 'Гайд'}
          </p>
          <span className="shrink-0 text-[10px] text-slate-600 mt-0.5 whitespace-nowrap">
            {new Date(guide.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        {guide.summary && (
          <p className={`text-slate-400 text-xs leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            {guide.summary}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400">
            📖 Гайд
          </span>
          {guide.knowledge_count != null && guide.knowledge_count > 0 && (
            <span className="text-[10px] text-slate-500">
              {guide.knowledge_count} инсайт{guide.knowledge_count === 1 ? '' : guide.knowledge_count < 5 ? 'а' : 'ов'}
            </span>
          )}
          <ChevronDown
            size={12}
            className={`ml-auto text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.04] px-4 pb-4 pt-3 space-y-3">
          {guide.source_url && (
            <a
              href={guide.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-400 active:text-blue-300"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={12} />
              <span className="truncate">{guide.source_url}</span>
            </a>
          )}

          <button
            onClick={() => setShowRaw(v => !v)}
            disabled={!guide.raw_text}
            className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 active:bg-white/10 disabled:opacity-40 px-3 py-2 rounded-xl transition-colors"
          >
            <FileText size={13} />
            {showRaw ? 'Скрыть текст' : 'Читать полностью'}
            {guide.raw_text && (
              <span className="text-slate-600 ml-1">· {guide.raw_text.length} chars</span>
            )}
          </button>

          {showRaw && guide.raw_text && (
            <textarea
              readOnly
              value={guide.raw_text}
              style={{ minHeight: '240px', maxHeight: '500px' }}
              className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-slate-400 resize-none outline-none font-mono leading-relaxed"
            />
          )}
        </div>
      )}
    </div>
  )
}

function GuidesTab() {
  const { guides, loading, error } = useGuides()

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-slate-500 text-sm">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center space-y-1">
        <p className="text-sm text-slate-500">Не удалось загрузить гайды</p>
        <p className="text-xs text-slate-600">{error}</p>
      </div>
    )
  }

  if (guides.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center space-y-1">
        <p className="text-3xl">📖</p>
        <p className="text-sm text-slate-500">Гайдов пока нет</p>
        <p className="text-xs text-slate-600">Контент с is_guide = true появится здесь</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {guides.map(g => <GuideCard key={g.id} guide={g} />)}
    </div>
  )
}

interface SourceInfo {
  title: string | null
  summary: string | null
  source_type: string | null
  source_url: string | null
}

function SourceGroupBlock({
  sourceInfo,
  fallbackSourceType,
  items,
  onOpen,
}: {
  sourceInfo: SourceInfo | null
  fallbackSourceType: string | null
  items: ExtractedKnowledge[]
  onOpen: (i: ExtractedKnowledge) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const sourceType = sourceInfo?.source_type ?? fallbackSourceType
  const srcCfg = SOURCE_TYPE_CFG[sourceType ?? ''] ?? { label: '📦 Unknown', cls: 'bg-slate-800 text-slate-400' }

  const rawTitle = sourceInfo?.title ?? ''

  const topic =
    sourceInfo?.summary ||
    (sourceInfo?.title && !sourceInfo.title.startsWith('Instagram') ? sourceInfo.title : null) ||
    (items[0]?.content ? items[0].content.slice(0, 80) + '...' : null) ||
    'Без заголовка'

  // Creator = @handle extracted from title only if it looks like a handle, not a URL
  const creatorMatch = rawTitle.match(/@([\w.]+)/)
  const creator = creatorMatch ? `@${creatorMatch[1]}` : null
  const sourceUrl = sourceInfo?.source_url ?? null

  // Latest item date
  const latestDate = items.reduce((max, i) => i.created_at > max ? i.created_at : max, items[0].created_at)
  const dateStr = new Date(latestDate).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-4 py-3 bg-white/[0.03] active:bg-white/[0.07] text-left transition-colors"
      >
        {/* Row 1: source tag + count + date */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${srcCfg.cls}`}>
            {srcCfg.label}
          </span>
          <span className="flex-1" />
          <span className="text-[10px] font-semibold text-slate-500">({items.length})</span>
          <span className="text-[10px] text-slate-600 whitespace-nowrap">{dateStr}</span>
          <ChevronDown size={12} className={`text-slate-600 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
        </div>
        {/* Row 2: topic as main bright text */}
        <p className="text-sm text-slate-100 font-medium leading-snug line-clamp-2">{topic}</p>
      </button>
      {expanded && (
        <div className="border-t border-white/[0.04]">
          {(creator || sourceUrl) && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04]">
              {creator && <span className="text-xs text-slate-500">{creator}</span>}
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-400 active:text-blue-300 ml-auto"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={10} />
                  <span className="truncate max-w-[180px]">{sourceUrl}</span>
                </a>
              )}
            </div>
          )}
          <div className="p-2 space-y-2">
            {items.map(i => <KnowledgeCard key={i.id} item={i} onOpen={onOpen} />)}
          </div>
        </div>
      )}
    </div>
  )
}

const INTAKE_URL = 'https://maos-intake.vercel.app/process'

const SOURCE_OPTIONS = [
  { label: 'YouTube видео',  value: 'youtube' },
  { label: 'Instagram Reel', value: 'instagram' },
  { label: 'Telegram канал', value: 'telegram' },
  { label: 'Статья/блог',    value: 'article' },
  { label: 'Подкаст',        value: 'podcast' },
  { label: 'Книга',          value: 'book' },
  { label: 'Другое',         value: 'text' },
] as const

function PasteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<'text' | 'url'>('text')

  // Text mode state
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState<string>('youtube')
  const [text, setText] = useState('')

  // URL mode state
  const [urlInput, setUrlInput] = useState('')
  const [urlResult, setUrlResult] = useState<{ hot?: number; strategic?: number } | null>(null)

  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  function resetStatus() { setStatus('idle'); setErrMsg('') }

  async function handleTextSubmit() {
    const trimmed = text.trim()
    if (!trimmed) return
    setStatus('loading')
    try {
      const res = await fetch(INTAKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'manual-paste', text: trimmed, title: title.trim() || undefined, source_type: sourceType }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('ok')
      setTimeout(() => { onSuccess(); onClose() }, 1500)
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Неизвестная ошибка')
      setStatus('error')
    }
  }

  async function handleUrlSubmit() {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    setStatus('loading')
    setUrlResult(null)
    try {
      const res = await fetch(INTAKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      let hot: number | undefined
      let strategic: number | undefined
      try {
        const json = await res.json()
        // Handle various response shapes from the intake API
        const rr = json?.routing_result ?? json?.result ?? json
        hot = rr?.hot ?? rr?.hot_backlog ?? json?.hot
        strategic = rr?.strategic ?? rr?.knowledge_base ?? json?.strategic
      } catch { /* ignore JSON parse errors */ }
      setUrlResult({ hot, strategic })
      setStatus('ok')
      onSuccess()
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
          <p className="text-slate-100 font-semibold">📥 Capture</p>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="px-5 pb-3 shrink-0">
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/[0.06]">
            {([{ key: 'text', label: '📝 Текст' }, { key: 'url', label: '🔗 Ссылка' }] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => { setMode(tab.key); resetStatus() }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  mode === tab.key ? 'bg-purple-600 text-white' : 'text-slate-500 active:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
          {mode === 'text' ? (
            <>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Заголовок (опционально)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
              />
              <select
                value={sourceType}
                onChange={e => setSourceType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-purple-500/50 transition-colors appearance-none"
              >
                {SOURCE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-[#1c1c27]">{o.label}</option>
                ))}
              </select>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Вставь текст, транскрипт, конспект..."
                style={{ minHeight: '200px' }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors resize-none"
              />
              {status === 'ok' && <p className="text-emerald-400 text-sm font-medium text-center py-1">✅ Отправлено</p>}
              {status === 'error' && <p className="text-red-400 text-sm text-center py-1">❌ {errMsg}</p>}
              <button
                onClick={handleTextSubmit}
                disabled={!text.trim() || status === 'loading' || status === 'ok'}
                className="w-full bg-purple-600 active:bg-purple-700 disabled:opacity-40 text-white font-semibold rounded-2xl py-3 text-sm transition-colors"
              >
                {status === 'loading' ? 'Отправка...' : 'Отправить в Brain'}
              </button>
            </>
          ) : (
            <>
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleUrlSubmit() }}
                placeholder="https://youtube.com/watch?v=..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
              />
              <p className="text-[11px] text-slate-600">
                YouTube, Instagram, статья — система автоматически извлечёт контент
              </p>
              {status === 'ok' && (
                <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-emerald-400 text-sm font-medium">✅ Принято в обработку</p>
                  {(urlResult?.hot != null || urlResult?.strategic != null) && (
                    <p className="text-xs text-slate-400">
                      {urlResult?.hot != null && `🔥 ${urlResult.hot} hot`}
                      {urlResult?.hot != null && urlResult?.strategic != null && ' · '}
                      {urlResult?.strategic != null && `📚 ${urlResult.strategic} strategic`}
                    </p>
                  )}
                </div>
              )}
              {status === 'error' && <p className="text-red-400 text-sm py-1">❌ {errMsg}</p>}
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || status === 'loading'}
                className="w-full bg-purple-600 active:bg-purple-700 disabled:opacity-40 text-white font-semibold rounded-2xl py-3 text-sm transition-colors"
              >
                {status === 'loading' ? 'Обрабатываю...' : 'Обработать'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

type SortKey = 'date' | 'immediate' | 'strategic'
type PageTab = 'knowledge' | 'guides'

export default function KnowledgePage() {
  const { items, loading, error, refresh } = useExtractedKnowledge()
  const [pageTab, setPageTab] = useState<PageTab>('knowledge')
  const [showPaste, setShowPaste] = useState(false)
  const [tabFilter, setTabFilter] = useState<'all' | 'hot_backlog' | 'knowledge_base'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [routeFilter, setRouteFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('date')
  const [selected, setSelected] = useState<ExtractedKnowledge | null>(null)
  const [groupMode, setGroupMode] = useState(false)
  const [sourceMap, setSourceMap] = useState<Map<string, SourceInfo>>(new Map())

  const types = useMemo(() => {
    const s = new Set<string>()
    for (const i of items) if (i.knowledge_type) s.add(i.knowledge_type)
    return Array.from(s)
  }, [items])

  const stats = useMemo(() => {
    const hot = items.filter(i => routedContains(i.routed_to, 'hot_backlog')).length
    const strategic = items.filter(i => i.strategic_relevance != null && i.strategic_relevance >= 0.7).length
    return { total: items.length, hot, strategic }
  }, [items])

  const routeCounts = useMemo(() => ({
    hot:      items.filter(i => routedContains(i.routed_to, 'hot_backlog')).length,
    archive:  items.filter(i => routedContains(i.routed_to, 'knowledge_base') && !routedContains(i.routed_to, 'hot_backlog')).length,
    discard:  items.filter(i => routedContains(i.routed_to, 'discarded')).length,
  }), [items])

  const tabCounts = useMemo(() => ({
    hot_backlog:    items.filter(i => routedContains(i.routed_to, 'hot_backlog')).length,
    knowledge_base: items.filter(i => routedContains(i.routed_to, 'knowledge_base') && !routedContains(i.routed_to, 'hot_backlog')).length,
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
      if (tabFilter === 'hot_backlog' && !routedContains(i.routed_to, 'hot_backlog')) return false
      if (tabFilter === 'knowledge_base' && !(routedContains(i.routed_to, 'knowledge_base') && !routedContains(i.routed_to, 'hot_backlog'))) return false
      if (typeFilter !== 'all' && i.knowledge_type !== typeFilter) return false
      if (routeFilter === 'hot' && !routedContains(i.routed_to, 'hot_backlog')) return false
      if (routeFilter === 'archive' && !(routedContains(i.routed_to, 'knowledge_base') && !routedContains(i.routed_to, 'hot_backlog'))) return false
      if (routeFilter === 'discard' && !routedContains(i.routed_to, 'discarded')) return false
      if (sourceFilter !== 'all' && (i.source_type ?? 'text') !== sourceFilter) return false
      if (search.trim() && !i.content.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    if (sortBy === 'immediate') {
      result = [...result].sort((a, b) => (b.immediate_relevance ?? 0) - (a.immediate_relevance ?? 0))
    } else if (sortBy === 'strategic') {
      result = [...result].sort((a, b) => (b.strategic_relevance ?? 0) - (a.strategic_relevance ?? 0))
    }
    return result
  }, [items, tabFilter, typeFilter, routeFilter, sourceFilter, search, sortBy])

  useEffect(() => {
    if (!groupMode) return
    const ids = [...new Set(
      filtered.map(i => i.ingested_content_id).filter((id): id is string => !!id)
    )]
    if (ids.length === 0) return
    let cancelled = false
    supabase
      .from('ingested_content')
      .select('id, title, summary, source_type, source_url')
      .in('id', ids)
      .then(({ data }) => {
        if (cancelled || !data) return
        const map = new Map<string, SourceInfo>()
        for (const row of data) {
          map.set(row.id, {
            title: (row as { title: string | null }).title ?? null,
            summary: (row as { summary: string | null }).summary ?? null,
            source_type: (row as { source_type: string | null }).source_type ?? null,
            source_url: (row as { source_url: string | null }).source_url ?? null,
          })
        }
        setSourceMap(map)
      })
    return () => { cancelled = true }
  }, [groupMode, filtered])

  type GroupEntry =
    | { kind: 'group'; ingestedId: string; fallbackSourceType: string | null; items: ExtractedKnowledge[] }
    | { kind: 'minute-group'; minuteKey: string; fallbackSourceType: string | null; items: ExtractedKnowledge[] }
    | { kind: 'singleton'; item: ExtractedKnowledge }

  // Group by ingested_content_id (3-tier)
  const groupedFiltered = useMemo((): GroupEntry[] => {
    const byId = new Map<string, ExtractedKnowledge[]>()
    const byIdOrder: string[] = []
    const byMinute = new Map<string, ExtractedKnowledge[]>()
    const byMinuteOrder: string[] = []

    for (const item of filtered) {
      if (item.ingested_content_id) {
        if (!byId.has(item.ingested_content_id)) {
          byId.set(item.ingested_content_id, [])
          byIdOrder.push(item.ingested_content_id)
        }
        byId.get(item.ingested_content_id)!.push(item)
      } else {
        const minuteKey = item.created_at.slice(0, 16) // "YYYY-MM-DDTHH:MM"
        if (!byMinute.has(minuteKey)) {
          byMinute.set(minuteKey, [])
          byMinuteOrder.push(minuteKey)
        }
        byMinute.get(minuteKey)!.push(item)
      }
    }

    const result: GroupEntry[] = []
    for (const id of byIdOrder) {
      const items = byId.get(id)!
      result.push({ kind: 'group', ingestedId: id, fallbackSourceType: items[0].source_type ?? null, items })
    }
    for (const minuteKey of byMinuteOrder) {
      const items = byMinute.get(minuteKey)!
      if (items.length === 1) {
        result.push({ kind: 'singleton', item: items[0] })
      } else {
        result.push({ kind: 'minute-group', minuteKey, fallbackSourceType: items[0].source_type ?? null, items })
      }
    }
    return result
  }, [filtered])

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
          {pageTab === 'knowledge' && (
            <button
              onClick={() => setGroupMode(v => !v)}
              className={`text-xs font-medium px-3 py-2 rounded-xl transition-colors border ${
                groupMode
                  ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                  : 'bg-white/5 border-white/[0.06] text-slate-400'
              }`}
            >
              📦 {groupMode ? 'Группы' : 'Группировать'}
            </button>
          )}
          <button
            onClick={() => setShowPaste(true)}
            className="flex items-center gap-1.5 bg-purple-600/20 active:bg-purple-600/40 text-purple-300 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
          >
            📥 Вставить текст
          </button>
        </div>
      </div>

      {/* Page tab switcher */}
      <div className="px-4 pb-3">
        <div className="flex bg-white/5 rounded-2xl p-1 border border-white/[0.06]">
          {([
            { key: 'knowledge', label: '🧠 База знаний' },
            { key: 'guides',    label: '📖 Гайды' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setPageTab(tab.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pageTab === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-500 active:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guides tab */}
      {pageTab === 'guides' && (
        <div className="px-4 flex-1">
          <GuidesTab />
        </div>
      )}

      {pageTab !== 'guides' && (
      <>
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

      {/* Stats bar */}
      <div className="px-4 pb-3">
        <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/[0.06] space-y-1.5">
          {/* Source breakdown */}
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-200">{stats.total}</span>
            <span className="text-slate-600"> знаний</span>
            {(['instagram', 'youtube', 'link', 'article'] as const)
              .filter(s => (sourceCounts[s] ?? 0) > 0)
              .map(s => {
                const icon = s === 'instagram' ? '📸' : s === 'youtube' ? '🎬' : '📰'
                return (
                  <span key={s}>
                    <span className="text-slate-600"> · </span>
                    <span>{icon} </span>
                    <span className="font-medium text-slate-300">{sourceCounts[s]}</span>
                    <span className="text-slate-600"> {s === 'instagram' ? 'Instagram' : s === 'youtube' ? 'YouTube' : 'Article'}</span>
                  </span>
                )
              })}
          </p>
          {/* Hot / archive */}
          <p className="text-xs text-slate-500">
            <span className="text-red-400 font-medium">🔥 {stats.hot} hot</span>
            <span className="text-slate-600"> · </span>
            <span className="text-blue-400 font-medium">📚 {tabCounts.knowledge_base} archive</span>
          </p>
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
        {([
          { key: 'all',     label: 'Все',        count: filtered.length },
          { key: 'hot',     label: '🔥 Горячее', count: routeCounts.hot },
          { key: 'archive', label: '📚 Архив',   count: routeCounts.archive },
          { key: 'discard', label: '🗑 Мусор',   count: routeCounts.discard },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setRouteFilter(key)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              routeFilter === key ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            {label} ({count})
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
        ) : !groupMode ? (
          filtered.map(i => <KnowledgeCard key={i.id} item={i} onOpen={setSelected} />)
        ) : (
          groupedFiltered.map(entry => {
            if (entry.kind === 'singleton') {
              return <KnowledgeCard key={entry.item.id} item={entry.item} onOpen={setSelected} />
            }
            if (entry.kind === 'group') {
              return (
                <SourceGroupBlock
                  key={entry.ingestedId}
                  sourceInfo={sourceMap.get(entry.ingestedId) ?? null}
                  fallbackSourceType={entry.fallbackSourceType}
                  items={entry.items}
                  onOpen={setSelected}
                />
              )
            }
            // minute-group: orphan items (no ingested_content_id) batched by minute
            return (
              <SourceGroupBlock
                key={entry.minuteKey}
                sourceInfo={null}
                fallbackSourceType={entry.fallbackSourceType}
                items={entry.items}
                onOpen={setSelected}
              />
            )
          })
        )}
      </div>

      {selected && (
        <KnowledgeModal
          item={selected}
          onClose={() => setSelected(null)}
          onOpenItem={(id) => {
            const found = items.find(i => i.id === id)
            if (found) setSelected(found)
          }}
        />
      )}
      </>
      )}

      {showPaste && (
        <PasteModal
          onClose={() => setShowPaste(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
