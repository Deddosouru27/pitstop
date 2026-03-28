import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface RealtimeHandlers<T extends object> {
  onInsert?: (record: T) => void
  onUpdate?: (record: T) => void
  onDelete?: (old: T) => void
}

interface RealtimeOptions {
  table: string
  filter?: string
  channelName: string
}

/**
 * Subscribes to Supabase Realtime postgres_changes for a table.
 * Handlers are kept in refs so they never cause resubscription.
 */
export function useSupabaseRealtime<T extends object>(
  options: RealtimeOptions,
  handlers: RealtimeHandlers<T>,
): void {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const { table, filter, channelName } = options

  useEffect(() => {
    const filterOpts: {
      event: '*'
      schema: 'public'
      table: string
      filter?: string
    } = { event: '*', schema: 'public', table }

    if (filter) filterOpts.filter = filter

    const channel = supabase
      .channel(channelName)
      .on<T>(
        'postgres_changes',
        filterOpts,
        (payload: RealtimePostgresChangesPayload<T>) => {
          console.log('realtime event:', payload.table, payload.eventType, payload.new)
          switch (payload.eventType) {
            case 'INSERT':
              handlersRef.current.onInsert?.(payload.new)
              break
            case 'UPDATE':
              handlersRef.current.onUpdate?.(payload.new)
              break
            case 'DELETE':
              handlersRef.current.onDelete?.(payload.old as T)
              break
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime]', channelName, 'subscribed')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, channelName])
}
