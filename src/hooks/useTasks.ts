import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { addSnapshot } from './useContextSnapshots'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import type { Task, Priority } from '../types'

// In-flight fetch deduplication for the global tasks fetch
let globalTasksFetchPromise: Promise<void> | null = null

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Always-current ref so fire-and-forget callbacks see latest tasks
  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  // Prevent duplicate fetches across strict-mode double-invokes
  const fetchedRef = useRef(false)

  const fetchTasks = useCallback(async () => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    // Deduplicate concurrent calls (e.g. two components mounting simultaneously)
    if (globalTasksFetchPromise) {
      await globalTasksFetchPromise
      return
    }

    globalTasksFetchPromise = (async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setTasks(data)
      setLoading(false)
    })()

    try {
      await globalTasksFetchPromise
    } finally {
      globalTasksFetchPromise = null
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // ── Realtime subscription ───────────────────────────────────────────────────
  const realtimeOptions = useMemo(() => ({
    table: 'tasks',
    channelName: 'realtime-tasks',
  }), [])

  useSupabaseRealtime<Task>(realtimeOptions, {
    onInsert: (record) => {
      setTasks(prev => {
        if (prev.some(t => t.id === record.id)) return prev
        return [record, ...prev]
      })
    },
    onUpdate: (record) => {
      setTasks(prev => prev.map(t => t.id === record.id ? record : t))
    },
    onDelete: (old) => {
      if (old.id) setTasks(prev => prev.filter(t => t.id !== old.id))
    },
  })

  const createTask = useCallback(async (input: {
    title: string
    description?: string | null
    priority: Priority
    due_date: string | null
    project_id: string | null
    assignee?: string | null
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
      if (data.project_id) {
        addSnapshot(data.project_id, 'task_created', {
          title: data.title,
          priority: data.priority,
        })
      }
      return data
    }
    // Rollback if insert failed
    setTasks(prev => prev.filter(t => t.id !== tempId))
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

  const completeTask = useCallback(async (
    id: string,
    completed: boolean,
    onCompleted?: (task: Task) => void,
  ): Promise<void> => {
    const now = new Date().toISOString()

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === id
        ? { ...t, is_completed: completed, status: completed ? 'done' : 'todo', completed_at: completed ? now : null, updated_at: now }
        : t
    ))

    if (completed) {
      const task = tasksRef.current.find(t => t.id === id)
      if (task) {
        onCompleted?.(task)
        if (task.project_id) {
          addSnapshot(task.project_id, 'task_completed', {
            task_id: task.id,
            title: task.title,
            priority: task.priority,
            completed_at: now,
          })
        }
      }
    }

    // Background DB sync — rollback UI on failure
    const { error } = await supabase.from('tasks').update({
      is_completed: completed,
      status:       completed ? 'done' : 'todo',
      completed_at: completed ? now : null,
      updated_at:   now,
    }).eq('id', id)

    if (error) {
      console.error('[completeTask] DB sync failed:', error.message)
      // Rollback optimistic update
      setTasks(prev => prev.map(t =>
        t.id === id
          ? { ...t, is_completed: !completed, status: !completed ? 'done' : 'todo', completed_at: !completed ? now : null, updated_at: now }
          : t
      ))
    }
  }, [])

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    const toRestore = tasksRef.current.find(t => t.id === id)

    // Optimistic remove
    setTasks(prev => prev.filter(t => t.id !== id))

    const { error } = await supabase.from('tasks').delete().eq('id', id)

    // Rollback on failure
    if (error && toRestore) {
      setTasks(prev =>
        [...prev, toRestore].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      )
    }
  }, [])

  return { tasks, loading, createTask, updateTask, completeTask, deleteTask }
}
