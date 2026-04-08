import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Idea } from '../types'

export type TriageRelevance = 'all' | 'hot' | 'strategic'
export type ActionFilter = 'unreviewed' | 'accepted' | 'rejected' | 'deferred'

// Show unreviewed ideas — null, pending, or new
function isPending(idea: Idea): boolean {
  return !idea.status || idea.status === 'pending' || idea.status === 'new'
}

export function useIdeasTriage(actionFilter: ActionFilter = 'unreviewed') {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [totalReviewed, setTotalReviewed] = useState(0)

  const fetchIdeas = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false })

    if (actionFilter === 'unreviewed') {
      q = q.or('status.is.null,status.eq.pending,status.eq.new')
    } else if (actionFilter === 'accepted') {
      q = q.eq('status', 'accepted')
    } else if (actionFilter === 'rejected') {
      q = q.in('status', ['rejected', 'dismissed'])
    } else if (actionFilter === 'deferred') {
      q = q.eq('status', 'deferred')
    }

    const { data } = await q
    if (data) setIdeas(data as Idea[])
    setLoading(false)
  }, [actionFilter])

  useEffect(() => { fetchIdeas() }, [fetchIdeas])

  const dismiss = useCallback(async (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id))
    setTotalReviewed(n => n + 1)
    await supabase.from('ideas').update({
      status: 'dismissed',
      reviewed_by: 'artur',
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
  }, [])

  const defer = useCallback(async (id: string) => {
    setIdeas(prev => {
      const idx = prev.findIndex(i => i.id === id)
      if (idx === -1) return prev
      const item = prev[idx]
      return [...prev.slice(0, idx), ...prev.slice(idx + 1), item]
    })
    setTotalReviewed(n => n + 1)
    await supabase.from('ideas').update({ status: 'deferred' }).eq('id', id)
  }, [])

  const convertToTask = useCallback(async (
    id: string,
    title: string,
    workType: string,
    phaseNumber: number | null,
  ) => {
    // Create task
    const { error: taskErr } = await supabase.from('tasks').insert({
      title,
      work_type: workType || null,
      phase_number: phaseNumber || null,
      status: 'todo',
      assignee: 'artur',
      is_completed: false,
      context: { source: 'ideas_triage', idea_id: id },
    })
    if (taskErr) throw taskErr

    // Mark idea converted
    await supabase.from('ideas').update({
      converted_to_task: true,
      status: 'accepted',
      reviewed_by: 'artur',
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)

    setIdeas(prev => prev.filter(i => i.id !== id))
    setTotalReviewed(n => n + 1)
  }, [])

  const pendingIdeas = actionFilter === 'unreviewed' ? ideas.filter(isPending) : ideas

  return { ideas: pendingIdeas, loading, totalReviewed, dismiss, defer, convertToTask, refetch: fetchIdeas }
}
