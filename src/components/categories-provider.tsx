'use client'

import { createContext, useContext } from 'react'
import type { PublicCategoryNode } from '@/lib/categories-server'

const CategoriesContext = createContext<PublicCategoryNode[] | null>(null)

export function CategoriesProvider({
  categories,
  children,
}: {
  categories: PublicCategoryNode[]
  children: React.ReactNode
}) {
  return (
    <CategoriesContext.Provider value={categories}>{children}</CategoriesContext.Provider>
  )
}

export function useMenuCategories() {
  return useContext(CategoriesContext)
}
