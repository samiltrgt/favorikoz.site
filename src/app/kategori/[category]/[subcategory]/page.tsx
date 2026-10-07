import CategoryCatalogPage from '@/components/category-catalog-page'
import { categoryMetadata } from '@/lib/category-seo-server'
import type { CatalogSearchParams } from '@/lib/seo/catalog'
export const revalidate = 60
type Props = { params: Promise<{ category: string; subcategory: string }>; searchParams: CatalogSearchParams }
export async function generateMetadata({ params, searchParams }: Props) {
  const { category, subcategory, rest = [] } = await params as { category: string; subcategory: string; rest?: string[] }
  return categoryMetadata([category, subcategory], searchParams)
}
export default async function Page({ params, searchParams }: Props) {
  const { category, subcategory, rest = [] } = await params as { category: string; subcategory: string; rest?: string[] }
  return <CategoryCatalogPage slugs={[category, subcategory]} searchParams={searchParams} />
}