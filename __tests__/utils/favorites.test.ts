import { getFavorites, clearFavoritesCache, toggleFavorite, isFavorite, initializeFavorites, isFavoriteSync } from '@/lib/favorites'

describe('favorites API and cache', () => {
  let mockFetch: jest.Mock
  const originalFetch = global.fetch
  function response(body: unknown) { return { json: async () => body } }

  beforeEach(() => {
    clearFavoritesCache()
    mockFetch = jest.fn()
    global.fetch = mockFetch
  })
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks() })

  it('shares an in-flight fetch and caches successful favorites', async () => {
    let complete!: (value: unknown) => void
    mockFetch.mockReturnValue(new Promise((resolve) => { complete = resolve }))
    const first = getFavorites()
    const second = getFavorites()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    complete(response({ success: true, favorites: ['p1', 'p2'] }))
    expect(await first).toEqual(['p1', 'p2'])
    expect(await second).toEqual(['p1', 'p2'])
    expect(await isFavorite('p1')).toBe(true)
    expect(await isFavorite('p3')).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('fetches fresh data after the cache is cleared', async () => {
    mockFetch.mockResolvedValueOnce(response({ success: true, favorites: ['p1'] }))
      .mockResolvedValueOnce(response({ success: true, favorites: ['p2'] }))
    expect(await getFavorites()).toEqual(['p1'])
    clearFavoritesCache()
    expect(await getFavorites()).toEqual(['p2'])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('returns no favorites when unauthenticated or when the request fails', async () => {
    mockFetch.mockResolvedValueOnce(response({ success: false }))
    expect(await getFavorites()).toEqual([])
    clearFavoritesCache()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockRejectedValueOnce(new Error('Network unavailable'))
    expect(await getFavorites()).toEqual([])
  })

  it('adds a favorite, invalidates the cache and notifies the UI', async () => {
    const changed = jest.fn()
    window.addEventListener('favoritesUpdated', changed)
    mockFetch.mockResolvedValueOnce(response({ success: true, favorites: [] }))
      .mockResolvedValueOnce(response({ success: true }))
      .mockResolvedValueOnce(response({ success: true, favorites: ['p1'] }))
    expect(await toggleFavorite('p1')).toEqual({ success: true, isFavorite: true })
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/favorites', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: 'p1' }),
    })
    expect(changed).toHaveBeenCalledTimes(1)
    expect(await getFavorites()).toEqual(['p1'])
    window.removeEventListener('favoritesUpdated', changed)
  })

  it('removes an existing favorite through DELETE', async () => {
    mockFetch.mockResolvedValueOnce(response({ success: true, favorites: ['p1'] }))
      .mockResolvedValueOnce(response({ success: true }))
    expect(await toggleFavorite('p1')).toEqual({ success: true, isFavorite: false })
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/favorites?product_id=p1', { method: 'DELETE' })
  })

  it('retains an existing favorite and cache after a rejected removal', async () => {
    mockFetch.mockResolvedValueOnce(response({ success: true, favorites: ['p1'] }))
      .mockResolvedValueOnce(response({ success: false, error: 'Rejected' }))
    expect(await toggleFavorite('p1')).toEqual({ success: false, isFavorite: true, error: 'Rejected' })
    expect(await isFavorite('p1')).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('loads the synchronous initial-render cache explicitly', async () => {
    mockFetch.mockResolvedValueOnce(response({ success: true, favorites: ['p1'] }))
    expect(await initializeFavorites()).toEqual(['p1'])
    expect(isFavoriteSync('p1')).toBe(true)
    expect(isFavoriteSync('p2')).toBe(false)
  })
})
