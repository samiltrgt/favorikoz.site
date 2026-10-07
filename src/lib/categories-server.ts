import { createSupabaseAnon } from '@/lib/supabase/server'
import { cache } from 'react'
import { loadCategorySortConfig, MENU_SORT_SLUG } from '@/lib/category-sort-config'
import { buildCategoryTree, type CategoryTreeRow } from '@/lib/category-tree'

export type PublicCategoryNode = CategoryTreeRow & { subcategories: PublicCategoryNode[] }

export const getPublicCategories = cache(async function getPublicCategories(): Promise<{
  tree: PublicCategoryNode[]
  flat: CategoryTreeRow[]
}> {
  // Public reads via anon + RLS (categories_public_read); no service_role.
  const supabase = createSupabaseAnon()
  const sortConfig = await loadCategorySortConfig(supabase)

  const { data, error } = await supabase
    .from('categories')
    .select('slug, name, description, parent_slug, deleted_at')
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error

  const flat = ((data || []) as CategoryTreeRow[]).filter((cat) => cat.slug !== MENU_SORT_SLUG)
  const tree = buildCategoryTree(flat, sortConfig) as PublicCategoryNode[]

  return { tree, flat }
})
