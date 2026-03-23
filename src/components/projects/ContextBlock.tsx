import { Sparkles, Loader2 } from 'lucide-react'
import type { Project } from '../../types'

interface Props {
  project: Project
  onUpdate: () => Promise<void>
  updating: boolean
}

export default function ContextBlock({ project, onUpdate, updating }: Props) {
  const hasContext = project.ai_what_done || project.ai_where_stopped || project.ai_next_step

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Контекст</h2>
        <button
          onClick={onUpdate}
          disabled={updating}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-colors"
        >
          {updating
            ? <><Loader2 size={12} className="animate-spin" /> Обновляю...</>
            : <><Sparkles size={12} /> Обновить контекст</>
          }
        </button>
      </div>

      {!hasContext ? (
        <div className="bg-surface-el rounded-2xl px-4 py-6 text-center">
          <p className="text-sm text-slate-500">Нажмите «Обновить контекст» для генерации</p>
          <p className="text-xs text-slate-600 mt-1">Claude проанализирует задачи и идеи проекта</p>
        </div>
      ) : (
        <div className="space-y-2">
          {project.ai_what_done && (
            <div className="bg-surface-el rounded-2xl px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-success">✅ Что сделано</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{project.ai_what_done}</p>
            </div>
          )}
          {project.ai_where_stopped && (
            <div className="bg-surface-el rounded-2xl px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-warning">📍 Где остановились</p>
              <p className="text-sm text-slate-200">{project.ai_where_stopped}</p>
            </div>
          )}
          {project.ai_next_step && (
            <div className="bg-surface-el rounded-2xl px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-accent">▶ Следующий шаг</p>
              <p className="text-sm text-slate-200">{project.ai_next_step}</p>
            </div>
          )}
        </div>
      )}

      {project.last_session_at && (
        <p className="text-xs text-slate-600 text-right">
          Обновлено {new Date(project.last_session_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  )
}
