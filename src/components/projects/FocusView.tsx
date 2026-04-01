import { useState, useMemo } from 'react'
import { Copy, Check, ChevronRight, Sparkles, Loader2 } from 'lucide-react'
import { getSnapshots, formatSnapshotFull } from '../../hooks/useContextSnapshots'
import type { Project, Task, Idea } from '../../types'

interface Props {
  project: Project
  activeTasks: Task[]
  ideas: Idea[]
  onShowDetail: () => void
  onOpenTask: (taskId: string) => void
  onToggleTask: (taskId: string, completed: boolean) => void
  onUpdateContext: () => Promise<void>
  updatingContext: boolean
}

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
}

/** Extract checklist items from free-form description text.
 *  Looks for lines starting with "- ", "• ", digits, or keywords like "проверить/check/тест".
 *  Falls back to generic test checklist. */
function extractTestChecklist(description: string | null): string {
  if (!description?.trim()) {
    return [
      '- [ ] Позитивный сценарий работает',
      '- [ ] Ошибочный ввод / граничные случаи не ломают приложение',
      '- [ ] npm run build ✅ 0 ошибок TypeScript',
    ].join('\n')
  }

  const lines = description
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 5)

  // Lines that look like checklist items or test scenarios
  const checkLines = lines.filter(l =>
    /^[-•*\d]/.test(l) ||
    /проверить|check|тест|негат|ошибк|edge|fail|должен|must/i.test(l)
  )

  const items = (checkLines.length > 0 ? checkLines : lines.slice(0, 3))
    .slice(0, 6)
    .map(l => `- [ ] ${l.replace(/^[-•*\d.)\s]+/, '')}`)

  return [
    ...items,
    '- [ ] npm run build ✅ 0 ошибок TypeScript',
    '- [ ] Коммит с описанием изменений',
  ].join('\n')
}

async function buildHandoffText(project: Project, activeTasks: Task[], ideas: Idea[]): Promise<string> {
  const snapshots = await getSnapshots(project.id)

  const historyLines = snapshots
    .map(s => formatSnapshotFull(s))
    .filter(line => line.length > 0)

  // Primary task = highest priority active task
  const [primaryTask, ...otherTasks] = activeTasks

  // Task block builder
  const taskBlock = (t: Task): string => [
    `**${t.title}**`,
    `Приоритет: ${t.priority}${t.due_date ? ` · Срок: ${t.due_date}` : ''}${t.status ? ` · Статус: ${t.status}` : ''}`,
    ...(t.description ? ['', t.description] : []),
  ].join('\n')

  const otherTaskLines = otherTasks.length > 0
    ? otherTasks.map(t => `- ${t.title} (${t.priority})`).join('\n')
    : '_Нет дополнительных задач_'

  const visibleIdeas = ideas.filter(i => !i.converted_to_task)
  const ideaLines = visibleIdeas.length > 0
    ? visibleIdeas.map(i => `- ${i.content}`).join('\n')
    : '_Нет идей_'

  // Expected outcome: first non-empty of task description summary or ai_next_step
  const expectedOutcome = primaryTask?.description
    ? primaryTask.description.split('\n')[0]
    : (project.ai_next_step || '_не определён_')

  const sections: string[] = [
    `# Work Package: ${project.name}`,
    '',
  ]

  if (project.github_repo) {
    sections.push(`**Репо:** \`${project.github_repo}\``, '')
  }

  sections.push(
    '## Контекст проекта',
    `**Что сделано:** ${project.ai_what_done || '_не заполнено_'}`,
    `**Где остановились:** ${project.ai_where_stopped || '_не заполнено_'}`,
    '',
    '## Задача',
    primaryTask ? taskBlock(primaryTask) : '_Нет активных задач_',
    '',
    '## Ожидаемый результат',
    expectedOutcome,
    '',
    '## Правила',
    '- Полный рабочий код, без TODO, заглушек, placeholder',
    '- TypeScript strict: никаких any',
    '- npm run build ✅ до коммита',
    '- Коммит с описанием что сделано и почему',
    '- Не ломать существующий функционал',
    '',
    '## Тест-чеклист',
    extractTestChecklist(primaryTask?.description ?? null),
  )

  if (otherTasks.length > 0) {
    sections.push('', '## Остальные задачи', otherTaskLines)
  }

  sections.push(
    '',
    '## Идеи',
    ideaLines,
    '',
    '## История',
    historyLines.length > 0 ? historyLines.slice(0, 10).join('\n') : '_История пуста_',
  )

  return sections.join('\n')
}

export default function FocusView({
  project,
  activeTasks,
  ideas,
  onShowDetail,
  onOpenTask,
  onToggleTask,
  onUpdateContext,
  updatingContext,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)

  const FOCUS_STATUSES = new Set<string | undefined>(['backlog', 'todo', 'in_progress', undefined])

  const nextTasks = useMemo(() => {
    return [...activeTasks]
      .filter(t => FOCUS_STATUSES.has(t.status))
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3))
      .slice(0, 3)
  }, [activeTasks])

  const hasContext = project.ai_next_step || project.ai_where_stopped

  const handleCopyHandoff = async () => {
    setCopyLoading(true)
    try {
      const md = await buildHandoffText(project, activeTasks, ideas)
      await navigator.clipboard.writeText(md)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } finally {
      setCopyLoading(false)
    }
  }

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Main focus card: what to do now */}
      {hasContext ? (
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-5 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Что делать сейчас
            </p>
            <p className="text-base text-slate-100 leading-relaxed">
              {project.ai_next_step || 'Обновите контекст для получения рекомендации'}
            </p>
          </div>

          {project.ai_where_stopped && (
            <div className="border-t border-white/[0.06] pt-3 space-y-1">
              <p className="text-xs font-semibold text-slate-500">Где остановились</p>
              <p className="text-sm text-slate-300">{project.ai_where_stopped}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyHandoff}
              disabled={copyLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-300 hover:text-slate-100 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              {copied ? (
                <><Check size={14} className="text-green-400" /> Скопировано!</>
              ) : (
                <><Copy size={14} /> Handoff</>
              )}
            </button>
            <button
              onClick={onUpdateContext}
              disabled={updatingContext}
              className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-400 hover:text-slate-200 text-sm font-medium px-3 py-2.5 rounded-xl transition-colors"
            >
              {updatingContext
                ? <Loader2 size={14} className="animate-spin" />
                : <Sparkles size={14} />
              }
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl p-5 text-center space-y-3">
          <p className="text-sm text-slate-400">Контекст ещё не сгенерирован</p>
          <button
            onClick={onUpdateContext}
            disabled={updatingContext}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white transition-colors disabled:opacity-60"
          >
            {updatingContext ? (
              <><Loader2 size={14} className="animate-spin" /> Генерирую...</>
            ) : (
              <><Sparkles size={14} /> Сгенерировать контекст</>
            )}
          </button>
        </div>
      )}

      {/* Repo / Deploy links */}
      {(project.github_repo || project.deploy_url) && (
        <div className="flex flex-wrap gap-2">
          {project.github_repo && (
            <a
              href={`https://github.com/${project.github_repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 hover:bg-white/10 active:bg-white/10 px-3 py-1.5 rounded-xl transition-colors"
              onClick={e => e.stopPropagation()}
            >
              📦 {project.github_repo}
            </a>
          )}
          {project.deploy_url && (
            <a
              href={project.deploy_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 hover:bg-white/10 active:bg-white/10 px-3 py-1.5 rounded-xl transition-colors"
              onClick={e => e.stopPropagation()}
            >
              🚀 {project.deploy_url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      )}

      {/* Next 3 tasks */}
      {nextTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Следующие задачи
          </p>
          <div className="space-y-1.5">
            {nextTasks.map((task, idx) => (
              <div
                key={task.id}
                className="flex items-start gap-3 px-4 py-3 bg-surface rounded-2xl active:opacity-60 cursor-pointer"
                onClick={() => onOpenTask(task.id)}
              >
                <button
                  onClick={e => { e.stopPropagation(); onToggleTask(task.id, true) }}
                  className="shrink-0 w-[22px] h-[22px] rounded-full border-2 border-slate-600 flex items-center justify-center transition-all hover:border-purple-500"
                />
                <span className="text-xs text-slate-500 font-mono w-4 shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-slate-100">{task.title}</p>
                  {task.description && (
                    <p className="truncate text-xs text-slate-500 mt-0.5">
                      {task.description.length > 80
                        ? task.description.slice(0, 80) + '…'
                        : task.description}
                    </p>
                  )}
                </div>
                {task.priority !== 'none' && (
                  <span className={`shrink-0 w-2 h-2 rounded-full ${
                    task.priority === 'high' ? 'bg-red-500' :
                    task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show detail button */}
      <button
        onClick={onShowDetail}
        className="w-full flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm font-medium py-3 transition-colors"
      >
        Подробнее <ChevronRight size={15} />
      </button>
    </div>
  )
}
