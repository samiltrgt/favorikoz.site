'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  applyConsentChoice,
  pushConsentUpdate,
  readConsentCookie,
  signalsFromState,
} from '@/lib/analytics/consent'

/**
 * LCP'yi geciktirmemek için: ilk paint sonrası (requestIdleCallback / timeout) gösterilir.
 * Varsayılan Consent Mode denied — inline script layout'ta GTM'den ÖNCE set edilir.
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const existing = readConsentCookie()
    if (existing) {
      // Önceki tercihi her sayfada Consent Mode'a uygula
      pushConsentUpdate(existing)
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

  if (!visible) return null

  const choose = (state: 'granted' | 'denied') => {
    applyConsentChoice(state)
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
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
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

/** Sunucu/SSR için kullanılmaz — tip yardımcı */
export function consentDefaultSnippet(): string {
  const denied = signalsFromState('denied')
  return `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',${JSON.stringify({
    ...denied,
    wait_for_update: 500,
  })});
(function(){
  try {
    var m = document.cookie.match(/(?:^|; )fk_consent=([^;]*)/);
    var v = m && m[1];
    if (v === 'granted' || v === 'denied') {
      gtag('consent','update',{
        ad_storage:v, analytics_storage:v, ad_user_data:v, ad_personalization:v
      });
    }
  } catch(e){}
})();
`.trim()
}
