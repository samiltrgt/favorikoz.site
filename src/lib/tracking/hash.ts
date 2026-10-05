import { createHash } from 'crypto'
export function hashNormalized(value: unknown, mode: 'text' | 'phone' | 'compact' = 'text'): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  let normalized = value.trim().toLowerCase()
  if (mode === 'compact') normalized = normalized.replace(/\s+/g, '')
  if (mode === 'phone') {
    normalized = normalized.replace(/\D/g, '')
    if (normalized.startsWith('00')) normalized = normalized.slice(2)
    if (normalized.startsWith('0')) normalized = normalized.slice(1)
    if (normalized.length === 10) normalized = `90${normalized}`
    if (!/^\d{10,15}$/.test(normalized)) return undefined
  }
  return createHash('sha256').update(normalized).digest('hex')
}
