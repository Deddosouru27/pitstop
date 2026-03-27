import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { callClaude } from '../lib/anthropic'
import { addSnapshot } from './useContextSnapshots'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import type { Idea } from '../types'

const CATEGORIZE_PROMPT = 'You are a categorization assistant. Given an idea or note, return ONLY one of these categories as a single lowercase word: feature, ux, marketing, bug, other. Nothing else — just the single word.'

// Module-level cache: persists across component mounts so deleted ideas
// don't reappear when navigating away and back.
const ideasCache = new Map<string, Idea[]>()

// In-flight fetch deduplication: prevents double-fetching when two
// component instances mount simultaneously for the same projectId.
const inFlightFetches = new Map<string, Promise<void>>()

export function useIdeas(projectId: string) {
  const [ideas, setIdeas] = useState<Idea[]>(() => ideasCache.get(projectId) ?? [])

  // Always-current ref for rollback access without stale closures
  const ideasRef = useRef(ideas)
  useEffect(() => { ideasRef.current = ideas }, [ideas])

  // Helper: update state and keep cache in sync
  const update = useCallback((updater: (prev: Idea[]) => Idea[]) => {
    setIdeas(prev => {
      const next = updater(prev)
      ideasCache.set(projectId, next)
      return next
    })
  }, [projectId])

  const fetchIdeas = useCallback(async () => {
    if (!projectId) return

    // If an identical fetch is already in-flight, wait for it instead of starting a new one
    if (inFlightFetches.has(projectId)) {
      await inFlightFetches.get(projectId)
      return
    }

    const fetchPromise = (async () => {
      const { data } = await supabase
        .from('ideas')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      console.log('[fetch]', 'ideas', projectId, data?.length ?? 0, 'items')
      if (data) {
        ideasCache.set(projectId, data)
        setIdeas(data)
      }
    })()

    inFlightFetches.set(projectId, fetchPromise)
    try {
      await fetchPromise
    } finally {
      inFlightFetches.delete(projectId)
    }
  }, [projectId])

  useEffect(() => {
    // Skip fetch if cache already has data for this project
    if (!ideasCache.has(projectId)) {
      fetchIdeas()
    }
  }, [fetchIdeas, projectId])

  const categorizeInBackground = useCallback(async (ideaId: string, content: string) => {
    try {
      const raw = await callClaude(CATEGORIZE_PROMPT, content)
      const valid = ['feature', 'ux', 'marketing', 'bug', 'other']
      const category = valid.includes(raw.trim().toLowerCase()) ? raw.trim().toLowerCase() : 'other'
      await supabase.from('ideas').update({ ai_category: category }).eq('id', ideaId)
      update(prev => prev.map(i => i.id === ideaId ? { ...i, ai_category: category } : i))
    } catch {
      // Silent fail — AI categorization is best-effort
    }
  }, [update])

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
    update(prev => [optimistic, ...prev])

    const { data } = await supabase
      .from('ideas')
      .insert({ project_id: projectId, content })
      .select()
      .single()

    if (data) {
      update(prev => prev.map(i => i.id === tempId ? data : i))
      categorizeInBackground(data.id, content)
      addSnapshot(projectId, 'idea_added', {
        idea_id: data.id,
        content: data.content,
        category: data.category ?? 'idea',
      })
    } else {
      // Rollback if insert failed
      update(prev => prev.filter(i => i.id !== tempId))
    }
  }, [projectId, categorizeInBackground, update])

  const markConverted = useCallback(async (id: string): Promise<void> => {
    update(prev => prev.map(i => i.id === id ? { ...i, converted_to_task: true } : i))
    supabase.from('ideas').update({ converted_to_task: true }).eq('id', id)
  }, [update])

  const deleteIdea = useCallback(async (id: string): Promise<void> => {
    // Capture for rollback before removing
    const toRestore = ideasRef.current.find(i => i.id === id)
    console.log('[delete]', 'idea', id)

    // Optimistic remove
    update(prev => prev.filter(i => i.id !== id))

    const { error } = await supabase.from('ideas').delete().eq('id', id)
    console.log('[delete response]', 'idea', id, error)

    // Rollback on failure
    if (error && toRestore) {
      update(prev => {
        const next = [...prev, toRestore].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        return next
      })
    }
  }, [update])

  // ── Realtime subscription (scoped to project) ─────────────────────────────
  const realtimeOptions = useMemo(() => ({
    table: 'ideas',
    filter: `project_id=eq.${projectId}`,
    channelName: `realtime-ideas-${projectId}`,
  }), [projectId])

  useSupabaseRealtime<Idea>(realtimeOptions, {
    onInsert: (record) => {
      update(prev => {
        if (prev.some(i => i.id === record.id)) return prev
        return [record, ...prev]
      })
    },
    onUpdate: (record) => {
      update(prev => prev.map(i => i.id === record.id ? record : i))
    },
    onDelete: (old) => {
      if (old.id) update(prev => prev.filter(i => i.id !== old.id))
    },
  })

  return { ideas, addIdea, markConverted, deleteIdea }
}
