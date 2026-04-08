import { useState, useMemo } from 'react'
import { CheckCircle, ArrowRight, XCircle, ListTodo, Zap } from 'lucide-react'
import { useIdeasTriage, type TriageRelevance, type ActionFilter } from '../../hooks/useIdeasTriage'
import type { Idea } from '../../types'

// ── Constants ─────────────────────────────────────────────────────────────────

const RELEVANCE_LABELS: Record<string, string> = {
  hot: '🔥 Hot',
  strategic: '📐 Strategic',
  new: '📋 New',
}

const WORK_TYPES = ['feature', 'fix', 'refactor', 'research', 'infra', 'design', 'ops']

const ACTION_TABS: { key: ActionFilter; label: string }[] = [
  { key: 'unreviewed', label: '📋 Неразобранные' },
  { key: 'accepted',   label: '✅ Accepted' },
  { key: 'rejected',   label: '❌ Rejected' },
  { key: 'deferred',   label: '⏳ Deferred' },
]

// ── Badges ────────────────────────────────────────────────────────────────────

function urgencyBadge(urgency: number | null | undefined): string {
  if (urgency == null) return ''
  if (urgency >= 8) return '🔴'
  if (urgency >= 5) return '🟡'
  return '🟢'
}

function impactBadge(impact: number | null | undefined): string {
  if (impact == null) return ''
  if (impact >= 8) return '⭐⭐⭐'
  if (impact >= 5) return '⭐⭐'
  return '⭐'
}

// ── RelevanceBadge ────────────────────────────────────────────────────────────

function RelevanceBadge({ value }: { value: string | null | undefined }) {
  const color = value === 'hot'
    ? 'bg-orange-900/50 text-orange-300'
    : value === 'strategic'
    ? 'bg-blue-900/50 text-blue-300'
    : 'bg-slate-700/50 text-slate-400'
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${color}`}>
      {RELEVANCE_LABELS[value ?? ''] ?? value ?? 'new'}
    </span>
  )
}

// ── ConvertForm ───────────────────────────────────────────────────────────────

interface ConvertFormProps {
  idea: Idea
  onConfirm: (title: string, workType: string, phase: number | null) => void
  onCancel: () => void
}

function ConvertForm({ idea, onConfirm, onCancel }: ConvertFormProps) {
  const [title, setTitle] = useState(idea.content.slice(0, 80))
  const [workType, setWorkType] = useState('feature')
  const [phase, setPhase] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onCancel}>
      <div
        className="w-full bg-[#1a1a2e] border-t border-white/10 rounded-t-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-slate-100">Создать задачу</h2>

        <div className="space-y-1">
          <label className="text-[11px] text-slate-500">Заголовок</label>
          <textarea
            value={title}
            onChange={e => setTitle(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-500/50 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] text-slate-500">Work type</label>
            <select
              value={workType}
              onChange={e => setWorkType(e.target.value)}
              className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-300 outline-none"
            >
              {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="w-24 space-y-1">
            <label className="text-[11px] text-slate-500">Phase</label>
            <input
              type="number"
              value={phase}
              onChange={e => setPhase(e.target.value)}
              placeholder="1"
              min={1}
              className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-300 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 active:bg-white/5"
          >
            Отмена
          </button>
          <button
            onClick={() => onConfirm(title.trim(), workType, phase ? parseInt(phase) : null)}
            disabled={!title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 text-sm font-medium text-white disabled:opacity-40 active:bg-purple-700"
          >
            Создать задачу
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TriageCard ────────────────────────────────────────────────────────────────

interface CardProps {
  idea: Idea
  actionFilter: ActionFilter
  onDismiss: () => void
  onDefer: () => void
  onConvert: () => void
}

function TriageCard({ idea, actionFilter, onDismiss, onDefer, onConvert }: CardProps) {
  const date = new Date(idea.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  const ai = idea.ai_analysis
  const isUnreviewed = actionFilter === 'unreviewed'

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-100 leading-relaxed">{idea.content}</p>
        </div>
      </div>

      {/* Meta badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        <RelevanceBadge value={idea.relevance} />
        {idea.source_type && (
          <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full">{idea.source_type}</span>
        )}

        {/* Accepted: urgency + impact */}
        {actionFilter === 'accepted' && (
          <>
            {ai?.urgency != null && (
              <span className="text-[11px] bg-white/5 px-1.5 py-0.5 rounded-full" title={`Urgency ${ai.urgency}`}>
                {urgencyBadge(ai.urgency)} {ai.urgency}
              </span>
            )}
            {ai?.impact != null && (
              <span className="text-[11px] bg-white/5 px-1.5 py-0.5 rounded-full" title={`Impact ${ai.impact}`}>
                {impactBadge(ai.impact)}
              </span>
            )}
          </>
        )}

        <span className="text-[10px] text-slate-600 ml-auto">{date}</span>
      </div>

      {/* Rejected: show reason */}
      {actionFilter === 'rejected' && (idea.rejection_reason ?? ai?.reason) && (
        <p className="text-[11px] text-red-400/70 bg-red-900/10 border border-red-900/20 rounded-xl px-3 py-1.5 leading-relaxed line-clamp-2">
          {idea.rejection_reason ?? ai?.reason}
        </p>
      )}

      {/* Triage action buttons — only for unreviewed */}
      {isUnreviewed && (
        <div className="flex gap-2">
          <button
            onClick={onConvert}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-900/40 border border-green-700/30 text-green-300 text-xs font-medium active:bg-green-800/50"
          >
            <CheckCircle size={13} /> Задача
          </button>
          <button
            onClick={onDefer}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 border border-white/[0.06] text-slate-400 text-xs font-medium active:bg-white/10"
          >
            <ArrowRight size={13} /> Оставить
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-900/30 border border-red-700/20 text-red-400 text-xs font-medium active:bg-red-800/40"
          >
            <XCircle size={13} /> Отклонить
          </button>
        </div>
      )}
    </div>
  )
}

// ── AutoProcessResult ─────────────────────────────────────────────────────────

interface AutoProcessResult {
  processed: number
  accepted: number
  rejected: number
  deferred: number
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IdeasTriagePage() {
  const [actionFilter, setActionFilter] = useState<ActionFilter>('unreviewed')
  const [relevanceFilter, setRelevanceFilter] = useState<TriageRelevance>('all')
  const [convertTarget, setConvertTarget] = useState<Idea | null>(null)
  const [converting, setConverting] = useState(false)
  const [autoProcessing, setAutoProcessing] = useState(false)
  const [autoResult, setAutoResult] = useState<AutoProcessResult | null>(null)
  const [autoError, setAutoError] = useState<string | null>(null)

  const { ideas, loading, totalReviewed, dismiss, defer, convertToTask, refetch } = useIdeasTriage(actionFilter)

  const filtered = useMemo(() => {
    if (relevanceFilter === 'all') return ideas
    return ideas.filter(i => i.relevance === relevanceFilter)
  }, [ideas, relevanceFilter])

  const total = ideas.length + totalReviewed
  const reviewed = totalReviewed

  const relCounts = useMemo(() => ({
    hot: ideas.filter(i => i.relevance === 'hot').length,
    strategic: ideas.filter(i => i.relevance === 'strategic').length,
  }), [ideas])

  async function handleConvert(title: string, workType: string, phase: number | null) {
    if (!convertTarget) return
    setConverting(true)
    try {
      await convertToTask(convertTarget.id, title, workType, phase)
    } catch (e) {
      console.error('[triage] convert failed:', e)
    } finally {
      setConverting(false)
      setConvertTarget(null)
    }
  }

  async function handleAutoProcess() {
    setAutoProcessing(true)
    setAutoResult(null)
    setAutoError(null)
    try {
      const res = await fetch('https://maos-intake.vercel.app/process-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      })
      const json = await res.json().catch(() => ({})) as Record<string, unknown>
      if (!res.ok) {
        setAutoError(String(json.message ?? json.error ?? `HTTP ${res.status}`))
        return
      }
      setAutoResult({
        processed: Number(json.processed ?? json.total ?? 10),
        accepted:  Number(json.accepted  ?? 0),
        rejected:  Number(json.rejected  ?? 0),
        deferred:  Number(json.deferred  ?? 0),
      })
      refetch()
    } catch (err) {
      setAutoError(err instanceof Error ? err.message : 'Сетевая ошибка')
    } finally {
      setAutoProcessing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <ListTodo size={18} className="text-slate-400" />
          <h1 className="text-base font-semibold text-slate-100">Ideas Triage</h1>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{ideas.length} осталось</span>
        </div>
        {/* Progress bar — only meaningful for unreviewed */}
        {actionFilter === 'unreviewed' && (
          <>
            <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: total > 0 ? `${(reviewed / total) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{reviewed} / {total} разобрано</p>
          </>
        )}
      </div>

      {/* Auto-Process button */}
      <div className="px-4 pb-3 shrink-0">
        <button
          onClick={handleAutoProcess}
          disabled={autoProcessing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-900/30 border border-purple-700/30 text-purple-300 text-xs font-medium disabled:opacity-50 active:bg-purple-900/50 transition-colors"
        >
          <Zap size={13} />
          {autoProcessing ? 'Обработка...' : '🤖 Auto-Process 10'}
        </button>
        {autoResult && (
          <p className="text-[11px] text-emerald-400 mt-1.5 pl-1">
            ✅ Processed {autoResult.processed}: {autoResult.accepted} accepted, {autoResult.rejected} rejected, {autoResult.deferred} deferred
          </p>
        )}
        {autoError && (
          <p className="text-[11px] text-red-400 mt-1.5 pl-1">❌ {autoError}</p>
        )}
      </div>

      {/* Action filter tabs */}
      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
        {ACTION_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActionFilter(tab.key); setRelevanceFilter('all') }}
            className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              actionFilter === tab.key
                ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                : 'bg-white/5 border-white/[0.06] text-slate-400 active:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Relevance sub-filter — only for unreviewed */}
      {actionFilter === 'unreviewed' && (
        <div className="px-4 pb-3 flex gap-1.5 shrink-0">
          {(['all', 'hot', 'strategic'] as TriageRelevance[]).map(r => (
            <button
              key={r}
              onClick={() => setRelevanceFilter(r)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                relevanceFilter === r
                  ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                  : 'bg-white/5 border-white/[0.06] text-slate-400 active:bg-white/10'
              }`}
            >
              {r === 'all' ? `Все (${ideas.length})` : r === 'hot' ? `🔥 Hot (${relCounts.hot})` : `📐 Strategic (${relCounts.strategic})`}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {loading && <p className="text-sm text-slate-500 py-12 text-center">Загрузка...</p>}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center space-y-2">
            <CheckCircle size={36} strokeWidth={1.5} className="text-green-500/60" />
            <p className="text-sm font-medium text-slate-300">
              {ideas.length === 0 ? 'Все идеи разобраны! 🎉' : 'Нет идей с таким фильтром'}
            </p>
            <p className="text-xs text-slate-500">
              {ideas.length === 0 ? `${reviewed} идей обработано` : 'Попробуй другой фильтр'}
            </p>
          </div>
        )}
        {filtered.map(idea => (
          <TriageCard
            key={idea.id}
            idea={idea}
            actionFilter={actionFilter}
            onDismiss={() => dismiss(idea.id)}
            onDefer={() => defer(idea.id)}
            onConvert={() => setConvertTarget(idea)}
          />
        ))}
      </div>

      {/* Convert modal */}
      {convertTarget && !converting && (
        <ConvertForm
          idea={convertTarget}
          onConfirm={handleConvert}
          onCancel={() => setConvertTarget(null)}
        />
      )}
    </div>
  )
}
