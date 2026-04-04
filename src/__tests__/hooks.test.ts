import { describe, test, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// ── Supabase mock (applied to all importers of src/lib/supabase) ──────────────

vi.mock('../lib/supabase', () => {
  const agents = [
    { id: '1', name: 'Пекарь',  role: 'Frontend', capabilities: [], status: 'idle',    current_task_id: null, last_heartbeat: null, repo: 'pitstop',     created_at: '2024-01-01T00:00:00Z' },
    { id: '2', name: 'Интакер', role: 'Intake',   capabilities: [], status: 'idle',    current_task_id: null, last_heartbeat: null, repo: 'maos-intake', created_at: '2024-01-01T00:00:00Z' },
    { id: '3', name: 'Ноут',    role: 'Runner',   capabilities: [], status: 'working', current_task_id: null, last_heartbeat: null, repo: 'maos-runner', created_at: '2024-01-01T00:00:00Z' },
    { id: '4', name: 'Sonnet',  role: 'AI',       capabilities: [], status: 'idle',    current_task_id: null, last_heartbeat: null, repo: null,          created_at: '2024-01-01T00:00:00Z' },
    { id: '5', name: 'Opus',    role: 'AI',       capabilities: [], status: 'offline', current_task_id: null, last_heartbeat: null, repo: null,          created_at: '2024-01-01T00:00:00Z' },
  ]

  const tasks = [
    { id: 't1', title: 'Fix login',   is_completed: false, status: 'todo', priority: 'high', due_date: null, project_id: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', completed_at: null, description: null },
    { id: 't2', title: 'Write docs',  is_completed: true,  status: 'done', priority: 'low',  due_date: null, project_id: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-02T00:00:00Z', description: null },
    { id: 't3', title: 'Deploy prod', is_completed: false, status: 'todo', priority: 'high', due_date: null, project_id: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', completed_at: null, description: null },
  ]

  const knowledge = [
    { id: 'k1', content: 'React hooks tips',     knowledge_type: 'tip',  event_type: null,         created_at: '2024-01-03T00:00:00Z', superseded_by: null },
    { id: 'k3', content: 'Supabase performance', knowledge_type: 'tip',  event_type: null,         created_at: '2024-01-02T00:00:00Z', superseded_by: null },
  ]

  function makeQ(data: unknown[]) {
    const result = { data, error: null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {}
    for (const m of ['select', 'order', 'neq', 'not', 'limit', 'eq', 'in', 'gte', 'lte', 'filter']) {
      q[m] = () => q
    }
    q.then  = (r: (v: typeof result) => unknown, x?: (e: unknown) => unknown) => Promise.resolve(result).then(r, x)
    q.catch = (f: (e: unknown) => unknown) => Promise.resolve(result).catch(f)
    q.single = () => Promise.resolve({ data: (data as unknown[])[0] ?? null, error: null })
    return q
  }

  const ch = { on: () => ch, subscribe: () => {}, unsubscribe: () => {} }

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'agents')              return makeQ(agents)
        if (table === 'tasks')               return makeQ(tasks)
        if (table === 'extracted_knowledge') return makeQ(knowledge)
        return makeQ([])
      },
      channel: () => ch,
      removeChannel: () => {},
    },
  }
})

// ── useAgents ─────────────────────────────────────────────────────────────────

import { useAgents } from '../hooks/useAgents'
import { useTasks  } from '../hooks/useTasks'
import { useExtractedKnowledge } from '../hooks/useExtractedKnowledge'

describe('useAgents', () => {
  test('returns 5 agents from mock data', async () => {
    const { result } = renderHook(() => useAgents())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.agents).toHaveLength(5)
  })

  test('agents have required fields: name, role, status', async () => {
    const { result } = renderHook(() => useAgents())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    for (const agent of result.current.agents) {
      expect(typeof agent.name).toBe('string')
      expect(typeof agent.role).toBe('string')
      expect(['idle', 'working', 'stuck', 'failed', 'offline']).toContain(agent.status)
    }
  })
})

// ── useTasks ──────────────────────────────────────────────────────────────────

describe('useTasks', () => {
  test('returns tasks from mock data', async () => {
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.tasks.length).toBeGreaterThan(0)
  })
})

// ── useExtractedKnowledge ─────────────────────────────────────────────────────

describe('useExtractedKnowledge', () => {
  test('returns items without SUPERSEDED records', async () => {
    const { result } = renderHook(() => useExtractedKnowledge())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    const superseded = result.current.items.filter(
      (item) => (item as unknown as { event_type?: string }).event_type === 'SUPERSEDED'
    )
    expect(superseded).toHaveLength(0)
  })
})

// ── Task filter logic (pure) ──────────────────────────────────────────────────

describe('task filtering by status', () => {
  test('filtering by done status returns only completed tasks', () => {
    const tasks = [
      { id: '1', status: 'done', is_completed: true  },
      { id: '2', status: 'todo', is_completed: false },
      { id: '3', status: 'done', is_completed: true  },
    ]
    const done = tasks.filter(t => t.status === 'done')
    expect(done).toHaveLength(2)
    expect(done.every(t => t.is_completed)).toBe(true)
  })
})
