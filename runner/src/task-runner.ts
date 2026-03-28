import { supabase } from './supabase.js'
import type { Task, TaskResult } from './types.js'

export async function executeTask(task: Task): Promise<TaskResult> {
  const startTime = Date.now()

  try {
    // Mark task as in_progress
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', task.id)

    if (updateError) {
      throw new Error(`Failed to update task status: ${updateError.message}`)
    }

    // Log the job in agent_jobs
    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .insert({
        type: 'run',
        status: 'running',
        payload: { task_id: task.id, task_title: task.title },
      })
      .select('id')
      .single()

    if (jobError) {
      console.error(`[task-runner] Failed to create agent_job: ${jobError.message}`)
    }

    // Execute: mark task as done
    // In a full implementation this would invoke Claude or another agent.
    // For now, the runner transitions the task through the workflow.
    const { error: completeError } = await supabase
      .from('tasks')
      .update({
        status: 'done',
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    if (completeError) {
      throw new Error(`Failed to complete task: ${completeError.message}`)
    }

    // Update agent_job to completed
    if (job) {
      await supabase
        .from('agent_jobs')
        .update({
          status: 'completed',
          result: { task_id: task.id, duration_ms: Date.now() - startTime },
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    }

    return {
      taskId: task.id,
      taskTitle: task.title,
      status: 'success',
      error: null,
      durationMs: Date.now() - startTime,
      timestamp: new Date(),
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    // Mark task as blocked on failure
    await supabase
      .from('tasks')
      .update({ status: 'blocked', updated_at: new Date().toISOString() })
      .eq('id', task.id)

    return {
      taskId: task.id,
      taskTitle: task.title,
      status: 'failed',
      error: errorMessage,
      durationMs: Date.now() - startTime,
      timestamp: new Date(),
    }
  }
}
