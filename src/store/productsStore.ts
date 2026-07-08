import { create } from 'zustand'
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

interface ProductsState {
  products: Product[]
  loading: boolean
  loadProducts: () => Promise<void>
  subscribeRealtime: () => () => void
  addProduct: (p: Omit<Product, 'productId'>) => Promise<void>
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  toggleProduct: (id: string) => Promise<void>
}

export const useProductsStore = create<ProductsState>()((set, get) => ({
  products: [], loading: false,

  subscribeRealtime() {
    const ch = supabase
      .channel('erp_products_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_products' }, () => { void get().loadProducts() })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  async loadProducts() {
    set({ loading: true })
    try {
      const { data } = await supabase.from('erp_products').select('*').order('descripcion')
      if (data) set({ products: (data as DbProduct[]).map(toProduct) })
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
    await get().loadProducts()
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
    await supabase.from('erp_products').update(patch).eq('id', id)
    await get().loadProducts()
  },

  async deleteProduct(id) {
    await supabase.from('erp_products').delete().eq('id', id)
    set(s => ({ products: s.products.filter(p => p.productId !== id) }))
  },

  async toggleProduct(id) {
    const p = get().products.find(p => p.productId === id)
    if (!p) return
    await supabase.from('erp_products').update({ activo: !p.activo }).eq('id', id)
    set(s => ({ products: s.products.map(p => p.productId === id ? { ...p, activo: !p.activo } : p) }))
  },
}))
