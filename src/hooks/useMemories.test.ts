import { describe, test, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// ── supabaseMemory mock (separate Supabase project) ───────────────────────────

vi.mock('../lib/supabaseMemory', () => {
  const memories = [
    { id: 'm1', content: 'React hooks tip',   source: 'manual', tags: ['react'], importance: 5, created_at: '2024-01-03T00:00:00Z' },
    { id: 'm2', content: 'Supabase perf tip', source: 'auto',   tags: [],        importance: 3, created_at: '2024-01-02T00:00:00Z' },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeQ(data: unknown[], error: unknown = null) {
    const result = { data, error }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {}
    for (const m of ['select', 'order', 'eq', 'range', 'delete']) {
      q[m] = () => q
    }
    q.then = (r: (v: typeof result) => unknown, x?: (e: unknown) => unknown) => Promise.resolve(result).then(r, x)
    return q
  }

  const ch = { on: () => ch, subscribe: () => {}, unsubscribe: () => {} }

  return {
    supabaseMemory: {
      from: () => makeQ(memories),
      channel: () => ch,
      removeChannel: () => {},
    },
  }
})

// ── Tests ─────────────────────────────────────────────────────────────────────

import { useMemories } from './useMemories'

describe('useMemories', () => {
  test('loads memories from supabaseMemory', async () => {
    const { result } = renderHook(() => useMemories())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.memories).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  test('memories have required fields', async () => {
    const { result } = renderHook(() => useMemories())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    for (const m of result.current.memories) {
      expect(typeof m.id).toBe('string')
      expect(typeof m.content).toBe('string')
    }
  })

  test('hasMore is false when returned count < PAGE_SIZE (50)', async () => {
    const { result } = renderHook(() => useMemories())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    // 2 items < 50 → hasMore = false
    expect(result.current.hasMore).toBe(false)
  })

  test('deleteMemory removes item optimistically', async () => {
    const { result } = renderHook(() => useMemories())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.memories).toHaveLength(2)

    await act(async () => {
      await result.current.deleteMemory('m1')
    })

    expect(result.current.memories).toHaveLength(1)
    expect(result.current.memories[0].id).toBe('m2')
  })

  test('exposes loadMore function', async () => {
    const { result } = renderHook(() => useMemories())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(typeof result.current.loadMore).toBe('function')
    expect(typeof result.current.loadingMore).toBe('boolean')
  })
})
