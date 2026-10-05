'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  applyConsentChoice,
  applyConsentPreferences,
  pushConsentUpdate,
  readConsentCookie,
  readConsentSignals,
  readSavedConsentSignals,
  initializeTrackingConsent,
} from '@/lib/analytics/consent'

/**
 * LCP'yi geciktirmemek için: ilk paint sonrası (requestIdleCallback / timeout) gösterilir.
 * Varsayılan Consent Mode denied — inline script layout'ta GTM'den ÖNCE set edilir.
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const existing = readConsentCookie()
    if (existing) {
      // Önceki tercihi her sayfada Consent Mode'a uygula
      const saved = readSavedConsentSignals()
      setAnalytics(saved.analytics_storage === 'granted')
      setMarketing(saved.ad_storage === 'granted')
      pushConsentUpdate(readConsentSignals(), saved)
      void initializeTrackingConsent()
      return
    }

    const show = () => setVisible(true)
    let idleId: number | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    if (typeof w.requestIdleCallback === 'function') {
      idleId = w.requestIdleCallback(show, { timeout: 2500 })
    } else {
      timeoutId = setTimeout(show, 1200)
    }

    return () => {
      if (idleId != null) w.cancelIdleCallback?.(idleId)
      if (timeoutId != null) clearTimeout(timeoutId)
    }
  }, [])

  if (!visible) return (
    <button type="button" onClick={() => setVisible(true)} className="fixed bottom-2 right-2 z-[99] rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-xs text-gray-600 shadow-sm">
      Çerez tercihleri
    </button>
  )

  const choose = (state: 'granted' | 'denied') => {
    applyConsentChoice(state)
    setAnalytics(state === 'granted')
    setMarketing(state === 'granted')
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Çerez tercihleri"
      className="fixed bottom-0 inset-x-0 z-[100] p-4 pointer-events-none"
    >
      <div className="mx-auto max-w-3xl pointer-events-auto rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-sm shadow-lg p-4 md:p-5">
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          Deneyiminizi iyileştirmek ve reklam performansını ölçmek için çerez kullanıyoruz.
          Pazarlama çerezleri yalnızca onayınızla etkinleşir. Ayrıntılar için{' '}
          <Link href="/cerez-politikasi" className="underline text-black hover:text-gray-700">
            Çerez Politikası
          </Link>
          .
        </p>
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
            Analitik ölçüm
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />
            Reklam ve kişiselleştirme
          </label>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => { applyConsentPreferences({ analytics, marketing }); setVisible(false) }}
            className="px-4 py-2.5 text-sm rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
          >
            Tercihleri kaydet
          </button>
          <button
            type="button"
            onClick={() => choose('denied')}
            className="px-4 py-2.5 text-sm rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
          >
            Reddet
          </button>
          <button
            type="button"
            onClick={() => choose('granted')}
            className="px-4 py-2.5 text-sm rounded-lg bg-black text-white hover:bg-gray-800"
          >
            Kabul et
          </button>
        </div>
      </div>
    </div>
  )
}
