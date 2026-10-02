import { revalidatePath, revalidateTag } from 'next/cache'

export const PRODUCTS_CACHE_TAG = 'products'
export const CATALOG_REVALIDATE_SECONDS = 60

export const PUBLIC_CATALOG_CACHE_CONTROL =
  'public, max-age=0, s-maxage=60, stale-while-revalidate=60'

export const PRIVATE_NO_STORE = 'private, no-store'

/**
 * Drops the catalog data cache and the ISR HTML for public product pages.
 * Route segment `revalidate` must stay a literal 60; this is the on-demand path.
 */
export function revalidateProductCatalog() {
  revalidateTag(PRODUCTS_CACHE_TAG)
  revalidatePath('/')
  revalidatePath('/urun/[slug]', 'page')
  revalidatePath('/kategori/[category]', 'page')
  revalidatePath('/kategori/[category]/[subcategory]', 'page')
  revalidatePath('/kategori/[category]/[subcategory]/[...rest]', 'page')
}
