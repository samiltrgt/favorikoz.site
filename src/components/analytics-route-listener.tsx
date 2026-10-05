'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView } from '@/lib/analytics/datalayer'
import { captureTrackingFromUrl } from '@/lib/analytics/tracking'
import { useConsentedTracking } from '@/lib/analytics/use-consented-tracking'
import { useEffect } from 'react'
import { initializeTrackingConsent } from '@/lib/analytics/consent'

/** App Router SPA geçişlerinde PageView + tıklama kimliği yakalama */
export default function AnalyticsRouteListener() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : ''
  const path = `${pathname}${search}`
  useEffect(() => {
    const sync = () => { void initializeTrackingConsent() }
    sync()
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.removeEventListener('online', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [path])
  useConsentedTracking(path, (channels) => {
    if (pathname?.startsWith('/admin')) return false
    captureTrackingFromUrl(search)
    return trackPageView(path, undefined, channels)
  })

  return null
}
