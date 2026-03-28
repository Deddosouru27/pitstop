import { useState, useEffect } from 'react'
import { supabaseMemory } from '../lib/supabaseMemory'
import type { Memory } from '../types'

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMemories = async () => {
      const { data, error: err } = await supabaseMemory
        .from('memories')
        .select('id, content, source, tags, importance, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      if (err) {
        setError(err.message)
      } else if (data) {
        setMemories(data)
      }
      setLoading(false)
    }

    fetchMemories()

    // Realtime subscription — new memories appear instantly
    const channel = supabaseMemory
      .channel('realtime-memories')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'memories' },
        (payload) => {
          setMemories(prev => {
            if (prev.some(m => m.id === (payload.new as Memory).id)) return prev
            return [payload.new as Memory, ...prev]
          })
        },
      )
      .subscribe()

    return () => { supabaseMemory.removeChannel(channel) }
  }, [])

  return { memories, loading, error }
}
