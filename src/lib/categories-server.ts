import { createSupabaseAdmin } from '@/lib/supabase/server'
import { loadCategorySortConfig, MENU_SORT_SLUG } from '@/lib/category-sort-config'
import { buildCategoryTree, type CategoryTreeRow } from '@/lib/category-tree'

export type PublicCategoryNode = CategoryTreeRow & { subcategories: PublicCategoryNode[] }

export async function getPublicCategories(): Promise<{
  tree: PublicCategoryNode[]
  flat: CategoryTreeRow[]
}> {
  const supabase = createSupabaseAdmin()
  const sortConfig = await loadCategorySortConfig(supabase)

  const { data, error } = await supabase
    .from('categories')
    .select('slug, name, description, parent_slug, deleted_at')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) throw error

  const flat = ((data || []) as CategoryTreeRow[]).filter((cat) => cat.slug !== MENU_SORT_SLUG)
  const tree = buildCategoryTree(flat, sortConfig) as PublicCategoryNode[]

  return { tree, flat }
}
