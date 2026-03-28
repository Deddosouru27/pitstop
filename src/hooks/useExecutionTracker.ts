import { useState, useRef, useCallback, useMemo } from 'react'
import type { Task } from '../types'

export interface ExecutionState {
  streak: number
  velocityToday: number
  lastCompletedAt: string | null
  sessionStartedAt: string
}

export interface ExecutionTracker {
  state: ExecutionState
  onTaskCompleted: (task: Task) => void
  shouldSuggestContextUpdate: boolean
  shouldSuggestNextTask: Task | null
  resetStreak: () => void
}

const STREAK_RESET_MS = 30 * 60 * 1000 // 30 minutes

function isToday(iso: string | null): boolean {
  if (!iso) return false
  return new Date(iso).toDateString() === new Date().toDateString()
}

export function useExecutionTracker(tasks: Task[]): ExecutionTracker {
  const [streak, setStreak] = useState(0)
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null)
  const lastCompletedRef = useRef<string | null>(null)
  const sessionStartedAt = useRef(new Date().toISOString())

  const velocityToday = useMemo(
    () => tasks.filter(t => t.is_completed && isToday(t.completed_at)).length,
    [tasks],
  )

  const onTaskCompleted = useCallback((_task: Task) => {
    const now = new Date().toISOString()
    const prev = lastCompletedRef.current
    const shouldReset =
      prev !== null &&
      Date.now() - new Date(prev).getTime() > STREAK_RESET_MS

    lastCompletedRef.current = now
    setLastCompletedAt(now)
    setStreak(s => (shouldReset ? 1 : s + 1))
  }, [])

  const resetStreak = useCallback(() => {
    setStreak(0)
    setLastCompletedAt(null)
    lastCompletedRef.current = null
  }, [])

  const shouldSuggestContextUpdate = streak >= 3

  const shouldSuggestNextTask = useMemo(() => {
    const active = tasks.filter(t => !t.is_completed)
    for (const priority of ['high', 'medium', 'low', 'none'] as const) {
      const found = active.find(t => t.priority === priority)
      if (found) return found
    }
    return null
  }, [tasks])

  return {
    state: {
      streak,
      velocityToday,
      lastCompletedAt,
      sessionStartedAt: sessionStartedAt.current,
    },
    onTaskCompleted,
    shouldSuggestContextUpdate,
    shouldSuggestNextTask,
    resetStreak,
  }
}
