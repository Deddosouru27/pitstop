import { useState, useRef, useCallback } from 'react'
import type { BatcherEventType } from '../types'

export type { BatcherEventType }

const STRONG_TRIGGERS = new Set<BatcherEventType>([
  'task_completed',
  'idea_converted',
  'priority_changed',
])

const STRONG_DELAY = 20_000
const WEAK_DELAY = 60_000
const WEAK_THRESHOLD = 3

interface PendingEntry {
  timer: ReturnType<typeof setTimeout>
  weakCount: number
  kind: 'strong' | 'weak'
}

/**
 * Batches AI update triggers per project.
 * - STRONG events (task_completed, idea_converted, priority_changed): fire after 20s
 * - WEAK events (task_created, idea_added): fire after 60s only if 3+ accumulated
 *
 * Returns reactive `pendingByProject` map so components can show indicators.
 */
export function useAIBatcher(onFire: (projectId: string) => void) {
  // Reactive state for UI indicators
  const [pendingByProject, setPendingByProject] = useState<Record<string, 'strong' | 'weak'>>({})

  // Non-reactive ref for timer management (avoids re-renders on every tick)
  const entriesRef = useRef<Map<string, PendingEntry>>(new Map())

  // Always-current onFire to avoid stale closures in timers
  const onFireRef = useRef(onFire)
  onFireRef.current = onFire

  const setPending = useCallback((projectId: string, kind: 'strong' | 'weak') => {
    setPendingByProject(prev => ({ ...prev, [projectId]: kind }))
  }, [])

  const clearPending = useCallback((projectId: string) => {
    setPendingByProject(prev => {
      const next = { ...prev }
      delete next[projectId]
      return next
    })
  }, [])

  const cancel = useCallback((projectId: string) => {
    const entry = entriesRef.current.get(projectId)
    if (entry) {
      clearTimeout(entry.timer)
      entriesRef.current.delete(projectId)
      clearPending(projectId)
    }
  }, [clearPending])

  const addEvent = useCallback((projectId: string, eventType: BatcherEventType) => {
    const isStrong = STRONG_TRIGGERS.has(eventType)
    const existing = entriesRef.current.get(projectId)

    if (isStrong) {
      // Cancel any existing timer and set a strong one
      if (existing) clearTimeout(existing.timer)
      const timer = setTimeout(() => {
        entriesRef.current.delete(projectId)
        clearPending(projectId)
        onFireRef.current(projectId)
      }, STRONG_DELAY)
      entriesRef.current.set(projectId, { timer, weakCount: 0, kind: 'strong' })
      setPending(projectId, 'strong')
    } else {
      // WEAK: if strong already pending, ignore (strong already covers it)
      if (existing?.kind === 'strong') return

      const newCount = (existing?.weakCount ?? 0) + 1

      if (newCount >= WEAK_THRESHOLD) {
        // Threshold reached — escalate to strong timer
        if (existing) clearTimeout(existing.timer)
        const timer = setTimeout(() => {
          entriesRef.current.delete(projectId)
          clearPending(projectId)
          onFireRef.current(projectId)
        }, STRONG_DELAY)
        entriesRef.current.set(projectId, { timer, weakCount: newCount, kind: 'strong' })
        setPending(projectId, 'strong')
      } else {
        // Keep accumulating; reset/extend the weak timer
        if (existing) clearTimeout(existing.timer)
        const timer = setTimeout(() => {
          entriesRef.current.delete(projectId)
          clearPending(projectId)
          onFireRef.current(projectId)
        }, WEAK_DELAY)
        entriesRef.current.set(projectId, { timer, weakCount: newCount, kind: 'weak' })
        setPending(projectId, 'weak')
      }
    }
  }, [setPending, clearPending])

  return { addEvent, cancel, pendingByProject }
}
