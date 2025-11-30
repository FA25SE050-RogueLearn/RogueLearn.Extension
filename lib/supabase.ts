import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function getEnv(key: string): string | undefined {
  const env = (import.meta as any).env || {}
  return env[key]
}

export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (client) return client
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
  const key = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY')
  client = createClient(url as string, key as string, { auth: { persistSession: false } })
  return client
}

export async function ensureSupabaseSession(accessToken?: string, refreshToken?: string): Promise<void> {
  const c = await getSupabaseClient()
  if (accessToken && refreshToken) {
    await c.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  }
}

export async function getCurrentSupabaseUser() {
  const c = await getSupabaseClient()
  const { data } = await c.auth.getUser()
  return data.user ?? null
}