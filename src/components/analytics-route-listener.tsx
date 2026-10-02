'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView } from '@/lib/analytics/datalayer'
import { captureTrackingFromUrl } from '@/lib/analytics/tracking'

/** App Router SPA geçişlerinde PageView + tıklama kimliği yakalama */
export default function AnalyticsRouteListener() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    const search = searchParams?.toString() ? `?${searchParams.toString()}` : ''
    const path = `${pathname}${search}`
    captureTrackingFromUrl(search)
    if (lastPath.current === path) return
    lastPath.current = path
    trackPageView(path)
  }, [pathname, searchParams])

  return null
}
