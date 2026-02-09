import { NextRequest, NextResponse } from 'next/server'
import { getNesInvoicePdfUrl, isNesConfigured } from '@/lib/nes'

/**
 * GET /api/nes/invoice-pdf?uuid=...
 * NES Portal: GET /earchive/v1/invoices/{uuid}/pdf (e-arşiv faturaları için)
 * Swagger: https://apitest.nes.com.tr/earchive/index.html
 * https://developertest.nes.com.tr/docs/
 * Bearer token ile NES'ten PDF alır ve stream eder.
 */
export async function GET(request: NextRequest) {
  const uuid = request.nextUrl.searchParams.get('uuid')
  if (!uuid) {
    return NextResponse.json({ error: 'uuid gerekli' }, { status: 400 })
  }
  if (!isNesConfigured()) {
    return NextResponse.json({ error: 'NES yapılandırılmamış' }, { status: 503 })
  }
  const url = getNesInvoicePdfUrl(uuid)
  if (!url) {
    return NextResponse.json({ error: 'NES yapılandırılmamış' }, { status: 503 })
  }
  const NES_API_KEY = process.env.NES_API_KEY || ''
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${NES_API_KEY}` },
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('NES PDF hatası:', res.status, text)
      return NextResponse.json({ error: 'Fatura PDF alınamadı' }, { status: res.status === 404 ? 404 : 502 })
    }
    const blob = await res.blob()
    const contentType = res.headers.get('content-type') || 'application/pdf'
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="fatura-${uuid}.pdf"`,
      },
    })
  } catch (err) {
    console.error('NES invoice-pdf error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
