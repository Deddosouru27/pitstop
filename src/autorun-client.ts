/**
 * MAOS Autorun Client — Lightweight multi-agent execution loop
 * Copy this file into any MAOS repo (pitstop, intake, runner).
 * Each agent runs its own instance with its own config.
 * 
 * Usage:
 *   import { AutorunClient } from './autorun-client';
 *   const client = new AutorunClient({ agentName: 'baker', repoName: 'pitstop', ... });
 *   client.start();
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync, spawn, ChildProcess } from 'child_process';
import https from 'https';

// ============================================================
// TELEGRAM NOTIFIER
// ============================================================

// Sends a message via Telegram Bot API. Silently no-ops if env vars missing.
async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  };

  return new Promise<void>(resolve => {
    const req = https.request(options, res => {
      res.resume();
      resolve();
    });
    req.on('error', () => resolve()); // never throw — notifications are best-effort
    req.setTimeout(5000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

// ============================================================
// TASK SAFETY GUARD
// ============================================================

// Keywords in task title/description that signal potentially destructive ops.
// Autorun will skip tasks matching these patterns and flag them for human review.
const UNSAFE_PATTERNS = [
  /\bdrop\s+table\b/i,
  /\bdelete\s+from\b/i,
  /\btruncate\b/i,
  /\brm\s+-rf\b/i,
  /\bgit\s+push\s+--force\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bdeploy\s+to\s+prod/i,
  /\bwipe\b.*\bdatabase\b/i,
  /\bpurge\b.*\bdata\b/i,
];

function isTaskSafe(task: TaskRow): boolean {
  const text = `${task.title} ${task.description ?? ''}`;
  return !UNSAFE_PATTERNS.some(re => re.test(text));
}

// ============================================================
// CONFIG
// ============================================================

interface AutorunConfig {
  agentName: string;       // e.g. 'baker', 'nout', 'intaker'
  agentId: string;         // UUID from agents table
  repoName: string;        // e.g. 'pitstop', 'maos-runner', 'maos-intake'
  repoPath: string;        // absolute path to repo root
  supabaseUrl?: string;
  supabaseKey?: string;
  pollIntervalMs?: number; // default 30000 (30s)
  heartbeatMs?: number;    // default 60000 (60s)
  maxTaskDurationMs?: number; // default 1800000 (30 min)
  maxFailCount?: number;   // default 2
  reviewInterval?: number; // tasks done between CEO periodic reviews, default 3
}

interface TaskRow {
  task_id: string;
  title: string;
  description: string;
  phase_number: number;
  exec_order: number | null;
}

// ============================================================
// AUTORUN CLIENT
// ============================================================

export class AutorunClient {
  private config: Required<AutorunConfig>;
  private supabase: SupabaseClient;
  private sessionId: string | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private running = false;
  private paused = false;
  private currentTaskProcess: ChildProcess | null = null;
  private tasksCompleted = 0;
  private errorsCount = 0;
  private sessionCostUsd = 0;
  private doneSinceLastReview: Array<{ task_id: string; title: string }> = [];

  constructor(config: AutorunConfig) {
    this.config = {
      supabaseUrl: process.env.SUPABASE_URL || 'https://stqhnkhcfndmhgvfyojv.supabase.co',
      supabaseKey: process.env.SUPABASE_ANON_KEY || '',
      pollIntervalMs: 30000,
      heartbeatMs: 60000,
      maxTaskDurationMs: 30 * 60 * 1000,
      maxFailCount: 2,
      reviewInterval: 3,
      ...config,
    };

    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey);
  }

  // ----------------------------------------------------------
  // LIFECYCLE
  // ----------------------------------------------------------

  async start(): Promise<void> {
    console.log(`[AUTORUN] Starting ${this.config.agentName} for ${this.config.repoName}`);
    this.running = true;
    this.paused = false;

    // Create session
    await this.createSession();

    // Set agent active
    await this.setAgentStatus('active');

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => this.heartbeat(), this.config.heartbeatMs);

    // Start polling
    this.pollTimer = setInterval(() => this.pollAndExecute(), this.config.pollIntervalMs);

    // Also poll immediately
    await this.pollAndExecute();

    // Log event
    await this.logEvent('session_started', {
      session_id: this.sessionId,
      agent_name: this.config.agentName,
      repo: this.config.repoName,
    });

    console.log(`[AUTORUN] ${this.config.agentName} running. Polling every ${this.config.pollIntervalMs / 1000}s`);
  }

  async stop(): Promise<void> {
    console.log(`[AUTORUN] Stopping ${this.config.agentName}...`);
    this.running = false;

    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    // Wait for current task if any
    if (this.currentTaskProcess) {
      console.log('[AUTORUN] Waiting for current task to finish...');
      // Give it 60s to finish, then kill
      await new Promise(resolve => setTimeout(resolve, 60000));
      if (this.currentTaskProcess) {
        this.currentTaskProcess.kill('SIGTERM');
      }
    }

    // Complete session
    await this.completeSession();
    await this.setAgentStatus('idle');

    await this.logEvent('session_ended', {
      session_id: this.sessionId,
      tasks_completed: this.tasksCompleted,
      errors_count: this.errorsCount,
      cost_usd: this.sessionCostUsd,
    });

    console.log(`[AUTORUN] ${this.config.agentName} stopped. Tasks: ${this.tasksCompleted}, Errors: ${this.errorsCount}`);
  }

  pause(): void {
    this.paused = true;
    console.log(`[AUTORUN] ${this.config.agentName} paused`);
  }

  resume(): void {
    this.paused = false;
    console.log(`[AUTORUN] ${this.config.agentName} resumed`);
  }

  // ----------------------------------------------------------
  // POLLING & EXECUTION
  // ----------------------------------------------------------

  private async pollAndExecute(): Promise<void> {
    if (!this.running || this.paused || this.currentTaskProcess) return;

    try {
      // Check for commands
      await this.checkCommands();

      if (!this.running) return;

      // Get next task
      const task = await this.getNextTask();
      if (!task) return;

      // Safety guard — skip tasks with destructive patterns
      if (!isTaskSafe(task)) {
        console.log(`[AUTORUN] ⚠️ UNSAFE task skipped: ${task.title}`);
        await this.supabase.from('tasks').update({ status: 'blocked', context: { blocked_reason: 'autorun_safety_guard: destructive pattern detected' } }).eq('id', task.task_id);
        await sendTelegram(`⚠️ <b>MAOS Safety Guard</b>\nTask skipped (unsafe): <code>${task.title}</code>\nAgent: ${this.config.agentName}`);
        await this.logEvent('task_skipped_unsafe', { task_id: task.task_id, task_title: task.title });
        return;
      }

      console.log(`[AUTORUN] Task: ${task.title}`);
      await sendTelegram(`🔵 <b>${this.config.agentName}</b> started:\n<code>${task.title}</code>`);
      await this.logEvent('task_started', { task_id: task.task_id, task_title: task.title });

      // Execute
      const startTime = Date.now();
      const success = await this.executeTask(task);
      const durationSec = Math.round((Date.now() - startTime) / 1000);

      if (success) {
        // Mark done with outcome
        await this.completeTask(task, durationSec);
        this.tasksCompleted++;
        this.doneSinceLastReview.push({ task_id: task.task_id, title: task.title });
        await this.logEvent('task_completed', {
          task_id: task.task_id,
          task_title: task.title,
          duration_seconds: durationSec,
          result: 'success',
        });
        console.log(`[AUTORUN] ✅ ${task.title} (${durationSec}s)`);
        await sendTelegram(`✅ <b>${this.config.agentName}</b> done (${durationSec}s):\n<code>${task.title}</code>`);

        // Write WAA
        await this.writeWAA(task, 'success', durationSec);

        // CEO periodic review every N tasks
        if (this.doneSinceLastReview.length >= this.config.reviewInterval) {
          await this.performPeriodicReview();
        }
      } else {
        // Handle failure
        await this.handleFailure(task, durationSec);
        this.errorsCount++;
      }
    } catch (err: any) {
      console.error(`[AUTORUN] Poll error: ${err.message}`);
      this.errorsCount++;
    }
  }

  private async getNextTask(): Promise<TaskRow | null> {
    const { data, error } = await this.supabase.rpc('get_next_autorun_task', {
      p_project_name: null,
      p_agent_name: this.config.agentName,
    });

    if (error) {
      console.error(`[AUTORUN] RPC error: ${error.message}`);
      return null;
    }

    if (!data || data.length === 0) return null;
    return data[0] as TaskRow;
  }

  private async executeTask(task: TaskRow): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        console.log(`[AUTORUN] ⏰ Timeout: ${task.title}`);
        if (this.currentTaskProcess) {
          this.currentTaskProcess.kill('SIGTERM');
          // Also try to kill claude processes
          try { execSync('pkill -f claude || true', { stdio: 'ignore' }); } catch {}
        }
        this.currentTaskProcess = null;
        resolve(false);
      }, this.config.maxTaskDurationMs);

      // Create feature branch
      try {
        const branchName = `feat/${this.config.agentName}-${task.task_id.substring(0, 8)}`;
        execSync(`cd ${this.config.repoPath} && git checkout -b ${branchName} 2>/dev/null || git checkout ${branchName}`, { stdio: 'pipe' });
      } catch {}

      // Build prompt for Claude Code
      const prompt = this.buildPrompt(task);

      // Run Claude Code
      this.currentTaskProcess = spawn('claude', ['-p', prompt, '--allowedTools', 'Edit,Write,Bash'], {
        cwd: this.config.repoPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let output = '';
      this.currentTaskProcess.stdout?.on('data', (data: Buffer) => { output += data.toString(); });
      this.currentTaskProcess.stderr?.on('data', (data: Buffer) => { output += data.toString(); });

      this.currentTaskProcess.on('close', (code: number | null) => {
        clearTimeout(timeout);
        this.currentTaskProcess = null;

        // Try to commit, merge, cleanup
        try {
          const branchName = `feat/${this.config.agentName}-${task.task_id.substring(0, 8)}`;
          execSync(`cd ${this.config.repoPath} && git add -A && git diff --cached --quiet || git commit -m "${task.title}"`, { stdio: 'pipe' });
          
          // Run tests
          try {
            execSync(`cd ${this.config.repoPath} && npx tsc --noEmit && npm run build`, { stdio: 'pipe', timeout: 120000 });
          } catch (testErr: any) {
            console.log(`[AUTORUN] ❌ Build/tsc failed: ${task.title}`);
            // Revert
            execSync(`cd ${this.config.repoPath} && git checkout main && git branch -D ${branchName} 2>/dev/null || true`, { stdio: 'pipe' });
            resolve(false);
            return;
          }

          // Merge to main
          execSync(`cd ${this.config.repoPath} && git checkout main && git merge ${branchName} --no-ff -m "Merge ${task.title}" && git push origin main`, { stdio: 'pipe' });
          // Cleanup branch
          execSync(`cd ${this.config.repoPath} && git branch -d ${branchName} 2>/dev/null || true`, { stdio: 'pipe' });

          resolve(code === 0);
        } catch (gitErr: any) {
          console.error(`[AUTORUN] Git error: ${gitErr.message}`);
          // Try to get back to main
          try { execSync(`cd ${this.config.repoPath} && git checkout main`, { stdio: 'pipe' }); } catch {}
          resolve(false);
        }
      });

      this.currentTaskProcess.on('error', () => {
        clearTimeout(timeout);
        this.currentTaskProcess = null;
        resolve(false);
      });
    });
  }

  private buildPrompt(task: TaskRow): string {
    return `You are working on the ${this.config.repoName} repository.

TASK: ${task.title}

DESCRIPTION:
${task.description}

RULES:
- Write complete, working code. No TODOs or stubs.
- One commit = one feature. TypeScript strict.
- Build + tsc --noEmit must pass before you finish.
- Do NOT execute any DDL SQL (CREATE/ALTER/DROP). Report SQL bugs as comments.
- Pre-push: no API keys in code (grep -r "sk-" src/), build passes, tsc passes.

When done, make sure all changes are saved.`;
  }

  // ----------------------------------------------------------
  // TASK COMPLETION & FAILURE
  // ----------------------------------------------------------

  private async completeTask(task: TaskRow, durationSec: number): Promise<void> {
    await this.supabase
      .from('tasks')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        outcome: {
          what_done: `Completed by ${this.config.agentName} autorun client. Duration: ${durationSec}s.`,
          what_learned: 'Executed via autorun-client.',
        },
      })
      .eq('id', task.task_id);
  }

  private async handleFailure(task: TaskRow, durationSec: number): Promise<void> {
    // Get current fail count
    const { data: taskData } = await this.supabase
      .from('tasks')
      .select('context')
      .eq('id', task.task_id)
      .single();

    const context = taskData?.context || {};
    const failCount = (context.fail_count || 0) + 1;
    context.fail_count = failCount;
    context.blockers = context.blockers || [];
    context.blockers.push(`Failure #${failCount} by ${this.config.agentName} at ${new Date().toISOString()}`);

    if (failCount >= this.config.maxFailCount) {
      // Block task
      await this.supabase
        .from('tasks')
        .update({ status: 'blocked', context })
        .eq('id', task.task_id);

      await this.logEvent('task_failed', {
        task_id: task.task_id,
        task_title: task.title,
        error: `Blocked after ${failCount} failures`,
        duration_seconds: durationSec,
      });
      console.log(`[AUTORUN] 🚫 Blocked: ${task.title} (${failCount}x fail)`);
      await sendTelegram(`🚫 <b>BLOCKED</b>: <code>${task.title}</code>\n${failCount}x fail — agent: ${this.config.agentName}`);
    } else {
      // Return to todo
      await this.supabase
        .from('tasks')
        .update({ status: 'todo', context })
        .eq('id', task.task_id);

      await this.logEvent('task_failed', {
        task_id: task.task_id,
        task_title: task.title,
        error: `Failure #${failCount}, returning to todo`,
        duration_seconds: durationSec,
      });
      console.log(`[AUTORUN] ❌ Failed: ${task.title} (attempt ${failCount}/${this.config.maxFailCount})`);
    }
  }

  // ----------------------------------------------------------
  // WAA
  // ----------------------------------------------------------

  private async writeWAA(task: TaskRow, result: string, durationSec: number): Promise<void> {
    await this.supabase.from('context_snapshots').insert({
      snapshot_type: 'agent_action',
      type: 'waa',
      content: {
        type: 'waa',
        agent: this.config.agentName,
        task_id: task.task_id,
        result,
        what_done: `${task.title} — completed by autorun-client`,
        what_learned: 'Automated execution',
        what_changed: [this.config.repoName],
        duration_minutes: Math.round(durationSec / 60),
      },
    });
  }

  // ----------------------------------------------------------
  // CEO PERIODIC REVIEW
  // ----------------------------------------------------------

  private async performPeriodicReview(): Promise<void> {
    const batch = [...this.doneSinceLastReview];
    this.doneSinceLastReview = [];

    const taskList = batch.map((t, i) => `${i + 1}. ${t.title}`).join('\n');
    console.log(`[AUTORUN] 👑 CEO review — ${batch.length} tasks completed`);

    const prompt = `You are the CEO of MAOS (Multi-Agent Operating System).

Review progress of the last ${batch.length} completed tasks:

${taskList}

Answer these questions concisely:
1. Is progress on track? Any patterns or concerns?
2. Should priorities change for the next tasks?
3. Are there any blockers that need a dedicated blocker task created?

Respond in JSON format:
{
  "on_track": true/false,
  "summary": "brief assessment",
  "priority_changes": "description or null",
  "blocker": { "title": "...", "description": "..." } or null
}`;

    let reviewResult: {
      on_track: boolean;
      summary: string;
      priority_changes: string | null;
      blocker: { title: string; description: string } | null;
    } | null = null;

    try {
      const output = await new Promise<string>((resolve, reject) => {
        let out = '';
        const proc = spawn('claude', ['-p', prompt, '--output-format', 'text'], {
          cwd: this.config.repoPath,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env },
        });
        proc.stdout?.on('data', (d: Buffer) => { out += d.toString(); });
        proc.stderr?.on('data', (d: Buffer) => { out += d.toString(); });
        proc.on('close', () => resolve(out));
        proc.on('error', reject);
        // 5 min max for CEO review
        setTimeout(() => { proc.kill('SIGTERM'); resolve(out); }, 5 * 60 * 1000);
      });

      // Extract JSON from output
      const match = output.match(/\{[\s\S]*\}/);
      if (match) {
        reviewResult = JSON.parse(match[0]);
      }
    } catch (err: any) {
      console.error(`[AUTORUN] CEO review error: ${err.message}`);
    }

    // Write snapshot regardless
    await this.supabase.from('context_snapshots').insert({
      snapshot_type: 'agent_action',
      content: {
        action: 'periodic_review',
        agent: 'ceo',
        tasks_reviewed: batch,
        result: reviewResult ?? { summary: 'Review completed', on_track: true, priority_changes: null, blocker: null },
        reviewed_at: new Date().toISOString(),
      },
    });

    if (reviewResult) {
      console.log(`[AUTORUN] 👑 CEO: ${reviewResult.summary}`);
      const statusIcon = reviewResult.on_track ? '✅' : '⚠️';
      await sendTelegram(`👑 <b>CEO Review</b> (${batch.length} tasks)\n${statusIcon} ${reviewResult.summary}${reviewResult.priority_changes ? `\n📌 ${reviewResult.priority_changes}` : ''}${reviewResult.blocker ? `\n🚫 Blocker created: <code>${reviewResult.blocker.title}</code>` : ''}`);

      // Create blocker task if CEO flagged one
      if (reviewResult.blocker) {
        const { data: activeCycle } = await this.supabase
          .from('cycle_plans')
          .select('id')
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        await this.supabase.from('tasks').insert({
          title: reviewResult.blocker.title,
          description: reviewResult.blocker.description,
          status: 'todo',
          work_type: 'blocker',
          priority: 'high',
          cycle_plan_id: activeCycle?.id ?? null,
          assignee: this.config.agentName,
          created_by: 'ceo_autorun',
        });

        console.log(`[AUTORUN] 🚫 CEO created blocker: ${reviewResult.blocker.title}`);
      }
    }

    await this.logEvent('ceo_review_completed', {
      tasks_reviewed: batch.length,
      on_track: reviewResult?.on_track ?? null,
      summary: reviewResult?.summary ?? null,
      blocker_created: reviewResult?.blocker != null,
    });
  }

  // ----------------------------------------------------------
  // HEARTBEAT & STATUS
  // ----------------------------------------------------------

  private async heartbeat(): Promise<void> {
    try {
      await this.supabase
        .from('agents')
        .update({ last_heartbeat: new Date().toISOString(), status: 'active' })
        .eq('id', this.config.agentId);
    } catch {}
  }

  private async setAgentStatus(status: string): Promise<void> {
    await this.supabase
      .from('agents')
      .update({ status })
      .eq('id', this.config.agentId);
  }

  // ----------------------------------------------------------
  // SESSION
  // ----------------------------------------------------------

  private async createSession(): Promise<void> {
    const { data } = await this.supabase
      .from('agent_sessions')
      .insert({
        agent_id: this.config.agentId,
        status: 'active',
      })
      .select('id')
      .single();

    this.sessionId = data?.id || null;
  }

  private async completeSession(): Promise<void> {
    if (!this.sessionId) return;
    await this.supabase
      .from('agent_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        tasks_completed: this.tasksCompleted,
        errors_count: this.errorsCount,
      })
      .eq('id', this.sessionId);
  }

  // ----------------------------------------------------------
  // COMMANDS (Pitstop → Runner bridge)
  // ----------------------------------------------------------

  private async checkCommands(): Promise<void> {
    const { data } = await this.supabase
      .from('autorun_commands')
      .select('*')
      .eq('processed', false)
      .or(`agent_name.eq.${this.config.agentName},agent_name.eq.all,agent_name.is.null`)
      .order('created_at', { ascending: true })
      .limit(5);

    if (!data) return;

    for (const cmd of data) {
      switch (cmd.command) {
        case 'stop':
          await this.stop();
          break;
        case 'pause':
          this.pause();
          break;
        case 'resume':
        case 'start':
          this.resume();
          break;
      }

      // Mark processed
      await this.supabase
        .from('autorun_commands')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', cmd.id);
    }
  }

  // ----------------------------------------------------------
  // LOGGING
  // ----------------------------------------------------------

  private async logEvent(eventType: string, details: Record<string, any>): Promise<void> {
    try {
      await this.supabase.from('agent_events').insert({
        agent_id: this.config.agentId,
        session_id: this.sessionId,
        event_type: eventType,
        details,
      });
    } catch (err: any) {
      console.error(`[AUTORUN] Log event error: ${err.message}`);
    }
  }
}

// ============================================================
// STANDALONE RUNNER — run with: npx tsx autorun-client.ts
// ============================================================

const __isMain = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop()!)

if (__isMain) {
  const agentName = process.env.AGENT_NAME || 'baker';
  const agentId = process.env.AGENT_ID || '';
  const repoName = process.env.REPO_NAME || 'pitstop';
  const repoPath = process.env.REPO_PATH || process.cwd();

  if (!agentId) {
    console.error('ERROR: Set AGENT_ID environment variable');
    console.error('Agent IDs:');
    console.error('  Ноут:    9e0f8481-4126-4e26-bd5d-c65453b42041');
    console.error('  Пекарь:  5afa060f-d333-4187-b98d-a9ef04faa9d1');
    console.error('  Интакер: 24791778-b591-419f-847a-735f27076b31');
    process.exit(1);
  }

  if (!process.env.SUPABASE_ANON_KEY) {
    console.error('ERROR: Set SUPABASE_ANON_KEY environment variable');
    process.exit(1);
  }

  const client = new AutorunClient({
    agentName,
    agentId,
    repoName,
    repoPath,
  });

  // Crash failsafe — notify CEO via Telegram on uncaught errors
  const crashHandler = async (err: unknown, origin: string) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AUTORUN] 💥 CRASH (${origin}): ${msg}`);
    await sendTelegram(`💥 <b>AUTORUN CRASH</b>\nAgent: ${agentName} | Repo: ${repoName}\nOrigin: ${origin}\n<code>${msg.slice(0, 300)}</code>`);
  };

  process.on('uncaughtException', (err, origin) => { void crashHandler(err, origin); });
  process.on('unhandledRejection', (reason) => { void crashHandler(reason, 'unhandledRejection'); });
  process.on('SIGINT', () => {
    void sendTelegram(`🛑 <b>Autorun stopped</b>\nAgent: ${agentName} (SIGINT)`).then(() => client.stop());
  });
  process.on('SIGTERM', () => {
    void sendTelegram(`🛑 <b>Autorun stopped</b>\nAgent: ${agentName} (SIGTERM)`).then(() => client.stop());
  });

  client.start();
}
