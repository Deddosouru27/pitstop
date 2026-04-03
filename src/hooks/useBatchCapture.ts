import { useState, useCallback } from 'react'

const INTAKE_URL = import.meta.env.VITE_INTAKE_URL as string | undefined

function isValidUrl(s: string): boolean {
  return /^https?:\/\/.+/i.test(s.trim())
}

export function parseUrlLines(raw: string): string[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(isValidUrl)
}

export interface BatchResult {
  url: string
  ok: boolean
  notification?: string
  error?: string
}

export type BatchStatus = 'idle' | 'running' | 'done'

export function useBatchCapture() {
  const [status, setStatus] = useState<BatchStatus>('idle')
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const [results, setResults] = useState<BatchResult[]>([])

  const run = useCallback(async (urls: string[]) => {
    if (!INTAKE_URL || urls.length === 0) return
    setStatus('running')
    setProgress({ current: 0, total: urls.length })
    setResults([])

    const batchResults: BatchResult[] = []

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      setProgress({ current: i + 1, total: urls.length })
      try {
        const res = await fetch(`${INTAKE_URL}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        if (!res.ok) {
          batchResults.push({ url, ok: false, error: `HTTP ${res.status}` })
        } else {
          const data = await res.json() as { notification?: string; status?: string }
          batchResults.push({ url, ok: true, notification: data.notification ?? data.status })
        }
      } catch (e) {
        batchResults.push({ url, ok: false, error: e instanceof Error ? e.message : 'Network error' })
      }
      setResults([...batchResults])
    }

    setStatus('done')
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setProgress({ current: 0, total: 0 })
    setResults([])
  }, [])

  return { status, progress, results, run, reset }
}
