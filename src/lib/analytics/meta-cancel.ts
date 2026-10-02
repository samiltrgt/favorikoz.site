/**
 * Meta iade/iptal düzeltmesi.
 *
 * Resmi CAPI / Events Manager dokümanında Purchase'ı geri alan standart
 * bir "Refund" / negatif Purchase olayı doğrulanamadı (2026-03).
 * Negatif Purchase uydurulmaz (plan yasağı).
 *
 * Özel "Refund" custom event ROAS'ı geri almaz; sahte sinyal riski yüksek.
 * Bu yüzden Meta tarafında otomatik olay BASILMAZ.
 */

import { devWarn } from '@/lib/logger'

export function noteMetaCancelUnverified(orderNumber: string) {
  devWarn(
    '[meta-cancel] Meta Purchase geri alma olayı doğrulanamadı — otomatik CAPI iade gönderilmedi',
    orderNumber
  )
}
