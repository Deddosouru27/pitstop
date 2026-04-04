import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface Weakness {
  key: string
  label: string
  count: number
  total: number
  pct: number
  level: 'green' | 'yellow' | 'red'
}

export function useKnowledgeWeaknesses() {
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [
        totalRes,
        noEntityRes,
        noTagsRes,
        noSourceRes,
        noBusinessRes,
      ] = await Promise.all([
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true }),
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true }).is('entities', null),
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true }).is('tags', null),
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true }).is('source_url', null),
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true }).is('business_value', null),
      ])

      if (cancelled) return

      const t = totalRes.count ?? 0

      // [label, count, [yellow_threshold_pct, red_threshold_pct]]
      const raw: [string, string, number, [number, number]][] = [
        ['no_entity',   'Без связей (entities)',   noEntityRes.count  ?? 0, [20, 50]],
        ['no_business', 'Без business value',       noBusinessRes.count ?? 0, [10, 30]],
        ['no_tags',     'Без тегов',                noTagsRes.count    ?? 0, [30, 60]],
        ['no_source',   'Без источника (URL)',       noSourceRes.count  ?? 0, [40, 70]],
      ]

      const ws: Weakness[] = raw.map(([key, label, count, [yThresh, rThresh]]) => {
        const pct = t > 0 ? Math.round(count / t * 100) : 0
        const level: 'green' | 'yellow' | 'red' =
          pct > rThresh ? 'red' : pct > yThresh ? 'yellow' : 'green'
        return { key, label, count, total: t, pct, level }
      })

      // Sort: red first, then yellow, then by pct desc
      ws.sort((a, b) => {
        const order = { red: 2, yellow: 1, green: 0 }
        return (order[b.level] - order[a.level]) || (b.pct - a.pct)
      })

      setTotal(t)
      setWeaknesses(ws)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { weaknesses, total, loading }
}
