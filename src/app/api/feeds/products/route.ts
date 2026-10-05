import { productFeed } from '@/lib/analytics/catalog-feed'
export const revalidate = 3600
export async function GET() { return productFeed('tsv') }
