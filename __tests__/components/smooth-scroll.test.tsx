import { act, render, screen } from '@testing-library/react'
import SmoothScroll from '@/components/smooth-scroll'

const mockDestroy = jest.fn()
const mockLenis = jest.fn().mockImplementation(() => ({ on: jest.fn(), off: jest.fn(), raf: jest.fn(), destroy: mockDestroy }))
jest.mock('lenis', () => ({ __esModule: true, default: function (...args: any[]) { return mockLenis(...args) } }))
jest.mock('gsap', () => ({ gsap: { registerPlugin: jest.fn(), ticker: { add: jest.fn(), remove: jest.fn(), lagSmoothing: jest.fn() } } }))
jest.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { update: jest.fn() } }))

describe('SmoothScroll progressive enhancement', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    Object.defineProperty(document, 'readyState', { configurable: true, value: 'loading' })
    window.matchMedia = jest.fn().mockImplementation(query => ({ matches: false, media: query }))
  })
  afterEach(() => jest.useRealTimers())

  it('shows children immediately, waits for window load, and disposes desktop smoothing', async () => {
    const { unmount } = render(<SmoothScroll><p>Ürünler</p></SmoothScroll>)
    expect(screen.getByText('Ürünler')).toBeVisible()
    expect(mockLenis).not.toHaveBeenCalled()
    await act(async () => { window.dispatchEvent(new Event('load')); jest.runOnlyPendingTimers() })
    expect(mockLenis).toHaveBeenCalledTimes(1)
    expect(window.__lenis).toBeDefined()
    unmount()
    expect(mockDestroy).toHaveBeenCalledTimes(1)
    expect(window.__lenis).toBeUndefined()
  })

  it.each(['(pointer: coarse)', '(prefers-reduced-motion: reduce)'])('retains native scrolling for %s', async query => {
    window.matchMedia = jest.fn().mockImplementation(value => ({ matches: value === query, media: value }))
    render(<SmoothScroll><p>Ürünler</p></SmoothScroll>)
    await act(async () => { window.dispatchEvent(new Event('load')); jest.runOnlyPendingTimers() })
    expect(mockLenis).not.toHaveBeenCalled()
    expect(screen.getByText('Ürünler')).toBeVisible()
  })

  it('does not initialize after unmount before load', async () => {
    const { unmount } = render(<SmoothScroll><p>Ürünler</p></SmoothScroll>)
    unmount()
    await act(async () => { window.dispatchEvent(new Event('load')); jest.runOnlyPendingTimers() })
    expect(mockLenis).not.toHaveBeenCalled()
  })
})
