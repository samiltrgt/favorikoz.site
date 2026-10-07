import type { MetadataRoute } from 'next'
import { createSupabaseAnon } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'
import { loadSitemapRows, buildCatalogSitemap } from '@/lib/seo/sitemap'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseAnon()
  // Public undeleted catalog, including temporarily sold-out products. Errors produce
  // 5xx instead of silently publishing a valid-looking but incomplete sitemap.
  const [categories, products] = await Promise.all([
    loadSitemapRows((from, to) => supabase.from('categories')
      .select('slug, parent_slug, updated_at', { count: 'exact' })
      .is('deleted_at', null).order('id').range(from, to)),
    loadSitemapRows((from, to) => supabase.from('products')
      .select('slug, updated_at', { count: 'exact' })
      .is('deleted_at', null).order('id').range(from, to)),
  ])
  return buildCatalogSitemap(getSiteUrl(), categories, products)
}
