import type { Task } from '../types'

function getWeight(task: Task): number {
  if (task.is_completed) return 4
  if (!task.due_date) return 3

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(task.due_date)
  due.setHours(0, 0, 0, 0)

  if (due < today) return 0   // overdue
  if (due.getTime() === today.getTime()) return 1 // today
  return 2 // future
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const wa = getWeight(a)
    const wb = getWeight(b)
    if (wa !== wb) return wa - wb

    // Same weight: sort by date ascending (nulls last)
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    return 0
  })
}
