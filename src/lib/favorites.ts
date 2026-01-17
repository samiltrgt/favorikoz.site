// Cache for favorites to avoid repeated API calls
let favoritesCache: string[] | null = null
let favoritesCachePromise: Promise<string[]> | null = null

// Get user's favorites from API
export async function getFavorites(): Promise<string[]> {
  if (typeof window === 'undefined') return []
  
  // Return cached favorites if available
  if (favoritesCache !== null) {
    return favoritesCache
  }
  
  // If there's already a request in progress, return that promise
  if (favoritesCachePromise) {
    return favoritesCachePromise
  }
  
  // Fetch favorites from API
  favoritesCachePromise = (async () => {
    try {
      const response = await fetch('/api/favorites')
      const result = await response.json()
      
      if (result.success) {
        favoritesCache = result.favorites || []
        return favoritesCache
      } else {
        // If not authenticated, return empty array
        favoritesCache = []
        return []
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
      favoritesCache = []
      return []
    } finally {
      favoritesCachePromise = null
    }
  })()
  
  return favoritesCachePromise
}

// Clear favorites cache (call after adding/removing favorites)
export function clearFavoritesCache() {
  favoritesCache = null
  favoritesCachePromise = null
}

// Check if a product is favorited (async)
export async function isFavorite(id: string): Promise<boolean> {
  const favorites = await getFavorites()
  return favorites.includes(id)
}

// Toggle favorite status (async)
export async function toggleFavorite(id: string): Promise<{ success: boolean; isFavorite: boolean; error?: string }> {
  try {
    const favorites = await getFavorites()
    const isFav = favorites.includes(id)
    
    if (isFav) {
      // Remove from favorites
      const response = await fetch(`/api/favorites?product_id=${id}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (result.success) {
        clearFavoritesCache()
        // Dispatch event to update UI
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('favoritesUpdated'))
        }
        return { success: true, isFavorite: false }
      } else {
        return { success: false, isFavorite: true, error: result.error || 'Favorilerden çıkarılamadı' }
      }
    } else {
      // Add to favorites
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: id }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        clearFavoritesCache()
        // Dispatch event to update UI
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('favoritesUpdated'))
        }
        return { success: true, isFavorite: true }
      } else {
        return { success: false, isFavorite: false, error: result.error || 'Favorilere eklenemedi' }
      }
    }
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return { success: false, isFavorite: false, error: 'Bir hata oluştu' }
  }
}

// Synchronous version for initial render (returns false if not loaded yet)
// This is for components that need a quick check before async data loads
let syncFavoritesCache: string[] = []
export function isFavoriteSync(id: string): boolean {
  return syncFavoritesCache.includes(id)
}

// Initialize sync cache (call this on mount)
export async function initializeFavorites() {
  const favorites = await getFavorites()
  syncFavoritesCache = favorites
  return favorites
}

// Migrate localStorage favorites to database (call after login)
export async function migrateLocalStorageFavorites(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Get old favorites from localStorage
    const oldFavoritesKey = 'favorites'
    const raw = localStorage.getItem(oldFavoritesKey)
    if (!raw) return

    const oldFavorites: string[] = JSON.parse(raw)
    if (!Array.isArray(oldFavorites) || oldFavorites.length === 0) return

    // Get current database favorites
    const currentFavorites = await getFavorites()
    const currentSet = new Set(currentFavorites)

    // Add old favorites that aren't already in database
    let migrated = 0
    for (const productId of oldFavorites) {
      if (!currentSet.has(productId)) {
        try {
          const result = await toggleFavorite(productId)
          if (result.success) {
            migrated++
          }
        } catch (error) {
          console.error(`Error migrating favorite ${productId}:`, error)
        }
      }
    }

    // Clear localStorage favorites after successful migration
    if (migrated > 0) {
      localStorage.removeItem(oldFavoritesKey)
      console.log(`Migrated ${migrated} favorites from localStorage to database`)
    }
  } catch (error) {
    console.error('Error migrating localStorage favorites:', error)
  }
}


