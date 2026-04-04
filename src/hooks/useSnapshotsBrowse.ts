import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 40

export interface BrowseSnapshot {
  id: string
  snapshot_type: string
  content: Record<string, unknown>
  created_at: string
}

export function useSnapshotsBrowse({ type, search }: { type: string; search: string }) {
  const [items, setItems]           = useState<BrowseSnapshot[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]       = useState(false)
  const [total, setTotal]           = useState<number | null>(null)

  const fetchPage = useCallback(async (offset: number, append: boolean) => {
    let q = supabase
      .from('context_snapshots')
      .select('id, snapshot_type, content, created_at', { count: offset === 0 ? 'exact' : undefined })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (type !== 'all') q = q.eq('snapshot_type', type)
    if (search.trim()) q = q.filter('content::text', 'ilike', `%${search.trim()}%`)

    const { data, count, error } = await q
    if (error) return

    const rows = (data ?? []) as BrowseSnapshot[]
    setHasMore(rows.length === PAGE_SIZE)
    setItems(prev => append ? [...prev, ...rows] : rows)
    if (offset === 0 && count != null) setTotal(count)
  }, [type, search])

  useEffect(() => {
    setLoading(true)
    setItems([])
    fetchPage(0, false).finally(() => setLoading(false))
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    await fetchPage(items.length, true)
    setLoadingMore(false)
  }, [fetchPage, items.length])

  return { items, loading, loadingMore, hasMore, total, loadMore }
}
