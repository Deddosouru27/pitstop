import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useIdeas } from '../../hooks/useIdeas'
import { callClaude } from '../../lib/anthropic'
import { getContextForAI, addSnapshot } from '../../hooks/useContextSnapshots'
import { useAIBatcher } from '../../hooks/useAIBatcher'
import { inferPriority } from '../../utils/inferPriority'
import ContextBlock from './ContextBlock'
import ContextExport from './ContextExport'
import IdeasModal from './IdeasModal'
import QuickAddIdeaSheet from './QuickAddIdeaSheet'
import EditProjectModal from './EditProjectModal'
import TaskItem from '../tasks/TaskItem'
import type { Idea, Task } from '../../types'

const CONTEXT_SYSTEM_PROMPT = `Ты — интеллектуальный менеджер проекта. Анализируй историю и текущее состояние проекта, возвращай ТОЛЬКО валидный JSON без markdown и пояснений.

Правила формирования полей:
- what_done: 1-2 предложения о ключевых достижениях. Опирайся на завершённые задачи и AI-резюме из истории.
- where_stopped: конкретная точка остановки — что было в работе последним, на чём именно прервались.
- next_step: ОДНО конкретное действие. Алгоритм выбора:
  1. Найди задачи с high priority — выбери ту, что логично продолжает where_stopped
  2. Если high нет — используй medium priority
  3. Если активных задач нет — предложи лучшую идею из списка идей, которая ещё не реализована
  4. Если идей тоже нет — напиши конкретный совет по следующему этапу развития проекта
  5. Формулируй как действие: «Реализовать X», «Исправить Y», «Написать Z»
  6. ВАЖНО: next_step должен быть чем-то, что ещё НЕ сделано. Сверяй с списком выполненных задач. Не повторяй уже сделанное.

Format: {"what_done": string, "where_stopped": string, "next_step": string}`

/** Returns words with length > minLen from a text string */
function wordSet(text: string, minLen = 3): Set<string> {
  return new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > minLen))
}

/** Returns fraction of idea words that overlap with completedWords (0..1) */
function ideaOverlapFraction(ideaContent: string, completedWords: Set<string>): number {
  const words = [...wordSet(ideaContent, 3)]
  if (words.length === 0) return 0
  const matches = words.filter(w => completedWords.has(w)).length
  return matches / words.length
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { projects, tasks, updateProject, deleteProject, createTask, openTask, completeTask } = useApp()
  const { ideas, addIdea, markConverted, deleteIdea } = useIdeas(id!)
  const [updatingContext, setUpdatingContext] = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)
  const [showIdeasModal, setShowIdeasModal] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const justUpdatedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const project = projects.find(p => p.id === id)

  const projectTasks = useMemo(() => {
    if (!id) return []
    return tasks.filter(t => t.project_id === id)
  }, [tasks, id])

  const activeTasks = useMemo(() => projectTasks.filter(t => !t.is_completed), [projectTasks])
  const completedTasks = useMemo(() => projectTasks.filter(t => t.is_completed), [projectTasks])
  const [showDone, setShowDone] = useState(false)

  // Keep always-current refs for use inside the batcher callback
  const activeTasksRef = useRef(activeTasks)
  useEffect(() => { activeTasksRef.current = activeTasks }, [activeTasks])
  const completedTasksRef = useRef(completedTasks)
  useEffect(() => { completedTasksRef.current = completedTasks }, [completedTasks])
  const ideasRef = useRef(ideas)
  useEffect(() => { ideasRef.current = ideas }, [ideas])
  const projectRef = useRef(project)
  useEffect(() => { projectRef.current = project }, [project])

  const runContextUpdate = useCallback(async (projectId: string) => {
    const proj = projectRef.current
    if (!proj || proj.id !== projectId) return
    setUpdatingContext(true)
    try {
      const contextString = await getContextForAI(projectId)
      const currentActiveTasks = activeTasksRef.current
      const currentCompletedTasks = completedTasksRef.current
      const activeIdeas = ideasRef.current.filter(i => !i.converted_to_task)

      // Build set of words from completed task titles for idea overlap detection
      const completedWords = wordSet(
        currentCompletedTasks.map(t => t.title).join(' '), 3
      )

      // Ideas whose content overlaps 60%+ with completed task titles
      const overlappingIdeas = activeIdeas.filter(i => ideaOverlapFraction(i.content, completedWords) >= 0.6)
      const nonOverlappingIdeas = activeIdeas.filter(i => ideaOverlapFraction(i.content, completedWords) < 0.6)

      const userMessage = [
        `Проект: ${proj.name}`,
        '',
        contextString || '(история проекта пуста)',
        '',
        'Текущие активные задачи:',
        currentActiveTasks.length > 0
          ? currentActiveTasks.map(t => `- ${t.title} (приоритет: ${t.priority}${t.due_date ? `, срок: ${t.due_date}` : ''})`).join('\n')
          : 'нет',
        '',
        'Уже выполненные задачи (НЕ предлагай их снова как Next Step):',
        currentCompletedTasks.length > 0
          ? currentCompletedTasks.slice(0, 20).map(t => `- ${t.title}`).join('\n')
          : 'нет',
        '',
        'Идеи которые дублируют выполненные задачи (НЕ предлагай их):',
        overlappingIdeas.length > 0
          ? overlappingIdeas.map(i => `- ${i.content}`).join('\n')
          : 'нет',
        '',
        'Текущие идеи (можно использовать для next_step если задач нет):',
        nonOverlappingIdeas.length > 0
          ? nonOverlappingIdeas.slice(0, 15).map(i => `- ${i.content}${i.ai_category ? ` (${i.ai_category})` : ''}`).join('\n')
          : 'нет',
        '',
        'Предыдущий контекст:',
        `Что сделано: ${proj.ai_what_done || 'нет'}`,
        `Где остановились: ${proj.ai_where_stopped || 'нет'}`,
        `Следующий шаг: ${proj.ai_next_step || 'нет'}`,
        '',
        'Обнови контекст проекта на основе всей этой информации.',
      ].join('\n')

      const raw = await callClaude(CONTEXT_SYSTEM_PROMPT, userMessage)

      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON in response')
      const parsed = JSON.parse(match[0]) as { what_done: string; where_stopped: string; next_step: string }

      const now = new Date().toISOString()

      await updateProject(projectId, {
        ai_what_done: parsed.what_done ?? null,
        ai_where_stopped: parsed.where_stopped ?? null,
        ai_next_step: parsed.next_step ?? null,
        last_session_at: now,
      })

      addSnapshot(projectId, 'ai_summary', {
        what_done: parsed.what_done ?? '',
        where_stopped: parsed.where_stopped ?? '',
        next_step: parsed.next_step ?? '',
        model: 'claude-sonnet-4-6',
      })
    } catch (err) {
      console.error('Context update failed:', err)
    } finally {
      setUpdatingContext(false)
    }
  }, [updateProject])

  const { addEvent, cancel, pendingByProject } = useAIBatcher(runContextUpdate)

  const pendingKind = id ? (pendingByProject[id] ?? null) : null

  // Live countdown when batcher is pending
  useEffect(() => {
    if (!pendingKind) {
      setCountdown(null)
      return
    }
    const startVal = pendingKind === 'strong' ? 20 : 60
    setCountdown(startVal)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [pendingKind])

  const handleUpdateContext = useCallback(async () => {
    if (!id) return
    // Cancel any pending batcher timer and fire immediately
    cancel(id)
    await runContextUpdate(id)
    // Show "Обновлено" for 2 seconds
    if (justUpdatedTimer.current) clearTimeout(justUpdatedTimer.current)
    setJustUpdated(true)
    justUpdatedTimer.current = setTimeout(() => setJustUpdated(false), 2000)
  }, [id, cancel, runContextUpdate])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (justUpdatedTimer.current) clearTimeout(justUpdatedTimer.current)
    }
  }, [])

  if (!project) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-slate-500">
        <p>Project not found</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-accent text-sm">Go back</button>
      </div>
    )
  }

  // Wrap completeTask to fire batcher on completion
  const handleToggleTask = (taskId: string, completed: boolean) => {
    completeTask(taskId, completed, completed ? (task: Task) => {
      if (task.project_id) addEvent(task.project_id, 'task_completed')
    } : undefined)
  }

  const handleConvertToTask = async (idea: Idea) => {
    // Infer priority from idea content + project context
    const inferred = inferPriority(idea.content, {
      nextStep: project.ai_next_step ?? '',
      whereStoped: project.ai_where_stopped ?? '',
      activeTasks: activeTasks.map(t => ({ title: t.title, priority: t.priority })),
      recentIdeas: ideas.filter(i => !i.converted_to_task).map(i => ({ content: i.content })),
    })

    await createTask({
      title: idea.content,
      priority: inferred,
      due_date: null,
      project_id: project.id,
    })
    await markConverted(idea.id)
    addEvent(project.id, 'idea_converted')

    addSnapshot(project.id, 'idea_converted', {
      ideaContent: idea.content,
      taskTitle: idea.content,
      priority: inferred,
    })
  }

  const handleAddIdea = (content: string) => {
    addIdea(content)
    addEvent(project.id, 'idea_added')
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
        <button onClick={() => navigate('/projects')} className="text-slate-500 hover:text-slate-300">
          <ArrowLeft size={20} />
        </button>
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: project.color }} />
        <h1 className="flex-1 font-bold text-slate-100 truncate">{project.name}</h1>
        <button
          onClick={() => setShowEditModal(true)}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Pencil size={17} />
        </button>
      </div>

      <div className="px-4 py-5 space-y-8">
        {/* AI Context Block */}
        <div className="space-y-3">
          <ContextBlock
            project={project}
            onUpdate={handleUpdateContext}
            updating={updatingContext}
            justUpdated={justUpdated}
            countdown={countdown}
          />
          <ContextExport
            project={project}
            activeTasks={activeTasks}
            ideas={ideas}
          />
        </div>

        {/* Tasks */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Задачи · {activeTasks.length} активных
          </h2>

          {projectTasks.length === 0 && (
            <p className="text-sm text-slate-600 text-center py-4">Задач в проекте нет</p>
          )}

          <div className="space-y-1.5">
            {activeTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                project={project}
                onToggle={handleToggleTask}
                onOpen={openTask}
              />
            ))}
          </div>

          {completedTasks.length > 0 && (
            <div className="space-y-1.5">
              <button
                onClick={() => setShowDone(v => !v)}
                className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Выполнено ({completedTasks.length}) {showDone ? '▲' : '▼'}
              </button>
              {showDone && completedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  project={project}
                  onToggle={handleToggleTask}
                  onOpen={openTask}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ideas card */}
        {(() => {
          const visibleCount = ideas.filter(i => !i.converted_to_task).length
          return (
            <div className="bg-surface rounded-2xl overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-4 cursor-pointer active:opacity-70"
                onClick={() => setShowIdeasModal(true)}
              >
                <span className="flex-1 font-semibold text-slate-100 text-sm">Идеи</span>
                {visibleCount > 0 && (
                  <span className="text-xs bg-white/10 text-slate-400 px-2 py-0.5 rounded-full">
                    {visibleCount}
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); setShowQuickAdd(true) }}
                  className="w-7 h-7 flex items-center justify-center rounded-xl bg-accent hover:bg-accent/90 text-white transition-colors"
                >
                  <Plus size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      {showIdeasModal && (
        <IdeasModal
          ideas={ideas}
          onAdd={handleAddIdea}
          onConvert={handleConvertToTask}
          onDelete={deleteIdea}
          onClose={() => setShowIdeasModal(false)}
        />
      )}

      {showQuickAdd && (
        <QuickAddIdeaSheet
          onAdd={handleAddIdea}
          onClose={() => setShowQuickAdd(false)}
        />
      )}

      {showEditModal && (
        <EditProjectModal
          project={project}
          onSave={async (updates) => { await updateProject(project.id, updates) }}
          onDelete={async () => {
            await deleteProject(project.id)
            navigate('/projects')
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}
