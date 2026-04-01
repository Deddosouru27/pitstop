import { useState, useMemo } from 'react'
import { Inbox, X, ExternalLink, Search } from 'lucide-react'
import { useIngestedContent } from '../../hooks/useIngestedContent'
import type { IngestedContent } from '../../types'

const SOURCE_TYPE_CFG: Record<string, { label: string; cls: string }> = {
  youtube:        { label: '▶ YouTube',    cls: 'bg-red-900/50 text-red-400' },
  instagram:      { label: '◈ Instagram',  cls: 'bg-pink-900/50 text-pink-400' },
  telegram:       { label: '✈ Telegram',   cls: 'bg-blue-900/50 text-blue-400' },
  article:        { label: '📰 Статья',    cls: 'bg-amber-900/50 text-amber-400' },
  podcast:        { label: '🎙 Подкаст',   cls: 'bg-purple-900/50 text-purple-400' },
  book:           { label: '📖 Книга',     cls: 'bg-emerald-900/50 text-emerald-400' },
  link:           { label: '🔗 Link',      cls: 'bg-blue-900/50 text-blue-400' },
  text:           { label: '📄 Text',      cls: 'bg-slate-800 text-slate-400' },
  'manual-paste': { label: '📋 Paste',     cls: 'bg-slate-800 text-slate-400' },
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  processed:  { label: 'Обработан', cls: 'bg-emerald-900/50 text-emerald-400' },
  processing: { label: 'В работе',  cls: 'bg-amber-900/50 text-amber-400' },
  pending:    { label: 'Ожидает',   cls: 'bg-slate-800 text-slate-400' },
  error:      { label: 'Ошибка',    cls: 'bg-red-900/50 text-red-400' },
}

function sourceTypeBadge(st: string | null) {
  if (!st) return null
  const cfg = SOURCE_TYPE_CFG[st] ?? { label: st, cls: 'bg-slate-800 text-slate-400' }
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
}

function statusBadge(status: string | null) {
  if (!status) return null
  const cfg = STATUS_CFG[status] ?? { label: status, cls: 'bg-slate-800 text-slate-400' }
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
}

function formatRouting(r: Record<string, unknown> | null): string {
  if (!r) return '—'
  return Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(' · ')
}

function IngestedModal({ item, onClose }: { item: IngestedContent; onClose: () => void }) {
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
          <div className="flex items-center gap-2 flex-wrap">
            {sourceTypeBadge(item.source_type)}
            {statusBadge(item.processing_status)}
          </div>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
          {item.title && (
            <p className="text-slate-100 text-base font-semibold leading-snug">{item.title}</p>
          )}

          {item.summary && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Summary</p>
              <p className="text-slate-300 text-sm leading-relaxed">{item.summary}</p>
            </div>
          )}

          {item.routing_result && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Routing</p>
              <p className="text-slate-400 text-xs">{formatRouting(item.routing_result)}</p>
            </div>
          )}

          {item.knowledge_count != null && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Insights extracted</p>
              <p className="text-slate-100 text-lg font-bold">{item.knowledge_count}</p>
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

          {item.raw_text && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">
                Raw text · {item.raw_text.length} chars
              </p>
              <textarea
                readOnly
                value={item.raw_text}
                style={{ minHeight: '240px', maxHeight: '420px' }}
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

function IngestedCard({ item, attempts, onOpen }: { item: IngestedContent; attempts: number; onOpen: (i: IngestedContent) => void }) {
  const dateStr = new Date(item.created_at).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  return (
    <button
      onClick={() => onOpen(item)}
      className="w-full text-left bg-white/5 rounded-2xl p-4 space-y-2 border border-white/[0.06] active:opacity-60 transition-opacity"
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-slate-100 text-sm font-medium leading-snug line-clamp-2">
          {item.title ?? item.source_url ?? 'Без заголовка'}
        </p>
        <span className="shrink-0 text-[10px] text-slate-600 mt-0.5 whitespace-nowrap">{dateStr}</span>
      </div>

      {item.summary && (
        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{item.summary}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {sourceTypeBadge(item.source_type)}
        {statusBadge(item.processing_status)}
        {item.knowledge_count != null && item.knowledge_count > 0 && (
          <span className="text-[10px] text-slate-500">
            {item.knowledge_count} инсайт{
              item.knowledge_count === 1 ? '' : item.knowledge_count < 5 ? 'а' : 'ов'
            }
          </span>
        )}
        {attempts > 1 && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-500">
            {attempts} попытки
          </span>
        )}
      </div>
    </button>
  )
}

export default function IngestedPage() {
  const { items, loading, error } = useIngestedContent()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<IngestedContent | null>(null)

  // Deduplicate by source_url (items already sorted DESC → first = latest per URL)
  const deduped = useMemo(() => {
    const seen = new Map<string, { item: IngestedContent; count: number }>()
    const noUrlItems: { item: IngestedContent; count: number }[] = []
    for (const item of items) {
      if (!item.source_url) {
        noUrlItems.push({ item, count: 1 })
      } else if (seen.has(item.source_url)) {
        seen.get(item.source_url)!.count++
      } else {
        seen.set(item.source_url, { item, count: 1 })
      }
    }
    return [...seen.values(), ...noUrlItems]
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return deduped
    return deduped.filter(({ item: i }) =>
      (i.title ?? '').toLowerCase().includes(q) ||
      (i.summary ?? '').toLowerCase().includes(q) ||
      (i.source_url ?? '').toLowerCase().includes(q)
    )
  }, [deduped, search])

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <Inbox size={28} strokeWidth={1.5} className="text-slate-600" />
        <p className="text-sm text-slate-500">Не удалось загрузить сырьё</p>
        <p className="text-xs text-slate-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Inbox size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="flex-1 text-2xl font-bold text-slate-100">Сырьё</h1>
          <span className="text-sm text-slate-500">{deduped.length}</span>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по заголовку, summary, url..."
            className="w-full bg-white/5 border border-white/[0.06] rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="px-4 space-y-2 flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center space-y-1">
            <Inbox size={32} strokeWidth={1.5} className="text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">
              {deduped.length === 0 ? 'Сырьё пока не загружалось' : 'Ничего не найдено'}
            </p>
            <p className="text-xs text-slate-600">
              {deduped.length === 0 ? 'Отправь текст через "📥 Вставить текст" в Knowledge' : 'Попробуй другой запрос'}
            </p>
          </div>
        ) : (
          filtered.map(({ item, count }) => <IngestedCard key={item.id} item={item} attempts={count} onOpen={setSelected} />)
        )}
      </div>

      {selected && <IngestedModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
