import { describe, test, expect } from 'vitest'
import { inferPriority } from '../utils/inferPriority'

// ── inferPriority ─────────────────────────────────────────────────────────────

const emptyCtx = { nextStep: '', whereStoped: '', activeTasks: [], recentIdeas: [] }

describe('inferPriority', () => {
  test('high-priority keywords → high', () => {
    expect(inferPriority('fix critical bug', emptyCtx)).toBe('high')
  })

  test('medium-priority keywords → medium', () => {
    expect(inferPriority('add feature', emptyCtx)).toBe('medium')
  })

  test('empty title → low', () => {
    expect(inferPriority('', emptyCtx)).toBe('low')
  })
})

// ── URL validation (mirrors DashboardPage QuickCaptureModal logic) ─────────────

function isValidUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

describe('URL validation', () => {
  test('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false)
  })

  test('accepts https:// URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })
})
