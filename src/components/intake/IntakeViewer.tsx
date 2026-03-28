import { Youtube, Instagram, Globe, FileText, ArrowRight, Trash2 } from 'lucide-react'
import type { Idea, Project } from '../../types'

const INTAKE_SOURCES = new Set(['youtube', 'instagram', 'article', 'url'])

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  youtube:   { label: 'YouTube',   icon: Youtube,   color: 'bg-red-900/50 text-red-400' },
  instagram: { label: 'Instagram', icon: Instagram,  color: 'bg-pink-900/50 text-pink-400' },
  article:   { label: 'Article',   icon: FileText,   color: 'bg-blue-900/50 text-blue-400' },
  url:       { label: 'URL',       icon: Globe,      color: 'bg-slate-800 text-slate-400' },
}

interface Props {
  ideas: Idea[]
  projects: Project[]
  onConvert: (id: string) => void
  onDelete: (id: string) => void
}

export default function IntakeViewer({ ideas, projects, onConvert, onDelete }: Props) {
  const projectMap = new Map(projects.map(p => [p.id, p]))

  const intakeIdeas = ideas
    .filter(i => i.source && INTAKE_SOURCES.has(i.source))
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
        const src = idea.source ?? 'url'
        const cfg = SOURCE_CONFIG[src] ?? SOURCE_CONFIG.url
        const Icon = cfg.icon
        const proj = projectMap.get(idea.project_id)

        return (
          <div
            key={idea.id}
            className="bg-white/5 rounded-2xl p-4 space-y-2 border border-white/[0.06]"
          >
            {/* Source badge + date */}
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                <Icon size={10} />
                {cfg.label}
              </span>
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

            {/* Content */}
            <p className="text-slate-100 text-sm leading-relaxed">{idea.content}</p>

            {/* Actions */}
            {idea.converted_to_task ? (
              <p className="text-xs text-emerald-500/70">✓ Задача создана</p>
            ) : (
              <div className="flex gap-2 pt-1">
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
