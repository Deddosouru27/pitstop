import { supabase } from '../lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

export type SnapshotType =
  | 'ai_summary'
  | 'task_completed'
  | 'task_created'
  | 'idea_added'
  | 'idea_converted'
  | 'priority_inferred'
  | 'feature_added'
  | 'manual_note'

export interface AiSummaryContent {
  what_done: string
  where_stopped: string
  next_step: string
  model: string
}

export interface TaskCompletedContent {
  task_id: string
  title: string
  priority: string
  completed_at: string
}

export interface TaskCreatedContent {
  title: string
  priority: string
}

export interface IdeaAddedContent {
  idea_id: string
  content: string
  category: string
}

export interface IdeaConvertedContent {
  ideaContent: string
  taskTitle: string
  priority: string
}

export interface PriorityInferredContent {
  taskTitle: string
  inferredPriority: string
  reason: string
}

export interface FeatureAddedContent {
  text: string
}

export interface ManualNoteContent {
  text: string
}

export type SnapshotContent =
  | AiSummaryContent
  | TaskCompletedContent
  | TaskCreatedContent
  | IdeaAddedContent
  | IdeaConvertedContent
  | PriorityInferredContent
  | FeatureAddedContent
  | ManualNoteContent

export interface ContextSnapshot {
  id: string
  project_id: string
  snapshot_type: SnapshotType
  content: SnapshotContent
  created_at: string
}

// ── Standalone functions ──────────────────────────────────────────────────────

/** Fire-and-forget — never throws, never awaited by callers */
export function addSnapshot(
  projectId: string,
  type: SnapshotType,
  content: SnapshotContent,
): void {
  supabase
    .from('context_snapshots')
    .insert({ project_id: projectId, snapshot_type: type, content })
    .then(({ error }) => {
      if (error) console.warn('[snapshot]', error.message)
    })
}

/** Returns snapshots newest-first. Pass limit=0 for all. */
export async function getSnapshots(
  projectId: string,
  limit = 0,
): Promise<ContextSnapshot[]> {
  let query = supabase
    .from('context_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (limit > 0) query = query.limit(limit)

  const { data, error } = await query
  if (error) {
    console.warn('[snapshot] getSnapshots:', error.message)
    return []
  }
  return (data ?? []) as ContextSnapshot[]
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/** Compact single-line representation — minimises tokens */
function formatSnapshotCompact(s: ContextSnapshot): string {
  const d = fmtDate(s.created_at)
  switch (s.snapshot_type) {
    case 'ai_summary': {
      const c = s.content as AiSummaryContent
      return `[${d}] ✓ ${c.what_done}`
    }
    case 'task_completed': {
      const c = s.content as TaskCompletedContent
      return `[${d}] ✅ "${c.title}" (${c.priority})`
    }
    case 'task_created': {
      const c = s.content as TaskCreatedContent
      return `[${d}] ➕ "${c.title}" (${c.priority})`
    }
    case 'idea_added': {
      const c = s.content as IdeaAddedContent
      return `[${d}] 💡 ${c.content}`
    }
    case 'idea_converted': {
      const c = s.content as IdeaConvertedContent
      return `[${d}] 🔄 ${c.taskTitle} → задача`
    }
    case 'priority_inferred': {
      const c = s.content as PriorityInferredContent
      return `[${d}] 🎯 ${c.inferredPriority}: "${c.taskTitle}"`
    }
    case 'feature_added': {
      const c = s.content as FeatureAddedContent
      return `[${d}] ⭐ ${c.text}`
    }
    case 'manual_note': {
      const c = s.content as ManualNoteContent
      return `[${d}] 📝 ${c.text}`
    }
    default:
      return `[${d}] ${s.snapshot_type}`
  }
}

/** Full formatter used in ContextExport (human-readable) */
export function formatSnapshotFull(s: ContextSnapshot): string {
  const d = new Date(s.created_at).toLocaleDateString('ru-RU')
  switch (s.snapshot_type) {
    case 'ai_summary': {
      const c = s.content as AiSummaryContent
      return `- [${d}] 🤖 AI резюме: ${c.what_done}`
    }
    case 'task_completed': {
      const c = s.content as TaskCompletedContent
      return `- [${d}] ✅ Задача выполнена: ${c.title} (приоритет: ${c.priority})`
    }
    case 'task_created': {
      const c = s.content as TaskCreatedContent
      return `- [${d}] ➕ Задача создана: ${c.title} (${c.priority})`
    }
    case 'idea_added': {
      const c = s.content as IdeaAddedContent
      return `- [${d}] 💡 Идея добавлена: ${c.content} (${c.category})`
    }
    case 'idea_converted': {
      const c = s.content as IdeaConvertedContent
      return `- [${d}] 🔄 Идея → задача: ${c.taskTitle}`
    }
    case 'priority_inferred':
      // Too granular for human export — skip
      return ''
    case 'feature_added': {
      const c = s.content as FeatureAddedContent
      return `- [${d}] ⭐ Фича: ${c.text}`
    }
    case 'manual_note': {
      const c = s.content as ManualNoteContent
      return `- [${d}] 📝 ${c.text}`
    }
    default:
      return `- [${d}] ${s.snapshot_type}`
  }
}

// ── Two-layer context for AI ──────────────────────────────────────────────────

/**
 * Assembles a structured memory string for Claude.
 * STATE layer: deduplicated sentences from all ai_summary what_done fields.
 * HISTORY layer: last 10 non-summary events, compact format.
 * Total max: 2500 chars.
 */
export async function getContextForAI(projectId: string): Promise<string> {
  const allSnapshots = await getSnapshots(projectId, 0)
  if (allSnapshots.length === 0) return ''

  // ── STATE LAYER: extract unique achievement sentences from all ai_summaries ──
  const summaries = allSnapshots
    .filter(s => s.snapshot_type === 'ai_summary')
    .map(s => (s.content as AiSummaryContent).what_done)
    .filter(Boolean)

  const sentenceSet = new Set<string>()
  for (const summary of summaries) {
    summary
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .forEach(s => sentenceSet.add(s))
  }

  const stateLines = [...sentenceSet].slice(0, 8).map(s => `• ${s}`)
  const stateBlock = stateLines.length > 0
    ? `[РЕАЛИЗОВАНО]\n${stateLines.join('\n')}`
    : ''

  // ── HISTORY LAYER: last 10 non-summary events ─────────────────────────────
  const historySnapshots = allSnapshots
    .filter(s => s.snapshot_type !== 'ai_summary')
    .slice(0, 10)

  const historyLines: string[] = []
  let historyLen = 0
  const maxHistory = 1500

  for (const s of historySnapshots) {
    const line = formatSnapshotCompact(s)
    const lineLen = line.length + 1
    if (historyLen + lineLen > maxHistory) break
    historyLines.push(line)
    historyLen += lineLen
  }

  const historyBlock = historyLines.length > 0
    ? `[ИСТОРИЯ]\n${historyLines.join('\n')}`
    : ''

  if (!stateBlock && !historyBlock) return ''

  const parts = ['PROJECT MEMORY:']
  if (stateBlock) parts.push(stateBlock)
  if (historyBlock) parts.push(historyBlock)

  const result = parts.join('\n\n')
  return result.length > 2500 ? result.slice(0, 2500) : result
}
