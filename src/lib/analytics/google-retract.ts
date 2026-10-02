/**
 * Google Ads conversion adjustment — RETRACT (iptal/iade).
 * order_id = order_number (Purchase transaction_id ile aynı).
 *
 * Env (yoksa atlanır, ödeme/admin akışı bozulmaz):
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GOOGLE_ADS_REFRESH_TOKEN
 *   GOOGLE_ADS_CUSTOMER_ID          (xxx-xxx-xxxx veya sadece rakam)
 *   GOOGLE_ADS_CONVERSION_ACTION_ID (conversions/123... veya sadece id)
 *
 * Kaynak: https://developers.google.com/google-ads/api/docs/conversions/upload-adjustments
 */

import { devLog, devWarn } from '@/lib/logger'

export async function retractGoogleConversion(orderNumber: string): Promise<void> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim()
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim()
  const customerIdRaw = process.env.GOOGLE_ADS_CUSTOMER_ID?.trim()
  const conversionActionRaw = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID?.trim()

  if (
    !developerToken ||
    !clientId ||
    !clientSecret ||
    !refreshToken ||
    !customerIdRaw ||
    !conversionActionRaw
  ) {
    devWarn(
      '[google-retract] Google Ads API env eksik — RETRACT atlandı (order:',
      orderNumber,
      ')'
    )
    return
  }

  const customerId = customerIdRaw.replace(/-/g, '')
  const conversionAction = conversionActionRaw.startsWith('customers/')
    ? conversionActionRaw
    : conversionActionRaw.includes('conversionActions/')
      ? `customers/${customerId}/${conversionActionRaw.replace(/^\/+/, '')}`
      : `customers/${customerId}/conversionActions/${conversionActionRaw}`

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!tokenRes.ok) {
      console.error('[google-retract] OAuth token hatası', await tokenRes.text())
      return
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string }
    if (!tokenJson.access_token) {
      console.error('[google-retract] access_token yok')
      return
    }

    const adjustmentDateTime = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace(/\.\d{3}Z$/, '+00:00')

    const body = {
      conversionAdjustments: [
        {
          adjustmentType: 'RETRACT',
          conversionAction,
          adjustmentDateTime,
          orderId: orderNumber,
        },
      ],
      partialFailure: true,
    }

    const url = `https://googleads.googleapis.com/v17/customers/${customerId}:uploadConversionAdjustments`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenJson.access_token}`,
        'developer-token': developerToken,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error('[google-retract] RETRACT hatası', res.status, await res.text())
      return
    }
    devLog('[google-retract] RETRACT gönderildi', orderNumber)
  } catch (err) {
    console.error('[google-retract] RETRACT exception', orderNumber, err)
  }
}

export function tryRetractGoogleConversion(orderNumber: string | null | undefined) {
  if (!orderNumber) return
  void retractGoogleConversion(orderNumber).catch((err) => {
    console.error('[google-retract] tryRetract', orderNumber, err)
  })
}
