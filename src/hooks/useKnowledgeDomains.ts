import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { KnowledgeDomain } from '../types'

type DomainInput = { name: string; description: string; priority: string }

export function useKnowledgeDomains() {
  const [domains, setDomains] = useState<KnowledgeDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const { data, error: err } = await supabase
      .from('knowledge_domains')
      .select('*')
      .order('priority', { ascending: false })
    if (err) setError(err.message)
    else { setDomains(data ?? []); setError(null) }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('knowledge_domains')
      .select('*')
      .order('priority', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else { setDomains(data ?? []); setError(null) }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  async function addDomain(input: DomainInput): Promise<boolean> {
    const { error: err } = await supabase
      .from('knowledge_domains')
      .insert({ name: input.name.trim(), description: input.description.trim() || null, priority: input.priority })
    if (err) return false
    await load()
    return true
  }

  async function updateDomain(id: string, input: DomainInput): Promise<boolean> {
    const { error: err } = await supabase
      .from('knowledge_domains')
      .update({ name: input.name.trim(), description: input.description.trim() || null, priority: input.priority })
      .eq('id', id)
    if (err) return false
    await load()
    return true
  }

  async function deleteDomain(id: string): Promise<boolean> {
    const { error: err } = await supabase
      .from('knowledge_domains')
      .delete()
      .eq('id', id)
    if (err) return false
    setDomains(prev => prev.filter(d => d.id !== id))
    return true
  }

  return { domains, loading, error, addDomain, updateDomain, deleteDomain }
}
