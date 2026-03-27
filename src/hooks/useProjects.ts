import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import type { Project } from '../types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const projectsRef = useRef(projects)
  useEffect(() => { projectsRef.current = projects }, [projects])

  // Prevent duplicate fetches
  const fetchedRef = useRef(false)

  const fetchProjects = useCallback(async () => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    console.log('[fetch]', 'projects', null, data?.length ?? 0, 'items')
    if (data) setProjects(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // ── Realtime subscription ───────────────────────────────────────────────────
  const realtimeOptions = useMemo(() => ({
    table: 'projects',
    channelName: 'realtime-projects',
  }), [])

  useSupabaseRealtime<Project>(realtimeOptions, {
    onInsert: (record) => {
      setProjects(prev => {
        if (prev.some(p => p.id === record.id)) return prev
        return [record, ...prev]
      })
    },
    onUpdate: (record) => {
      setProjects(prev => prev.map(p => p.id === record.id ? record : p))
    },
    onDelete: (old) => {
      if (old.id) setProjects(prev => prev.filter(p => p.id !== old.id))
    },
  })

  const createProject = useCallback(async (input: Pick<Project, 'name' | 'color'>): Promise<Project | null> => {
    const { data } = await supabase
      .from('projects')
      .insert(input)
      .select()
      .single()
    if (data) setProjects(prev => [data, ...prev])
    return data
  }, [])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>): Promise<Project | null> => {
    const { data } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) setProjects(prev => prev.map(p => p.id === id ? data : p))
    return data
  }, [])

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    const toRestore = projectsRef.current.find(p => p.id === id)
    console.log('[delete]', 'project', id)

    // Optimistic remove
    setProjects(prev => prev.filter(p => p.id !== id))

    const { error } = await supabase.from('projects').delete().eq('id', id)
    console.log('[delete response]', 'project', id, error)

    // Rollback on failure
    if (error && toRestore) {
      setProjects(prev =>
        [...prev, toRestore].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      )
    }
  }, [])

  return { projects, loading, createProject, updateProject, deleteProject }
}
