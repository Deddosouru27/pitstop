import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { callClaude } from '../lib/anthropic'
import { addSnapshot } from './useContextSnapshots'
import type { Idea } from '../types'

const CATEGORIZE_PROMPT = 'You are a categorization assistant. Given an idea or note, return ONLY one of these categories as a single lowercase word: feature, ux, marketing, bug, other. Nothing else — just the single word.'

export function useIdeas(projectId: string) {
  const [ideas, setIdeas] = useState<Idea[]>([])

  const fetchIdeas = useCallback(async () => {
    if (!projectId) return
    const { data } = await supabase
      .from('ideas')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (data) setIdeas(data)
  }, [projectId])

  useEffect(() => { fetchIdeas() }, [fetchIdeas])

  const categorizeInBackground = useCallback(async (ideaId: string, content: string) => {
    try {
      const raw = await callClaude(CATEGORIZE_PROMPT, content)
      const valid = ['feature', 'ux', 'marketing', 'bug', 'other']
      const category = valid.includes(raw.trim().toLowerCase()) ? raw.trim().toLowerCase() : 'other'
      await supabase.from('ideas').update({ ai_category: category }).eq('id', ideaId)
      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, ai_category: category } : i))
    } catch {
      // Silent fail — AI categorization is best-effort
    }
  }, [])

  const addIdea = useCallback(async (content: string): Promise<void> => {
    const tempId = `temp-${Date.now()}`
    const optimistic: Idea = {
      id: tempId,
      project_id: projectId,
      content,
      category: 'idea',
      ai_category: '',
      converted_to_task: false,
      created_at: new Date().toISOString(),
    }
    setIdeas(prev => [optimistic, ...prev])

    const { data } = await supabase
      .from('ideas')
      .insert({ project_id: projectId, content })
      .select()
      .single()

    if (data) {
      setIdeas(prev => prev.map(i => i.id === tempId ? data : i))
      // Fire-and-forget: categorize + log snapshot
      categorizeInBackground(data.id, content)
      addSnapshot(projectId, 'idea_added', {
        idea_id: data.id,
        content: data.content,
        category: data.category ?? 'idea',
      })
    }
  }, [projectId, categorizeInBackground])

  const markConverted = useCallback(async (id: string): Promise<void> => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, converted_to_task: true } : i))
    supabase.from('ideas').update({ converted_to_task: true }).eq('id', id)
  }, [])

  const deleteIdea = useCallback(async (id: string): Promise<void> => {
    setIdeas(prev => prev.filter(i => i.id !== id))
    supabase.from('ideas').delete().eq('id', id)
  }, [])

  return { ideas, addIdea, markConverted, deleteIdea }
}
