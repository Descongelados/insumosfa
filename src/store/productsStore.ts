import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../types'
import { SEED_PRODUCTS } from '../data/seed'

interface ProductsState {
  products: Product[]
  addProduct: (p: Omit<Product, 'productId'>) => void
  updateProduct: (id: string, data: Partial<Product>) => void
  deleteProduct: (id: string) => void
  toggleProduct: (id: string) => void
}

export const useProductsStore = create<ProductsState>()(
  persist(
    (set) => ({
      products: SEED_PRODUCTS,
      addProduct(data) {
        const product: Product = { ...data, productId: `pr${Date.now()}` }
        set((s) => ({ products: [...s.products, product] }))
      },
      updateProduct(id, data) {
        set((s) => ({ products: s.products.map((p) => (p.productId === id ? { ...p, ...data } : p)) }))
      },
      deleteProduct(id) {
        set((s) => ({ products: s.products.filter((p) => p.productId !== id) }))
      },
      toggleProduct(id) {
        set((s) => ({ products: s.products.map((p) => (p.productId === id ? { ...p, activo: !p.activo } : p)) }))
      },
    }),
    { name: 'erp_products' }
  )
)
