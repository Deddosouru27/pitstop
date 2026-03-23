import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Project } from '../types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProjects(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

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

  return { projects, loading, createProject, updateProject }
}
