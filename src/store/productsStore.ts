import { create } from 'zustand'
import type { Product } from '../types'
import { SEED_PRODUCTS } from '../data/seed'

interface ProductsState {
  products: Product[]
  addProduct: (p: Omit<Product, 'productId'>) => void
  updateProduct: (id: string, data: Partial<Product>) => void
  toggleProduct: (id: string) => void
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: SEED_PRODUCTS,
  addProduct(data) {
    const p: Product = { ...data, productId: `pr${Date.now()}` }
    set((s) => ({ products: [...s.products, p] }))
  },
  updateProduct(id, data) {
    set((s) => ({ products: s.products.map((p) => (p.productId === id ? { ...p, ...data } : p)) }))
  },
  toggleProduct(id) {
    set((s) => ({ products: s.products.map((p) => (p.productId === id ? { ...p, activo: !p.activo } : p)) }))
  },
}))
