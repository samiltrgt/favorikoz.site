import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '⚠️ SUPABASE ENVIRONMENT VARIABLES EKSİK!\n\n' +
      'Lütfen .env.local dosyasını düzenleyip şu değerleri ekle:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n' +
      'Detaylar için ENV_SETUP.md dosyasına bak.'
    )
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}

// Singleton instance for client-side usage
export const supabase = createSupabaseClient()

