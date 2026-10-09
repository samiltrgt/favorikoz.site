import 'server-only'
import { createHash } from 'node:crypto'

export const RECOVERY_COOKIE = 'fk_password_recovery'
export const RECOVERY_MAX_AGE = 10 * 60

// Bind the short-lived recovery permission to the session verified by Supabase.
export function recoverySessionProof(accessToken: string): string {
  return createHash('sha256').update(accessToken).digest('hex')
}
