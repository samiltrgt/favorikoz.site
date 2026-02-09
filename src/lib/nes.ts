/**
 * NES Developer Portal – E-Fatura / E-Arşiv entegrasyonu
 *
 * Resmi dokümantasyon: https://developertest.nes.com.tr/docs/
 * - E-Fatura API, E-Arşiv API bölümleri
 * - Base path: /einvoice
 * - Yetkilendirme: Bearer token (NES_API_KEY)
 *
 * Bu modül: pazaryeri (marketplace) akışı ile e-arşiv fatura oluşturma ve PDF indirme.
 */

const NES_BASE = (process.env.NES_API_BASE_URL || '').replace(/\/$/, '')
const NES_API_KEY = process.env.NES_API_KEY || ''
const NES_EINVOICE_PATH = (process.env.NES_EINVOICE_PATH || '/einvoice').replace(/^\/+|\/+$/g, '') || 'einvoice'
const NES_EARCHIVE_PATH = (process.env.NES_EARCHIVE_PATH || '/earchive').replace(/^\/+|\/+$/g, '') || 'earchive'
const NES_MARKETPLACE_ID = (process.env.NES_MARKETPLACE_ID || '').trim()
const NES_INVOICE_ENABLED = process.env.NES_INVOICE_ENABLED !== 'false'

/** NES yapılandırması tam mı? (Portal’da tanımlı base URL, API key ve marketplace id gerekli) */
export function isNesConfigured(): boolean {
  return (
    NES_INVOICE_ENABLED &&
    NES_BASE.length > 0 &&
    NES_API_KEY.length > 0 &&
    NES_MARKETPLACE_ID.length > 0
  )
}

/** Uygulama tarafında fatura oluşturmak için kullandığımız sipariş verisi */
export type OrderForInvoice = {
  id?: string | null
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
  created_at?: string | null
}

/**
 * NES Portal – CreateInvoicesFromMarketPlaceOrdersDto uyumlu istek gövdesi.
 * Dokümantasyon: https://developertest.nes.com.tr/docs/ (E-Fatura / E-Arşiv API)
 */
interface NesCreateInvoiceRequest {
  beginDate: string   // ISO 8601
  endDate: string    // ISO 8601
  page: number
  pageSize: number
  orders: Array<{
    orderId: string | null
    orderNumber: string
    documentSerie: string | null
    documentTemplate: string | null
    receiverAlias: string | null
    isEArchive: boolean
  }>
}

/**
 * NES yanıtında dönen fatura kaydı (dizi içinde her sipariş için bir öğe).
 */
interface NesInvoiceResponseItem {
  uuid?: string
  isSucceded?: boolean
  errorMessage?: string
}

function buildNesPayload(order: OrderForInvoice): NesCreateInvoiceRequest {
  const orderDate = order.created_at ? new Date(order.created_at) : new Date()
  const iso = orderDate.toISOString()
  return {
    beginDate: iso,
    endDate: iso,
    page: 1,
    pageSize: 1,
    orders: [
      {
        orderId: order.id ?? null,
        orderNumber: order.order_number,
        documentSerie: null,
        documentTemplate: null,
        receiverAlias: null,
        isEArchive: true,
      },
    ],
  }
}

export type CreateInvoiceResult =
  | { success: true; uuid: string; pdfUrl?: string }
  | { success: false; error: string }

/**
 * NES Portal – e-arşiv fatura oluşturma
 *
 * Endpoint: POST /einvoice/v1/uploads/marketplaces/{marketplaceId}/orders/createinvoice
 * Dokümantasyon: https://developertest.nes.com.tr/docs/
 */
export async function createEArchiveInvoice(order: OrderForInvoice): Promise<CreateInvoiceResult> {
  if (!isNesConfigured()) {
    return {
      success: false,
      error:
        'NES API yapılandırılmamış (NES_API_BASE_URL, NES_API_KEY, NES_MARKETPLACE_ID). Portal: https://developertest.nes.com.tr/docs/',
    }
  }

  const path = `${NES_EINVOICE_PATH}/v1/uploads/marketplaces/${NES_MARKETPLACE_ID}/orders/createinvoice`
  const url = `${NES_BASE}/${path.replace(/^\/+/, '')}`

  const payload = buildNesPayload(order)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NES_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      // ignore
    }

    if (!res.ok) {
      const errMsg =
        (data as { message?: string })?.message ||
        (data as { error?: string })?.error ||
        text ||
        res.statusText
      console.error('NES e-arşiv fatura hatası:', res.status, errMsg, data)
      return { success: false, error: String(errMsg) }
    }

    const arr = Array.isArray(data) ? data : []
    const first = arr[0] as NesInvoiceResponseItem | undefined
    if (!first) {
      return { success: false, error: 'NES yanıtında fatura kaydı yok' }
    }
    if (first.isSucceded === false) {
      return { success: false, error: first.errorMessage || 'Fatura oluşturulamadı' }
    }
    const uuid = first.uuid
    if (!uuid) {
      return { success: false, error: 'NES yanıtında fatura UUID bulunamadı' }
    }

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')
    const pdfUrl = baseUrl
      ? `${baseUrl}/api/nes/invoice-pdf?uuid=${encodeURIComponent(String(uuid))}`
      : undefined

    return { success: true, uuid: String(uuid), pdfUrl }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fatura oluşturulamadı'
    console.error('NES createEArchiveInvoice error:', err)
    return { success: false, error: message }
  }
}

/**
 * NES Portal – e-arşiv fatura PDF endpoint’i (proxy için base URL üretir)
 * Gerçek çağrı: GET /earchive/v1/invoices/{uuid}/pdf
 * Swagger: https://apitest.nes.com.tr/earchive/index.html
 * Uygulama: GET /api/nes/invoice-pdf?uuid=... ile proxy edilir.
 */
export function getNesInvoicePdfUrl(uuid: string): string | null {
  if (!NES_BASE || !NES_API_KEY) return null
  // E-arşiv faturaları için PDF endpoint'i /earchive altında
  const path = `${NES_EARCHIVE_PATH}/v1/invoices/${encodeURIComponent(uuid)}/pdf`
  return `${NES_BASE}/${path.replace(/^\/+/, '')}`
}
