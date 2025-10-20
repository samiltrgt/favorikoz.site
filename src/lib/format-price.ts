/**
 * Format price in Turkish Lira format
 * @param price - The price to format (should be the actual price from Excel)
 * @returns Formatted price string (e.g., "1.250,00")
 */
export function formatPrice(price: number): string {
  // Price is already in correct format from Excel import
  return price.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Get display price for UI components
 * @param price - The price from database
 * @returns Price ready for display
 */
export function getDisplayPrice(price: number): number {
  // Price is already correct from Excel import, no division needed
  return price
}

