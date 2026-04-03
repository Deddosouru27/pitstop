import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Idea } from '../types'

export type TriageRelevance = 'all' | 'hot' | 'strategic'

// Only show new/pending ideas — already reviewed ones are excluded
function isPending(idea: Idea): boolean {
  return !idea.status || idea.status === 'pending'
}

export function useIdeasTriage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [totalReviewed, setTotalReviewed] = useState(0)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const [pendingRes, reviewedRes] = await Promise.all([
      supabase
        .from('ideas')
        .select('*')
        .or('status.is.null,status.eq.pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '("pending")'),
    ])
    if (pendingRes.data) setIdeas(pendingRes.data)
    setTotalReviewed(reviewedRes.count ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

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
    // Move to end of queue in UI only — mark deferred in DB
    setIdeas(prev => {
      const idx = prev.findIndex(i => i.id === id)
      if (idx === -1) return prev
      const item = prev[idx]
      const next = [...prev.slice(0, idx), ...prev.slice(idx + 1), item]
      return next
    })
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

  return { ideas: ideas.filter(isPending), loading, totalReviewed, dismiss, defer, convertToTask }
}
