import { unstable_cache } from 'next/cache'
import { createSupabaseAnon } from '@/lib/supabase/server'
import { CATALOG_REVALIDATE_SECONDS, PRODUCTS_CACHE_TAG } from '@/lib/product-cache'
import { dbToDisplay, formatTRY } from '@/lib/price'
import { siteBrands } from '@/lib/site-brands'
import {
  DEFAULT_CAMPAIGN_BANNERS,
  HOME_LAYOUT_LINK,
  loadHomeLayoutConfig,
  normalizeHref,
  type HomeLayoutConfig,
} from '@/lib/home-layout'
import type { EditorialCategory, EditorialProduct } from '@/components/EditorialProductRows'

const MAX_PROMO_PRODUCTS = 5
const EDITORIAL_CONTROL_SLOTS = [1, 3, 0] as const
const EDITORIAL_PRODUCTS_PER_ROW = 12
const EDITORIAL_MIN_PRODUCTS = 3
const PRODUCT_FIELDS =
  'id, slug, name, brand, price, original_price, image, images, rating, reviews_count, in_stock, is_new, is_best_seller, stock_quantity, created_at, subcategory_slug, category_slug'

export interface HomeProduct {
  id: string
  slug: string
  name: string
  brand: string | null
  price: number
  original_price: number | null
  image: string | null
  rating: number | null
  reviews_count: number | null
  in_stock: boolean
  stock_quantity: number
  created_at: string
  subcategory_slug: string | null
  category_slug: string | null
  [key: string]: any
}

export interface HomePromoBanner {
  id: string
  title: string
  description: string | null
  image: string
  image_mobile?: string | null
  link: string
  button_text: string
  position: string
  is_active: boolean
  display_order: number
  [key: string]: any
}

export interface CampaignBanner {
  id: string
  src: string
  alt: string
  href: string
  width: number
  height: number
}

export interface HomeSections {
  products: HomeProduct[]
  ownProductionProducts: HomeProduct[]
  promoBanners: HomePromoBanner[]
  /** FixedPromoCarousel için bağımsız ürün listesi (banner seçimine bağlı değil). */
  promoCarouselProducts: HomeProduct[]
  /** Öne çıkanlar paneli, kategori satır başlıkları ve Fontenay metinleri. */
  homeLayout: HomeLayoutConfig
  /** Üst kampanya slider'ı. Sorgu hata verirse varsayılan görseller. */
  campaignBanners: CampaignBanner[]
  /** Brand marquee: sabit marka logoları ve yazı markaları. */
  marqueeBrands: Array<{ name: string; src?: string; width?: number; lines?: readonly string[] }>
  editorialCategories: EditorialCategory[]
}

function toEditorialProduct(product: HomeProduct): EditorialProduct | null {
  const image = product.image?.trim()
  if (!image) return null

  const images = Array.isArray(product.images)
    ? product.images.filter((src: unknown): src is string => typeof src === 'string' && src.length > 0)
    : undefined

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    subtitle: product.brand?.trim() || undefined,
    brand: product.brand?.trim() || undefined,
    href: `/urun/${product.slug}`,
    image,
    imageAlt: product.name,
    displayPrice: `₺${formatTRY(product.price)}`,
    price: product.price,
    originalPrice: product.original_price,
    rating: typeof product.rating === 'number' ? product.rating : undefined,
    reviewsCount: typeof product.reviews_count === 'number' ? product.reviews_count : undefined,
    outOfStock: product.in_stock === false || product.stock_quantity <= 0,
    stockLabel: 'STOKTA YOK',
    isNew: product.is_new === true,
    isBestSeller: product.is_best_seller === true,
    images,
  }
}

function normalizeProductPrice<T extends { price: number; original_price?: number | null }>(
  product: T
): T {
  return {
    ...product,
    price: dbToDisplay(product.price),
    original_price: product.original_price ? dbToDisplay(product.original_price) : null,
  }
}

/**
 * Anasayfa için tüm bölümlerin verisini sunucuda tek seferde çözer.
 * (BULGU-4: client no-store fetch'lerini ortadan kaldırmak için)
 * Cached 60s; product writes call revalidateTag('products').
 */
async function loadHomeSections(): Promise<HomeSections> {
  const supabase = createSupabaseAnon()

  const [
    productsRes,
    ownProductionRes,
    promoBannersRes,
    promoBannerProductsRes,
    bannersRes,
    homeLayout,
  ] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, slug, name, brand, price, original_price, image, rating, reviews_count, in_stock, stock_quantity, created_at, subcategory_slug, category_slug'
      )
      .is('deleted_at', null)
      .eq('in_stock', true) // Müşterilere sadece stokta olan ürünleri göster
      .gt('stock_quantity', 0) // Stok miktarı 0'dan büyük olmalı
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .limit(120),
    supabase
      .from('own_production_products')
      .select('id, display_order, is_active, created_at, product_id, products (*)')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('promo_banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .order('id', { ascending: true }),
    supabase
      .from('promo_banner_products')
      .select('id, banner_id, product_id, display_order, is_active, products (*)')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('banners')
      .select('id, title, image, link, display_order, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true }),
    loadHomeLayoutConfig(),
  ])

  if (productsRes.error) {
    console.error('❌ getHomeSections products error:', productsRes.error)
  }
  if (ownProductionRes.error) {
    console.error('❌ getHomeSections own_production_products error:', ownProductionRes.error)
  }
  if (promoBannersRes.error) {
    console.error('❌ getHomeSections promo_banners error:', promoBannersRes.error)
  }
  if (promoBannerProductsRes.error) {
    console.error('❌ getHomeSections promo_banner_products error:', promoBannerProductsRes.error)
  }
  if (bannersRes.error) {
    console.error('❌ getHomeSections banners error:', bannersRes.error)
  }

  if (
    productsRes.error ||
    ownProductionRes.error ||
    promoBannersRes.error ||
    promoBannerProductsRes.error
  ) {
    throw new Error('getHomeSections query failed')
  }

  const products = (productsRes.data || []).map(normalizeProductPrice) as HomeProduct[]

  const ownProductionManaged = (ownProductionRes.data || [])
    .map((row: any) => row.products)
    .filter(Boolean)
    .map(normalizeProductPrice) as HomeProduct[]
  const ownProductionProducts = ownProductionManaged.length > 0 ? ownProductionManaged : products

  const promoBanners = (promoBannersRes.data || []) as HomePromoBanner[]

  // Banner slider'dan bağımsız: admin'de atanmış tüm promo ürünleri (tekil, sırayla).
  const seenPromoIds = new Set<string>()
  const managedPromoProducts: HomeProduct[] = []
  for (const row of promoBannerProductsRes.data || []) {
    const product = (row as unknown as { products?: HomeProduct | null }).products
    if (!product?.id || seenPromoIds.has(product.id)) continue
    seenPromoIds.add(product.id)
    managedPromoProducts.push(normalizeProductPrice(product))
    if (managedPromoProducts.length >= MAX_PROMO_PRODUCTS) break
  }
  const fallbackPromoProducts =
    managedPromoProducts.length > 0
      ? managedPromoProducts
      : products.slice(0, MAX_PROMO_PRODUCTS)
  const curatedPromo = homeLayout.featured.productIds.length
    ? await fetchProductsByIds(supabase, homeLayout.featured.productIds)
    : []
  const promoCarouselProducts = homeLayout.featured.productIds.length
    ? curatedPromo
    : fallbackPromoProducts

  const campaignBanners = bannersRes.error
    ? DEFAULT_CAMPAIGN_BANNERS.map((banner, index) => ({
        id: `default-${index}`,
        src: banner.src,
        alt: banner.alt,
        href: banner.href,
        width: banner.width,
        height: banner.height,
      }))
    : ((bannersRes.data || []) as Array<{
        id: string
        title: string | null
        image: string | null
        link: string | null
      }>)
        .filter((banner) => banner.image && banner.link !== HOME_LAYOUT_LINK)
        .map((banner) => ({
          id: banner.id,
          src: banner.image as string,
          alt: banner.title?.trim() || 'Kampanya',
          href: normalizeHref(banner.link, '/tum-urunler'),
          width: 2172,
          height: 724,
        }))

  const editorialCategories = await loadEditorialCategories(supabase, homeLayout)
  const marqueeBrands = siteBrands

  return {
    products,
    ownProductionProducts,
    promoBanners,
    promoCarouselProducts,
    homeLayout,
    campaignBanners,
    marqueeBrands,
    editorialCategories,
  }
}

async function fetchProductsByIds(
  supabase: ReturnType<typeof createSupabaseAnon>,
  ids: string[]
): Promise<HomeProduct[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_FIELDS)
    .in('id', ids)
    .is('deleted_at', null)

  if (error) {
    console.error('❌ fetchProductsByIds error:', error)
    return []
  }

  const byId = new Map(
    ((data || []).map(normalizeProductPrice) as HomeProduct[]).map((product) => [product.id, product])
  )
  return ids
    .map((id) => byId.get(id))
    .filter((product): product is HomeProduct => Boolean(product?.image?.trim()))
}

async function loadEditorialCategories(
  supabase: ReturnType<typeof createSupabaseAnon>,
  layout: HomeLayoutConfig
): Promise<EditorialCategory[]> {
  const curatedIds = layout.rows.flatMap((row) => row.productIds)
  const curated = await fetchProductsByIds(supabase, curatedIds)
  const curatedById = new Map(curated.map((product) => [product.id, product]))

  const perCategory = await Promise.all(
    layout.rows.map(async (row) => {
      if (row.productIds.length > 0) {
        return {
          cat: { slug: row.slug, name: row.title },
          products: row.productIds
            .map((id) => curatedById.get(id))
            .filter((product): product is HomeProduct => Boolean(product)),
          curated: true,
        }
      }

      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_FIELDS)
        .eq('category_slug', row.slug)
        .is('deleted_at', null)
        .eq('in_stock', true)
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .limit(EDITORIAL_PRODUCTS_PER_ROW)

      if (error) {
        console.error(`❌ editorial products [${row.slug}] error:`, error)
        return { cat: { slug: row.slug, name: row.title }, products: [] as HomeProduct[], curated: false }
      }

      return {
        cat: { slug: row.slug, name: row.title },
        products: (data || []).map(normalizeProductPrice) as HomeProduct[],
        curated: false,
      }
    })
  )

  const rows: EditorialCategory[] = []
  let missingImageCount = 0

  for (const entry of perCategory) {
    const mapped: EditorialProduct[] = []
    for (const product of entry.products) {
      const item = toEditorialProduct(product)
      if (!item) {
        missingImageCount += 1
        continue
      }
      mapped.push(item)
      if (mapped.length >= EDITORIAL_PRODUCTS_PER_ROW) break
    }

    const minimum = entry.curated ? 1 : EDITORIAL_MIN_PRODUCTS
    if (mapped.length < minimum) continue

    rows.push({
      id: entry.cat.slug,
      title: entry.cat.name,
      controlSlot: EDITORIAL_CONTROL_SLOTS[rows.length % EDITORIAL_CONTROL_SLOTS.length],
      products: mapped,
    })
  }

  if (missingImageCount > 0) {
    console.warn(
      `[editorial] ${missingImageCount} ürün görseli eksik; satırlara dahil edilmedi (hayali yol kullanılmadı).`
    )
  }

  return rows
}

export const getHomeSections = unstable_cache(loadHomeSections, ['home-sections-editorial-v7'], {
  tags: [PRODUCTS_CACHE_TAG],
  revalidate: CATALOG_REVALIDATE_SECONDS,
})
