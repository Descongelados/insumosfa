import { create } from 'zustand'
import { toast } from './toastStore'
import { refChannel } from './realtimeChannel'
import type { Product } from '../types'
import { supabase } from '../lib/supabase'

type DbProduct = {
  id: string; sku: string; descripcion: string; categoria: string
  marca: string; unidad_medida: string; costo_promedio: number
  precio_venta: number; activo: boolean
}

function toProduct(r: DbProduct): Product {
  return {
    productId: r.id, sku: r.sku, descripcion: r.descripcion,
    categoria: r.categoria, marca: r.marca, unidadMedida: r.unidad_medida,
    costoPromedio: r.costo_promedio, precioVenta: r.precio_venta, activo: r.activo,
  }
}

async function fetchProducts() {
  const { data, error } = await supabase.from('erp_products').select('*').order('descripcion')
  if (error) { toast.error('Error al cargar productos.'); return null }
  return (data as DbProduct[]).map(toProduct)
}

interface ProductsState {
  products: Product[]
  loading: boolean
  initialized: boolean
  loadProducts: () => Promise<void>
  subscribeRealtime: () => () => void
  addProduct: (p: Omit<Product, 'productId'>) => Promise<void>
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  toggleProduct: (id: string) => Promise<void>
}

export const useProductsStore = create<ProductsState>()((set, get) => ({
  products: [], loading: false, initialized: false,

  subscribeRealtime() {
    return refChannel('erp_products_rt', (ch) => ch
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_products' }, async () => {
        if (!get().initialized) return
        const d = await fetchProducts(); if (d) set({ products: d })
      })
    )
  },

  async loadProducts() {
    if (get().initialized) return
    set({ loading: true })
    try {
      const d = await fetchProducts()
      if (d) set({ products: d, initialized: true })
    } finally {
      set({ loading: false })
    }
  },

  async addProduct(data) {
    await supabase.from('erp_products').insert({
      sku: data.sku, descripcion: data.descripcion, categoria: data.categoria,
      marca: data.marca, unidad_medida: data.unidadMedida,
      costo_promedio: data.costoPromedio, precio_venta: data.precioVenta, activo: data.activo,
    })
    const d = await fetchProducts()
    if (d) set({ products: d })
  },

  async updateProduct(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.sku !== undefined) patch.sku = data.sku
    if (data.descripcion !== undefined) patch.descripcion = data.descripcion
    if (data.categoria !== undefined) patch.categoria = data.categoria
    if (data.marca !== undefined) patch.marca = data.marca
    if (data.unidadMedida !== undefined) patch.unidad_medida = data.unidadMedida
    if (data.costoPromedio !== undefined) patch.costo_promedio = data.costoPromedio
    if (data.precioVenta !== undefined) patch.precio_venta = data.precioVenta
    if (data.activo !== undefined) patch.activo = data.activo

    // Optimistic update
    set(s => ({ products: s.products.map(p => p.productId === id ? { ...p, ...data } : p) }))

    const { error } = await supabase.from('erp_products').update(patch).eq('id', id)
    if (error) {
      toast.error('Error al guardar. Intenta de nuevo.')
      const d = await fetchProducts()
      if (d) set({ products: d })
    }
  },

  async deleteProduct(id) {
    const backup = get().products
    set(s => ({ products: s.products.filter(p => p.productId !== id) }))
    const { error } = await supabase.from('erp_products').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar producto. Intenta de nuevo.')
      set({ products: backup })
    }
  },

  async toggleProduct(id) {
    const p = get().products.find(p => p.productId === id)
    if (!p) return
    // Optimistic update
    set(s => ({ products: s.products.map(p => p.productId === id ? { ...p, activo: !p.activo } : p) }))
    const { error } = await supabase.from('erp_products').update({ activo: !p.activo }).eq('id', id)
    if (error) {
      toast.error('Error al guardar. Intenta de nuevo.')
      // Rollback
      set(s => ({ products: s.products.map(p => p.productId === id ? { ...p, activo: p.activo } : p) }))
    }
  },
}))
