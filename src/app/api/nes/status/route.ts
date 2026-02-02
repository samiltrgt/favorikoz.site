import { NextResponse } from 'next/server'
import { isNesConfigured } from '@/lib/nes'

/**
 * GET /api/nes/status
 * NES e-arşiv yapılandırmasının okunup okunmadığını kontrol eder.
 * Ödeme/fatura testi öncesi hızlı kontrol için.
 */
export async function GET() {
  const configured = isNesConfigured()
  return NextResponse.json({
    success: true,
    nesConfigured: configured,
    message: configured
      ? 'NES e-arşiv yapılandırıldı; ödeme başarılı olunca fatura kesilecek.'
      : 'NES yapılandırılmamış (NES_API_BASE_URL + NES_API_KEY veya NES_CLIENT_ID/SECRET gerekli).',
  })
}
