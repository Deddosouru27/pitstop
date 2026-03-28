export interface RunnerConfig {
  telegramToken: string
  supabaseUrl: string
  supabaseKey: string
  anthropicKey: string
  repoUrl: string
  workDir: string
  claudeCodeTimeout: number
  allowedChatIds: number[]
}

export interface TaskPayload {
  chatId: number
  messageId: number
  prompt: string
  projectId?: string
  branch: string
}

export type RunnerStatus =
  | '📥 Принял задачу'
  | '📦 Клонирую репо...'
  | '🤖 Claude Code работает...'
  | '💾 Коммичу...'
  | '🔀 Мержу...'
  | '✅ Задеплоено'
  | '❌ Ошибка'

export interface IdeaAnalysis {
  summary: string
  ideas: string[]
  relevance: 'hot' | 'interesting' | 'noise'
}

export interface IdeaInput {
  type: 'text' | 'url'
  content: string
}

export interface ClaudeCodeResult {
  success: boolean
  output: string
  error?: string
  commitHash?: string
}

export interface GitMergeResult {
  success: boolean
  error?: string
}
