import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Subtask } from '../types'

export function useSubtasks(taskId: string) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])

  const fetchSubtasks = useCallback(async () => {
    if (!taskId) return
    const { data } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at')
    if (data) setSubtasks(data)
  }, [taskId])

  useEffect(() => { fetchSubtasks() }, [fetchSubtasks])

  const addSubtask = useCallback(async (title: string): Promise<void> => {
    const tempId = `temp-${Date.now()}`
    const optimistic: Subtask = {
      id: tempId,
      task_id: taskId,
      title,
      is_completed: false,
      created_at: new Date().toISOString(),
    }
    setSubtasks(prev => [...prev, optimistic])

    const { data } = await supabase
      .from('subtasks')
      .insert({ task_id: taskId, title, is_completed: false })
      .select()
      .single()
    if (data) setSubtasks(prev => prev.map(s => s.id === tempId ? data : s))
  }, [taskId])

  const toggleSubtask = useCallback(async (id: string, is_completed: boolean): Promise<void> => {
    // Optimistic
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, is_completed } : s))
    supabase.from('subtasks').update({ is_completed }).eq('id', id)
  }, [])

  const deleteSubtask = useCallback(async (id: string): Promise<void> => {
    setSubtasks(prev => prev.filter(s => s.id !== id))
    supabase.from('subtasks').delete().eq('id', id)
  }, [])

  return { subtasks, addSubtask, toggleSubtask, deleteSubtask }
}
