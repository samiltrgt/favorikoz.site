import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { createSupabaseServer } from '@/lib/supabase/server'

async function getBaseUrl(): Promise<string> {
  try {
    const headersList = await headers()
    const host = headersList.get('host')
    const proto = headersList.get('x-forwarded-proto') ?? headersList.get('x-url')?.split('://')[0] ?? 'https'
    if (host) return `${proto === 'https' ? 'https' : 'http'}://${host}`
  } catch {
    // headers() bazen build/static ortamında yoktur
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://www.favorikozmetik.com'
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE_URL = await getBaseUrl()
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/hakkimizda`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tum-urunler`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/kargo-iade`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/gizlilik`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/cerez-politikasi`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/kullanim-kosullari`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/kvkk`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/sepet`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    { url: `${BASE_URL}/giris`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/kayit`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  try {
    const supabase = await createSupabaseServer()

    // Kategoriler (ana + alt)
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('slug, parent_slug')
      .is('deleted_at', null)

    const categoryEntries: MetadataRoute.Sitemap = []
    if (categoriesData?.length) {
      const mainCategories = categoriesData.filter((c) => !c.parent_slug)
      const subcategories = categoriesData.filter((c) => c.parent_slug)

      for (const cat of mainCategories) {
        categoryEntries.push({
          url: `${BASE_URL}/kategori/${cat.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        })
      }
      for (const sub of subcategories) {
        const parentSlug = (sub as { parent_slug?: string }).parent_slug
        if (parentSlug) {
          categoryEntries.push({
            url: `${BASE_URL}/kategori/${parentSlug}/${sub.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          })
        }
      }
    }

    // Ürünler (stokta olan, public sitemap için)
    const { data: productsData } = await supabase
      .from('products')
      .select('slug, updated_at')
      .is('deleted_at', null)
      .eq('in_stock', true)
      .gt('stock_quantity', 0)

    const productEntries: MetadataRoute.Sitemap = (productsData || []).map((p) => ({
      url: `${BASE_URL}/urun/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...staticPages, ...categoryEntries, ...productEntries]
  } catch {
    return staticPages
  }
}
