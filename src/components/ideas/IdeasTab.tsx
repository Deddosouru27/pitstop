import { useState, useMemo } from 'react'
import { Lightbulb, CheckSquare, Square, X, ArrowRightCircle } from 'lucide-react'
import { useAllIdeas } from '../../hooks/useAllIdeas'
import { useApp } from '../../context/AppContext'
import IdeaDetailModal from './IdeaDetailModal'
import ConvertToTaskModal from './ConvertToTaskModal'
import type { Idea } from '../../types'

// ── Constants ─────────────────────────────────────────────────────────────────

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

type StatusFilter = 'new' | 'approved' | 'rejected' | 'deferred'
type RelevanceFilter = 'all' | 'hot' | 'strategic'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'new',      label: 'Новые' },
  { key: 'approved', label: 'Approved' },
  { key: 'deferred', label: 'Позже' },
  { key: 'rejected', label: 'Rejected' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function ideaMatchesStatus(idea: Idea, filter: StatusFilter): boolean {
  const s = idea.status
  switch (filter) {
    case 'new':      return !s || s === 'pending'
    case 'approved': return s === 'accepted'
    case 'rejected': return s === 'dismissed'
    case 'deferred': return s === 'deferred'
  }
}

// ── RejectModal ───────────────────────────────────────────────────────────────

function RejectModal({ count, onConfirm, onCancel }: {
  count: number
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const noun = count === 1 ? 'идею' : count < 5 ? 'идеи' : 'идей'
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full bg-[#13131a] rounded-t-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <p className="text-slate-200 text-sm font-semibold">Отклонить {count} {noun}</p>
          <button onClick={onCancel} className="text-slate-500 active:text-slate-300"><X size={20} /></button>
        </div>
        <div className="px-5 pb-8 space-y-3">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Причина отклонения (необязательно)..."
            className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none outline-none focus:border-purple-500/50 h-24"
          />
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 rounded-2xl bg-white/5 text-slate-400 text-sm font-medium active:bg-white/10">
              Отмена
            </button>
            <button onClick={() => onConfirm(reason)} className="flex-1 py-3 rounded-2xl bg-red-600/20 text-red-400 text-sm font-semibold active:bg-red-600/30">
              🗑 Отклонить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── IdeaCard ──────────────────────────────────────────────────────────────────

function IdeaCard({ idea, projectName, projectColor, selected, selectMode, onOpen, onToggleSelect, onConvert }: {
  idea: Idea
  projectName: string | undefined
  projectColor: string | undefined
  selected: boolean
  selectMode: boolean
  onOpen: (idea: Idea) => void
  onToggleSelect: (id: string) => void
  onConvert: (idea: Idea) => void
}) {
  const categoryClass = CATEGORY_COLORS[idea.ai_category] ?? CATEGORY_COLORS.other
  const title = idea.summary?.trim()
    || (idea.content.length > 80 ? idea.content.slice(0, 80) + '…' : idea.content)

  return (
    <div
      className={`w-full text-left rounded-2xl p-3.5 space-y-2 border transition-all ${
        selected ? 'bg-purple-600/15 border-purple-500/40' : 'bg-white/5 border-white/[0.06]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {selectMode && (
          <button onClick={() => onToggleSelect(idea.id)} className="shrink-0 mt-0.5 text-purple-400 active:opacity-70">
            {selected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-600" />}
          </button>
        )}
        <button
          onClick={() => selectMode ? onToggleSelect(idea.id) : onOpen(idea)}
          className="flex-1 text-left active:opacity-70"
        >
          <p className="text-slate-100 text-sm font-medium line-clamp-2 leading-snug">{title}</p>
        </button>
        {!selectMode && !idea.converted_to_task && (
          <button
            onClick={e => { e.stopPropagation(); onConvert(idea) }}
            className="shrink-0 text-slate-600 active:text-purple-400 transition-colors mt-0.5"
            title="Создать задачу"
          >
            <ArrowRightCircle size={15} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
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
        {idea.ai_category && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryClass}`}>
            {idea.ai_category.charAt(0).toUpperCase() + idea.ai_category.slice(1)}
          </span>
        )}
        {idea.converted_to_task && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-500">
            Converted
          </span>
        )}
        {idea.rejection_reason && (
          <span className="text-[10px] text-slate-500 italic truncate max-w-[160px]">
            ✗ {idea.rejection_reason}
          </span>
        )}
        {projectName && (
          <div className="flex items-center gap-1 ml-auto text-[10px] text-slate-500">
            {projectColor && <span className="w-1.5 h-1.5 rounded-full" style={{ background: projectColor }} />}
            <span>{projectName}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── BulkBar ───────────────────────────────────────────────────────────────────

function BulkBar({ count, total, onApprove, onReject, onConvert, onSelectAll, onClear }: {
  count: number
  total: number
  onApprove: () => void
  onReject: () => void
  onConvert: () => void
  onSelectAll: () => void
  onClear: () => void
}) {
  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-40 px-4">
      <div className="bg-[#1c1c2e] border border-white/10 rounded-2xl px-4 py-3 shadow-2xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">
            Выбрано: <span className="text-slate-200">{count}</span> из {total}
          </span>
          <button
            onClick={onSelectAll}
            className="text-[10px] text-purple-400 active:text-purple-300 underline underline-offset-2 ml-1"
          >
            {count === total ? 'Снять все' : 'Выбрать все'}
          </button>
          <button onClick={onClear} className="text-slate-600 active:text-slate-400 ml-auto">
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onApprove}
            className="flex-1 text-xs font-medium py-2 rounded-xl bg-emerald-600/20 text-emerald-400 active:bg-emerald-600/30 transition-colors"
          >
            ✅ Approve
          </button>
          <button
            onClick={onReject}
            className="flex-1 text-xs font-medium py-2 rounded-xl bg-red-600/20 text-red-400 active:bg-red-600/30 transition-colors"
          >
            🗑 Reject
          </button>
          <button
            onClick={onConvert}
            disabled={count !== 1}
            className="flex-1 text-xs font-medium py-2 rounded-xl bg-blue-600/20 text-blue-400 active:bg-blue-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            🔄 В задачу
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IdeasTab() {
  const { ideas, loading, markConverted, deleteIdea, updateStatus, rejectIdeas } = useAllIdeas()
  const { projects } = useApp()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('new')
  const [relevanceFilter, setRelevanceFilter] = useState<RelevanceFilter>('all')
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [convertIdea, setConvertIdea] = useState<Idea | null>(null)

  const projectMap = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>()
    for (const p of projects) m.set(p.id, { name: p.name, color: p.color })
    return m
  }, [projects])

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { new: 0, approved: 0, rejected: 0, deferred: 0 }
    const keys: StatusFilter[] = ['new', 'approved', 'rejected', 'deferred']
    for (const idea of ideas) {
      for (const key of keys) {
        if (ideaMatchesStatus(idea, key)) { counts[key]++; break }
      }
    }
    return counts
  }, [ideas])

  const sourceTypes = useMemo(() => {
    const seen = new Set<string>()
    for (const idea of ideas) if (idea.source_type) seen.add(idea.source_type)
    return Array.from(seen).sort()
  }, [ideas])

  const filtered = useMemo(() => {
    return ideas.filter(idea => {
      if (!ideaMatchesStatus(idea, statusFilter)) return false
      if (relevanceFilter !== 'all' && idea.relevance !== relevanceFilter) return false
      if (sourceTypeFilter !== 'all' && idea.source_type !== sourceTypeFilter) return false
      return true
    })
  }, [ideas, statusFilter, relevanceFilter, sourceTypeFilter])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map(i => i.id)))
  }

  async function handleApprove() {
    const ids = Array.from(selectedIds)
    exitSelectMode()
    await updateStatus(ids, 'accepted')
  }

  async function handleRejectConfirm(reason: string) {
    const ids = Array.from(selectedIds)
    setRejectModalOpen(false)
    exitSelectMode()
    await rejectIdeas(ids, reason || undefined)
  }

  function handleConvertSingle() {
    const id = Array.from(selectedIds)[0]
    const idea = ideas.find(i => i.id === id)
    if (!idea) return
    exitSelectMode()
    setConvertIdea(idea)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="flex-1 text-2xl font-bold text-slate-100">Ideas</h1>
          <span className="text-xs text-slate-600">{ideas.length}</span>
          {selectMode ? (
            <button
              onClick={exitSelectMode}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/[0.06] text-slate-400"
            >
              Отмена
            </button>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/[0.06] text-slate-400"
            >
              Выбрать
            </button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); exitSelectMode() }}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              statusFilter === tab.key
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
              statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'
            }`}>{statusCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Relevance filter */}
      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {(['all', 'hot', 'strategic'] as RelevanceFilter[]).map(r => (
          <button
            key={r}
            onClick={() => setRelevanceFilter(r)}
            className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full transition-colors ${
              relevanceFilter === r
                ? 'bg-white/15 text-slate-200'
                : 'bg-white/5 text-slate-500 active:bg-white/10'
            }`}
          >
            {r === 'all' ? 'Все' : r === 'hot' ? '🔥 Hot' : '📐 Strategic'}
          </button>
        ))}
      </div>

      {/* Source type filter */}
      {sourceTypes.length > 0 && (
        <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSourceTypeFilter('all')}
            className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full transition-colors ${
              sourceTypeFilter === 'all'
                ? 'bg-white/15 text-slate-200'
                : 'bg-white/5 text-slate-500 active:bg-white/10'
            }`}
          >
            Все источники
          </button>
          {sourceTypes.map(st => {
            const cfg = SOURCE_TYPE_CFG[st] ?? { label: st, cls: '' }
            return (
              <button
                key={st}
                onClick={() => setSourceTypeFilter(st)}
                className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                  sourceTypeFilter === st
                    ? 'bg-white/15 text-slate-200'
                    : 'bg-white/5 text-slate-500 active:bg-white/10'
                }`}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      )}

      {/* List */}
      <div className="px-4 space-y-1.5 flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-600">
            <Lightbulb size={32} strokeWidth={1.5} className="mb-3 opacity-40" />
            <p className="text-sm">Идей нет</p>
          </div>
        ) : (
          filtered.map(idea => {
            const proj = projectMap.get(idea.project_id)
            return (
              <IdeaCard
                key={idea.id}
                idea={idea}
                projectName={proj?.name}
                projectColor={proj?.color}
                selected={selectedIds.has(idea.id)}
                selectMode={selectMode}
                onOpen={setSelectedIdea}
                onToggleSelect={toggleSelect}
                onConvert={setConvertIdea}
              />
            )
          })
        )}
      </div>

      {/* Bulk action bar */}
      {selectMode && selectedIds.size > 0 && (
        <BulkBar
          count={selectedIds.size}
          total={filtered.length}
          onApprove={handleApprove}
          onReject={() => setRejectModalOpen(true)}
          onConvert={handleConvertSingle}
          onSelectAll={selectAll}
          onClear={exitSelectMode}
        />
      )}

      {/* Reject reason modal */}
      {rejectModalOpen && (
        <RejectModal
          count={selectedIds.size}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectModalOpen(false)}
        />
      )}

      {/* Detail modal */}
      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          project={projects.find(p => p.id === selectedIdea.project_id)}
          onClose={() => setSelectedIdea(null)}
          onConvert={markConverted}
          onDelete={deleteIdea}
          onUpdateStatus={updateStatus}
        />
      )}

      {/* Convert to task modal */}
      {convertIdea && (
        <ConvertToTaskModal
          idea={convertIdea}
          onClose={() => setConvertIdea(null)}
          onCreated={() => markConverted(convertIdea.id)}
        />
      )}
    </div>
  )
}
