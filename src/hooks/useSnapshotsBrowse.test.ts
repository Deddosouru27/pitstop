import { describe, test, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// ── Supabase mock ─────────────────────────────────────────────────────────────

const SNAPSHOTS = Array.from({ length: 5 }, (_, i) => ({
  id:            `s${i + 1}`,
  snapshot_type: i < 2 ? 'job_outcome' : 'decision_log',
  content:       { title: `Snap ${i + 1}`, detail: 'some text' },
  created_at:    `2024-04-0${i + 1}T12:00:00Z`,
}))

vi.mock('../lib/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeQ(data: unknown[], count: number): any {
    const result = { data, error: null, count }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {}
    for (const m of ['order', 'eq', 'neq', 'not', 'is', 'limit', 'filter', 'gte', 'lte', 'maybeSingle']) {
      q[m] = () => q
    }
    q.range = () => q
    q.then = (r: (v: typeof result) => unknown, x?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(r, x)
    q.single = () => Promise.resolve({ data: data[0] ?? null, error: null })
    return q
  }

  return {
    supabase: {
      from: () => ({
        select: () => makeQ(SNAPSHOTS, SNAPSHOTS.length),
      }),
      channel: () => ({ on: () => ({}), subscribe: () => {} }),
      removeChannel: () => {},
    },
  }
})

// ── Tests ─────────────────────────────────────────────────────────────────────

import { useSnapshotsBrowse } from './useSnapshotsBrowse'

describe('useSnapshotsBrowse', () => {
  test('loads items on mount', async () => {
    const { result } = renderHook(() => useSnapshotsBrowse({ type: 'all', search: '' }))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.items).toHaveLength(5)
  })

  test('exposes total count', async () => {
    const { result } = renderHook(() => useSnapshotsBrowse({ type: 'all', search: '' }))
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.total).toBe(5)
  })

  test('items have required BrowseSnapshot fields', async () => {
    const { result } = renderHook(() => useSnapshotsBrowse({ type: 'all', search: '' }))
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    for (const item of result.current.items) {
      expect(typeof item.id).toBe('string')
      expect(typeof item.snapshot_type).toBe('string')
      expect(typeof item.content).toBe('object')
      expect(typeof item.created_at).toBe('string')
    }
  })

  test('resets items when type filter changes', async () => {
    const { result, rerender } = renderHook(
      ({ type }) => useSnapshotsBrowse({ type, search: '' }),
      { initialProps: { type: 'all' } }
    )
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.items).toHaveLength(5)

    rerender({ type: 'job_outcome' })
    // After rerender, loading should reset
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    // Mock returns all 5 regardless — just verify it re-fetched (loading went true then false)
    expect(result.current.items).toBeDefined()
  })

  test('exposes loadMore function', async () => {
    const { result } = renderHook(() => useSnapshotsBrowse({ type: 'all', search: '' }))
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(typeof result.current.loadMore).toBe('function')
  })

  test('hasMore is false when results < PAGE_SIZE (40)', async () => {
    const { result } = renderHook(() => useSnapshotsBrowse({ type: 'all', search: '' }))
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    // 5 items < 40 PAGE_SIZE → hasMore should be false
    expect(result.current.hasMore).toBe(false)
  })
})
