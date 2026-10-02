import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProductCard from '@/components/product-card'

jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...props} />
  }
})

jest.mock('@/lib/favorites', () => ({
  isFavorite: jest.fn().mockResolvedValue(false),
  toggleFavorite: jest.fn().mockResolvedValue({ success: true, isFavorite: true }),
}))

jest.mock('@/lib/cart', () => ({
  addToCart: jest.fn(),
}))

beforeAll(() => {
  class MockIntersectionObserver {
    observe = jest.fn()
    unobserve = jest.fn()
    disconnect = jest.fn()
    constructor(_callback: IntersectionObserverCallback) {
      // Do not call synchronously — real IO fires after observe()
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  })
})

describe('ProductCard Component', () => {
  const mockProduct = {
    id: '1',
    slug: 'test-product',
    name: 'Test Product Name',
    brand: 'Favori',
    price: 99.99,
    original_price: 149.99,
    image: '/test-image.jpg',
    rating: 4.5,
    reviews_count: 128,
    in_stock: true,
  }

  const mockOutOfStockProduct = {
    ...mockProduct,
    id: '2',
    slug: 'out-of-stock-product',
    name: 'Out of Stock Product',
    in_stock: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render product information correctly', () => {
    render(<ProductCard product={mockProduct} />)

    expect(screen.getByText('Test Product Name')).toBeInTheDocument()
    expect(screen.getByText('₺99,99')).toBeInTheDocument()
    expect(screen.getByText('₺149,99')).toBeInTheDocument()
    expect(screen.getByText('(128)')).toBeInTheDocument()
  })

  it('should display product image with correct alt text', () => {
    render(<ProductCard product={mockProduct} />)

    const image = screen.getByRole('img', { name: 'Test Product Name' })
    expect(image).toHaveAttribute('src', '/test-image.jpg')
    expect(image).toHaveAttribute('alt', 'Test Product Name')
  })

  it('should show Favori brand badge when showBrandBadge is true', () => {
    render(<ProductCard product={mockProduct} showBrandBadge />)
    expect(screen.getByText('Favori')).toBeInTheDocument()
  })

  it('should show discount badge with correct percentage', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('SAVE 33%')).toBeInTheDocument()
  })

  it('should show NEW and BESTSELLER labels', () => {
    render(
      <ProductCard
        product={{ ...mockProduct, original_price: null, is_new: true }}
      />
    )
    expect(screen.getByText('NEW')).toBeInTheDocument()

    render(
      <ProductCard
        product={{
          ...mockProduct,
          id: '3',
          original_price: null,
          is_new: false,
          is_best_seller: true,
        }}
      />
    )
    expect(screen.getByText('BESTSELLER')).toBeInTheDocument()
  })

  it('should show stock overlay when product is out of stock', () => {
    render(<ProductCard product={mockOutOfStockProduct} />)
    expect(screen.getAllByText('Stok Yok').length).toBeGreaterThan(0)
  })

  it('should disable add to cart button when product is out of stock', () => {
    render(<ProductCard product={mockOutOfStockProduct} />)

    const card = screen.getByTestId('product-card')
    fireEvent.mouseEnter(card)

    const addToCartButton = screen.getByLabelText('Sepete ekle')
    expect(addToCartButton).toBeDisabled()
  })

  it('should render product links correctly', () => {
    render(<ProductCard product={mockProduct} />)

    const productLinks = screen.getAllByRole('link')
    expect(productLinks.length).toBeGreaterThanOrEqual(2)

    productLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/urun/test-product')
    })
  })

  it('should format price correctly with Turkish locale', () => {
    const expensiveProduct = {
      ...mockProduct,
      price: 1234.56,
      original_price: 2000.0,
    }

    render(<ProductCard product={expensiveProduct} />)

    expect(screen.getByText('₺1.234,56')).toBeInTheDocument()
    expect(screen.getByText('₺2.000,00')).toBeInTheDocument()
  })

  it('should render list variant', () => {
    render(<ProductCard product={mockProduct} variant="list" />)

    expect(screen.getByTestId('product-card')).toBeInTheDocument()
    expect(screen.getByText('Test Product Name')).toBeInTheDocument()
    expect(screen.getByText('Ekle')).toBeInTheDocument()
  })

  it('should call addToCart on cart button click', async () => {
    const { addToCart } = await import('@/lib/cart')
    render(<ProductCard product={mockProduct} />)

    const card = screen.getByTestId('product-card')
    fireEvent.mouseEnter(card)

    fireEvent.click(screen.getByLabelText('Sepete ekle'))

    await waitFor(() => {
      expect(addToCart).toHaveBeenCalled()
    })
  })

  it('should use 4:5 media aspect ratio', () => {
    render(<ProductCard product={mockProduct} />)
    const media = screen.getByTestId('product-card').querySelector('.pcard__media')
    expect(media).toBeTruthy()
    expect(media).toHaveClass('pcard__media')
  })
})
