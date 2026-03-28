import { useState, useMemo } from 'react'
import { Lightbulb } from 'lucide-react'
import { useAllIdeas } from '../../hooks/useAllIdeas'
import { useApp } from '../../context/AppContext'
import IdeaDetailModal from './IdeaDetailModal'
import IntakeViewer, { isIntakeIdea } from '../intake/IntakeViewer'
import type { Idea } from '../../types'

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'intake',    label: 'Из Intake' },
  { key: 'feature',   label: 'Feature' },
  { key: 'ux',        label: 'UX' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'bug',       label: 'Bug' },
  { key: 'other',     label: 'Other' },
] as const

type FilterKey = typeof FILTERS[number]['key']

const CATEGORY_COLORS: Record<string, string> = {
  feature:   'bg-blue-900/50 text-blue-400',
  ux:        'bg-purple-900/50 text-purple-400',
  marketing: 'bg-amber-900/50 text-amber-400',
  bug:       'bg-red-900/50 text-red-400',
  other:     'bg-slate-800 text-slate-400',
}

function IdeaCard({
  idea,
  projectName,
  projectColor,
  onOpen,
}: {
  idea: Idea
  projectName: string | undefined
  projectColor: string | undefined
  onOpen: (idea: Idea) => void
}) {
  const categoryClass = CATEGORY_COLORS[idea.ai_category] ?? CATEGORY_COLORS.other
  const label = idea.ai_category
    ? idea.ai_category.charAt(0).toUpperCase() + idea.ai_category.slice(1)
    : 'Idea'

  const title = idea.summary?.trim()
    || (idea.content.length > 60 ? idea.content.slice(0, 60) + '…' : idea.content)

  return (
    <button
      onClick={() => onOpen(idea)}
      className="w-full text-left bg-white/5 rounded-2xl p-4 space-y-2 active:opacity-60 transition-opacity border border-white/[0.06]"
    >
      <p className="text-slate-100 text-sm font-medium line-clamp-1 overflow-hidden">{title}</p>
      <div className="flex items-center gap-2">
        {idea.ai_category && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryClass}`}>
            {label}
          </span>
        )}
        {idea.converted_to_task && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-500">
            Converted
          </span>
        )}
        {projectName && (
          <div className="flex items-center gap-1 ml-auto text-[10px] text-slate-500">
            {projectColor && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: projectColor }} />
            )}
            <span>{projectName}</span>
          </div>
        )}
      </div>
    </button>
  )
}

export default function IdeasTab() {
  const { ideas, loading, markConverted, deleteIdea } = useAllIdeas()
  const { projects } = useApp()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)

  const projectMap = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>()
    for (const p of projects) m.set(p.id, { name: p.name, color: p.color })
    return m
  }, [projects])

  const filtered = useMemo(() => {
    if (filter === 'all') return ideas
    if (filter === 'intake') return ideas.filter(isIntakeIdea)
    return ideas.filter(i => i.ai_category === filter)
  }, [ideas, filter])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-100">Ideas</h1>
        <p className="text-sm text-slate-500 mt-0.5">{ideas.length} idea{ideas.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filter chips */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              filter === f.key
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ideas list */}
      <div className="px-4 space-y-2 flex-1">
        {filter === 'intake' ? (
          <IntakeViewer
            ideas={filtered}
            projects={projects}
            onConvert={markConverted}
            onDelete={deleteIdea}
            onOpen={setSelectedIdea}
          />
        ) : (
          <>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-600">
                <Lightbulb size={32} strokeWidth={1.5} className="mb-3 opacity-40" />
                <p className="text-sm">No ideas yet</p>
                <p className="text-xs mt-1">Ideas captured from projects appear here</p>
              </div>
            )}

            {filtered.map(idea => {
              const proj = projectMap.get(idea.project_id)
              return (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  projectName={proj?.name}
                  projectColor={proj?.color}
                  onOpen={setSelectedIdea}
                />
              )
            })}
          </>
        )}
      </div>

      {/* Detail modal */}
      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          project={projects.find(p => p.id === selectedIdea.project_id)}
          onClose={() => setSelectedIdea(null)}
          onConvert={markConverted}
          onDelete={deleteIdea}
        />
      )}
    </div>
  )
}
