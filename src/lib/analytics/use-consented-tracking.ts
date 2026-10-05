'use client'

import { useEffect, useRef } from 'react'
import { CONSENT_CHANGED_EVENT, readConsentSignals } from './consent'
import type { AllowedBrowserChannels } from './datalayer'

/** Send each active-view channel once, including a channel first enabled later. */
export function useConsentedTracking(key: string, track: (channels: AllowedBrowserChannels) => boolean | void) {
  const sent = useRef({ key: '', analytics: false, marketing: false })
  useEffect(() => {
    if (sent.current.key !== key) sent.current = { key, analytics: false, marketing: false }
    const send = () => {
      const consent = readConsentSignals()
      const analytics = !sent.current.analytics && consent.analytics_storage === 'granted'
      const marketing = !sent.current.marketing && consent.ad_storage === 'granted'
      if (!analytics && !marketing) return
      const result = track({ analytics_allowed: analytics, marketing_allowed: marketing })
      if (result === false) return
      sent.current.analytics ||= analytics
      sent.current.marketing ||= marketing
    }
    send()
    window.addEventListener(CONSENT_CHANGED_EVENT, send)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, send)
  }, [key, track])
}
