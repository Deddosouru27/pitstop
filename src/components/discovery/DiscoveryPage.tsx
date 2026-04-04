import { useNavigate } from 'react-router-dom'
import { Compass, BookOpen, Inbox } from 'lucide-react'
import { useDiscovery } from '../../hooks/useDiscovery'
import { useKnowledgeWeaknesses } from '../../hooks/useKnowledgeWeaknesses'

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

const LEVEL_ICON: Record<string, string> = { green: '✅', yellow: '⚠️', red: '🔴' }
const LEVEL_CLS:  Record<string, string> = {
  green:  'text-emerald-400',
  yellow: 'text-amber-400',
  red:    'text-red-400',
}

export default function DiscoveryPage() {
  const navigate = useNavigate()
  const { recentSources, loading: srcLoading } = useDiscovery()
  const { weaknesses, total, loading: wkLoading } = useKnowledgeWeaknesses()

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <Compass size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Обзор знаний</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {total > 0 ? `${total} записей в базе` : 'Что изучить дальше'}
          </p>
        </div>
      </div>

      {/* Weaknesses section */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <BookOpen size={13} className="text-slate-500" />
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Слабые места</h2>
        </div>

        {wkLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-white/[0.04] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white/[0.04] rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04]">
            {weaknesses.map(w => (
              <button
                key={w.key}
                onClick={() => navigate('/knowledge')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/5 transition-colors"
              >
                <span className="text-sm shrink-0">{LEVEL_ICON[w.level]}</span>
                <p className="flex-1 text-sm text-slate-300 leading-snug">{w.label}</p>
                <p className={`text-xs font-semibold shrink-0 ${LEVEL_CLS[w.level]}`}>
                  {w.count} ({w.pct}%)
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Recent sources section */}
      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Inbox size={13} className="text-slate-500" />
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Последние источники</h2>
        </div>

        {srcLoading ? (
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
