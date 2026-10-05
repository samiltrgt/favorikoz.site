import { adValueFromOrder } from './value'

export type RevenueOrder = {
  payment_status: string; status: string; total: number; items: unknown; shipping_cost: number
  discount_amount?: number | null; tracking?: Record<string, unknown> | null
  utm_source?: string | null; utm_campaign?: string | null
}
export type AdSpend = { source: string; campaign: string; amount: number; platform_revenue: number | null }

export function summarizeRoas(orders: RevenueOrder[], spend: AdSpend[]) {
  const groups = new Map<string, { source: string; campaign: string; orders: number; revenue: number; spend: number; platformRevenue: number | null; incompletePlatformRevenue: boolean }>()
  function group(source: string, campaign: string) {
    source = source.trim().toLowerCase() || 'unattributed'
    campaign = campaign.trim()
    const key = JSON.stringify([source, campaign])
    if (!groups.has(key)) groups.set(key, { source, campaign, orders: 0, revenue: 0, spend: 0, platformRevenue: null, incompletePlatformRevenue: false })
    return groups.get(key)!
  }
  for (const order of orders) {
    if (order.payment_status !== 'completed' || ['cancelled', 'refunded', 'failed'].includes(order.status)) continue
    const tracking = order.tracking || {}
    const utm = tracking.utm && typeof tracking.utm === 'object' ? tracking.utm as Record<string, unknown> : {}
    const source = String(utm.utm_source || utm.source || tracking.utm_source || order.utm_source || 'unattributed')
    const campaign = String(utm.utm_campaign || utm.campaign || tracking.utm_campaign || order.utm_campaign || '')
    const row = group(source, campaign)
    row.orders++
    row.revenue += adValueFromOrder(order)
  }
  for (const cost of spend) {
    const row = group(cost.source, cost.campaign || '')
    row.spend += Number(cost.amount) || 0
    if (cost.platform_revenue != null) row.platformRevenue = (row.platformRevenue || 0) + Number(cost.platform_revenue)
    else row.incompletePlatformRevenue = true
  }
  return Array.from(groups.values()).map(({ incompletePlatformRevenue, ...row }) => ({
    ...row, revenue: Math.round(row.revenue * 100) / 100,
    platformRevenue: incompletePlatformRevenue ? null : row.platformRevenue,
    roas: row.spend > 0 ? row.revenue / row.spend : null,
    platformRoas: !incompletePlatformRevenue && row.spend > 0 && row.platformRevenue !== null ? row.platformRevenue / row.spend : null,
    aov: row.orders > 0 ? row.revenue / row.orders : null,
  })).sort((a, b) => b.revenue - a.revenue)
}

export function validDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
