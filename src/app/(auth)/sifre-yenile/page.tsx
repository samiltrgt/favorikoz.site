import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { RECOVERY_COOKIE, recoverySessionProof } from '@/lib/auth-email'
import ResetPasswordForm from '@/components/reset-password-form'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage({ searchParams }: { searchParams: { code?: string; token_hash?: string; type?: string } }) {
  // Older PKCE reset mails still point here; exchange them in the shared callback.
  if (searchParams.code) redirect(`/auth/callback?code=${encodeURIComponent(searchParams.code)}`)
  if (searchParams.token_hash) redirect(`/auth/callback?token_hash=${encodeURIComponent(searchParams.token_hash)}&type=${encodeURIComponent(searchParams.type || '')}`)
  const proof = cookies().get(RECOVERY_COOKIE)?.value
  let recoveryAuthorized = false
  if (proof) {
    const supabase = await createSupabaseServer()
    const { data: verified, error } = await supabase.auth.getUser()
    if (!error && verified.user) {
      const { data: { session } } = await supabase.auth.getSession()
      recoveryAuthorized = !!session && proof === recoverySessionProof(session.access_token)
    }
  }
  return <ResetPasswordForm recoveryAuthorized={recoveryAuthorized} />
}
