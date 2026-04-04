import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CreateTaskModal from '../components/tasks/CreateTaskModal'

// Mock supabase — CreateTaskModal imports it directly
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}))

describe('CreateTaskModal', () => {
  test('submit button is disabled when title is empty', () => {
    render(
      <CreateTaskModal
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    )
    const button = screen.getByRole('button', { name: /Создать задачу/i })
    expect(button.hasAttribute('disabled')).toBe(true)
  })
})
