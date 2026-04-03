import { useNavigate } from 'react-router-dom'
import { Compass, BookOpen, Inbox } from 'lucide-react'
import { useDiscovery } from '../../hooks/useDiscovery'

const SOURCE_LABELS: Record<string, string> = {
  youtube:   'YouTube',
  instagram: 'Instagram',
  article:   'Статья',
  text:      'Текст',
  link:      'Ссылка',
  telegram:  'Telegram',
}

const SOURCE_COLORS: Record<string, string> = {
  youtube:   'text-red-400 bg-red-500/10',
  instagram: 'text-pink-400 bg-pink-500/10',
  telegram:  'text-blue-400 bg-blue-500/10',
  article:   'text-sky-400 bg-sky-500/10',
  link:      'text-indigo-400 bg-indigo-500/10',
  text:      'text-slate-400 bg-slate-500/10',
}

function sourceLabel(t: string | null) {
  return SOURCE_LABELS[t ?? ''] ?? t ?? 'Текст'
}

function sourceColor(t: string | null) {
  return SOURCE_COLORS[t ?? ''] ?? 'text-slate-400 bg-slate-500/10'
}

function truncateUrl(url: string | null, max = 48): string {
  if (!url) return '—'
  const clean = url.replace(/^https?:\/\/(www\.)?/, '')
  return clean.length > max ? clean.slice(0, max) + '…' : clean
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

export default function DiscoveryPage() {
  const navigate = useNavigate()
  const { gaps, recentSources, loading } = useDiscovery()

  const maxCnt = gaps.length > 0 ? Math.max(...gaps.map(g => g.cnt)) : 1

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <Compass size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Обзор знаний</h1>
          <p className="text-xs text-slate-500 mt-0.5">Что изучить дальше</p>
        </div>
      </div>

      {/* Gaps section */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <BookOpen size={13} className="text-slate-500" />
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Слабые места</h2>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-surface rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : gaps.length === 0 ? (
          <div className="bg-surface rounded-2xl px-4 py-6 text-center text-sm text-slate-500">
            Нет данных
          </div>
        ) : (
          <div className="space-y-2">
            {gaps.map(gap => {
              const pct = Math.round((gap.cnt / maxCnt) * 100)
              return (
                <button
                  key={gap.topic_cluster}
                  onClick={() => navigate('/knowledge')}
                  className="w-full bg-surface rounded-2xl px-4 py-3 text-left active:bg-surface-el transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-200 font-medium truncate pr-2">{gap.topic_cluster}</span>
                    <span className="text-xs text-slate-500 shrink-0">{gap.cnt} {gap.cnt === 1 ? 'знание' : gap.cnt < 5 ? 'знания' : 'знаний'}</span>
                  </div>
                  <div className="h-1 bg-surface-el rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent/60 transition-all"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent sources section */}
      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Inbox size={13} className="text-slate-500" />
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Последние источники</h2>
        </div>

        {loading ? (
          <div className="space-y-px bg-surface rounded-2xl overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-surface animate-pulse border-b border-white/[0.04] last:border-0" />
            ))}
          </div>
        ) : recentSources.length === 0 ? (
          <div className="bg-surface rounded-2xl px-4 py-6 text-center text-sm text-slate-500">
            Нет данных
          </div>
        ) : (
          <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
            {recentSources.map(src => (
              <div key={src.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${sourceColor(src.source_type)}`}>
                  {sourceLabel(src.source_type)}
                </span>
                <span className="flex-1 text-xs text-slate-400 truncate font-mono">
                  {truncateUrl(src.source_url)}
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {src.knowledge_count > 0 ? `${src.knowledge_count} зн.` : '—'}
                </span>
                <span className="shrink-0 text-xs text-slate-600">{formatDate(src.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
