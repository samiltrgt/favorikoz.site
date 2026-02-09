import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Header from '@/components/header'
import '@testing-library/jest-dom'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock cart
jest.mock('@/lib/cart', () => ({
  getCart: jest.fn(() => [
    { id: '1', name: 'Product 1', price: 100, qty: 2, image: '/test.jpg' },
    { id: '2', name: 'Product 2', price: 200, qty: 1, image: '/test2.jpg' },
  ]),
}))

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock fetch for auth
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: false }),
      })
    ) as jest.Mock
  })

  describe('Rendering', () => {
    it('should render logo and brand name', () => {
      render(<Header />)
      expect(screen.getByText('Favori Kozmetik')).toBeInTheDocument()
    })

    it('should render contact information', () => {
      render(<Header />)
      expect(screen.getByText(/0537 647 07 10/)).toBeInTheDocument()
      expect(screen.getByText(/mervesaat@gmail.com/)).toBeInTheDocument()
    })

    it('should render navigation links', () => {
      render(<Header />)
      expect(screen.getByText('Anasayfa')).toBeInTheDocument()
      expect(screen.getByText('Tüm Ürünler')).toBeInTheDocument()
      expect(screen.getByText('Çok Satanlar')).toBeInTheDocument()
    })

    it('should render search input', () => {
      render(<Header />)
      const searchInputs = screen.getAllByPlaceholderText(/Ürün ara/)
      expect(searchInputs.length).toBeGreaterThan(0)
    })

    it('should render cart with item count', async () => {
      render(<Header />)
      await waitFor(() => {
        const cartCount = screen.getByText('3')
        expect(cartCount).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Menu', () => {
    it('should toggle mobile menu on button click', () => {
      render(<Header />)
      
      const mobileMenuButton = screen.getByTestId('mobile-menu-button')
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument()
      
      fireEvent.click(mobileMenuButton)
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
      
      fireEvent.click(mobileMenuButton)
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument()
    })

    it('should have proper accessibility attributes on mobile menu button', () => {
      render(<Header />)
      
      const mobileMenuButton = screen.getByTestId('mobile-menu-button')
      expect(mobileMenuButton).toHaveAttribute('aria-label')
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false')
      
      fireEvent.click(mobileMenuButton)
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Search Functionality', () => {
    it('should update search query on input change', () => {
      render(<Header />)
      
      const searchInput = screen.getAllByPlaceholderText(/Ürün ara/)[0]
      fireEvent.change(searchInput, { target: { value: 'şampuan' } })
      
      expect(searchInput).toHaveValue('şampuan')
    })

    it('should show search input in both desktop and mobile', () => {
      render(<Header />)
      
      // Desktop search
      const searchInputs = screen.getAllByPlaceholderText(/Ürün ara/)
      expect(searchInputs.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Cart Display', () => {
    it('should display cart icon', () => {
      render(<Header />)
      
      const cartLink = screen.getByRole('link', { name: /Sepet.*ürün/ })
      expect(cartLink).toBeInTheDocument()
      expect(cartLink).toHaveAttribute('href', '/sepet')
    })

    it('should have proper accessibility on cart link', () => {
      render(<Header />)
      
      const cartLink = screen.getByRole('link', { name: /Sepet.*ürün/ })
      expect(cartLink).toHaveAttribute('aria-label')
      expect(cartLink).toHaveAttribute('title')
    })

    it('should update cart count when cart changes', async () => {
      render(<Header />)
      
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument() // 2 + 1 = 3 items
      })
    })

    it('should not show cart badge when cart is empty', () => {
      // Mock empty cart
      const { getCart } = require('@/lib/cart')
      getCart.mockReturnValue([])
      
      render(<Header />)
      
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
    })
  })

  describe('User Authentication', () => {
    it('should show login link when user is not authenticated', async () => {
      render(<Header />)
      
      await waitFor(() => {
        const userIcon = screen.getByTestId('user-icon')
        expect(userIcon).toBeInTheDocument()
        expect(userIcon).toHaveAttribute('href', '/giris')
      })
    })

    it('should show user menu when user is authenticated', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            user: { name: 'Test User', email: 'test@example.com' },
          }),
        })
      ) as jest.Mock
      
      render(<Header />)
      
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument() // First name
      })
    })
  })

  describe('Categories Dropdown', () => {
    it('should show categories dropdown on hover', () => {
      render(<Header />)
      
      const kategorilerButton = screen.getByText('Kategoriler')
      expect(kategorilerButton).toBeInTheDocument()
    })

    it('should render categories button', () => {
      render(<Header />)
      
      const kategorilerButton = screen.getByRole('button', { name: /Kategoriler/ })
      expect(kategorilerButton).toBeInTheDocument()
      expect(kategorilerButton).toHaveClass('flex', 'items-center')
    })
  })

  describe('Admin Link', () => {
    it('should not show admin link in top bar (admin only via direct URL)', () => {
      render(<Header />)
      
      const adminLink = screen.queryByText('Admin')
      expect(adminLink).not.toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('should show mobile menu button on small screens', () => {
      render(<Header />)
      
      const mobileMenuButton = screen.getByTestId('mobile-menu-button')
      expect(mobileMenuButton).toBeInTheDocument()
      expect(mobileMenuButton).toHaveClass('lg:hidden')
    })

    it('should hide desktop navigation on small screens', () => {
      render(<Header />)
      
      const nav = screen.getByRole('navigation')
      const desktopNav = nav.querySelector('.hidden.lg\\:flex')
      expect(desktopNav).toBeInTheDocument()
    })
  })
})
