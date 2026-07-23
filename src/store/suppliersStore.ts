import { create } from 'zustand'
import type { Supplier } from '../types'
import { supabase } from '../lib/supabase'

type DbSupplier = {
  id: string; razon_social: string; rfc: string; contacto: string
  correo: string; telefono: string; condiciones_pago: string
  calidad: number; precio: number; tiempo_entrega: number
  cumplimiento: number; activo: boolean
}

function toSupplier(r: DbSupplier): Supplier {
  return {
    supplierId: r.id, razonSocial: r.razon_social, rfc: r.rfc,
    contacto: r.contacto, correo: r.correo, telefono: r.telefono,
    condicionesPago: r.condiciones_pago, calidad: r.calidad,
    precio: r.precio, tiempoEntrega: r.tiempo_entrega,
    cumplimiento: r.cumplimiento, activo: r.activo,
  }
}

interface SuppliersState {
  suppliers: Supplier[]
  loading: boolean
  loadSuppliers: () => Promise<void>
  subscribeRealtime: () => () => void
  addSupplier: (s: Omit<Supplier, 'supplierId'>) => Promise<void>
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>
  deleteSupplier: (id: string) => Promise<void>
}

export const useSuppliersStore = create<SuppliersState>()((set, get) => ({
  suppliers: [], loading: false,

  subscribeRealtime() {
    const ch = supabase
      .channel('erp_suppliers_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_suppliers' }, () => { void get().loadSuppliers() })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  async loadSuppliers() {
    set({ loading: true })
    try {
      const { data } = await supabase.from('erp_suppliers').select('*').order('razon_social')
      if (data) set({ suppliers: (data as DbSupplier[]).map(toSupplier) })
    } finally {
      set({ loading: false })
    }
  },

  async addSupplier(data) {
    await supabase.from('erp_suppliers').insert({
      razon_social: data.razonSocial, rfc: data.rfc, contacto: data.contacto,
      correo: data.correo, telefono: data.telefono,
      condiciones_pago: data.condicionesPago, calidad: data.calidad,
      precio: data.precio, tiempo_entrega: data.tiempoEntrega,
      cumplimiento: data.cumplimiento, activo: data.activo,
    })
    await get().loadSuppliers()
  },

  async updateSupplier(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.razonSocial !== undefined) patch.razon_social = data.razonSocial
    if (data.rfc !== undefined) patch.rfc = data.rfc
    if (data.contacto !== undefined) patch.contacto = data.contacto
    if (data.correo !== undefined) patch.correo = data.correo
    if (data.telefono !== undefined) patch.telefono = data.telefono
    if (data.condicionesPago !== undefined) patch.condiciones_pago = data.condicionesPago
    if (data.calidad !== undefined) patch.calidad = data.calidad
    if (data.precio !== undefined) patch.precio = data.precio
    if (data.tiempoEntrega !== undefined) patch.tiempo_entrega = data.tiempoEntrega
    if (data.cumplimiento !== undefined) patch.cumplimiento = data.cumplimiento
    if (data.activo !== undefined) patch.activo = data.activo

    // Optimistic update
    set(s => ({ suppliers: s.suppliers.map(s => s.supplierId === id ? { ...s, ...data } : s) }))

    const { error } = await supabase.from('erp_suppliers').update(patch).eq('id', id)
    if (error) await get().loadSuppliers()
  },

  async deleteSupplier(id) {
    set(s => ({ suppliers: s.suppliers.filter(s => s.supplierId !== id) }))
    await supabase.from('erp_suppliers').delete().eq('id', id)
  },
}))
