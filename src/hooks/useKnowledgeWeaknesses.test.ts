import { describe, test, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeCount(count: number): any {
    const result = { data: [], error: null, count }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {}
    for (const m of ['select', 'order', 'eq', 'neq', 'in', 'not', 'is', 'limit', 'filter', 'range']) {
      q[m] = () => q
    }
    q.then = (r: (v: typeof result) => unknown, x?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(r, x)
    return q
  }

  let callCount = 0
  return {
    supabase: {
      from: () => ({
        select: () => {
          // First call = total (200), then null checks in order
          callCount++
          if (callCount === 1) return makeCount(200)  // total
          if (callCount === 2) return makeCount(60)   // no_entity (30%)
          if (callCount === 3) return makeCount(0)    // no_tags (0%)
          if (callCount === 4) return makeCount(100)  // no_source (50%)
          if (callCount === 5) return makeCount(20)   // no_business (10%)
          return makeCount(0)
        },
      }),
      channel: () => ({ on: () => ({}), subscribe: () => {} }),
      removeChannel: () => {},
    },
  }
})

// ── Tests ─────────────────────────────────────────────────────────────────────

import { useKnowledgeWeaknesses } from './useKnowledgeWeaknesses'

describe('useKnowledgeWeaknesses', () => {
  test('loads and resolves', async () => {
    const { result } = renderHook(() => useKnowledgeWeaknesses())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.weaknesses.length).toBeGreaterThan(0)
  })

  test('returns 4 weakness categories', async () => {
    const { result } = renderHook(() => useKnowledgeWeaknesses())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.weaknesses).toHaveLength(4)
  })

  test('each weakness has required fields', async () => {
    const { result } = renderHook(() => useKnowledgeWeaknesses())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    for (const w of result.current.weaknesses) {
      expect(typeof w.key).toBe('string')
      expect(typeof w.label).toBe('string')
      expect(typeof w.count).toBe('number')
      expect(typeof w.pct).toBe('number')
      expect(['green', 'yellow', 'red']).toContain(w.level)
    }
  })

  test('sorted: red first, then yellow, then green', async () => {
    const { result } = renderHook(() => useKnowledgeWeaknesses())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    const levels = result.current.weaknesses.map(w => w.level)
    const ORDER = { red: 2, yellow: 1, green: 0 }
    for (let i = 1; i < levels.length; i++) {
      expect(ORDER[levels[i]]).toBeLessThanOrEqual(ORDER[levels[i - 1]])
    }
  })

  test('exposes total count', async () => {
    const { result } = renderHook(() => useKnowledgeWeaknesses())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(typeof result.current.total).toBe('number')
  })
})
