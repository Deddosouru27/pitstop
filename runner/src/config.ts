import type { RunnerConfig } from './types.js'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`)
  }
  return value
}

function parseIntList(value: string): number[] {
  return value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
}

export function loadConfig(): RunnerConfig {
  return {
    telegramToken: requireEnv('TELEGRAM_BOT_TOKEN'),
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseKey: requireEnv('SUPABASE_SERVICE_KEY'),
    anthropicKey: requireEnv('ANTHROPIC_API_KEY'),
    repoUrl: requireEnv('REPO_URL'),
    workDir: process.env['RUNNER_WORK_DIR'] ?? '/tmp/pitstop-runner',
    claudeCodeTimeout: 10 * 60 * 1000, // 10 минут
    allowedChatIds: parseIntList(process.env['ALLOWED_CHAT_IDS'] ?? ''),
  }
}
