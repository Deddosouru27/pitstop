import { useState, useEffect } from 'react'
import { X, ExternalLink, ArrowRightCircle, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Idea, Project } from '../../types'

const CATEGORY_COLORS: Record<string, string> = {
  feature:   'bg-blue-900/50 text-blue-400',
  ux:        'bg-purple-900/50 text-purple-400',
  marketing: 'bg-amber-900/50 text-amber-400',
  bug:       'bg-red-900/50 text-red-400',
  other:     'bg-slate-800 text-slate-400',
}

const SOURCE_TYPE_CFG: Record<string, { label: string; cls: string }> = {
  youtube:        { label: '▶ YouTube',   cls: 'bg-red-900/50 text-red-400' },
  instagram:      { label: '◈ Instagram', cls: 'bg-pink-900/50 text-pink-400' },
  telegram:       { label: '✈ Telegram',  cls: 'bg-blue-900/50 text-blue-400' },
  link:           { label: '🔗 Link',     cls: 'bg-blue-900/50 text-blue-400' },
  text:           { label: '📄 Text',     cls: 'bg-slate-800 text-slate-400' },
  'manual-paste': { label: '📋 Paste',    cls: 'bg-slate-800 text-slate-400' },
}

interface Props {
  idea: Idea
  project: Project | undefined
  onClose: () => void
  onOpenConvert: () => void
  onDelete: (id: string) => void
  onApprove: (id: string) => Promise<void>
  onReject: (id: string, reason: string) => Promise<void>
  onDefer: (id: string) => Promise<void>
}

export default function IdeaDetailModal({
  idea,
  project,
  onClose,
  onOpenConvert,
  onDelete,
  onApprove,
  onReject,
  onDefer,
}: Props) {
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [linkedKnowledge, setLinkedKnowledge] = useState<{ id: string; content: string } | null>(null)

  const categoryClass = CATEGORY_COLORS[idea.ai_category] ?? CATEGORY_COLORS.other
  const categoryLabel = idea.ai_category
    ? idea.ai_category.charAt(0).toUpperCase() + idea.ai_category.slice(1)
    : 'Idea'

  // Fetch linked knowledge if knowledge_id exists
  useEffect(() => {
    const kId = (idea as unknown as Record<string, unknown>).knowledge_id as string | undefined
    if (!kId) return
    let cancelled = false
    supabase
      .from('extracted_knowledge')
      .select('id, content')
      .eq('id', kId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setLinkedKnowledge(data as { id: string; content: string })
      })
    return () => { cancelled = true }
  }, [idea])

  async function handleApprove() {
    setSaving(true)
    await onApprove(idea.id)
    setSaving(false)
    onClose()
  }

  async function handleRejectSubmit() {
    setSaving(true)
    await onReject(idea.id, rejectReason)
    setSaving(false)
    onClose()
  }

  async function handleDefer() {
    setSaving(true)
    await onDefer(idea.id)
    setSaving(false)
    onClose()
  }

  const currentStatus = idea.status ?? 'pending'
  const isApproved  = currentStatus === 'accepted'
  const isRejected  = currentStatus === 'dismissed'
  const isDeferred  = currentStatus === 'deferred'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#13131a] rounded-t-3xl pb-10 flex flex-col max-h-[92dvh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-3 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryClass}`}>
              {categoryLabel}
            </span>
            {idea.relevance === 'hot' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-900/40 text-orange-300 border border-orange-700/30">
                🔥 Hot
              </span>
            )}
            {idea.relevance === 'strategic' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">
                📐 Strategic
              </span>
            )}
            {idea.source_type && (() => {
              const cfg = SOURCE_TYPE_CFG[idea.source_type] ?? { label: idea.source_type, cls: 'bg-slate-800 text-slate-400' }
              return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
            })()}
            {isApproved && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400">✅ Approved</span>}
            {isRejected && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">🗑 Rejected</span>}
            {isDeferred && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400">📌 Позже</span>}
            {idea.converted_to_task && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-400">🔄 Converted</span>}
          </div>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 space-y-3">
          {/* Summary */}
          {idea.summary?.trim() && (
            <p className="text-slate-100 text-base font-semibold leading-snug">{idea.summary.trim()}</p>
          )}

          {/* Full content */}
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{idea.content}</p>

          {/* Linked knowledge */}
          {linkedKnowledge && (
            <div className="bg-white/5 rounded-xl px-3 py-2.5 border border-white/[0.06] space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">🧠 Связанное знание</p>
              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{linkedKnowledge.content}</p>
            </div>
          )}

          {/* Rejection reason */}
          {isRejected && idea.rejection_reason && (
            <div className="bg-red-900/15 rounded-xl px-3 py-2 border border-red-900/30">
              <p className="text-[10px] text-red-500 uppercase tracking-wider font-medium mb-1">Причина отклонения</p>
              <p className="text-xs text-red-300">{idea.rejection_reason}</p>
            </div>
          )}

          {/* Source */}
          {idea.source && (
            <a
              href={idea.source}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-400 active:text-blue-300 break-all"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={12} className="shrink-0" />
              <span className="truncate">{idea.source}</span>
            </a>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-slate-500 pb-2">
            {project && (
              <>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: project.color }} />
                <span>{project.name}</span>
                <span>·</span>
              </>
            )}
            <span>
              {new Date(idea.created_at).toLocaleString('ru-RU', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pt-3 space-y-2 shrink-0">
          {rejectMode ? (
            /* Reject reason input */
            <div className="space-y-2">
              <textarea
                autoFocus
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Причина отклонения (необязательно)..."
                className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none outline-none focus:border-red-500/40 h-20"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setRejectMode(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-400 text-sm font-medium active:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-red-600/20 text-red-400 text-sm font-semibold active:bg-red-600/30 disabled:opacity-40"
                >
                  🗑 Отклонить
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Main actions */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleApprove}
                  disabled={saving || isApproved}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl text-xs font-medium transition-colors disabled:opacity-50 ${
                    isApproved
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/5 text-slate-400 active:bg-emerald-600/20'
                  }`}
                >
                  <span className="text-base">✅</span>
                  Approve
                </button>
                <button
                  onClick={() => setRejectMode(true)}
                  disabled={saving || isRejected}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl text-xs font-medium transition-colors disabled:opacity-50 ${
                    isRejected
                      ? 'bg-red-600/30 text-red-300 border border-red-500/40'
                      : 'bg-white/5 text-slate-400 active:bg-red-600/20'
                  }`}
                >
                  <span className="text-base">🗑</span>
                  Reject
                </button>
                <button
                  onClick={handleDefer}
                  disabled={saving || isDeferred}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl text-xs font-medium transition-colors disabled:opacity-50 ${
                    isDeferred
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-slate-400 active:bg-amber-600/20'
                  }`}
                >
                  <span className="text-base">📌</span>
                  Позже
                </button>
              </div>

              {/* Convert + delete */}
              <div className="flex gap-2">
                {!idea.converted_to_task ? (
                  <button
                    onClick={() => { onOpenConvert(); onClose() }}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-600 active:bg-purple-700 text-white text-sm font-medium py-3 rounded-2xl transition-colors"
                  >
                    <ArrowRightCircle size={16} />
                    Convert to Task
                  </button>
                ) : (
                  <div className="flex-1 text-center text-xs text-emerald-400/70 py-3 bg-white/5 rounded-2xl">
                    ✅ Task created
                  </div>
                )}
                <button
                  onClick={() => { onDelete(idea.id); onClose() }}
                  className="flex items-center justify-center w-12 bg-white/5 active:bg-red-900/30 text-slate-500 active:text-red-400 rounded-2xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
