import { StrictMode } from 'react'
import { act, render } from '@testing-library/react'
import ProductViewTracker from '@/components/product-view-tracker'
import { applyConsentChoice, applyConsentPreferences } from '@/lib/analytics/consent'

beforeEach(() => {
  for (const cookie of document.cookie.split(';')) document.cookie = `${cookie.trim().split('=')[0]}=; Path=/; Max-Age=0`
  window.dataLayer = []
  delete window.fkTagConfig
  delete window.gtag
  delete window.fbq
  jest.mocked(fetch).mockResolvedValue(new Response('{}'))
})

const eventNames = () => (window.dataLayer || []).map((row: any) => row.event).filter((event) => event === 'ViewContent' || event === 'view_item')

it('tracks a currently viewed product after late consent, once even under Strict Mode', async () => {
  render(<StrictMode><ProductViewTracker productId="product-1" name="Serum" price={100} /></StrictMode>)
  expect(eventNames()).toEqual([])
  await act(() => applyConsentChoice('granted'))
  expect(eventNames()).toEqual(['ViewContent', 'view_item'])
  await act(() => applyConsentChoice('granted'))
  expect(eventNames()).toEqual(['ViewContent', 'view_item'])
})

it('later marketing acceptance sends only the newly permitted channel', async () => {
  await applyConsentPreferences({ analytics: true, marketing: false })
  render(<ProductViewTracker productId="product-1" name="Serum" price={100} />)
  expect(eventNames()).toEqual(['view_item'])
  await act(() => applyConsentPreferences({ analytics: true, marketing: true }))
  expect(eventNames()).toEqual(['view_item', 'ViewContent'])
})

it('tracks a different product when App Router reuses the component', async () => {
  await applyConsentChoice('granted')
  const { rerender } = render(<ProductViewTracker productId="product-1" name="Serum" price={100} />)
  rerender(<ProductViewTracker productId="product-2" name="Cream" price={150} />)
  expect(eventNames()).toEqual(['ViewContent', 'view_item', 'ViewContent', 'view_item'])
  const meta = (window.dataLayer || []).filter((row: any) => row.event === 'ViewContent') as any[]
  expect(meta[0].content_ids).toEqual(['product-1'])
  expect(meta[1].content_ids).toEqual(['product-2'])
  expect(meta[0].eventID).not.toBe(meta[1].eventID)
})
