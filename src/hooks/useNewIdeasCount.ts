import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useNewIdeasCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('ideas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new')
      .then(({ count: n }) => {
        if (!cancelled) setCount(n ?? 0)
      })
    return () => { cancelled = true }
  }, [])

  return count
}
