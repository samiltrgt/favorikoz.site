/**
 * NES Portal e-Arşiv Fatura API
 * Token alır, e-arşiv fatura oluşturur.
 * Endpoint ve alan isimleri NES dokümantasyonuna göre güncellenebilir.
 */

const NES_BASE = process.env.NES_API_BASE_URL || ''
const NES_API_KEY = process.env.NES_API_KEY || ''
const NES_CLIENT_ID = process.env.NES_CLIENT_ID || ''
const NES_CLIENT_SECRET = process.env.NES_CLIENT_SECRET || ''
const NES_TOKEN_PATH = process.env.NES_TOKEN_PATH || '/token'
const NES_INVOICE_PATH = process.env.NES_INVOICE_PATH || '/api/v1/earchive/invoices'
const NES_ENABLED = process.env.NES_INVOICE_ENABLED !== 'false'

export function isNesConfigured(): boolean {
  const hasApiKey = !!NES_API_KEY
  const hasOAuth = !!NES_CLIENT_ID && !!NES_CLIENT_SECRET
  return NES_ENABLED && !!NES_BASE && (hasApiKey || hasOAuth)
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getToken(): Promise<string> {
  if (NES_API_KEY) return NES_API_KEY
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }
  const url = `${NES_BASE.replace(/\/$/, '')}${NES_TOKEN_PATH}`
  const formBody = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: NES_CLIENT_ID,
    client_secret: NES_CLIENT_SECRET,
  }).toString()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`NES token failed ${res.status}: ${text}`)
  }
  const data = (await res.json()) as { access_token?: string; token?: string; expires_in?: number }
  const token = data.access_token || data.token
  if (!token) throw new Error('NES token response missing access_token')
  const expiresIn = (data.expires_in ?? 3600) * 1000
  cachedToken = { token, expiresAt: Date.now() + expiresIn }
  return token
}

export type OrderForInvoice = {
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone?: string | null
  customer_tc?: string | null
  shipping_address: { address?: string; city?: string; zipcode?: string }
  items: Array<{ name: string; price: number; quantity: number }>
  subtotal: number
  shipping_cost: number
  total: number
}

function buildNesPayload(order: OrderForInvoice): Record<string, unknown> {
  const shipping = order.shipping_address || {}
  const addressLine = [shipping.address, shipping.city, shipping.zipcode].filter(Boolean).join(', ')
  const kdvRate = 18
  const items = (order.items || []).map((item) => {
    const unitPriceTL = item.price / 100
    const lineTotal = unitPriceTL * item.quantity
    const kdvTutar = Math.round((lineTotal * (kdvRate / 100)) * 100) / 100
    return {
      malHizmet: item.name?.slice(0, 200) || 'Ürün',
      miktar: item.quantity,
      birimFiyat: Number(unitPriceTL.toFixed(2)),
      kdvOrani: kdvRate,
      kdvTutar,
      tutar: Math.round(lineTotal * 100) / 100,
    }
  })
  if (order.shipping_cost > 0) {
    const kargoTL = order.shipping_cost / 100
    const kargoKdv = Math.round((kargoTL * (kdvRate / 100)) * 100) / 100
    items.push({
      malHizmet: 'Kargo',
      miktar: 1,
      birimFiyat: Number(kargoTL.toFixed(2)),
      kdvOrani: kdvRate,
      kdvTutar: kargoKdv,
      tutar: Number(kargoTL.toFixed(2)),
    })
  }
  const toplamTutar = order.total / 100
  const kdvToplam = Math.round((toplamTutar * (kdvRate / (100 + kdvRate))) * 100) / 100
  return {
    faturaNo: order.order_number,
    faturaTarihi: new Date().toISOString().slice(0, 10),
    aliciAdi: (order.customer_name || '').slice(0, 200),
    aliciAdres: addressLine.slice(0, 500) || 'Adres belirtilmemiş',
    aliciIl: (shipping as { city?: string }).city || '',
    aliciIlce: '',
    aliciVergiNo: order.customer_tc || '',
    aliciTcKimlikNo: order.customer_tc || '',
    aliciEposta: order.customer_email || '',
    aliciTelefon: order.customer_phone || '',
    paraBirimi: 'TRY',
    kalemler: items,
    toplamTutar: Number(toplamTutar.toFixed(2)),
    kdvToplam: Number(kdvToplam.toFixed(2)),
    odenecekTutar: Number(toplamTutar.toFixed(2)),
  }
}

export type CreateInvoiceResult = { success: true; uuid: string; pdfUrl?: string } | { success: false; error: string }

export async function createEArchiveInvoice(order: OrderForInvoice): Promise<CreateInvoiceResult> {
  if (!isNesConfigured()) {
    return { success: false, error: 'NES API yapılandırılmamış' }
  }
  try {
    const token = await getToken()
    const url = `${NES_BASE.replace(/\/$/, '')}${NES_INVOICE_PATH}`
    const payload = buildNesPayload(order)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    let data: Record<string, unknown> = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      // ignore
    }
    if (!res.ok) {
      const errMsg = (data as { message?: string }).message || (data as { error?: string }).error || text || res.statusText
      console.error('NES e-arşiv fatura hatası:', res.status, errMsg, data)
      return { success: false, error: String(errMsg) }
    }
    const uuid = (data as { uuid?: string }).uuid ?? (data as { id?: string }).id ?? (data as { faturaUuid?: string }).faturaUuid
    const pdfUrl = (data as { pdfUrl?: string }).pdfUrl ?? (data as { pdf_url?: string }).pdf_url ?? (data as { faturaPdfUrl?: string }).faturaPdfUrl
    if (uuid) {
      return { success: true, uuid: String(uuid), pdfUrl: pdfUrl ? String(pdfUrl) : undefined }
    }
    return { success: false, error: 'NES yanıtında fatura UUID bulunamadı' }
  } catch (err: any) {
    console.error('NES createEArchiveInvoice error:', err)
    return { success: false, error: err?.message || 'Fatura oluşturulamadı' }
  }
}
