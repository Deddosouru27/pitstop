import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 40

export interface BrowseSnapshot {
  id: string
  snapshot_type: string
  content: Record<string, unknown>
  created_at: string
}

interface BrowseOpts {
  types?: string[]
  typeLike?: string
  search: string
}

export function useSnapshotsBrowse({ types, typeLike, search }: BrowseOpts) {
  const [items, setItems]           = useState<BrowseSnapshot[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]       = useState(false)
  const [total, setTotal]           = useState<number | null>(null)

  // Stable key for deps
  const typesKey = types?.join(',') ?? ''

  const fetchPage = useCallback(async (offset: number, append: boolean) => {
    let q = supabase
      .from('context_snapshots')
      .select('id, snapshot_type, content, created_at', { count: offset === 0 ? 'exact' : undefined })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (types && types.length === 1) {
      q = q.eq('snapshot_type', types[0])
    } else if (types && types.length > 1) {
      q = q.in('snapshot_type', types)
    } else if (typeLike) {
      q = q.ilike('snapshot_type', typeLike)
    }

    if (search.trim()) q = q.filter('content::text', 'ilike', `%${search.trim()}%`)

    const { data, count, error } = await q
    if (error) return

    const rows = (data ?? []) as BrowseSnapshot[]
    setHasMore(rows.length === PAGE_SIZE)
    setItems(prev => append ? [...prev, ...rows] : rows)
    if (offset === 0 && count != null) setTotal(count)
  }, [typesKey, typeLike, search]) // eslint-disable-line react-hooks/exhaustive-deps

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
