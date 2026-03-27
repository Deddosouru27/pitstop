import type { BatcherEventType } from '../hooks/useAIBatcher'

/**
 * Module-level queue for AI batcher events.
 *
 * Allows components outside ProjectDetail (e.g. TasksTab) to enqueue
 * task_created / idea_added events that ProjectDetail drains on mount
 * and forwards to its local useAIBatcher instance.
 *
 * Events older than MAX_AGE_MS are silently discarded when drained.
 */

const MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes

interface PendingEvent {
  projectId: string
  eventType: BatcherEventType
  timestamp: number
}

const queue: PendingEvent[] = []

/** Enqueue a batcher event for a project. Safe to call from anywhere. */
export function enqueueBatcherEvent(projectId: string, eventType: BatcherEventType): void {
  queue.push({ projectId, eventType, timestamp: Date.now() })
}

/**
 * Drain and return all non-expired events for the given project.
 * Expired events and events for other projects are discarded/kept respectively.
 */
export function drainBatcherEvents(projectId: string): BatcherEventType[] {
  const now = Date.now()
  const drained: BatcherEventType[] = []
  let writeIdx = 0

  for (let i = 0; i < queue.length; i++) {
    const event = queue[i]
    if (now - event.timestamp > MAX_AGE_MS) continue // discard expired
    if (event.projectId === projectId) {
      drained.push(event.eventType)
    } else {
      queue[writeIdx++] = event // keep for other projects
    }
  }

  queue.length = writeIdx
  return drained
}
