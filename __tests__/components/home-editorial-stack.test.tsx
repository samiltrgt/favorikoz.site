import { act, fireEvent, render, screen } from '@testing-library/react'
import HomeEditorialStack from '@/components/home-editorial-stack'

jest.mock('@/components/BrandMarquee', () => ({ __esModule: true, default: () => <div>Markalar</div> }))
jest.mock('@/components/responsive-image', () => ({ __esModule: true, default: ({ priority, ...props }: any) => <img {...props} /> }))

describe('Campaign carousel scheduling', () => {
  let visibility: IntersectionObserverCallback
  const banners = [{ src: '/a.webp', href: '/a', alt: 'A' }, { src: '/b.webp', href: '/b', alt: 'B' }]
  beforeEach(() => {
    jest.useFakeTimers()
    Object.defineProperty(document, 'readyState', { configurable: true, value: 'loading' })
    window.matchMedia = jest.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() }))
    global.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) { visibility = callback }
      observe() {} disconnect() {} unobserve() {} takeRecords() { return [] }
      root = null; rootMargin = ''; thresholds = []
    }
  })
  afterEach(() => jest.useRealTimers())
  const show = (isIntersecting: boolean) => act(() => visibility([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver))
  const advance = () => act(() => { jest.advanceTimersByTime(6000) })
  const active = (number: number) => expect(screen.getByLabelText(`Banner ${number}`)).toHaveAttribute('aria-current', 'true')

  it('shows its first banner immediately and advances only after load while visible', () => {
    render(<HomeEditorialStack brands={[]} banners={banners} />)
    active(1)
    show(true)
    advance()
    active(1)
    act(() => { window.dispatchEvent(new Event('load')) })
    advance()
    active(2)
    show(false)
    advance()
    active(2)
    fireEvent.click(screen.getByLabelText('Önceki banner'))
    active(1)
  })

  it('pauses under keyboard focus even after the pointer leaves', () => {
    render(<HomeEditorialStack brands={[]} banners={banners} />)
    show(true)
    act(() => { window.dispatchEvent(new Event('load')) })
    const next = screen.getByLabelText('Sonraki banner')
    const carousel = screen.getByRole('region', { name: 'Kampanya bannerları' })
    fireEvent.focus(next)
    fireEvent.mouseEnter(carousel)
    fireEvent.mouseLeave(carousel)
    advance()
    active(1)
    fireEvent.blur(next)
    advance()
    active(2)
  })

  it('preserves manual controls with reduced motion', () => {
    window.matchMedia = jest.fn().mockImplementation(query => ({ matches: query.includes('reduced-motion'), media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() }))
    render(<HomeEditorialStack brands={[]} banners={banners} />)
    show(true)
    act(() => { window.dispatchEvent(new Event('load')) })
    advance()
    active(1)
    fireEvent.click(screen.getByLabelText('Sonraki banner'))
    active(2)
  })
})
