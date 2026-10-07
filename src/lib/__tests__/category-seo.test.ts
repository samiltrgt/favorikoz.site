import { resolveCategoryChain, categoryCopy, categoryPath, legacyCategoryRedirect } from '../category-seo'
import { CATEGORY_SEO } from '@/data/category-seo'
import baseline from '../../../docs/seo-baseline.json'

describe('category SEO ancestry and editorial overrides', () => {
  const rows = baseline.categories
  test('accepts a real three-level path and rejects flattened or unrelated parents', () => {
    expect(resolveCategoryChain(rows, ['tirnak', 'cihazlar', 'toz-toplayici'])?.map((row) => row.slug)).toEqual(['tirnak', 'cihazlar', 'toz-toplayici'])
    expect(resolveCategoryChain(rows, ['tirnak', 'toz-toplayici'])).toBeNull()
    expect(resolveCategoryChain(rows, ['sac-bakimi', 'kalici-oje'])).toBeNull()
    expect(resolveCategoryChain(rows, ['kalici-oje'])).toBeNull()
    expect(resolveCategoryChain(rows, ['missing'])).toBeNull()
    expect(resolveCategoryChain(rows, [])).toBeNull()
  })
  test('deleted categories cannot resolve', () => {
    expect(resolveCategoryChain([{ slug: 'gone', name: 'Gone', deleted_at: '2026-10-07' }], ['gone'])).toBeNull()
  })
  test('legacy root/leaf shortcuts redirect only to the verified full ancestry', () => {
    expect(legacyCategoryRedirect(rows, ['tirnak', 'toz-toplayici'])).toBe('/kategori/tirnak/cihazlar/toz-toplayici')
    expect(legacyCategoryRedirect(rows, ['sac-bakimi', 'toz-toplayici'])).toBeNull()
    expect(legacyCategoryRedirect(rows, ['tirnak', 'missing'])).toBeNull()
    expect(legacyCategoryRedirect(rows, ['tirnak', 'kalici-oje'])).toBeNull()
    expect(legacyCategoryRedirect(rows, ['tirnak', 'jeller', 'toz-toplayici'])).toBeNull()
  })
  test('five guides use existing categories, unique copy and meaningful visible sections', () => {
    expect(Object.keys(CATEGORY_SEO)).toHaveLength(5)
    expect(new Set(Object.values(CATEGORY_SEO).map((guide) => guide.description)).size).toBe(5)
    for (const [slug, guide] of Object.entries(CATEGORY_SEO)) {
      expect(rows.some((row) => row.slug === slug)).toBe(true)
      expect(guide.sections).toHaveLength(3)
      expect([guide.intro, ...guide.sections.map((section) => section.text)].join(' ').split(/\s+/).length).toBeGreaterThan(150)
    }
  })
  test('fallback names actual leaf and parent; paths include the full chain', () => {
    const chain = resolveCategoryChain(rows, ['tirnak', 'cihazlar', 'toz-toplayici'])!
    expect(categoryCopy(chain).description).toContain('Toz Toplayıcı')
    expect(categoryCopy(chain).description).toContain('Cihazlar')
    expect(categoryPath(chain.map((row) => row.slug))).toBe('/kategori/tirnak/cihazlar/toz-toplayici')
  })
})
