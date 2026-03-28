import { useAgentJobs } from '../../hooks/useAgentJobs'

interface Props {
  projectId: string
}

function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (ms < 1000) return '<1с'
  if (ms < 60000) return `${Math.round(ms / 1000)}с`
  return `${Math.round(ms / 60000)}м`
}

export default function BotActivitySection({ projectId }: Props) {
  const { jobs, loading } = useAgentJobs(projectId)

  if (loading) return null

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        🤖 Последние действия бота
      </h2>

      {jobs.length === 0 ? (
        <p className="text-sm text-slate-600 text-center py-4">
          Бот ещё не выполнял задачи
        </p>
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
  )
}
