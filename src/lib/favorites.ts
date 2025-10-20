const FAV_KEY = 'favorites'

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(FAV_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setFavorites(ids: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(FAV_KEY, JSON.stringify(ids))
}

export function toggleFavorite(id: string) {
  const favs = new Set(getFavorites())
  if (favs.has(id)) favs.delete(id)
  else favs.add(id)
  setFavorites(Array.from(favs))
  return favs.has(id)
}

export function isFavorite(id: string) {
  return getFavorites().includes(id)
}


