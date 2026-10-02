import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Header from '@/components/header'
import '@testing-library/jest-dom'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}))

jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
})

jest.mock('@/lib/cart', () => ({
  getCart: jest.fn(() => [
    { id: '1', name: 'Product 1', price: 100, qty: 2, image: '/test.jpg' },
    { id: '2', name: 'Product 2', price: 200, qty: 1, image: '/test2.jpg' },
  ]),
}))

jest.mock('@/components/categories-provider', () => ({
  useMenuCategories: () => [
    {
      name: 'Tırnak',
      slug: 'tirnak',
      subcategories: [
        { name: 'Protez Tırnak', slug: 'protez-tirnak', subcategories: [] },
        {
          name: 'Oje',
          slug: 'oje',
          subcategories: [{ name: 'Kalıcı Oje', slug: 'kalici-oje', subcategories: [] }],
        },
      ],
    },
    { name: 'Saç Bakımı', slug: 'sac-bakimi', subcategories: [] },
  ],
}))

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // jsdom does not implement HTMLDialogElement.showModal
    HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    })
    HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    })
  })

  describe('Rendering', () => {
    it('should render brand wordmark', () => {
      render(<Header />)
      expect(screen.getAllByLabelText(/Favori Kozmetik — Ana sayfa/).length).toBeGreaterThan(0)
      expect(document.querySelectorAll('.rh-wordmark').length).toBeGreaterThan(0)
      expect(document.querySelector('.rh-wordmark')?.textContent).toMatch(/FAVORİ/)
      expect(document.querySelector('.rh-wordmark')?.textContent).toMatch(/KOZMETİK/)
    })

    it('should render navigation links', () => {
      render(<Header />)
      expect(screen.getAllByText('Anasayfa').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Tüm Ürünler').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Tırnak').length).toBeGreaterThan(0)
    })

    it('should render subcategory links under their parent category', () => {
      render(<Header />)

      const subcategory = screen.getByRole('link', { name: 'Protez Tırnak' })
      expect(subcategory).toHaveAttribute('href', '/kategori/tirnak/protez-tirnak')

      const nested = screen.getByRole('link', { name: 'Kalıcı Oje' })
      expect(nested).toHaveAttribute('href', '/kategori/tirnak/oje/kalici-oje')
    })

    it('should reveal subcategories in the mobile menu', () => {
      render(<Header />)

      fireEvent.click(screen.getByTestId('mobile-menu-button'))
      expect(screen.queryByRole('link', { name: 'Protez Tırnak', hidden: false })).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Tırnak alt kategorilerini göster' }))
      expect(screen.getByRole('button', { name: 'Tırnak listesine dön' })).toBeInTheDocument()
      const drawerLinks = screen.getAllByRole('link', { name: 'Protez Tırnak' })
      expect(drawerLinks.length).toBeGreaterThan(1)
      expect(drawerLinks.some((link) => link.getAttribute('href') === '/kategori/tirnak/protez-tirnak')).toBe(true)

      fireEvent.click(screen.getByRole('button', { name: 'Tırnak listesine dön' }))
      expect(screen.queryByRole('button', { name: 'Tırnak listesine dön' })).not.toBeInTheDocument()
    })

    it('should render cart with item count', async () => {
      render(<Header />)
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('should render announcement and contact email in drawer footer', () => {
      render(<Header />)
      expect(screen.getByText(/profesyonel kozmetik/i)).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('mobile-menu-button'))
      expect(screen.getByText('mervesaat@gmail.com')).toBeInTheDocument()
    })
  })

  describe('Mobile Menu', () => {
    it('should open mobile menu on button click', () => {
      render(<Header />)

      const mobileMenuButton = screen.getByTestId('mobile-menu-button')
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(mobileMenuButton)
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
    })

    it('should have proper accessibility attributes on menu button', () => {
      render(<Header />)

      const mobileMenuButton = screen.getByTestId('mobile-menu-button')
      expect(mobileMenuButton).toHaveAttribute('aria-label', 'Menüyü aç')
      expect(mobileMenuButton).toHaveAttribute('aria-haspopup', 'dialog')
    })
  })

  describe('Search Functionality', () => {
    it('should open search dialog and navigate on submit', () => {
      render(<Header />)

      fireEvent.click(screen.getByTestId('header-search-button'))
      expect(screen.getByTestId('header-search-dialog')).toBeInTheDocument()

      const searchInput = screen.getByPlaceholderText(/Ürün ara/)
      fireEvent.change(searchInput, { target: { value: 'şampuan' } })
      fireEvent.submit(searchInput.closest('form')!)

      expect(mockPush).toHaveBeenCalledWith('/tum-urunler?search=%C5%9Fampuan')
    })
  })

  describe('Cart Display', () => {
    it('should navigate to cart on cart button click', () => {
      render(<Header />)

      fireEvent.click(screen.getByTestId('header-cart-button'))
      expect(mockPush).toHaveBeenCalledWith('/sepet')
    })

    it('should have accessible cart label with count', async () => {
      render(<Header />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Sepetim, 3 ürün/ })).toBeInTheDocument()
      })
    })
  })

  describe('Account', () => {
    it('should navigate to account on Hesabım click', () => {
      render(<Header />)

      fireEvent.click(screen.getByRole('button', { name: 'Hesabım' }))
      expect(mockPush).toHaveBeenCalledWith('/hesabim')
    })
  })

  describe('Favorites', () => {
    it('should navigate to favorites on heart click', () => {
      render(<Header />)

      fireEvent.click(screen.getByRole('button', { name: 'Favorilerim' }))
      expect(mockPush).toHaveBeenCalledWith('/favorilerim')
    })
  })
})
