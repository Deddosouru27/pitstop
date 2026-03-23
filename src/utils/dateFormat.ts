export function formatDueDate(dateStr: string): { label: string; className: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)

  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < -1) return { label: `${Math.abs(diff)}d ago`, className: 'text-red-400' }
  if (diff === -1) return { label: 'Yesterday', className: 'text-red-400' }
  if (diff === 0) return { label: 'Today', className: 'text-amber-400' }
  if (diff === 1) return { label: 'Tomorrow', className: 'text-slate-300' }

  return {
    label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    className: 'text-slate-400',
  }
}

export function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
