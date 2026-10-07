import fs from 'fs'
import path from 'path'
import loader from '@/lib/cloudinary-loader'
import manifest from '@/data/optimized-images.json'

test('every responsive image candidate points to an existing nonempty derivative', () => {
  for (const variants of Object.values(manifest)) {
    for (const variant of variants) {
      expect(variant.path).toMatch(/^\/seo-images\/[a-f0-9]+-\d+\.webp$/)
      expect(fs.statSync(path.join(process.cwd(), 'public', variant.path)).size).toBeGreaterThan(0)
    }
  }
})

test('hero image resolves to a mobile derivative and unknown images retain their original source', () => {
  expect(loader({ src: '/home-banners/banner1.jpg', width: 420 })).toMatch(/-420\.webp$/)
  expect(loader({ src: 'https://example.com/new-product.jpg', width: 420 })).toBe('https://example.com/new-product.jpg')
})

test('Cloudinary URL transforms preserve query parameters and use the exact host', () => {
  expect(loader({ src: 'https://res.cloudinary.com/demo/image/upload/sample.jpg?v=2', width: 320 })).toContain('w_320,c_limit/sample.jpg?v=2')
  expect(loader({ src: 'https://res.cloudinary.com.evil.example/image/upload/a.jpg', width: 320 })).toBe('https://res.cloudinary.com.evil.example/image/upload/a.jpg')
})
