import { supabase } from '../lib/supabase'

interface HealthCheckResult {
  status: 'ok' | 'error'
  latency: number
}

export async function healthCheck(): Promise<HealthCheckResult> {
  const start = performance.now()
  try {
    const { error } = await supabase.from('projects').select('id').limit(1)
    if (error) throw error
    const latency = Math.round(performance.now() - start)
    return { status: 'ok', latency }
  } catch {
    const latency = Math.round(performance.now() - start)
    return { status: 'error', latency }
  }
}
