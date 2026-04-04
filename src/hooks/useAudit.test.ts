import { describe, test, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => {
  const BLOCKERS = [
    { id: 'b1', title: 'Blocked by X', status: 'todo' },
    { id: 'b2', title: 'Auth broken',  status: 'in_progress' },
  ]
  const SNAPSHOT = [{ created_at: new Date(Date.now() - 2 * 3_600_000).toISOString() }]
  const AGENTS   = [
    { id: 'a1', name: 'Baker',  role: 'frontend', last_heartbeat: new Date(Date.now() - 10 * 60_000).toISOString() },
    { id: 'a2', name: 'Runner', role: 'runner',   last_heartbeat: null },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeQ(data: unknown[], count = data.length): any {
    const result = { data, error: null, count }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {}
    for (const m of ['select', 'order', 'eq', 'neq', 'in', 'not', 'is', 'limit', 'filter', 'range', 'maybeSingle']) {
      q[m] = () => q
    }
    q.then = (r: (v: typeof result) => unknown, x?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(r, x)
    q.single = () => Promise.resolve({ data: data[0] ?? null, error: null })
    return q
  }

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'tasks')               return makeQ(BLOCKERS, 2)
        if (table === 'ideas')               return makeQ([], 7)
        if (table === 'context_snapshots')   return makeQ(SNAPSHOT)
        if (table === 'agents')              return makeQ(AGENTS)
        if (table === 'extracted_knowledge') return makeQ([], 100)
        return makeQ([])
      },
      channel: () => ({ on: () => ({}), subscribe: () => {} }),
      removeChannel: () => {},
    },
  }
})

// ── Tests ─────────────────────────────────────────────────────────────────────

import { useAudit } from './useAudit'

describe('useAudit', () => {
  test('starts loading then resolves', async () => {
    const { result } = renderHook(() => useAudit())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    expect(result.current.data).not.toBeNull()
  })

  test('openBlockers populated from tasks table', async () => {
    const { result } = renderHook(() => useAudit())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    expect(result.current.data!.openBlockers).toHaveLength(2)
    expect(result.current.data!.openBlockers[0].title).toBe('Blocked by X')
  })

  test('hoursSinceSnapshot is a non-negative number', async () => {
    const { result } = renderHook(() => useAudit())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    const h = result.current.data!.hoursSinceSnapshot
    expect(h).not.toBeNull()
    expect(typeof h).toBe('number')
    expect(h!).toBeGreaterThanOrEqual(0)
  })

  test('agents are mapped with minutesSinceHeartbeat', async () => {
    const { result } = renderHook(() => useAudit())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })

    const agents = result.current.data!.agents
    expect(agents).toHaveLength(2)

    const baker = agents.find(a => a.name === 'Baker')!
    expect(typeof baker.minutesSinceHeartbeat).toBe('number')
    expect(baker.minutesSinceHeartbeat).toBeGreaterThanOrEqual(0)

    const runner = agents.find(a => a.name === 'Runner')!
    expect(runner.minutesSinceHeartbeat).toBeNull()
  })

  test('exposes refresh function', async () => {
    const { result } = renderHook(() => useAudit())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    expect(typeof result.current.refresh).toBe('function')
  })

  test('sets lastUpdated after load', async () => {
    const { result } = renderHook(() => useAudit())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    expect(result.current.lastUpdated).toBeInstanceOf(Date)
  })
})
