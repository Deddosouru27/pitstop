import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAgentJobs } from '../../hooks/useAgentJobs'
import type { Task } from '../../types'

interface Props {
  projectId: string
}

function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (ms < 1000) return '<1с'
  if (ms < 60000) return `${Math.round(ms / 1000)}с`
  return `${Math.round(ms / 60000)}м`
}

const ASSIGNEE_LABELS: Record<string, string> = {
  baker: 'Пекарь',
  runner: 'Ноут',
  intake: 'Интакер',
  auto: 'Авто',
}

export default function BotActivitySection({ projectId }: Props) {
  const { jobs, loading } = useAgentJobs(projectId)
  const [botTasks, setBotTasks] = useState<Task[]>([])

  useEffect(() => {
    supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('created_by', 'bot')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setBotTasks(data) })
  }, [projectId])

  if (loading) return null

  return (
    <div className="space-y-5">
      {/* ── Задачи от бота ─────────────────────────────────────────────── */}
      {botTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            📥 Задачи от бота
          </h2>
          <div className="space-y-1.5">
            {botTasks.map(task => (
              <div key={task.id} className="bg-surface rounded-2xl px-4 py-3 space-y-0.5">
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5 shrink-0">
                    {task.is_completed ? '✅' : '📋'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-snug">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                  {task.assignee && (
                    <span className="shrink-0 text-[11px] text-slate-500 bg-white/5 rounded-lg px-2 py-0.5">
                      {ASSIGNEE_LABELS[task.assignee] ?? task.assignee}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Последние действия бота ────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          🤖 Последние действия бота
        </h2>

        {jobs.length === 0 ? (
          <div className="text-center py-6 space-y-1">
            <p className="text-sm text-slate-500">Активности нет</p>
            <p className="text-xs text-slate-600">Запусти /autorun МАOS в Telegram чтобы бот начал работать</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {jobs.map(job => {
              const result = job.result ?? {}
              const taskName =
                (result.task as string) ||
                (result.goal as string) ||
                job.type
              const commit = result.commit as string | undefined
              const duration = formatDuration(job.created_at, job.updated_at)

              return (
                <div key={job.id} className="bg-surface rounded-2xl px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5 shrink-0">
                      {job.status === 'completed' ? '✅' : '❌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 leading-snug">{taskName}</p>
                      {commit && (
                        <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">
                          {commit}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs text-slate-500">{duration}</p>
                      <p className="text-xs text-slate-600">
                        {new Date(job.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
