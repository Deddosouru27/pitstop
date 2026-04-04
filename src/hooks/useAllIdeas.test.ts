import { describe, test, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => {
  const ideas = [
    { id: 'i1', content: 'Build feature X',  summary: 'Feature idea', status: 'new',      source_type: 'text', ai_category: 'feature', relevance: 'hot',       project_id: null, converted_to_task: false, rejection_reason: null, created_at: '2024-01-03T00:00:00Z' },
    { id: 'i2', content: 'Fix login bug',    summary: 'Bug fix',      status: 'pending',  source_type: 'text', ai_category: 'bug',     relevance: null,        project_id: null, converted_to_task: false, rejection_reason: null, created_at: '2024-01-02T00:00:00Z' },
    { id: 'i3', content: 'Improve onboard', summary: null,           status: 'accepted', source_type: 'link', ai_category: 'ux',      relevance: 'strategic', project_id: null, converted_to_task: true,  rejection_reason: null, created_at: '2024-01-01T00:00:00Z' },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeQ(data: unknown[]) {
    const result = { data, error: null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {}
    for (const m of ['select', 'order', 'eq', 'neq', 'in', 'filter', 'not', 'limit', 'update', 'delete']) {
      q[m] = () => q
    }
    q.then   = (r: (v: typeof result) => unknown, x?: (e: unknown) => unknown) => Promise.resolve(result).then(r, x)
    q.single = () => Promise.resolve({ data: (data as unknown[])[0] ?? null, error: null })
    return q
  }

  const ch = { on: () => ch, subscribe: () => {}, unsubscribe: () => {} }

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'ideas') return makeQ(ideas)
        return makeQ([])
      },
      channel: () => ch,
      removeChannel: () => {},
    },
  }
})

vi.mock('./useSupabaseRealtime', () => ({ useSupabaseRealtime: () => {} }))

// ── Tests ─────────────────────────────────────────────────────────────────────

import { useAllIdeas } from './useAllIdeas'

describe('useAllIdeas', () => {
  test('loads all ideas regardless of status', async () => {
    const { result } = renderHook(() => useAllIdeas())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.ideas).toHaveLength(3)
  })

  test('ideas have required fields', async () => {
    const { result } = renderHook(() => useAllIdeas())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    for (const idea of result.current.ideas) {
      expect(typeof idea.id).toBe('string')
      expect(typeof idea.content).toBe('string')
    }
  })

  test('exposes all mutation functions', async () => {
    const { result } = renderHook(() => useAllIdeas())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(typeof result.current.updateStatus).toBe('function')
    expect(typeof result.current.rejectIdeas).toBe('function')
    expect(typeof result.current.markConverted).toBe('function')
    expect(typeof result.current.deleteIdea).toBe('function')
  })

  test('updateStatus mutates ideas optimistically', async () => {
    const { result } = renderHook(() => useAllIdeas())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.ideas.find(i => i.id === 'i1')?.status).toBe('new')

    await act(async () => {
      await result.current.updateStatus(['i1'], 'accepted')
    })

    expect(result.current.ideas.find(i => i.id === 'i1')?.status).toBe('accepted')
  })

  test('rejectIdeas sets status=dismissed and stores reason', async () => {
    const { result } = renderHook(() => useAllIdeas())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })

    await act(async () => {
      await result.current.rejectIdeas(['i2'], 'not relevant')
    })

    const rejected = result.current.ideas.find(i => i.id === 'i2')
    expect(rejected?.status).toBe('dismissed')
    expect(rejected?.rejection_reason).toBe('not relevant')
  })

  test('deleteIdea removes item optimistically', async () => {
    const { result } = renderHook(() => useAllIdeas())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.ideas).toHaveLength(3)

    await act(async () => {
      await result.current.deleteIdea('i3')
    })

    expect(result.current.ideas).toHaveLength(2)
    expect(result.current.ideas.find(i => i.id === 'i3')).toBeUndefined()
  })
})
