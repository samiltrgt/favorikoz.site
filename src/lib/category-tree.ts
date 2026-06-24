import { MENU_SORT_SLUG, sortCategorySiblings, type CategorySortConfig } from './category-sort-config'

export type CategoryTreeRow = {
  slug: string
  name: string
  description?: string | null
  parent_slug?: string | null
  deleted_at?: string | null
}

export function buildCategoryTree(
  rows: CategoryTreeRow[],
  sortConfig?: CategorySortConfig
) {
  const visible = rows.filter((row) => row.slug !== MENU_SORT_SLUG)
  const byParent = new Map<string | null, CategoryTreeRow[]>()

  for (const row of visible) {
    const key = row.parent_slug ?? null
    const list = byParent.get(key) ?? []
    list.push(row)
    byParent.set(key, list)
  }

  for (const [parentSlug, list] of Array.from(byParent.entries())) {
    byParent.set(parentSlug, sortCategorySiblings(list, parentSlug, sortConfig))
  }

  const makeNode = (row: CategoryTreeRow): CategoryTreeRow & { subcategories: any[] } => ({
    ...row,
    subcategories: (byParent.get(row.slug) ?? []).map(makeNode),
  })

  return (byParent.get(null) ?? []).map(makeNode)
}

export function collectDescendantSlugsFromFlat(
  flat: Array<Pick<CategoryTreeRow, 'slug' | 'parent_slug'>>,
  rootSlug: string
): string[] {
  const slugs = new Set<string>([rootSlug])
  let growing = true
  while (growing) {
    growing = false
    for (const row of flat) {
      if (row.parent_slug && slugs.has(row.parent_slug) && !slugs.has(row.slug)) {
        slugs.add(row.slug)
        growing = true
      }
    }
  }
  return Array.from(slugs)
}

export type CategoryTreeNode = {
  slug: string
  name?: string
  subcategories?: CategoryTreeNode[]
}

export function collectSubtreeSlugs(node: CategoryTreeNode): string[] {
  const slugs = [node.slug]
  for (const child of node.subcategories || []) {
    slugs.push(...collectSubtreeSlugs(child))
  }
  return slugs
}

export function findCategoryNode<T extends { slug: string; subcategories?: T[] }>(
  tree: T[],
  slug: string
): T | null {
  for (const node of tree) {
    if (node.slug === slug) return node
    const found = findCategoryNode(node.subcategories || [], slug)
    if (found) return found
  }
  return null
}
