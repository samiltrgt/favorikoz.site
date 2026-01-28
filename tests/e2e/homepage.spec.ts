import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')
    
    // Check if the page loads
    await expect(page).toHaveTitle(/Favori Kozmetik/)
    
    // Check if header elements are present
    await expect(page.locator('h1')).toContainText('Favori Kozmetik')
    
    // Check if navigation is present
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('text=Anasayfa')).toBeVisible()
    await expect(page.locator('text=Tüm Ürünler')).toBeVisible()
  })

  test('should display contact information', async ({ page }) => {
    await page.goto('/')
    
    // Check contact info in top bar
    await expect(page.locator('text=0537 647 07 10')).toBeVisible()
    await expect(page.locator('text=mervesaat@gmail.com')).toBeVisible()
  })

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/')
    
    // Test navigation links
    await page.click('text=Tüm Ürünler')
    await expect(page).toHaveURL('/tum-urunler')
    
    await page.goBack()
    await page.click('text=Çok Satanlar')
    await expect(page).toHaveURL('/cok-satanlar')
  })
})

test.describe('Product Pages', () => {
  test('should display products on homepage', async ({ page }) => {
    await page.goto('/')
    
    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })
    
    // Check if at least one product is displayed
    const productCards = page.locator('[data-testid="product-card"]')
    await expect(productCards).toHaveCount({ min: 1 })
  })

  test('should navigate to product detail page', async ({ page }) => {
    await page.goto('/')
    
    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })
    
    // Click on first product
    const firstProduct = page.locator('[data-testid="product-card"]').first()
    await firstProduct.click()
    
    // Should navigate to product detail page
    await expect(page).toHaveURL(/\/urun\//)
    
    // Check if product details are displayed
    await expect(page.locator('h1')).toBeVisible()
  })
})

test.describe('Authentication', () => {
  test('should navigate to login page', async ({ page }) => {
    await page.goto('/')
    
    // Click on user icon to go to login
    await page.click('[data-testid="user-icon"]')
    
    // Should navigate to login page
    await expect(page).toHaveURL('/giris')
    
    // Check if login form is present
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/giris')
    
    // Click on signup link
    await page.click('text=Kayıt Ol')
    
    // Should navigate to signup page
    await expect(page).toHaveURL('/kayit')
    
    // Check if signup form is present
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })
})

test.describe('Mobile Responsiveness', () => {
  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Check if mobile menu button is visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
    
    // Test mobile menu
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
  })
})
