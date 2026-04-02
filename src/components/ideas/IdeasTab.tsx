import { useState, useMemo } from 'react'
import { Lightbulb, ChevronDown, CheckSquare, Square, X, Users } from 'lucide-react'
import { useAllIdeas } from '../../hooks/useAllIdeas'
import { useApp } from '../../context/AppContext'
import IdeaDetailModal from './IdeaDetailModal'
import { supabase } from '../../lib/supabase'
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

type StatusTab = 'pending' | 'accepted' | 'dismissed' | 'deferred'
type GroupMode = 'none' | 'source' | 'category'

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'pending',   label: 'Новые' },
  { key: 'accepted',  label: 'В работу' },
  { key: 'deferred',  label: 'Позже' },
  { key: 'dismissed', label: 'Отклонённые' },
]

const CATEGORY_CHIPS = ['all', 'feature', 'ux', 'marketing', 'bug', 'other'] as const
type CategoryChip = typeof CATEGORY_CHIPS[number]

// ── Helpers ───────────────────────────────────────────────────────────────────

function ideaStatus(idea: Idea): StatusTab {
  const s = idea.status
  if (s === 'accepted' || s === 'dismissed' || s === 'deferred') return s
  return 'pending'
}

function sourceLabel(source: string | null | undefined): string {
  if (!source) return 'Без источника'
  try {
    const url = new URL(source)
    const host = url.hostname.replace(/^www\./, '')
    if (host.includes('instagram.com')) {
      const m = url.pathname.match(/\/([^/?#]+)/)
      return m ? `Instagram @${m[1]}` : 'Instagram'
    }
    if (host.includes('youtube.com') || host === 'youtu.be') return 'YouTube'
    if (host.includes('t.me') || host.includes('telegram')) {
      const m = url.pathname.match(/\/([^/?#]+)/)
      return m ? `Telegram @${m[1]}` : 'Telegram'
    }
    return host
  } catch {
    return source.length > 40 ? source.slice(0, 40) + '…' : source
  }
}

function groupKey(idea: Idea, mode: GroupMode): string {
  if (mode === 'source') return idea.source ?? '__none__'
  if (mode === 'category') return idea.ai_category || 'other'
  return '__all__'
}

function groupLabel(key: string, mode: GroupMode): string {
  if (mode === 'source') {
    if (key === '__none__') return 'Без источника'
    return sourceLabel(key)
  }
  if (mode === 'category') {
    if (!key || key === 'other') return 'Other'
    return key.charAt(0).toUpperCase() + key.slice(1)
  }
  return 'Все'
}

// ── IdeaCard ──────────────────────────────────────────────────────────────────

function IdeaCard({
  idea,
  projectName,
  projectColor,
  selected,
  selectMode,
  onOpen,
  onToggleSelect,
}: {
  idea: Idea
  projectName: string | undefined
  projectColor: string | undefined
  selected: boolean
  selectMode: boolean
  onOpen: (idea: Idea) => void
  onToggleSelect: (id: string) => void
}) {
  const categoryClass = CATEGORY_COLORS[idea.ai_category] ?? CATEGORY_COLORS.other
  const title = idea.summary?.trim()
    || (idea.content.length > 80 ? idea.content.slice(0, 80) + '…' : idea.content)

  function handleClick() {
    if (selectMode) onToggleSelect(idea.id)
    else onOpen(idea)
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left rounded-2xl p-3.5 space-y-2 border transition-all active:opacity-70 ${
        selected
          ? 'bg-purple-600/15 border-purple-500/40'
          : 'bg-white/5 border-white/[0.06]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {selectMode && (
          <span className="shrink-0 mt-0.5 text-purple-400">
            {selected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-600" />}
          </span>
        )}
        <p className="flex-1 text-slate-100 text-sm font-medium line-clamp-2 leading-snug">{title}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {idea.relevance === 'hot' && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/30">
            🔥 Hot
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
        {projectName && (
          <div className="flex items-center gap-1 ml-auto text-[10px] text-slate-500">
            {projectColor && <span className="w-1.5 h-1.5 rounded-full" style={{ background: projectColor }} />}
            <span>{projectName}</span>
          </div>
        )}
      </div>
    </button>
  )
}

// ── Group block ───────────────────────────────────────────────────────────────

function GroupBlock({
  label,
  ideas,
  projectMap,
  selectedIds,
  selectMode,
  onOpen,
  onToggleSelect,
}: {
  label: string
  ideas: Idea[]
  projectMap: Map<string, { name: string; color: string }>
  selectedIds: Set<string>
  selectMode: boolean
  onOpen: (idea: Idea) => void
  onToggleSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-1 py-1 active:opacity-70"
      >
        <ChevronDown size={13} className={`text-slate-600 transition-transform shrink-0 ${open ? '' : '-rotate-90'}`} />
        <span className="text-xs text-slate-400 font-medium flex-1 text-left truncate">{label}</span>
        <span className="text-[10px] text-slate-600">{ideas.length}</span>
      </button>
      {open && (
        <div className="space-y-1.5 pl-0">
          {ideas.map(idea => {
            const proj = projectMap.get(idea.project_id)
            return (
              <IdeaCard
                key={idea.id}
                idea={idea}
                projectName={proj?.name}
                projectColor={proj?.color}
                selected={selectedIds.has(idea.id)}
                selectMode={selectMode}
                onOpen={onOpen}
                onToggleSelect={onToggleSelect}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Bulk action bar ───────────────────────────────────────────────────────────

function BulkBar({
  count,
  total,
  onAccept,
  onDefer,
  onDismiss,
  onSelectAll,
  onClear,
}: {
  count: number
  total: number
  onAccept: () => void
  onDefer: () => void
  onDismiss: () => void
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
            onClick={onAccept}
            className="flex-1 text-xs font-medium py-2 rounded-xl bg-emerald-600/20 text-emerald-400 active:bg-emerald-600/30 transition-colors"
          >
            ✅ Принять
          </button>
          <button
            onClick={onDefer}
            className="flex-1 text-xs font-medium py-2 rounded-xl bg-amber-600/20 text-amber-400 active:bg-amber-600/30 transition-colors"
          >
            📌 Позже
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 text-xs font-medium py-2 rounded-xl bg-red-600/20 text-red-400 active:bg-red-600/30 transition-colors"
          >
            🗑 Отклонить
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IdeasTab() {
  const { ideas, loading, markConverted, deleteIdea, updateStatus } = useAllIdeas()
  const { projects } = useApp()
  const [statusTab, setStatusTab] = useState<StatusTab>('pending')
  const [catFilter, setCatFilter] = useState<CategoryChip>('all')
  const [groupMode, setGroupMode] = useState<GroupMode>('none')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)

  const projectMap = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>()
    for (const p of projects) m.set(p.id, { name: p.name, color: p.color })
    return m
  }, [projects])

  // Counts per status tab (ignoring category filter)
  const statusCounts = useMemo(() => {
    const counts: Record<StatusTab, number> = { pending: 0, accepted: 0, dismissed: 0, deferred: 0 }
    for (const idea of ideas) counts[ideaStatus(idea)]++
    return counts
  }, [ideas])

  // Filtered by status + category
  const filtered = useMemo(() => {
    return ideas.filter(idea => {
      if (ideaStatus(idea) !== statusTab) return false
      if (catFilter !== 'all' && idea.ai_category !== catFilter) return false
      return true
    })
  }, [ideas, statusTab, catFilter])

  // Grouped
  const groups = useMemo(() => {
    if (groupMode === 'none') return [{ key: '__all__', label: 'Все', items: filtered }]
    const map = new Map<string, Idea[]>()
    for (const idea of filtered) {
      const k = groupKey(idea, groupMode)
      const arr = map.get(k) ?? []
      arr.push(idea)
      map.set(k, arr)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([k, items]) => ({ key: k, label: groupLabel(k, groupMode), items }))
  }, [filtered, groupMode])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  async function bulkAccept() {
    const selectedIdeas = filtered.filter(i => selectedIds.has(i.id))
    const ids = selectedIdeas.map(i => i.id)
    exitSelectMode()
    await updateStatus(ids, 'accepted')
    await Promise.all(
      selectedIdeas.map(idea =>
        supabase.from('tasks').insert({
          title: idea.summary?.trim() || idea.content.slice(0, 80),
          description: idea.content,
          project_id: idea.project_id ?? null,
          priority: 'medium',
          due_date: null,
          status: 'todo',
          is_completed: false,
        })
      )
    )
    await Promise.all(ids.map(id => markConverted(id)))
  }

  async function bulkAction(status: 'dismissed' | 'deferred') {
    const ids = Array.from(selectedIds)
    exitSelectMode()
    await updateStatus(ids, status)
  }

  function cycleGroupMode() {
    setGroupMode(prev => {
      if (prev === 'none') return 'source'
      if (prev === 'source') return 'category'
      return 'none'
    })
  }

  const groupModeLabel = groupMode === 'none' ? 'Группировка' : groupMode === 'source' ? 'По источнику' : 'По категории'

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
          <button
            onClick={cycleGroupMode}
            className={`text-xs px-2.5 py-1.5 rounded-xl border transition-colors ${
              groupMode !== 'none'
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                : 'bg-white/5 border-white/[0.06] text-slate-500'
            }`}
          >
            <Users size={13} className="inline mr-1" />
            {groupModeLabel}
          </button>
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
            onClick={() => { setStatusTab(tab.key); exitSelectMode() }}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              statusTab === tab.key
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
              statusTab === tab.key ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'
            }`}>
              {statusCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {CATEGORY_CHIPS.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full transition-colors ${
              catFilter === cat
                ? 'bg-white/15 text-slate-200'
                : 'bg-white/5 text-slate-500 active:bg-white/10'
            }`}
          >
            {cat === 'all' ? 'Все категории' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 space-y-4 flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-600">
            <Lightbulb size={32} strokeWidth={1.5} className="mb-3 opacity-40" />
            <p className="text-sm">Идей нет</p>
          </div>
        ) : groupMode === 'none' ? (
          <div className="space-y-1.5">
            {filtered.map(idea => {
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
                />
              )
            })}
          </div>
        ) : (
          groups.map(g => (
            <GroupBlock
              key={g.key}
              label={`${g.label} (${g.items.length})`}
              ideas={g.items}
              projectMap={projectMap}
              selectedIds={selectedIds}
              selectMode={selectMode}
              onOpen={setSelectedIdea}
              onToggleSelect={toggleSelect}
            />
          ))
        )}
      </div>

      {/* Bulk action bar */}
      {selectMode && selectedIds.size > 0 && (
        <BulkBar
          count={selectedIds.size}
          total={filtered.length}
          onAccept={bulkAccept}
          onDefer={() => bulkAction('deferred')}
          onDismiss={() => bulkAction('dismissed')}
          onSelectAll={selectAll}
          onClear={exitSelectMode}
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
    </div>
  )
}
