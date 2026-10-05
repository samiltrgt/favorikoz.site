'use client'

import { useEffect, useRef } from 'react'
import { trackViewItemList } from '@/lib/analytics/datalayer'
import { CONSENT_CHANGED_EVENT } from '@/lib/analytics/consent'

type ListItem = { id: string; name?: string; price: number }

type Props = {
  itemListId: string
  itemListName: string
  items: ListItem[]
}

/** Liste geldikten sonra view_item_list — boş listeyle basmaz */
export default function ViewItemListTracker({ itemListId, itemListName, items }: Props) {
  const sent = useRef<string | null>(null)

  useEffect(() => {
    const signature = `${itemListId}:${items.map((item) => item.id).join(',')}`
    const send = () => {
      if (sent.current === signature || items.length === 0) return
      if (trackViewItemList({ itemListId, itemListName, items })) sent.current = signature
    }
    send()
    window.addEventListener(CONSENT_CHANGED_EVENT, send)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, send)
  }, [itemListId, itemListName, items])

  return null
}
