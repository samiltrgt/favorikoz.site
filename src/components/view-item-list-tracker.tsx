'use client'

import { useEffect, useRef } from 'react'
import { trackViewItemList } from '@/lib/analytics/datalayer'

type ListItem = { id: string; name?: string; price: number }

type Props = {
  itemListId: string
  itemListName: string
  items: ListItem[]
}

/** Liste geldikten sonra view_item_list — boş listeyle basmaz */
export default function ViewItemListTracker({ itemListId, itemListName, items }: Props) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current || items.length === 0) return
    sent.current = true
    trackViewItemList({ itemListId, itemListName, items })
  }, [itemListId, itemListName, items])

  return null
}
