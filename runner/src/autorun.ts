import { supabase } from './supabase.js'
import { executeTask } from './task-runner.js'
import { sendTelegramMessage, formatTaskReport, formatAutorunSummary } from './telegram.js'
import type { Task, AutorunState, AutorunSummary, StopReason } from './types.js'
import { PRIORITY_ORDER, AUTORUN_DEFAULTS } from './types.js'

export interface AutorunOptions {
  maxConsecutiveErrors?: number
  maxDurationMs?: number
  projectId?: string
}

export async function startAutorun(options: AutorunOptions = {}): Promise<AutorunSummary> {
  const state: AutorunState = {
    startedAt: new Date(),
    totalProcessed: 0,
    successCount: 0,
    failCount: 0,
    consecutiveErrors: 0,
    maxConsecutiveErrors: options.maxConsecutiveErrors ?? AUTORUN_DEFAULTS.maxConsecutiveErrors,
    maxDurationMs: options.maxDurationMs ?? AUTORUN_DEFAULTS.maxDurationMs,
    stopped: false,
    results: [],
  }

  // Register autorun job
  const { data: autorunJob } = await supabase
    .from('agent_jobs')
    .insert({
      type: 'autorun',
      status: 'running',
      payload: {
        max_consecutive_errors: state.maxConsecutiveErrors,
        max_duration_ms: state.maxDurationMs,
        project_id: options.projectId ?? null,
      },
    })
    .select('id')
    .single()

  const autorunJobId = autorunJob?.id ?? null

  await sendTelegramMessage('🚀 <b>Autorun запущен</b>\nОжидаем задачи из PitStop...')

  // Listen for /stop via agent_jobs status change
  const stopChannel = autorunJobId
    ? supabase
        .channel('autorun-stop')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'agent_jobs',
            filter: `id=eq.${autorunJobId}`,
          },
          (payload) => {
            const updated = payload.new as { status: string }
            if (updated.status === 'cancelled') {
              state.stopped = true
            }
          },
        )
        .subscribe()
    : null

  let stopReason: StopReason = 'completed'

  try {
    while (true) {
      // Check stop conditions
      if (state.stopped) {
        stopReason = 'user_stop'
        break
      }

      const elapsed = Date.now() - state.startedAt.getTime()
      if (elapsed >= state.maxDurationMs) {
        stopReason = 'timeout'
        break
      }

      if (state.consecutiveErrors >= state.maxConsecutiveErrors) {
        stopReason = 'max_errors'
        break
      }

      // Fetch next task
      const task = await fetchNextTask(options.projectId)
      if (!task) {
        stopReason = 'no_tasks'
        break
      }

      // Execute task
      const result = await executeTask(task)
      state.results.push(result)
      state.totalProcessed++

      if (result.status === 'success') {
        state.successCount++
        state.consecutiveErrors = 0
      } else {
        state.failCount++
        state.consecutiveErrors++
      }

      // Remaining tasks count
      const remainingCount = await countRemainingTasks(options.projectId)

      // Send mini-report to Telegram
      await sendTelegramMessage(
        formatTaskReport(
          result.taskTitle,
          result.status,
          result.durationMs,
          result.error,
          remainingCount,
          state.totalProcessed,
        ),
      )

      // Brief pause between tasks
      await sleep(AUTORUN_DEFAULTS.pollIntervalMs)
    }
  } finally {
    // Cleanup realtime subscription
    if (stopChannel) {
      await supabase.removeChannel(stopChannel)
    }

    // Update autorun job
    if (autorunJobId) {
      await supabase
        .from('agent_jobs')
        .update({
          status: stopReason === 'user_stop' ? 'cancelled' : 'completed',
          result: {
            stop_reason: stopReason,
            total_processed: state.totalProcessed,
            success_count: state.successCount,
            fail_count: state.failCount,
            duration_ms: Date.now() - state.startedAt.getTime(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', autorunJobId)
    }
  }

  const summary: AutorunSummary = {
    stopReason,
    totalProcessed: state.totalProcessed,
    successCount: state.successCount,
    failCount: state.failCount,
    durationMs: Date.now() - state.startedAt.getTime(),
    results: state.results,
  }

  // Send final summary to Telegram
  await sendTelegramMessage(
    formatAutorunSummary(
      summary.stopReason,
      summary.totalProcessed,
      summary.successCount,
      summary.failCount,
      summary.durationMs,
    ),
  )

  return summary
}

async function fetchNextTask(projectId?: string): Promise<Task | null> {
  let query = supabase
    .from('tasks')
    .select('*')
    .in('status', ['backlog', 'todo'])
    .order('priority', { ascending: true })
    .limit(20)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    console.error(`[autorun] Failed to fetch tasks: ${error.message}`)
    return null
  }

  if (!data || data.length === 0) {
    return null
  }

  // Sort by priority using our order map (high=0 first)
  const sorted = data.sort((a, b) => {
    const aPri = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 3
    const bPri = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 3
    if (aPri !== bPri) return aPri - bPri
    // Within same priority, prefer 'todo' over 'backlog'
    if (a.status === 'todo' && b.status === 'backlog') return -1
    if (a.status === 'backlog' && b.status === 'todo') return 1
    return 0
  })

  return sorted[0] as Task
}

async function countRemainingTasks(projectId?: string): Promise<number> {
  let query = supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .in('status', ['backlog', 'todo'])

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { count } = await query
  return count ?? 0
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
