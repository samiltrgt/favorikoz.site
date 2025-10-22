import { getCart, addToCart, removeFromCart, updateQuantity, clearCart } from '@/lib/cart'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn()
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
})

describe('Cart utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('getCart', () => {
    it('should return empty array when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null)
      const cart = getCart()
      expect(cart).toEqual([])
    })

    it('should return parsed cart from localStorage', () => {
      const mockCart = [
        { id: '1', slug: 'test-1', name: 'Test 1', image: 'img1.jpg', price: 100, qty: 2 },
        { id: '2', slug: 'test-2', name: 'Test 2', image: 'img2.jpg', price: 200, qty: 1 },
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCart))
      
      const cart = getCart()
      expect(cart).toEqual(mockCart)
    })

    it('should return empty array when localStorage has invalid JSON', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      const cart = getCart()
      expect(cart).toEqual([])
    })
  })

  describe('addToCart', () => {
    it('should add new item to empty cart', () => {
      const product = { 
        id: '1', 
        slug: 'test-1', 
        name: 'Test Product', 
        image: 'img1.jpg', 
        price: 100, 
        qty: 1 
      }
      addToCart(product)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cart',
        JSON.stringify([product])
      )
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent))
    })

    it('should increment quantity for existing item', () => {
      const existingCart = [{ 
        id: '1', 
        slug: 'test-1', 
        name: 'Test 1', 
        image: 'img1.jpg', 
        price: 100, 
        qty: 2 
      }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingCart))
      
      const product = { 
        id: '1', 
        slug: 'test-1', 
        name: 'Test Product', 
        image: 'img1.jpg', 
        price: 100, 
        qty: 1 
      }
      addToCart(product)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cart',
        JSON.stringify([{ 
          id: '1', 
          slug: 'test-1', 
          name: 'Test 1', 
          image: 'img1.jpg', 
          price: 100, 
          qty: 3 
        }])
      )
    })

    it('should add new item to existing cart', () => {
      const existingCart = [{ 
        id: '1', 
        slug: 'test-1', 
        name: 'Test 1', 
        image: 'img1.jpg', 
        price: 100, 
        qty: 2 
      }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingCart))
      
      const product = { 
        id: '2', 
        slug: 'test-2', 
        name: 'New Product', 
        image: 'img2.jpg', 
        price: 200, 
        qty: 1 
      }
      addToCart(product)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cart',
        JSON.stringify([
          { id: '1', slug: 'test-1', name: 'Test 1', image: 'img1.jpg', price: 100, qty: 2 },
          { id: '2', slug: 'test-2', name: 'New Product', image: 'img2.jpg', price: 200, qty: 1 },
        ])
      )
    })
  })

  describe('removeFromCart', () => {
    it('should remove item from cart', () => {
      const existingCart = [
        { id: '1', slug: 'test-1', name: 'Test 1', image: 'img1.jpg', price: 100, qty: 2 },
        { id: '2', slug: 'test-2', name: 'Test 2', image: 'img2.jpg', price: 200, qty: 1 },
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingCart))
      
      removeFromCart('1')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cart',
        JSON.stringify([{ id: '2', slug: 'test-2', name: 'Test 2', image: 'img2.jpg', price: 200, qty: 1 }])
      )
    })

    it('should handle removing non-existent item', () => {
      const existingCart = [{ id: '1', slug: 'test-1', name: 'Test 1', image: 'img1.jpg', price: 100, qty: 2 }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingCart))
      
      removeFromCart('999')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cart',
        JSON.stringify([{ id: '1', slug: 'test-1', name: 'Test 1', image: 'img1.jpg', price: 100, qty: 2 }])
      )
    })
  })

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const existingCart = [{ id: '1', slug: 'test-1', name: 'Test 1', image: 'img1.jpg', price: 100, qty: 2 }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingCart))
      
      updateQuantity('1', 5)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cart',
        JSON.stringify([{ id: '1', slug: 'test-1', name: 'Test 1', image: 'img1.jpg', price: 100, qty: 5 }])
      )
    })

    it('should remove item when quantity is 0', () => {
      const existingCart = [
        { id: '1', slug: 'test-1', name: 'Test 1', image: 'img1.jpg', price: 100, qty: 2 },
        { id: '2', slug: 'test-2', name: 'Test 2', image: 'img2.jpg', price: 200, qty: 1 },
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingCart))
      
      updateQuantity('1', 0)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cart',
        JSON.stringify([{ id: '2', slug: 'test-2', name: 'Test 2', image: 'img2.jpg', price: 200, qty: 1 }])
      )
    })

    it('should handle updating non-existent item', () => {
      const existingCart = [{ id: '1', slug: 'test-1', name: 'Test 1', image: 'img1.jpg', price: 100, qty: 2 }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingCart))
      
      updateQuantity('999', 5)
      
      // Should not call setItem for non-existent item
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      const existingCart = [
        { id: '1', slug: 'test-1', name: 'Test 1', image: 'img1.jpg', price: 100, qty: 2 },
        { id: '2', slug: 'test-2', name: 'Test 2', image: 'img2.jpg', price: 200, qty: 1 },
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingCart))
      
      clearCart()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cart',
        JSON.stringify([])
      )
    })
  })
})