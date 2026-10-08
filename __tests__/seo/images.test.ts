import fs from 'fs'
import path from 'path'
import loader from '@/lib/cloudinary-loader'
import manifest from '@/data/optimized-images.json'
import { responsiveImage } from '@/lib/responsive-image'
import { optimizedImageSource } from '@/lib/responsive-image-server'

test('every responsive image candidate points to an existing nonempty derivative', () => {
  for (const entry of Object.values(manifest)) {
    expect(entry.hash).toMatch(/^[a-f0-9]{20}$/)
    expect(entry.widths).toEqual(Array.from(new Set(entry.widths)).sort((a, b) => a - b))
    for (const width of entry.widths) {
      expect(width).toBeGreaterThan(0)
      expect(fs.statSync(path.join(process.cwd(), 'public', `/seo-images/${entry.hash}-${width}.webp`)).size).toBeGreaterThan(0)
    }
  }
})

test('responsive sources describe only real encoded variants without repeated URLs', () => {
  const source = Object.keys(manifest)[0]
  const entry = manifest[source as keyof typeof manifest]
  const selected = responsiveImage(optimizedImageSource(source))!
  expect(selected.srcSet.split(', ')).toEqual(entry.widths.map(width => `/seo-images/${entry.hash}-${width}.webp ${width}w`))
  expect(responsiveImage('https://example.com/new-product.jpg')).toBeNull()
})

test('hero image resolves to a mobile derivative and unknown images retain their original source', () => {
  expect(loader({ src: optimizedImageSource('/home-banners/banner1.jpg'), width: 420 })).toMatch(/-420\.webp$/)
  expect(loader({ src: 'https://example.com/new-product.jpg', width: 420 })).toBe('https://example.com/new-product.jpg')
})

test('the client parser accepts only bounded, ordered local variant references', () => {
  const hash = 'a'.repeat(20)
  expect(responsiveImage(`/seo-images/${hash}-640.webp?widths=320,640`)).not.toBeNull()
  for (const src of [
    `/seo-images/${hash}-640.webp?widths=640,320`,
    `/seo-images/${hash}-640.webp?widths=320,320,640`,
    `/seo-images/${hash}-640.webp?widths=320,960`,
    `/seo-images/${hash}-999999.webp?widths=320,999999`,
    `https://example.com/seo-images/${hash}-640.webp?widths=320,640`,
  ]) expect(responsiveImage(src)).toBeNull()
  expect(optimizedImageSource('https://example.com/new-product.jpg')).toBe('https://example.com/new-product.jpg')
})

test('Cloudinary URL transforms preserve query parameters and use the exact host', () => {
  expect(loader({ src: 'https://res.cloudinary.com/demo/image/upload/sample.jpg?v=2', width: 320 })).toContain('w_320,c_limit/sample.jpg?v=2')
  expect(loader({ src: 'https://res.cloudinary.com.evil.example/image/upload/a.jpg', width: 320 })).toBe('https://res.cloudinary.com.evil.example/image/upload/a.jpg')
})
