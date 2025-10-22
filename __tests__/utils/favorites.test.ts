import { getFavorites, setFavorites, toggleFavorite, isFavorite } from '@/lib/favorites'

describe('favorites utility', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('getFavorites', () => {
    it('should return empty array when no favorites exist', () => {
      expect(getFavorites()).toEqual([])
    })

    it('should return saved favorites from localStorage', () => {
      localStorage.setItem('favorites', JSON.stringify(['1', '2', '3']))
      expect(getFavorites()).toEqual(['1', '2', '3'])
    })

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('favorites', 'invalid json')
      expect(getFavorites()).toEqual([])
    })

    it('should handle null value in localStorage', () => {
      localStorage.removeItem('favorites')
      expect(getFavorites()).toEqual([])
    })
  })

  describe('setFavorites', () => {
    it('should save favorites to localStorage', () => {
      setFavorites(['1', '2', '3'])
      expect(localStorage.getItem('favorites')).toBe(JSON.stringify(['1', '2', '3']))
    })

    it('should overwrite existing favorites', () => {
      setFavorites(['1', '2'])
      setFavorites(['3', '4', '5'])
      expect(JSON.parse(localStorage.getItem('favorites')!)).toEqual(['3', '4', '5'])
    })

    it('should handle empty array', () => {
      setFavorites([])
      expect(localStorage.getItem('favorites')).toBe(JSON.stringify([]))
    })
  })

  describe('toggleFavorite', () => {
    it('should add product to favorites when not present', () => {
      const result = toggleFavorite('1')
      expect(result).toBe(true) // Returns true because item was added
      expect(getFavorites()).toContain('1')
    })

    it('should remove product from favorites when present', () => {
      setFavorites(['1', '2', '3'])
      const result = toggleFavorite('2')
      expect(result).toBe(false) // Returns false because item was removed
      expect(getFavorites()).toEqual(['1', '3'])
    })

    it('should handle toggling multiple times', () => {
      toggleFavorite('1') // Add
      expect(getFavorites()).toContain('1')
      
      toggleFavorite('1') // Remove
      expect(getFavorites()).not.toContain('1')
      
      toggleFavorite('1') // Add again
      expect(getFavorites()).toContain('1')
    })

    it('should maintain other favorites when toggling', () => {
      setFavorites(['1', '2', '3'])
      toggleFavorite('4') // Add new
      expect(getFavorites()).toContain('1')
      expect(getFavorites()).toContain('2')
      expect(getFavorites()).toContain('3')
      expect(getFavorites()).toContain('4')
    })

    it('should handle string IDs correctly', () => {
      toggleFavorite('product-123')
      expect(getFavorites()).toContain('product-123')
    })
  })

  describe('isFavorite', () => {
    it('should return true when product is in favorites', () => {
      setFavorites(['1', '2', '3'])
      expect(isFavorite('2')).toBe(true)
    })

    it('should return false when product is not in favorites', () => {
      setFavorites(['1', '2', '3'])
      expect(isFavorite('4')).toBe(false)
    })

    it('should return false when no favorites exist', () => {
      expect(isFavorite('1')).toBe(false)
    })

    it('should handle string IDs correctly', () => {
      setFavorites(['product-123', 'product-456'])
      expect(isFavorite('product-123')).toBe(true)
      expect(isFavorite('product-789')).toBe(false)
    })
  })

  describe('integration tests', () => {
    it('should work correctly in a typical user flow', () => {
      // User adds first favorite
      toggleFavorite('1')
      expect(isFavorite('1')).toBe(true)
      
      // User adds more favorites
      toggleFavorite('2')
      toggleFavorite('3')
      expect(getFavorites()).toHaveLength(3)
      
      // User removes a favorite
      toggleFavorite('2')
      expect(isFavorite('2')).toBe(false)
      expect(getFavorites()).toHaveLength(2)
      
      // User checks favorites
      expect(isFavorite('1')).toBe(true)
      expect(isFavorite('3')).toBe(true)
    })

    it('should persist favorites across multiple operations', () => {
      toggleFavorite('1')
      toggleFavorite('2')
      toggleFavorite('3')
      
      const savedFavorites = getFavorites()
      expect(savedFavorites).toContain('1')
      expect(savedFavorites).toContain('2')
      expect(savedFavorites).toContain('3')
    })
  })
})
