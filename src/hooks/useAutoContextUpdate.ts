import { useCallback, useRef, useEffect } from 'react'
import { callClaude } from '../lib/anthropic'
import { getContextForAI, addSnapshot } from './useContextSnapshots'
import { useAIBatcher } from './useAIBatcher'
import type { Project, Task } from '../types'

const CONTEXT_SYSTEM_PROMPT = `You are an intelligent project manager. Analyze the project history and current state, return ONLY valid JSON without markdown or explanations.

Rules for generating fields:
- what_done: 1-2 sentences about key achievements. Base on completed tasks and AI summaries from history.
- where_stopped: specific stopping point — what was being worked on last, where exactly work was interrupted.
- next_step: ONE specific action. Selection algorithm:
  1. Find high priority tasks — choose one that logically continues where_stopped
  2. If no high — use medium priority
  3. If no active tasks — suggest the best unconverted idea
  4. If no ideas either — write specific advice for next project development stage
  5. Phrase as action: "Implement X", "Fix Y", "Write Z"
  6. IMPORTANT: next_step must be something NOT yet done. Cross-check with completed tasks list. Do not repeat already done items.

Format: {"what_done": string, "where_stopped": string, "next_step": string}`

interface AutoContextDeps {
  projects: Project[]
  tasks: Task[]
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>
}

/**
 * Global auto-context updater. Fires AI context update when tasks are completed.
 * Returns a wrapped completeTask that auto-triggers batcher events.
 */
export function useAutoContextUpdate({ projects, tasks, updateProject }: AutoContextDeps) {
  const projectsRef = useRef(projects)
  useEffect(() => { projectsRef.current = projects }, [projects])
  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])
  const updateProjectRef = useRef(updateProject)
  useEffect(() => { updateProjectRef.current = updateProject }, [updateProject])

  const runContextUpdate = useCallback(async (projectId: string) => {
    const proj = projectsRef.current.find(p => p.id === projectId)
    if (!proj) return

    try {
      const contextString = await getContextForAI(projectId)
      const allTasks = tasksRef.current.filter(t => t.project_id === projectId)
      const currentActiveTasks = allTasks.filter(t => !t.is_completed)
      const currentCompletedTasks = allTasks.filter(t => t.is_completed)

      const userMessage = [
        `Project: ${proj.name}`,
        '',
        contextString || '(project history is empty)',
        '',
        'Current active tasks:',
        currentActiveTasks.length > 0
          ? currentActiveTasks.map(t => `- ${t.title} (priority: ${t.priority}${t.due_date ? `, due: ${t.due_date}` : ''})`).join('\n')
          : 'none',
        '',
        'Already completed tasks (DO NOT suggest these as Next Step):',
        currentCompletedTasks.length > 0
          ? currentCompletedTasks.slice(0, 20).map(t => `- ${t.title}`).join('\n')
          : 'none',
        '',
        'Previous context:',
        `What done: ${proj.ai_what_done || 'none'}`,
        `Where stopped: ${proj.ai_where_stopped || 'none'}`,
        `Next step: ${proj.ai_next_step || 'none'}`,
        '',
        'Update the project context based on all this information.',
      ].join('\n')

      const raw = await callClaude(CONTEXT_SYSTEM_PROMPT, userMessage)
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON in response')
      const parsed = JSON.parse(match[0]) as { what_done: string; where_stopped: string; next_step: string }

      const now = new Date().toISOString()

      await updateProjectRef.current(projectId, {
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
      console.error('[auto-context] Update failed:', err)
    }
  }, [])

  const { addEvent, cancel, pendingByProject } = useAIBatcher(runContextUpdate)

  /** Fire context update immediately for a project (cancels pending batcher) */
  const fireContextUpdate = useCallback(async (projectId: string) => {
    cancel(projectId)
    await runContextUpdate(projectId)
  }, [cancel, runContextUpdate])

  /** Notify the batcher that a task was completed for a project */
  const onTaskCompleted = useCallback((projectId: string) => {
    addEvent(projectId, 'task_completed')
  }, [addEvent])

  /** Notify the batcher of any event type */
  const addBatcherEvent = useCallback((projectId: string, eventType: 'task_completed' | 'idea_converted' | 'priority_changed' | 'task_created' | 'idea_added') => {
    addEvent(projectId, eventType)
  }, [addEvent])

  return {
    onTaskCompleted,
    addBatcherEvent,
    fireContextUpdate,
    pendingByProject,
  }
}
