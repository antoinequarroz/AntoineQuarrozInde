import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient> | null = null

export function useSupabaseClient() {
  if (client) return client

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseAnonKey || config.public.supabasePublishableKey

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Supabase client config is missing' })
  }

  client = createClient(supabaseUrl, supabaseKey)
  return client
}
