import type { SupabaseClient } from '@supabase/supabase-js'

let clientPromise: Promise<SupabaseClient> | null = null

export function useSupabaseClient() {
  if (clientPromise) return clientPromise

  // Capture Nuxt's context before awaiting the SDK. Public pages share the
  // lightweight auth store but only private account actions need this client.
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseAnonKey || config.public.supabasePublishableKey

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Supabase client config is missing' })
  }

  clientPromise = import('@supabase/supabase-js')
    .then(({ createClient }) => createClient(supabaseUrl, supabaseKey))
    .catch((error) => {
      // A failed chunk load must not prevent a later login attempt.
      clientPromise = null
      throw error
    })
  return clientPromise
}
