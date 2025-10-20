import fs from 'fs'
import path from 'path'
import { products } from './dummy-data'
import { importedProducts } from './imported-products'

const DATA_FILE = path.join(process.cwd(), 'data', 'products.json')

// Ensure data directory exists
const ensureDataDir = () => {
  const dataDir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Initialize data file if it doesn't exist
const initializeDataFile = () => {
  ensureDataDir()
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2))
  }
}

// Read products from file
export const readProducts = () => {
  try {
    // Always try to read from data/products.json first (for admin updates)
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8')
      const jsonProducts = JSON.parse(data)
      if (jsonProducts && jsonProducts.length > 0) {
        return jsonProducts
      }
    }
    
    // If no JSON file or empty, use imported products
    if (importedProducts && importedProducts.length > 0) {
      return importedProducts
    }
    
    // Fallback to dummy data
    initializeDataFile()
    return products
  } catch (error) {
    console.error('Error reading products:', error)
    return products
  }
}

// Write products to file
export const writeProducts = (newProducts: any[]) => {
  try {
    ensureDataDir()
    fs.writeFileSync(DATA_FILE, JSON.stringify(newProducts, null, 2))
    return true
  } catch (error) {
    console.error('Error writing products:', error)
    return false
  }
}

// Update a single product
export const updateProduct = (id: string, updatedProduct: any) => {
  try {
    const products = readProducts()
    const index = products.findIndex((p: any) => p.id === id)
    
    if (index === -1) {
      throw new Error('Product not found')
    }
    
    // Update the product
    products[index] = { ...products[index], ...updatedProduct }
    
    // Write back to file
    const success = writeProducts(products)
    if (success) {
      return products[index]
    } else {
      throw new Error('Failed to save product')
    }
  } catch (error) {
    console.error('Error updating product:', error)
    throw error
  }
}

// Delete a product
export const deleteProduct = (id: string) => {
  try {
    const products = readProducts()
    const filteredProducts = products.filter((p: any) => p.id !== id)
    
    if (filteredProducts.length === products.length) {
      throw new Error('Product not found')
    }
    
    const success = writeProducts(filteredProducts)
    if (success) {
      return true
    } else {
      throw new Error('Failed to delete product')
    }
  } catch (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}

// Add a new product
export const addProduct = (newProduct: any) => {
  try {
    const products = readProducts()
    const productWithId = {
      ...newProduct,
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString().slice(0, 10)
    }
    
    products.push(productWithId)
    
    const success = writeProducts(products)
    if (success) {
      return productWithId
    } else {
      throw new Error('Failed to add product')
    }
  } catch (error) {
    console.error('Error adding product:', error)
    throw error
  }
}

// Get a single product by ID
export const getProductById = (id: string) => {
  try {
    const products = readProducts()
    return products.find((p: any) => p.id === id)
  } catch (error) {
    console.error('Error getting product:', error)
    return null
  }
}
