import { startAutorun } from './autorun.js'
import type { AutorunOptions } from './autorun.js'
import { supabase } from './supabase.js'
import { startTelegramPolling, sendTelegramMessage } from './telegram.js'

type CommandName = 'autorun' | 'run' | 'stop' | 'telegram' | 'poll'

interface ParsedArgs {
  command: CommandName
  projectId?: string
  maxErrors?: number
  maxDurationMs?: number
  jobId?: string
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  const command = args[0] as CommandName

  const validCommands: CommandName[] = ['autorun', 'run', 'stop', 'telegram', 'poll']

  if (!command || !validCommands.includes(command)) {
    console.error('Usage: tsx src/index.ts <command> [options]')
    console.error('')
    console.error('Commands:')
    console.error('  autorun                   Start continuous task processing')
    console.error('  run                       Run a single next task')
    console.error('  stop --job-id <id>        Stop a running autorun')
    console.error('  telegram                  Start Telegram bot (long-polling for /autorun, /stop, /status)')
    console.error('  poll                      Poll for pending autorun jobs and execute them')
    console.error('')
    console.error('Options:')
    console.error('  --project-id <id>         Filter tasks by project')
    console.error('  --max-errors <n>          Max consecutive errors (default: 3)')
    console.error('  --max-duration <minutes>  Max duration in minutes (default: 120)')
    console.error('  --job-id <id>             Autorun job ID to stop')
    process.exit(1)
  }

  const parsed: ParsedArgs = { command }

  for (let i = 1; i < args.length; i++) {
    const flag = args[i]
    const value = args[i + 1]

    switch (flag) {
      case '--project-id':
        if (!value) {
          console.error('--project-id requires a value')
          process.exit(1)
        }
        parsed.projectId = value
        i++
        break

      case '--max-errors':
        if (!value || isNaN(Number(value))) {
          console.error('--max-errors requires a numeric value')
          process.exit(1)
        }
        parsed.maxErrors = Number(value)
        i++
        break

      case '--max-duration':
        if (!value || isNaN(Number(value))) {
          console.error('--max-duration requires a numeric value (minutes)')
          process.exit(1)
        }
        parsed.maxDurationMs = Number(value) * 60 * 1000
        i++
        break

      case '--job-id':
        if (!value) {
          console.error('--job-id requires a value')
          process.exit(1)
        }
        parsed.jobId = value
        i++
        break

      default:
        console.error(`Unknown option: ${flag}`)
        process.exit(1)
    }
  }

  return parsed
}

async function handleAutorun(parsed: ParsedArgs): Promise<void> {
  const options: AutorunOptions = {
    projectId: parsed.projectId,
    maxConsecutiveErrors: parsed.maxErrors,
    maxDurationMs: parsed.maxDurationMs,
  }

  console.log('[autorun] Starting continuous loop...')
  if (options.projectId) {
    console.log(`[autorun] Filtering by project: ${options.projectId}`)
  }
  console.log(`[autorun] Max consecutive errors: ${options.maxConsecutiveErrors ?? 3}`)
  console.log(`[autorun] Max duration: ${(options.maxDurationMs ?? 7200000) / 60000} minutes`)
  console.log('')

  const summary = await startAutorun(options)

  console.log('')
  console.log('=== AUTORUN SUMMARY ===')
  console.log(`Stop reason:    ${summary.stopReason}`)
  console.log(`Total tasks:    ${summary.totalProcessed}`)
  console.log(`Successful:     ${summary.successCount}`)
  console.log(`Failed:         ${summary.failCount}`)
  console.log(`Duration:       ${Math.round(summary.durationMs / 1000)}s`)
  console.log('')

  if (summary.results.length > 0) {
    console.log('Tasks processed:')
    for (const r of summary.results) {
      const icon = r.status === 'success' ? '✅' : '❌'
      console.log(`  ${icon} ${r.taskTitle} (${Math.round(r.durationMs / 1000)}s)`)
      if (r.error) {
        console.log(`     Error: ${r.error}`)
      }
    }
  }
}

async function handleRun(parsed: ParsedArgs): Promise<void> {
  const { executeTask } = await import('./task-runner.js')

  let query = supabase
    .from('tasks')
    .select('*')
    .in('status', ['backlog', 'todo'])
    .order('priority', { ascending: true })
    .limit(1)

  if (parsed.projectId) {
    query = query.eq('project_id', parsed.projectId)
  }

  const { data, error } = await query

  if (error) {
    console.error(`[run] Failed to fetch task: ${error.message}`)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('[run] No tasks available (backlog/todo)')
    return
  }

  const task = data[0]
  console.log(`[run] Executing: ${task.title}`)

  const result = await executeTask(task)

  if (result.status === 'success') {
    console.log(`[run] ✅ Completed in ${Math.round(result.durationMs / 1000)}s`)
  } else {
    console.error(`[run] ❌ Failed: ${result.error}`)
    process.exit(1)
  }
}

async function handleStop(parsed: ParsedArgs): Promise<void> {
  if (!parsed.jobId) {
    // Find the latest running autorun job
    const { data, error } = await supabase
      .from('agent_jobs')
      .select('id')
      .eq('type', 'autorun')
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error(`[stop] Failed to query jobs: ${error.message}`)
      process.exit(1)
    }

    if (!data || data.length === 0) {
      console.log('[stop] No running autorun found')
      return
    }

    parsed.jobId = data[0].id
  }

  const { error } = await supabase
    .from('agent_jobs')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', parsed.jobId)

  if (error) {
    console.error(`[stop] Failed to cancel job: ${error.message}`)
    process.exit(1)
  }

  console.log(`[stop] Cancelled autorun job: ${parsed.jobId}`)
}

async function handleTelegram(): Promise<void> {
  console.log('[telegram] Starting Telegram bot...')
  await startTelegramPolling()
}

async function handlePoll(parsed: ParsedArgs): Promise<void> {
  console.log('[poll] Polling for pending autorun jobs...')
  const pollIntervalMs = 5000

  while (true) {
    try {
      // Find pending autorun jobs created via Telegram
      const { data: pendingJobs, error } = await supabase
        .from('agent_jobs')
        .select('id, payload')
        .eq('type', 'autorun')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)

      if (error) {
        console.error(`[poll] Failed to query jobs: ${error.message}`)
        await sleep(pollIntervalMs)
        continue
      }

      if (!pendingJobs || pendingJobs.length === 0) {
        await sleep(pollIntervalMs)
        continue
      }

      const job = pendingJobs[0]
      const payload = job.payload as Record<string, unknown> | null
      console.log(`[poll] Found pending autorun job: ${job.id}`)

      // Mark as running
      await supabase
        .from('agent_jobs')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', job.id)

      // Execute autorun with payload options, reusing the existing job
      const options: AutorunOptions = {
        projectId: parsed.projectId ?? (payload?.['project_id'] as string | undefined),
        maxConsecutiveErrors: parsed.maxErrors,
        maxDurationMs: parsed.maxDurationMs,
        existingJobId: job.id,
      }

      const summary = await startAutorun(options)

      console.log(`[poll] Autorun job ${job.id} finished: ${summary.stopReason}`)
    } catch (err) {
      console.error('[poll] Error:', err)
      await sendTelegramMessage(`❌ <b>Poll error:</b> ${err instanceof Error ? err.message : String(err)}`)
      await sleep(pollIntervalMs)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv)

  switch (parsed.command) {
    case 'autorun':
      await handleAutorun(parsed)
      break
    case 'run':
      await handleRun(parsed)
      break
    case 'stop':
      await handleStop(parsed)
      break
    case 'telegram':
      await handleTelegram()
      break
    case 'poll':
      await handlePoll(parsed)
      break
  }
}

main().catch((err) => {
  console.error('[runner] Fatal error:', err)
  process.exit(1)
})
