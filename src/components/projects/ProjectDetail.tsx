import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useIdeas } from '../../hooks/useIdeas'
import { callClaude } from '../../lib/anthropic'
import { getContextForAI, addSnapshot } from '../../hooks/useContextSnapshots'
import ContextBlock from './ContextBlock'
import ContextExport from './ContextExport'
import IdeasSection from './IdeasSection'
import TaskItem from '../tasks/TaskItem'
import type { Idea } from '../../types'

const CONTEXT_SYSTEM_PROMPT = `Ты — интеллектуальный менеджер проекта. У тебя есть полная история проекта в виде хронологического лога. На основе этой истории обнови контекст проекта. ВАЖНО: не сбрасывай старую информацию, а развивай и уточняй её. Отвечай ТОЛЬКО валидным JSON без markdown: {"what_done": string, "where_stopped": string, "next_step": string}`

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { projects, tasks, updateProject, createTask, openTask, completeTask } = useApp()
  const { ideas, addIdea, markConverted, deleteIdea } = useIdeas(id!)
  const [updatingContext, setUpdatingContext] = useState(false)

  const project = projects.find(p => p.id === id)

  const projectTasks = useMemo(() => {
    if (!id) return []
    return tasks.filter(t => t.project_id === id)
  }, [tasks, id])

  const activeTasks = useMemo(() => projectTasks.filter(t => !t.is_completed), [projectTasks])
  const completedTasks = useMemo(() => projectTasks.filter(t => t.is_completed), [projectTasks])
  const [showDone, setShowDone] = useState(false)

  if (!project) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-slate-500">
        <p>Project not found</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-accent text-sm">Go back</button>
      </div>
    )
  }

  const handleUpdateContext = async () => {
    setUpdatingContext(true)
    try {
      // Fetch full project memory (last 50 snapshots)
      const contextString = await getContextForAI(id!)

      const activeIdeas = ideas.filter(i => !i.converted_to_task)

      const userMessage = [
        `Проект: ${project.name}`,
        '',
        contextString || '(история проекта пуста)',
        '',
        'Текущие активные задачи:',
        activeTasks.length > 0
          ? activeTasks.map(t => `- ${t.title} (приоритет: ${t.priority}${t.due_date ? `, срок: ${t.due_date}` : ''})`).join('\n')
          : 'нет',
        '',
        'Текущие идеи:',
        activeIdeas.length > 0
          ? activeIdeas.slice(0, 15).map(i => `- ${i.content}${i.ai_category ? ` (${i.ai_category})` : ''}`).join('\n')
          : 'нет',
        '',
        'Предыдущий контекст:',
        `Что сделано: ${project.ai_what_done || 'нет'}`,
        `Где остановились: ${project.ai_where_stopped || 'нет'}`,
        `Следующий шаг: ${project.ai_next_step || 'нет'}`,
        '',
        'Обнови контекст проекта на основе всей этой информации.',
      ].join('\n')

      const raw = await callClaude(CONTEXT_SYSTEM_PROMPT, userMessage)

      // Extract JSON even if there's surrounding text
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON in response')
      const parsed = JSON.parse(match[0]) as { what_done: string; where_stopped: string; next_step: string }

      const now = new Date().toISOString()

      await updateProject(project.id, {
        ai_what_done: parsed.what_done ?? null,
        ai_where_stopped: parsed.where_stopped ?? null,
        ai_next_step: parsed.next_step ?? null,
        last_session_at: now,
      })

      // Log the AI summary as a snapshot (fire-and-forget)
      addSnapshot(project.id, 'ai_summary', {
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
  }

  const handleConvertToTask = async (idea: Idea) => {
    await createTask({
      title: idea.content,
      priority: 'none',
      due_date: null,
      project_id: project.id,
    })
    await markConverted(idea.id)
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
      </div>

      <div className="px-4 py-5 space-y-8">
        {/* AI Context Block */}
        <div className="space-y-3">
          <ContextBlock
            project={project}
            onUpdate={handleUpdateContext}
            updating={updatingContext}
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
                onToggle={completeTask}
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
                  onToggle={completeTask}
                  onOpen={openTask}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ideas */}
        <IdeasSection
          ideas={ideas}
          onAdd={addIdea}
          onConvert={handleConvertToTask}
          onDelete={deleteIdea}
        />
      </div>
    </div>
  )
}
