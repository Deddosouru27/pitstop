import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import type { Idea } from '../types'

export function useAllIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)

  const ideasRef = useRef(ideas)
  useEffect(() => { ideasRef.current = ideas }, [ideas])

  const update = useCallback((updater: (prev: Idea[]) => Idea[]) => {
    setIdeas(prev => updater(prev))
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setIdeas(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const markConverted = useCallback(async (id: string): Promise<void> => {
    update(prev => prev.map(i => i.id === id ? { ...i, converted_to_task: true } : i))
    await supabase.from('ideas').update({ converted_to_task: true }).eq('id', id)
  }, [update])

  const deleteIdea = useCallback(async (id: string): Promise<void> => {
    const toRestore = ideasRef.current.find(i => i.id === id)
    update(prev => prev.filter(i => i.id !== id))
    const { error } = await supabase.from('ideas').delete().eq('id', id)
    if (error && toRestore) {
      update(prev => {
        const next = [...prev, toRestore].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        return next
      })
    }
  }, [update])

  const updateStatus = useCallback(async (ids: string[], status: 'accepted' | 'dismissed' | 'deferred' | 'pending'): Promise<void> => {
    update(prev => prev.map(i => ids.includes(i.id) ? { ...i, status } : i))
    await supabase.from('ideas').update({ status }).in('id', ids)
  }, [update])

  useSupabaseRealtime<Idea>({ table: 'ideas', channelName: 'realtime-all-ideas' }, {
    onInsert: (record) => update(prev => {
      if (prev.some(i => i.id === record.id)) return prev
      return [record, ...prev]
    }),
    onUpdate: (record) => update(prev => prev.map(i => i.id === record.id ? record : i)),
    onDelete: (old) => { if (old.id) update(prev => prev.filter(i => i.id !== old.id)) },
  })

  return { ideas, loading, markConverted, deleteIdea, updateStatus }
}
