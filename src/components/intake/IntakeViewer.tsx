import { ArrowRight, Trash2, Globe } from 'lucide-react'
import type { Idea, Project } from '../../types'

export const INTAKE_SOURCES = new Set([
  'youtube', 'instagram', 'article', 'url', 'twitter', 'threads', 'thread',
  'video', 'research', 'text',
])

/** Returns the effective source value checking both source_type and source fields */
export function getIdeaSource(idea: { source?: string | null; source_type?: string | null }): string | null {
  return idea.source_type ?? idea.source ?? null
}

/** An idea is from Intake if source_type is set (non-empty), or source matches known intake values */
export function isIntakeIdea(idea: { source?: string | null; source_type?: string | null }): boolean {
  if (idea.source_type != null && idea.source_type !== '') return true
  return idea.source != null && idea.source !== '' && INTAKE_SOURCES.has(idea.source)
}

const SOURCE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  youtube:   { label: 'YouTube',   emoji: '🎬', color: 'bg-red-900/50 text-red-400' },
  instagram: { label: 'Instagram', emoji: '📸', color: 'bg-pink-900/50 text-pink-400' },
  article:   { label: 'Статья',    emoji: '📰', color: 'bg-blue-900/50 text-blue-400' },
  url:       { label: 'URL',       emoji: '🔗', color: 'bg-slate-800 text-slate-400' },
  twitter:   { label: 'Twitter/X', emoji: '🐦', color: 'bg-sky-900/50 text-sky-400' },
  threads:   { label: 'Threads',   emoji: '🧵', color: 'bg-violet-900/50 text-violet-400' },
  thread:    { label: 'Thread',    emoji: '🧵', color: 'bg-violet-900/50 text-violet-400' },
  video:     { label: 'Видео',     emoji: '📹', color: 'bg-red-900/50 text-red-400' },
  research:  { label: 'Research',  emoji: '🔬', color: 'bg-emerald-900/50 text-emerald-400' },
  text:      { label: 'Текст',     emoji: '📝', color: 'bg-slate-800 text-slate-400' },
}

const CATEGORY_COLORS: Record<string, string> = {
  feature:   'bg-blue-900/50 text-blue-400',
  ux:        'bg-purple-900/50 text-purple-400',
  marketing: 'bg-amber-900/50 text-amber-400',
  bug:       'bg-red-900/50 text-red-400',
  other:     'bg-slate-800 text-slate-400',
}

interface Props {
  ideas: Idea[]
  projects: Project[]
  onConvert: (id: string) => void
  onDelete: (id: string) => void
  onOpen?: (idea: Idea) => void
}

export default function IntakeViewer({ ideas, projects, onConvert, onDelete, onOpen }: Props) {
  const projectMap = new Map(projects.map(p => [p.id, p]))

  const intakeIdeas = ideas
    .filter(isIntakeIdea)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (intakeIdeas.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-slate-600">
        <Globe size={28} strokeWidth={1.5} className="mb-2 opacity-40" />
        <p className="text-sm">Контент из Intake ещё не обработан</p>
        <p className="text-xs mt-1">YouTube, Instagram, статьи появятся здесь</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {intakeIdeas.map(idea => {
        const src = getIdeaSource(idea) ?? 'url'
        const cfg = SOURCE_CONFIG[src] ?? { label: src, emoji: '🔗', color: 'bg-slate-800 text-slate-400' }
        const proj = projectMap.get(idea.project_id)
        const catColor = idea.ai_category ? (CATEGORY_COLORS[idea.ai_category] ?? CATEGORY_COLORS.other) : null
        const title = idea.summary?.trim()
          || (idea.content.length > 60 ? idea.content.slice(0, 60) + '…' : idea.content)

        return (
          <div
            key={idea.id}
            className="bg-white/5 rounded-2xl p-4 space-y-2 border border-white/[0.06] cursor-pointer active:opacity-60 transition-opacity"
            onClick={() => onOpen?.(idea)}
          >
            {/* Source badge + category + date */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                {cfg.emoji} {cfg.label}
              </span>
              {catColor && idea.ai_category && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${catColor}`}>
                  {idea.ai_category.charAt(0).toUpperCase() + idea.ai_category.slice(1)}
                </span>
              )}
              {proj && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: proj.color }} />
                  <span>{proj.name}</span>
                </div>
              )}
              <span className="text-[10px] text-slate-600 ml-auto">
                {new Date(idea.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {/* Title */}
            <p className="text-slate-100 text-sm font-medium line-clamp-1 overflow-hidden">{title}</p>

            {/* Actions */}
            {idea.converted_to_task ? (
              <p className="text-xs text-emerald-500/70">✓ Задача создана</p>
            ) : (
              <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => onConvert(idea.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600/20 active:bg-purple-600/40 text-purple-400 text-xs font-medium py-2 rounded-xl transition-colors"
                >
                  <ArrowRight size={13} />
                  Создать задачу
                </button>
                <button
                  onClick={() => onDelete(idea.id)}
                  className="flex items-center justify-center w-9 bg-white/5 active:bg-red-900/30 text-slate-500 active:text-red-400 rounded-xl transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
