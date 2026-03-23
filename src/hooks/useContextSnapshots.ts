import { supabase } from '../lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

export type SnapshotType = 'ai_summary' | 'task_completed' | 'idea_added' | 'manual_note'

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

export interface IdeaAddedContent {
  idea_id: string
  content: string
  category: string
}

export interface ManualNoteContent {
  text: string
}

export type SnapshotContent =
  | AiSummaryContent
  | TaskCompletedContent
  | IdeaAddedContent
  | ManualNoteContent

export interface ContextSnapshot {
  id: string
  project_id: string
  snapshot_type: SnapshotType
  content: SnapshotContent
  created_at: string
}

// ── Standalone functions (importable anywhere, no hook state needed) ──────────

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

function formatSnapshot(s: ContextSnapshot): string {
  const d = fmtDate(s.created_at)
  switch (s.snapshot_type) {
    case 'ai_summary': {
      const c = s.content as AiSummaryContent
      return `[${d}] AI Summary: Что сделано: ${c.what_done} | Где остановились: ${c.where_stopped} | Следующий шаг: ${c.next_step}`
    }
    case 'task_completed': {
      const c = s.content as TaskCompletedContent
      return `[${d}] Task completed: "${c.title}" (priority: ${c.priority})`
    }
    case 'idea_added': {
      const c = s.content as IdeaAddedContent
      return `[${d}] Idea added: "${c.content}" (category: ${c.category})`
    }
    case 'manual_note': {
      const c = s.content as ManualNoteContent
      return `[${d}] Note: ${c.text}`
    }
  }
}

/** Assembles the full memory string for Claude (last 50 snapshots) */
export async function getContextForAI(projectId: string): Promise<string> {
  const snapshots = await getSnapshots(projectId, 50)
  if (snapshots.length === 0) return ''
  const lines = snapshots.map(formatSnapshot)
  return `PROJECT MEMORY (chronological, newest first):\n\n${lines.join('\n')}`
}
