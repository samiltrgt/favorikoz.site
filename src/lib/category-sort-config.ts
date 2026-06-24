import { createClient } from '@supabase/supabase-js'

export const MENU_SORT_SLUG = '_menu_sort'

/** parent slug veya "root" → sıralı alt kategori slug listesi */
export type CategorySortConfig = Record<string, string[]>

/** Sıra config yoksa veya eksikse kullanılan varsayılan menü önceliği */
export const DEFAULT_CATEGORY_SORT: CategorySortConfig = {
  tirnak: ['protez-tirnak-setleri'],
}

export function sortCategorySiblings<T extends { slug: string; name: string }>(
  categories: T[],
  parentSlug: string | null,
  orderMap?: CategorySortConfig
): T[] {
  const key = parentSlug ?? 'root'
  const order = orderMap?.[key]?.length ? orderMap![key] : DEFAULT_CATEGORY_SORT[key]

  if (!order?.length) {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }

  return [...categories].sort((a, b) => {
    const aRank = order.indexOf(a.slug)
    const bRank = order.indexOf(b.slug)
    const aOrder = aRank === -1 ? order.length + 1 : aRank
    const bOrder = bRank === -1 ? order.length + 1 : bRank
    if (aOrder !== bOrder) return aOrder - bOrder
    return a.name.localeCompare(b.name, 'tr')
  })
}

export function parseSortConfig(raw: string | null | undefined): CategorySortConfig {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as CategorySortConfig) : {}
  } catch {
    return {}
  }
}

export async function loadCategorySortConfig(supabase: any): Promise<CategorySortConfig> {
  const { data } = await supabase
    .from('categories')
    .select('description')
    .eq('slug', MENU_SORT_SLUG)
    .is('deleted_at', null)
    .maybeSingle()

  return parseSortConfig(data?.description)
}

export async function saveCategorySortConfig(supabase: any, config: CategorySortConfig) {
  const now = new Date().toISOString()
  const { data: existing } = await supabase
    .from('categories')
    .select('slug')
    .eq('slug', MENU_SORT_SLUG)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('categories')
      .update({ description: JSON.stringify(config), updated_at: now })
      .eq('slug', MENU_SORT_SLUG)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('categories').insert({
    slug: MENU_SORT_SLUG,
    name: 'Menü Sıralama (Sistem)',
    description: JSON.stringify(config),
    parent_slug: null,
  })
  if (error) throw error
}

export function moveSlugInOrder(
  order: string[],
  slug: string,
  direction: 'up' | 'down'
): string[] | null {
  const idx = order.indexOf(slug)
  if (idx === -1) return null
  const swapWith = direction === 'up' ? idx - 1 : idx + 1
  if (swapWith < 0 || swapWith >= order.length) return null
  const next = [...order]
  ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
  return next
}

export function ensureOrderIncludesSiblings(
  order: string[] | undefined,
  siblingSlugs: string[]
): string[] {
  const base = order ? [...order] : []
  for (const slug of siblingSlugs) {
    if (!base.includes(slug)) base.push(slug)
  }
  return base.filter((slug) => siblingSlugs.includes(slug))
}
