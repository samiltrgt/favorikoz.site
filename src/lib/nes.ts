/**
 * NES Portal E-Invoice API (v1 Swagger)
 * Base path: /einvoice
 * Fatura: POST /v1/uploads/marketplaces/{id}/orders/createinvoice
 * Yetki: Bearer NES_API_KEY
 */

const NES_BASE = (process.env.NES_API_BASE_URL || '').replace(/\/$/, '')
const NES_API_KEY = process.env.NES_API_KEY || ''
const NES_EINVOICE_PATH = process.env.NES_EINVOICE_PATH || '/einvoice'
const NES_MARKETPLACE_ID = process.env.NES_MARKETPLACE_ID || ''
const NES_ENABLED = process.env.NES_INVOICE_ENABLED !== 'false'

export function isNesConfigured(): boolean {
  return NES_ENABLED && !!NES_BASE && !!NES_API_KEY && !!NES_MARKETPLACE_ID
}

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

/** NES CreateInvoicesFromMarketPlaceOrdersDto */
function buildNesPayload(order: OrderForInvoice): Record<string, unknown> {
  const orderDate = order.created_at ? new Date(order.created_at) : new Date()
  const iso = orderDate.toISOString()
  return {
    beginDate: iso,
    endDate: iso,
    page: 1,
    pageSize: 1,
    orders: [
      {
        orderId: order.id || null,
        orderNumber: order.order_number,
        documentSerie: null,
        documentTemplate: null,
        receiverAlias: null,
        isEArchive: true,
      },
    ],
  }
}

export type CreateInvoiceResult = { success: true; uuid: string; pdfUrl?: string } | { success: false; error: string }

export async function createEArchiveInvoice(order: OrderForInvoice): Promise<CreateInvoiceResult> {
  if (!isNesConfigured()) {
    return { success: false, error: 'NES API yapılandırılmamış (NES_API_BASE_URL, NES_API_KEY, NES_MARKETPLACE_ID)' }
  }
  const url = `${NES_BASE}${NES_EINVOICE_PATH}/v1/uploads/marketplaces/${NES_MARKETPLACE_ID}/orders/createinvoice`
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
    const first = arr[0] as { uuid?: string; isSucceded?: boolean; errorMessage?: string } | undefined
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
    const pdfUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/nes/invoice-pdf?uuid=${encodeURIComponent(uuid)}` : undefined
    return { success: true, uuid: String(uuid), pdfUrl }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fatura oluşturulamadı'
    console.error('NES createEArchiveInvoice error:', err)
    return { success: false, error: message }
  }
}
