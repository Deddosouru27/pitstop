import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Target, ChevronLeft } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useIdeas } from '../../hooks/useIdeas'
import { callClaude } from '../../lib/anthropic'
import { getContextForAI, addSnapshot } from '../../hooks/useContextSnapshots'
import { inferPriority } from '../../utils/inferPriority'
import { useAIBatcher } from '../../hooks/useAIBatcher'
import FocusView from './FocusView'
import ContextBlock from './ContextBlock'
import ContextExport from './ContextExport'
import IdeasModal from './IdeasModal'
import QuickAddIdeaSheet from './QuickAddIdeaSheet'
import EditProjectModal from './EditProjectModal'
import GoalInputSheet from './GoalInputSheet'
import GoalPreviewSheet from './GoalPreviewSheet'
import type { ProposedTask } from './GoalPreviewSheet'
import BotActivitySection from './BotActivitySection'
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
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false)
  const [goalText, setGoalText] = useState('')
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([])
  const [isDecomposing, setIsDecomposing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [showFullDetail, setShowFullDetail] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [quickAddPriority, setQuickAddPriority] = useState<'low' | 'medium' | 'high'>('medium')

  const project = projects.find(p => p.id === id)

  const projectTasks = useMemo(() => {
    if (!id) return []
    return tasks.filter(t => t.project_id === id)
  }, [tasks, id])

  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 }

  const activeTasks = useMemo(() =>
    projectTasks
      .filter(t => !t.is_completed && t.status !== 'done' && t.status !== 'cancelled')
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 3
        const pb = PRIORITY_ORDER[b.priority] ?? 3
        if (pa !== pb) return pa - pb
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }),
    [projectTasks]
  )
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

  const handleDecompose = async (text: string) => {
    if (!project) return
    setIsDecomposing(true)
    setGoalText(text)
    try {
      const contextMemory = await getContextForAI(project.id)
      const currentActive = activeTasksRef.current
      const currentCompleted = completedTasksRef.current

      const systemPrompt = `Ты — опытный технический менеджер проекта.
Пользователь описывает конкретную цель, которую хочет реализовать в своём проекте.
Твоя задача: декомпозировать эту цель на конкретные исполнимые задачи.

Правила:
- Каждая задача должна быть конкретной и исполнимой (не "улучшить UX", а "добавить анимацию появления карточки")
- НЕ дублируй активные задачи
- НЕ предлагай то, что уже выполнено
- Разбивай на 3-7 задач (не больше, не меньше)
- Расставляй приоритеты логично: что блокирует остальное = high
- Возвращай ТОЛЬКО валидный JSON-массив без markdown и пояснений

Format: [{"title": string, "description": string, "priority": "low"|"medium"|"high"}]`

      const userMessage = [
        `Проект: ${project.name}`,
        '',
        `Цель: ${text}`,
        '',
        'Контекст проекта:',
        contextMemory || '(история пуста)',
        '',
        'Активные задачи (НЕ дублировать):',
        currentActive.length > 0 ? currentActive.map(t => `- ${t.title}`).join('\n') : 'нет',
        '',
        'Выполненные задачи (НЕ предлагать снова):',
        currentCompleted.length > 0 ? currentCompleted.slice(0, 20).map(t => `- ${t.title}`).join('\n') : 'нет',
        '',
        'Текущее состояние:',
        project.ai_where_stopped || 'не определено',
        '',
        'Декомпозируй цель на задачи.',
      ].join('\n')

      const response = await callClaude(systemPrompt, userMessage)
      const match = response.replace(/```json|```/g, '').match(/\[[\s\S]*\]/)
      if (!match) throw new Error('No array in response')
      const parsed = JSON.parse(match[0]) as ProposedTask[]

      setProposedTasks(parsed)
      setGoalSheetOpen(false)
      setPreviewSheetOpen(true)
    } catch (err) {
      console.error('Goal decomposition failed:', err)
    } finally {
      setIsDecomposing(false)
    }
  }

  const handleConfirmGoal = async () => {
    if (!project) return
    setIsConfirming(true)
    try {
      const results: Array<{ title: string; ok: boolean }> = []
      for (const task of proposedTasks) {
        const created = await createTask({
          title: task.title,
          description: task.description,
          priority: task.priority,
          due_date: null,
          project_id: project.id,
        })
        results.push({ title: task.title, ok: !!created })
        if (created) {
          addSnapshot(project.id, 'task_created', {
            title: task.title,
            priority: task.priority,
          })
        }
      }
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) {
        console.error('Some tasks failed to create:', failed.map(f => f.title))
      }
      setPreviewSheetOpen(false)
      setGoalText('')
      setProposedTasks([])
    } catch (err) {
      console.error('Task creation failed:', err)
    } finally {
      setIsConfirming(false)
    }
  }

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

  const handleQuickAddTask = async () => {
    const trimmed = quickAddTitle.trim()
    if (!trimmed || !project) return
    await createTask({
      title: trimmed,
      priority: quickAddPriority,
      due_date: null,
      project_id: project.id,
    })
    setQuickAddTitle('')
    setQuickAddPriority('medium')
    setQuickAddOpen(false)
    addEvent(project.id, 'task_created')
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
        <button
          onClick={() => showFullDetail ? setShowFullDetail(false) : navigate('/projects')}
          className="text-slate-500 hover:text-slate-300"
        >
          {showFullDetail ? <ChevronLeft size={20} /> : <ArrowLeft size={20} />}
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

      {!showFullDetail ? (
        <FocusView
          project={project}
          activeTasks={activeTasks}
          ideas={ideas}
          onShowDetail={() => setShowFullDetail(true)}
          onOpenTask={openTask}
          onToggleTask={handleToggleTask}
          onUpdateContext={handleUpdateContext}
          updatingContext={updatingContext}
        />
      ) : (
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

          {/* Set Goal button */}
          <button
            onClick={() => setGoalSheetOpen(true)}
            className="w-full flex items-center justify-center gap-2 border border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5 text-purple-400 font-semibold rounded-2xl py-3 text-sm transition-colors"
          >
            <Target size={15} />
            Задать цель
          </button>

          {/* Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Задачи · {activeTasks.length} активных
              </h2>
              <button
                onClick={() => setQuickAddOpen(v => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-xl bg-accent hover:bg-accent/90 text-white transition-colors"
              >
                <Plus size={15} strokeWidth={2.5} />
              </button>
            </div>

            {quickAddOpen && (
              <div className="bg-surface rounded-2xl p-4 space-y-3">
                <input
                  type="text"
                  value={quickAddTitle}
                  onChange={e => setQuickAddTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleQuickAddTask() }}
                  placeholder="Название задачи..."
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-accent/50 transition-colors"
                />
                <div className="flex items-center gap-2">
                  {(['high', 'medium', 'low'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setQuickAddPriority(p)}
                      className={`flex-1 text-xs font-semibold py-2 rounded-xl transition-colors ${
                        quickAddPriority === p
                          ? p === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : p === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                          : 'bg-green-500/20 text-green-400 border border-green-500/40'
                          : 'bg-white/5 text-slate-500 border border-white/10'
                      }`}
                    >
                      {p === 'high' ? 'Высокий' : p === 'medium' ? 'Средний' : 'Низкий'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleQuickAddTask}
                  disabled={!quickAddTitle.trim()}
                  className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
                >
                  Добавить задачу
                </button>
              </div>
            )}

            {projectTasks.length === 0 && !quickAddOpen && (
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

          {/* Bot activity */}
          <BotActivitySection projectId={project.id} />

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
      )}

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

      <GoalInputSheet
        isOpen={goalSheetOpen}
        onClose={() => setGoalSheetOpen(false)}
        onDecompose={handleDecompose}
        isLoading={isDecomposing}
      />

      <GoalPreviewSheet
        isOpen={previewSheetOpen}
        onClose={() => { setPreviewSheetOpen(false); setProposedTasks([]) }}
        onConfirm={handleConfirmGoal}
        tasks={proposedTasks}
        goalText={goalText}
        isConfirming={isConfirming}
      />
    </div>
  )
}
