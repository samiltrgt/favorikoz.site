import { createSupabaseAdmin } from '@/lib/supabase/server'

/** Inactive banner row that stores homepage section copy and product picks. */
export const HOME_LAYOUT_LINK = 'internal:home-rows'
const HOME_LAYOUT_IMAGE = '/home-banners/banner1.jpg'

export const DEFAULT_CAMPAIGN_BANNERS = [
  {
    src: '/home-banners/banner1.jpg',
    width: 2172,
    height: 724,
    alt: 'Dubai Cat Eye, Disco ve Silk Cat Eye jel oje koleksiyonu',
    href: '/kategori/tirnak',
  },
  {
    src: '/home-banners/banner2.jpg',
    width: 2171,
    height: 724,
    alt: 'Runail UV builder jel ve Dubai gel polish',
    href: '/kategori/tirnak',
  },
  {
    src: '/home-banners/banner3.jpg',
    width: 2188,
    height: 718,
    alt: 'Protez tırnak başlangıç seti, UV lamba ve tırnak bakım ürünleri',
    href: '/kategori/tirnak',
  },
  {
    src: '/home-banners/banner4.jpg',
    width: 2188,
    height: 719,
    alt: 'UV lamba, tırnak frezesi ve toz toplama cihazı',
    href: '/kategori/tirnak',
  },
] as const

export const EDITORIAL_ROWS = [
  { slug: 'tirnak', title: 'Tırnak' },
  { slug: 'ipek-kirpik', title: 'İpek Kirpik' },
  { slug: 'kisisel-bakim', title: 'Kişisel Bakım' },
] as const

const MAX_PRODUCTS = 12

export interface HomeFeaturedLayout {
  title: string
  description: string
  ctaLabel: string
  href: string
  productIds: string[]
}

export interface HomeRowLayout {
  slug: string
  title: string
  productIds: string[]
}

export interface HomeFontenayLayout {
  title: string
  subtitle: string
  href: string
  cta: string
}

export interface HomeLayoutConfig {
  featured: HomeFeaturedLayout
  rows: HomeRowLayout[]
  fontenay: HomeFontenayLayout
}

export const DEFAULT_HOME_LAYOUT: HomeLayoutConfig = {
  featured: {
    title: 'Öne Çıkanlar',
    description: 'Sizin için seçtiğimiz ürünleri keşfedin.',
    ctaLabel: 'Ürünleri Gör',
    href: '/tum-urunler',
    productIds: [],
  },
  rows: EDITORIAL_ROWS.map((row) => ({
    slug: row.slug,
    title: row.title,
    productIds: [],
  })),
  fontenay: {
    title: 'Fontenay Paris',
    subtitle: 'Sizin için ürettiğimiz profesyonel kalite ürünlerimiz',
    href: '/tum-urunler',
    cta: 'Tümünü Gör',
  },
}

export function normalizeHref(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const href = value.trim()
  if (href.startsWith('/') && !href.startsWith('//')) return href.slice(0, 240)
  if (/^https?:\/\//i.test(href)) return href.slice(0, 300)
  return fallback
}

function cleanText(value: unknown, fallback: string, max: number) {
  if (typeof value !== 'string') return fallback
  const text = value.replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, max) : fallback
}

function cleanIds(value: unknown) {
  if (!Array.isArray(value)) return []
  const ids: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!id || id.length > 80 || ids.includes(id)) continue
    ids.push(id)
    if (ids.length >= MAX_PRODUCTS) break
  }
  return ids
}

export function parseHomeLayout(raw: unknown): HomeLayoutConfig {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return DEFAULT_HOME_LAYOUT
    }
  }
  if (!parsed || typeof parsed !== 'object') return DEFAULT_HOME_LAYOUT

  const source = parsed as Partial<HomeLayoutConfig>
  const featured = source.featured ?? DEFAULT_HOME_LAYOUT.featured
  const fontenay = source.fontenay ?? DEFAULT_HOME_LAYOUT.fontenay
  const rowSource = new Map(
    (Array.isArray(source.rows) ? source.rows : []).map((row) => [row?.slug, row])
  )

  return {
    featured: {
      title: cleanText(featured.title, DEFAULT_HOME_LAYOUT.featured.title, 80),
      description: cleanText(featured.description, DEFAULT_HOME_LAYOUT.featured.description, 180),
      ctaLabel: cleanText(featured.ctaLabel, DEFAULT_HOME_LAYOUT.featured.ctaLabel, 40),
      href: normalizeHref(featured.href, DEFAULT_HOME_LAYOUT.featured.href),
      productIds: cleanIds(featured.productIds),
    },
    rows: DEFAULT_HOME_LAYOUT.rows.map((row) => {
      const saved = rowSource.get(row.slug)
      return {
        slug: row.slug,
        title: cleanText(saved?.title, row.title, 80),
        productIds: cleanIds(saved?.productIds),
      }
    }),
    fontenay: {
      title: cleanText(fontenay.title, DEFAULT_HOME_LAYOUT.fontenay.title, 80),
      subtitle: cleanText(fontenay.subtitle, DEFAULT_HOME_LAYOUT.fontenay.subtitle, 180),
      href: normalizeHref(fontenay.href, DEFAULT_HOME_LAYOUT.fontenay.href),
      cta: cleanText(fontenay.cta, DEFAULT_HOME_LAYOUT.fontenay.cta, 40),
    },
  }
}

export function mergeHomeLayout(
  current: HomeLayoutConfig,
  patch: Partial<HomeLayoutConfig>
): HomeLayoutConfig {
  return parseHomeLayout({
    featured: patch.featured ?? current.featured,
    rows: patch.rows ?? current.rows,
    fontenay: patch.fontenay ?? current.fontenay,
  })
}

export async function loadHomeLayoutConfig(): Promise<HomeLayoutConfig> {
  try {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('banners')
      .select('subtitle')
      .eq('link', HOME_LAYOUT_LINK)
      .limit(1)
      .maybeSingle()

    if (error || !data?.subtitle) return DEFAULT_HOME_LAYOUT
    return parseHomeLayout(data.subtitle)
  } catch (error) {
    console.error('loadHomeLayoutConfig error:', error)
    return DEFAULT_HOME_LAYOUT
  }
}

export async function saveHomeLayoutConfig(config: HomeLayoutConfig) {
  const supabase = createSupabaseAdmin()
  const subtitle = JSON.stringify(config)
  const { data: existing, error: readError } = await supabase
    .from('banners')
    .select('id')
    .eq('link', HOME_LAYOUT_LINK)
    .limit(1)
    .maybeSingle()

  if (readError) throw readError

  if (existing?.id) {
    const { error } = await supabase
      .from('banners')
      .update({
        title: 'Ana sayfa bölüm ayarları',
        subtitle,
        image: HOME_LAYOUT_IMAGE,
        link: HOME_LAYOUT_LINK,
        is_active: false,
        display_order: 999,
      })
      .eq('id', existing.id)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('banners').insert({
    title: 'Ana sayfa bölüm ayarları',
    subtitle,
    image: HOME_LAYOUT_IMAGE,
    link: HOME_LAYOUT_LINK,
    is_active: false,
    display_order: 999,
  })
  if (error) throw error
}
