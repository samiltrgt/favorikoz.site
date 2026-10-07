jest.mock('react', () => ({ ...jest.requireActual('react'), cache: (fn: unknown) => fn }))
jest.mock('next/navigation', () => ({ notFound: () => { throw new Error('404') }, permanentRedirect: (path: string) => { throw new Error(`308 ${path}`) } }))
jest.mock('@/lib/categories-server', () => ({ getPublicCategories: jest.fn() }))
jest.mock('@/lib/category-products', () => ({ getCategoryProducts: jest.fn(), getSubcategoryProducts: jest.fn() }))
jest.mock('@/lib/site-url', () => ({ isPreviewDeployment: jest.fn(() => false) }))
import { getPublicCategories } from '@/lib/categories-server'
import { getCategoryProducts, getSubcategoryProducts } from '@/lib/category-products'
import { isPreviewDeployment } from '@/lib/site-url'
import { getCategoryPageData, categoryPageItems, categoryMetadata } from '../category-seo-server'
import { categoryCanonical, categoryHref, sortCategoryProducts } from '../category-seo'
import type { CategoryListProduct } from '@/lib/category-products'

beforeEach(() => {
  ;(getPublicCategories as jest.Mock).mockResolvedValue({ flat: [{ slug: 'tirnak', name: 'Tırnak', parent_slug: null }] })
  ;(getCategoryProducts as jest.Mock).mockResolvedValue([])
  ;(getSubcategoryProducts as jest.Mock).mockResolvedValue([])
  ;(isPreviewDeployment as jest.Mock).mockReturnValue(false)
})

test('missing and incorrect category ancestry result in 404, read failures remain server errors', async () => {
  await expect(getCategoryPageData('missing')).rejects.toThrow('404')
  ;(getPublicCategories as jest.Mock).mockRejectedValue(new Error('database offline'))
  await expect(getCategoryPageData('tirnak')).rejects.toThrow('database offline')
})

test('pagination includes the final item once and refuses out-of-range pages', () => {
  const products = Array.from({ length: 81 }, (_, index) => index)
  expect(categoryPageItems(products, { page: '1' }).items).toHaveLength(40)
  expect(categoryPageItems(products, { page: '2' }).items).toEqual(products.slice(40, 80))
  expect(categoryPageItems(products, { page: '3' }).items).toEqual([80])
  expect(() => categoryPageItems(products, { page: '4' })).toThrow('404')
  expect(categoryPageItems([], {}).items).toEqual([])
})

test('verified legacy paths use a permanent redirect to the full chain', async () => {
  ;(getPublicCategories as jest.Mock).mockResolvedValue({ flat: [
    { slug: 'tirnak', name: 'Tırnak', parent_slug: null },
    { slug: 'cihazlar', name: 'Cihazlar', parent_slug: 'tirnak' },
    { slug: 'toz-toplayici', name: 'Toz Toplayıcı', parent_slug: 'cihazlar' },
  ] })
  await expect(getCategoryPageData('tirnak/toz-toplayici')).rejects.toThrow('308 /kategori/tirnak/cihazlar/toz-toplayici')
  const metadata = await categoryMetadata(['tirnak', 'cihazlar', 'toz-toplayici'])
  expect(metadata.alternates?.canonical).toBe('/kategori/tirnak/cihazlar/toz-toplayici')
})

test('page canonicals are self-referencing; sort variants and previews are noindex', async () => {
  ;(getCategoryProducts as jest.Mock).mockResolvedValue(Array.from({ length: 81 }, (_, index) => ({ id: String(index), price: index })))
  expect(categoryCanonical('/kategori/tirnak', 1)).toBe('/kategori/tirnak')
  expect((await categoryMetadata(['tirnak'], { page: '2' })).alternates?.canonical).toBe('/kategori/tirnak?page=2')
  expect((await categoryMetadata(['tirnak'], { page: '2', sort: 'price-low' })).robots).toMatchObject({ index: false, follow: true })
  expect((await categoryMetadata(['tirnak'], {})).robots).toMatchObject({ index: true })
  ;(isPreviewDeployment as jest.Mock).mockReturnValue(true)
  expect((await categoryMetadata(['tirnak'], {})).robots).toMatchObject({ index: false })
  expect(categoryHref('/kategori/tirnak', 2, 'price-low')).toBe('/kategori/tirnak?sort=price-low&page=2')
  expect(categoryHref('/kategori/tirnak', 1, 'newest')).toBe('/kategori/tirnak')
  await expect(categoryMetadata(['tirnak'], { page: '99999' })).rejects.toThrow('404')
})

test('global price sorting happens before pagination with deterministic ties', () => {
  const products = Array.from({ length: 81 }, (_, index) => ({ id: String(index).padStart(3, '0'), slug: `p${index}`, name: `Product ${index}`, price: 81 - index })) as CategoryListProduct[]
  const sorted = sortCategoryProducts(products, 'price-low')
  expect(categoryPageItems(sorted, {}).items[0].price).toBe(1)
  expect(categoryPageItems(sorted, { page: '3' }).items[0].price).toBe(81)
  expect(products[0].price).toBe(81)
})
