import { useState, useEffect, useCallback } from 'react'
import { supabaseMemory } from '../lib/supabaseMemory'
import type { Memory } from '../types'

const PAGE_SIZE = 50

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchPage(offset: number, append: boolean) {
    const { data, error: err } = await supabaseMemory
      .from('memories')
      .select('id, content, source, tags, importance, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (err) {
      setError(err.message)
      return
    }
    const rows = (data ?? []) as Memory[]
    setHasMore(rows.length === PAGE_SIZE)
    setMemories(prev => append ? [...prev, ...rows] : rows)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchPage(0, false).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    await fetchPage(memories.length, true)
    setLoadingMore(false)
  }, [memories.length])

  const deleteMemory = useCallback(async (id: string): Promise<void> => {
    setMemories(prev => prev.filter(m => m.id !== id))
    await supabaseMemory.from('memories').delete().eq('id', id)
  }, [])

  return { memories, loading, loadingMore, hasMore, error, loadMore, deleteMemory }
}
