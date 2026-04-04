import { describe, test, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => {
  const projects = [
    { id: 'p1', name: 'Pitstop', color: '#7c3aed', github_repo: null, deploy_url: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    { id: 'p2', name: 'MAOS',    color: '#0ea5e9', github_repo: null, deploy_url: null, created_at: '2024-01-02T00:00:00Z', updated_at: '2024-01-02T00:00:00Z' },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeQ(data: unknown[], error: unknown = null) {
    const result = { data, error, count: data.length }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {}
    for (const m of ['select', 'order', 'eq', 'neq', 'limit', 'in', 'gte', 'lte', 'filter', 'not', 'insert', 'update', 'delete']) {
      q[m] = () => q
    }
    q.then       = (r: (v: typeof result) => unknown, x?: (e: unknown) => unknown) => Promise.resolve(result).then(r, x)
    q.single     = () => Promise.resolve({ data: (data as unknown[])[0] ?? null, error })
    q.maybeSingle = () => Promise.resolve({ data: (data as unknown[])[0] ?? null, error })
    return q
  }

  const ch = { on: () => ch, subscribe: () => {}, unsubscribe: () => {} }

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'projects') return makeQ(projects)
        return makeQ([])
      },
      channel: () => ch,
      removeChannel: () => {},
    },
  }
})

vi.mock('./useSupabaseRealtime', () => ({ useSupabaseRealtime: () => {} }))

// ── Tests ─────────────────────────────────────────────────────────────────────

import { useProjects } from './useProjects'

describe('useProjects', () => {
  test('loads projects from supabase', async () => {
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.projects).toHaveLength(2)
    expect(result.current.projects[0].name).toBe('Pitstop')
    expect(result.current.projects[1].name).toBe('MAOS')
  })

  test('projects have required fields', async () => {
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    for (const p of result.current.projects) {
      expect(typeof p.id).toBe('string')
      expect(typeof p.name).toBe('string')
      expect(typeof p.color).toBe('string')
    }
  })

  test('exposes createProject, updateProject, deleteProject', async () => {
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(typeof result.current.createProject).toBe('function')
    expect(typeof result.current.updateProject).toBe('function')
    expect(typeof result.current.deleteProject).toBe('function')
  })

  test('deleteProject removes item optimistically', async () => {
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.projects).toHaveLength(2)

    await act(async () => {
      await result.current.deleteProject('p1')
    })

    expect(result.current.projects).toHaveLength(1)
    expect(result.current.projects[0].id).toBe('p2')
  })
})
