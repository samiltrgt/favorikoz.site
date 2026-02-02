import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createEArchiveInvoice, isNesConfigured } from '@/lib/nes'

/**
 * POST /api/nes/invoice-retry
 * Body: { "orderNumber": "ORD-1770051008155-7IP3ZWPAJBX" }
 * veya query: ?orderNumber=ORD-...
 *
 * Ödeme tamamlanmış ama fatura kesilmemiş sipariş için NES e-arşiv fatura oluşturmayı dener.
 * Geliştirme ortamında doğrudan; canlıda NES_INVOICE_RETRY_SECRET eşleşmeli (isteğe bağlı).
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.NES_INVOICE_RETRY_SECRET
    if (secret) {
      const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.nextUrl.searchParams.get('secret')
      if (auth !== secret) {
        return NextResponse.json({ success: false, error: 'Yetkisiz' }, { status: 401 })
      }
    }

    let orderNumber =
      request.nextUrl.searchParams.get('orderNumber') ||
      (await request.json().catch(() => ({}))).orderNumber
    if (!orderNumber || typeof orderNumber !== 'string') {
      return NextResponse.json({ success: false, error: 'orderNumber gerekli' }, { status: 400 })
    }
    orderNumber = orderNumber.trim()

    if (!isNesConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'NES yapılandırılmamış. NES_API_BASE_URL, NES_API_KEY ve NES_MARKETPLACE_ID kontrol edin.',
      }, { status: 400 })
    }

    const supabase = await createSupabaseServer()
    const { data: orderRow, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single()

    if (fetchError || !orderRow) {
      return NextResponse.json({ success: false, error: 'Sipariş bulunamadı' }, { status: 404 })
    }
    if (orderRow.status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Sipariş ödenmemiş; sadece paid siparişler için fatura kesilir.' }, { status: 400 })
    }
    if (orderRow.invoice_uuid) {
      return NextResponse.json({
        success: true,
        message: 'Fatura zaten mevcut',
        invoice_uuid: orderRow.invoice_uuid,
        invoice_pdf_url: orderRow.invoice_pdf_url || undefined,
      })
    }

    const shipping = (orderRow.shipping_address as { address?: string; city?: string; zipcode?: string }) || {}
    const items = (orderRow.items as Array<{ name: string; price: number; quantity: number }>) || []
    const orderForInvoice = {
      id: orderRow.id,
      order_number: orderRow.order_number,
      customer_name: orderRow.customer_name,
      customer_email: orderRow.customer_email,
      customer_phone: orderRow.customer_phone,
      customer_tc: orderRow.customer_tc,
      shipping_address: shipping,
      items,
      subtotal: orderRow.subtotal,
      shipping_cost: orderRow.shipping_cost,
      total: orderRow.total,
      created_at: orderRow.created_at,
    }

    const invoiceResult = await createEArchiveInvoice(orderForInvoice)
    if (!invoiceResult.success) {
      return NextResponse.json({
        success: false,
        error: invoiceResult.error,
        message: 'NES fatura oluşturamadı. Sunucu loglarına ve NES endpoint/payload dokümantasyonuna bakın.',
      }, { status: 502 })
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        invoice_uuid: invoiceResult.uuid,
        invoice_pdf_url: invoiceResult.pdfUrl || null,
        invoiced_at: new Date().toISOString(),
      })
      .eq('order_number', orderNumber)

    if (updateError) {
      console.error('Fatura güncelleme hatası:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Fatura NES\'te oluştu ama sipariş güncellenemedi: ' + updateError.message,
        invoice_uuid: invoiceResult.uuid,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Fatura oluşturuldu ve siparişe kaydedildi',
      invoice_uuid: invoiceResult.uuid,
      invoice_pdf_url: invoiceResult.pdfUrl || undefined,
    })
  } catch (err: any) {
    console.error('invoice-retry error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
