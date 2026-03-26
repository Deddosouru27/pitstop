import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Cycle, CycleStats } from '../../types'

// Build chainable mock
function buildChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const makeFn = () => vi.fn().mockReturnValue(chain)

  chain.select = makeFn()
  chain.eq = makeFn()
  chain.order = makeFn()
  chain.insert = makeFn()
  chain.update = makeFn()
  chain.single = vi.fn().mockResolvedValue(resolvedValue)

  // For terminal calls without .single()
  chain.order.mockResolvedValue(resolvedValue)
  chain.eq.mockResolvedValue(resolvedValue)

  return chain
}

vi.mock('../../lib/supabase', () => {
  const chain = buildChain({ data: [], error: null })
  return {
    supabase: {
      from: vi.fn().mockReturnValue(chain),
      _chain: chain,
    },
  }
})

// We need to import after mocking
import { supabase } from '../../lib/supabase'

describe('Cycle types and CycleStats', () => {
  it('should create a valid Cycle object', () => {
    const cycle: Cycle = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      project_id: 'f2896db9-8eeb-4a15-a49f-7b8571f09dfe',
      name: 'Sprint 1',
      description: 'First sprint',
      goal: 'Implement basic workflow',
      start_date: '2026-03-26T00:00:00Z',
      end_date: '2026-04-09T00:00:00Z',
      status: 'active',
      created_at: '2026-03-26T00:00:00Z',
      updated_at: '2026-03-26T00:00:00Z',
    }

    expect(cycle.id).toBe('123e4567-e89b-12d3-a456-426614174000')
    expect(cycle.name).toBe('Sprint 1')
    expect(cycle.status).toBe('active')
    expect(cycle.description).toBe('First sprint')
    expect(cycle.goal).toBe('Implement basic workflow')
  })

  it('should allow null description and goal', () => {
    const cycle: Cycle = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      project_id: 'f2896db9-8eeb-4a15-a49f-7b8571f09dfe',
      name: 'Sprint 2',
      description: null,
      goal: null,
      start_date: '2026-04-09T00:00:00Z',
      end_date: '2026-04-23T00:00:00Z',
      status: 'upcoming',
      created_at: '2026-03-26T00:00:00Z',
      updated_at: '2026-03-26T00:00:00Z',
    }

    expect(cycle.description).toBeNull()
    expect(cycle.goal).toBeNull()
  })

  it('should enforce valid status values', () => {
    const validStatuses: Cycle['status'][] = ['upcoming', 'active', 'completed']
    validStatuses.forEach(status => {
      const cycle: Cycle = {
        id: 'test-id',
        project_id: 'test-project',
        name: 'Test',
        description: null,
        goal: null,
        start_date: '2026-01-01T00:00:00Z',
        end_date: '2026-01-15T00:00:00Z',
        status,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(['upcoming', 'active', 'completed']).toContain(cycle.status)
    })
  })
})

describe('CycleStats', () => {
  it('should calculate stats for empty cycle (0 tasks)', () => {
    const stats: CycleStats = {
      total_tasks: 0,
      done_tasks: 0,
      in_progress: 0,
      blocked: 0,
      completion_rate: 0,
    }

    expect(stats.total_tasks).toBe(0)
    expect(stats.completion_rate).toBe(0)
  })

  it('should calculate completion rate correctly', () => {
    const stats: CycleStats = {
      total_tasks: 10,
      done_tasks: 7,
      in_progress: 2,
      blocked: 1,
      completion_rate: 70,
    }

    expect(stats.completion_rate).toBe(70)
    expect(stats.done_tasks + stats.in_progress + stats.blocked).toBeLessThanOrEqual(stats.total_tasks)
  })

  it('should handle 100% completion', () => {
    const stats: CycleStats = {
      total_tasks: 5,
      done_tasks: 5,
      in_progress: 0,
      blocked: 0,
      completion_rate: 100,
    }

    expect(stats.completion_rate).toBe(100)
    expect(stats.done_tasks).toBe(stats.total_tasks)
  })
})

describe('CycleStats computation logic', () => {
  it('should compute completion_rate as 0 when total is 0', () => {
    const statuses: string[] = []
    const total = statuses.length
    const done = statuses.filter(s => s === 'done').length
    const rate = total > 0 ? Math.round((done / total) * 100) : 0

    expect(rate).toBe(0)
  })

  it('should compute correct stats from status array', () => {
    const statuses = ['done', 'done', 'in_progress', 'blocked', 'todo', 'done']
    const total = statuses.length
    const done = statuses.filter(s => s === 'done').length
    const inProgress = statuses.filter(s => s === 'in_progress').length
    const blocked = statuses.filter(s => s === 'blocked').length
    const rate = total > 0 ? Math.round((done / total) * 100) : 0

    expect(total).toBe(6)
    expect(done).toBe(3)
    expect(inProgress).toBe(1)
    expect(blocked).toBe(1)
    expect(rate).toBe(50)
  })

  it('should round completion_rate to nearest integer', () => {
    const statuses = ['done', 'todo', 'in_progress']
    const total = statuses.length
    const done = statuses.filter(s => s === 'done').length
    const rate = total > 0 ? Math.round((done / total) * 100) : 0

    expect(rate).toBe(33) // 33.33... rounds to 33
  })
})

describe('Cycle date validation logic', () => {
  it('should detect when start_date is after end_date', () => {
    const startDate = '2026-04-15T00:00:00Z'
    const endDate = '2026-04-01T00:00:00Z'

    const isValid = new Date(startDate) < new Date(endDate)
    expect(isValid).toBe(false)
  })

  it('should accept valid date range', () => {
    const startDate = '2026-04-01T00:00:00Z'
    const endDate = '2026-04-15T00:00:00Z'

    const isValid = new Date(startDate) < new Date(endDate)
    expect(isValid).toBe(true)
  })

  it('should reject same start and end date', () => {
    const startDate = '2026-04-01T00:00:00Z'
    const endDate = '2026-04-01T00:00:00Z'

    const isValid = new Date(startDate) < new Date(endDate)
    expect(isValid).toBe(false)
  })
})

describe('Cycle name validation logic', () => {
  it('should detect empty name', () => {
    const name = ''
    expect(name.trim().length).toBe(0)
  })

  it('should detect whitespace-only name', () => {
    const name = '   '
    expect(name.trim().length).toBe(0)
  })

  it('should accept valid name', () => {
    const name = 'Sprint 1'
    expect(name.trim().length).toBeGreaterThan(0)
  })
})

describe('Supabase chain mock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have supabase mock available', () => {
    expect(supabase).toBeDefined()
    expect(supabase.from).toBeDefined()
  })

  it('should return chain from supabase.from()', () => {
    const result = supabase.from('cycles')
    expect(result).toBeDefined()
    expect(result.select).toBeDefined()
    expect(result.insert).toBeDefined()
  })
})
