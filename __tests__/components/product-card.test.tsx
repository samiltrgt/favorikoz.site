import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import userEvent from '@testing-library/user-event'
import ProductCard from '@/components/product-card'

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
})

// Avoid redefining window.location to prevent jsdom navigation errors

describe('ProductCard Component', () => {
  const mockProduct = {
    id: '1',
    slug: 'test-product',
    name: 'Test Product Name',
    brand: 'Test Brand',
    price: 99.99,
    original_price: 149.99,
    image: '/test-image.jpg',
    rating: 4.5,
    reviews_count: 128,
    is_new: true,
    is_best_seller: false,
    discount: 33,
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
    window.location.href = ''
  })

  it('should render product information correctly', () => {
    render(<ProductCard product={mockProduct} />)
    
    expect(screen.getByText('Test Product Name')).toBeInTheDocument()
    expect(screen.getByText('Test Brand')).toBeInTheDocument()
    expect(screen.getByText('₺99,99')).toBeInTheDocument()
    expect(screen.getByText('₺149,99')).toBeInTheDocument()
    expect(screen.getByText('(128)')).toBeInTheDocument()
  })

  it('should display product image with correct alt text', () => {
    render(<ProductCard product={mockProduct} />)
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', '/test-image.jpg')
    expect(image).toHaveAttribute('alt', 'Test Product Name')
  })

  it('should show "New" badge when product is new', () => {
    render(<ProductCard product={mockProduct} />)
    
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('should show "Best Seller" badge when product is best seller', () => {
    const bestSellerProduct = { ...mockProduct, is_best_seller: true }
    render(<ProductCard product={bestSellerProduct} />)
    
    expect(screen.getByText('Best Seller')).toBeInTheDocument()
  })

  it('should show discount badge with correct percentage', () => {
    render(<ProductCard product={mockProduct} />)
    
    expect(screen.getByText('-33%')).toBeInTheDocument()
  })

  it('should display correct number of filled stars based on rating', () => {
    render(<ProductCard product={mockProduct} />)
    
    // Rating is 4.5, so 4 stars should be filled (text-black), 1 empty (text-gray-300)
    const filledStars = document.querySelectorAll('.lucide-star.text-black')
    const emptyStars = document.querySelectorAll('.lucide-star.text-gray-300')
    
    expect(filledStars).toHaveLength(4) // 4 filled stars
    expect(emptyStars).toHaveLength(1)  // 1 empty star
  })

  it('should show "Out of Stock" overlay when product is out of stock', () => {
    render(<ProductCard product={mockOutOfStockProduct} />)
    
    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
  })

  it('should disable add to cart button when product is out of stock', () => {
    render(<ProductCard product={mockOutOfStockProduct} />)
    
    // Hover to show the button
    const card = screen.getByText('Out of Stock Product').closest('div')
    fireEvent.mouseEnter(card!)
    
    // Find the shopping cart button by its SVG class
    const addToCartButton = document.querySelector('button .lucide-shopping-cart')?.closest('button')
    expect(addToCartButton).toBeDisabled()
  })

    it('should navigate to product page when card is clicked', () => {
      const router = useRouter() as unknown as { push: jest.Mock }
      router.push.mockClear()
      render(<ProductCard product={mockProduct} />)
      const card = screen.getByText('Test Product Name').closest('div')
      fireEvent.click(card!)
      expect(router.push).toHaveBeenCalledWith('/urun/test-product')
    })

  it('should not navigate when button is clicked', () => {
    const router = useRouter() as unknown as { push: jest.Mock }
    router.push.mockClear()
    render(<ProductCard product={mockProduct} />)
    const card = screen.getByText('Test Product Name').closest('div')
    fireEvent.mouseEnter(card!)
    const favoriteButton = document.querySelector('button .lucide-heart')?.closest('button')
    fireEvent.click(favoriteButton!)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('should toggle favorite state when heart button is clicked', () => {
    render(<ProductCard product={mockProduct} />)
    
    // Hover to show buttons
    const card = screen.getByText('Test Product Name').closest('div')
    fireEvent.mouseEnter(card!)
    
    // Find the heart button by its SVG class
    const favoriteButton = document.querySelector('button .lucide-heart')?.closest('button')
    const heartIcon = favoriteButton?.querySelector('svg')
    
    // Initially not favorited
    expect(heartIcon).not.toHaveClass('fill-red-500')
    
    // Click to favorite
    fireEvent.click(favoriteButton!)
    
    // Should be favorited
    expect(heartIcon).toHaveClass('fill-red-500')
  })

  it('should show loading state when add to cart is clicked', async () => {
    render(<ProductCard product={mockProduct} />)
    
    // Hover to show buttons
    const card = screen.getByText('Test Product Name').closest('div')
    fireEvent.mouseEnter(card!)
    
    // Find the shopping cart button by its SVG class
    const addToCartButton = document.querySelector('button .lucide-shopping-cart')?.closest('button')
    
    // Click add to cart
    fireEvent.click(addToCartButton!)
    
    // Button should be disabled during loading
    expect(addToCartButton).toBeDisabled()
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(addToCartButton).not.toBeDisabled()
    }, { timeout: 1000 })
  })

  it('should show hover effects on mouse enter/leave', () => {
    render(<ProductCard product={mockProduct} />)
    
    const card = screen.getByText('Test Product Name').closest('div')
    
    // Initially buttons should be hidden (opacity-0)
    const buttonsContainer = document.querySelector('.absolute.top-3.right-3')
    expect(buttonsContainer).toHaveClass('opacity-0')
    
    // On hover, buttons should appear (opacity-100)
    fireEvent.mouseEnter(card!)
    expect(buttonsContainer).toHaveClass('opacity-100')
    
    // On mouse leave, buttons should hide again (opacity-0)
    fireEvent.mouseLeave(card!)
    expect(buttonsContainer).toHaveClass('opacity-0')
  })

  it('should format price correctly with Turkish locale', () => {
    const expensiveProduct = {
      ...mockProduct,
      price: 1234.56,
      original_price: 2000.00,
    }
    
    render(<ProductCard product={expensiveProduct} />)
    
    expect(screen.getByText('₺1.234,56')).toBeInTheDocument()
    expect(screen.getByText('₺2.000,00')).toBeInTheDocument()
  })

  it('should render product links correctly', () => {
    render(<ProductCard product={mockProduct} />)
    
    const productLinks = screen.getAllByRole('link')
    expect(productLinks).toHaveLength(2) // Image link and title link
    
    productLinks.forEach(link => {
      expect(link).toHaveAttribute('href', '/urun/test-product')
    })
  })
})
