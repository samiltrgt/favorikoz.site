import { createSupabaseServer } from '@/lib/supabase/server'
import AuthConfirmation from '@/components/auth-confirmation'

export const dynamic = 'force-dynamic'

export default async function ConfirmationPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase.auth.getUser()
  return <AuthConfirmation confirmed={!searchParams.error && !error && !!data.user?.email_confirmed_at} />
}
