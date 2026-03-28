export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'cancelled'
export type Priority = 'none' | 'low' | 'medium' | 'high'
export type AgentJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type AgentJobType = 'run' | 'autorun'

export interface Task {
  id: string
  title: string
  description: string | null
  is_completed: boolean
  status: TaskStatus
  priority: Priority
  due_date: string | null
  project_id: string | null
  cycle_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface AgentJob {
  id: string
  type: AgentJobType
  status: AgentJobStatus
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  retry_count: number
  chat_id: string | null
  created_at: string
  updated_at: string
}

export interface AutorunState {
  startedAt: Date
  totalProcessed: number
  successCount: number
  failCount: number
  consecutiveErrors: number
  maxConsecutiveErrors: number
  maxDurationMs: number
  stopped: boolean
  results: TaskResult[]
}

export interface TaskResult {
  taskId: string
  taskTitle: string
  status: 'success' | 'failed' | 'skipped'
  error: string | null
  durationMs: number
  timestamp: Date
}

export type StopReason = 'no_tasks' | 'max_errors' | 'timeout' | 'user_stop' | 'completed'

export interface AutorunSummary {
  stopReason: StopReason
  totalProcessed: number
  successCount: number
  failCount: number
  durationMs: number
  results: TaskResult[]
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
}

export const AUTORUN_DEFAULTS = {
  maxConsecutiveErrors: 3,
  maxDurationMs: 2 * 60 * 60 * 1000, // 2 hours
  pollIntervalMs: 1000,
} as const
