import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { addSnapshot } from './useContextSnapshots'
import type { Task, Priority } from '../types'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Always-current ref so fire-and-forget callbacks see latest tasks
  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const createTask = useCallback(async (input: {
    title: string
    priority: Priority
    due_date: string | null
    project_id: string | null
  }): Promise<Task | null> => {
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    const optimistic: Task = {
      id: tempId,
      description: null,
      is_completed: false,
      completed_at: null,
      created_at: now,
      updated_at: now,
      ...input,
    }
    setTasks(prev => [optimistic, ...prev])

    const { data } = await supabase
      .from('tasks')
      .insert({ ...input, is_completed: false })
      .select()
      .single()

    if (data) {
      setTasks(prev => prev.map(t => t.id === tempId ? data : t))
      return data
    }
    return null
  }, [])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>): Promise<Task | null> => {
    const { data } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) setTasks(prev => prev.map(t => t.id === id ? data : t))
    return data
  }, [])

  const completeTask = useCallback(async (id: string, completed: boolean): Promise<void> => {
    const now = new Date().toISOString()

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === id
        ? { ...t, is_completed: completed, completed_at: completed ? now : null, updated_at: now }
        : t
    ))

    // Background DB sync
    supabase.from('tasks').update({
      is_completed: completed,
      completed_at: completed ? now : null,
      updated_at: now,
    }).eq('id', id)

    // Fire-and-forget snapshot only when completing (not un-completing)
    if (completed) {
      const task = tasksRef.current.find(t => t.id === id)
      if (task?.project_id) {
        addSnapshot(task.project_id, 'task_completed', {
          task_id: task.id,
          title: task.title,
          priority: task.priority,
          completed_at: now,
        })
      }
    }
  }, [])

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    setTasks(prev => prev.filter(t => t.id !== id))
    supabase.from('tasks').delete().eq('id', id)
  }, [])

  return { tasks, loading, createTask, updateTask, completeTask, deleteTask }
}
