import { create } from 'zustand'
import type { SolicitudCompra, OrdenCompra } from '../types'
import { supabase } from '../lib/supabase'

type DbSolicitud = {
  id: string; solicitante: string; fecha: string; prioridad: string
  motivo: string; product_id: string; cantidad: number; estatus: string
}
type DbOrden = {
  id: string; folio: string; supplier_id: string; fecha: string
  fecha_entrega_esperada: string; monto: number; iva_pct: number; estatus: string
  items: unknown; notas: string
}

function toSolicitud(r: DbSolicitud): SolicitudCompra {
  return {
    solicitudId: r.id, solicitante: r.solicitante, fecha: r.fecha,
    prioridad: r.prioridad as SolicitudCompra['prioridad'],
    motivo: r.motivo, productId: r.product_id,
    cantidad: r.cantidad, estatus: r.estatus as SolicitudCompra['estatus'],
  }
}
function toOrden(r: DbOrden): OrdenCompra {
  return {
    ordenCompraId: r.id, folio: r.folio, supplierId: r.supplier_id,
    fecha: r.fecha, fechaEntregaEsperada: r.fecha_entrega_esperada,
    monto: r.monto, ivaPct: (r.iva_pct ?? 16) as OrdenCompra['ivaPct'],
    estatus: r.estatus as OrdenCompra['estatus'],
    items: (r.items as OrdenCompra['items']) ?? [], notas: r.notas,
  }
}

interface PurchasesState {
  solicitudes: SolicitudCompra[]
  ordenesCompra: OrdenCompra[]
  loading: boolean
  loadPurchases: () => Promise<void>
  subscribeRealtime: () => () => void
  addSolicitud: (s: Omit<SolicitudCompra, 'solicitudId'>) => Promise<void>
  updateSolicitud: (id: string, data: Partial<SolicitudCompra>) => Promise<void>
  deleteSolicitud: (id: string) => Promise<void>
  addOrdenCompra: (o: Omit<OrdenCompra, 'ordenCompraId' | 'folio'>) => Promise<OrdenCompra>
  updateOrdenCompra: (id: string, data: Partial<OrdenCompra>) => Promise<void>
  deleteOrdenCompra: (id: string) => Promise<void>
}

export const usePurchasesStore = create<PurchasesState>()((set, get) => ({
  solicitudes: [], ordenesCompra: [], loading: false,

  subscribeRealtime() {
    const ch = supabase
      .channel('erp_purchases_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_purchase_requests' }, () => { void get().loadPurchases() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_purchase_orders' }, () => { void get().loadPurchases() })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  async loadPurchases() {
    set({ loading: true })
    try {
      const [{ data: sd }, { data: od }] = await Promise.all([
        supabase.from('erp_purchase_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('erp_purchase_orders').select('*').order('created_at', { ascending: false }),
      ])
      if (sd) set({ solicitudes: (sd as DbSolicitud[]).map(toSolicitud) })
      if (od) set({ ordenesCompra: (od as DbOrden[]).map(toOrden) })
    } finally {
      set({ loading: false })
    }
  },

  async addSolicitud(data) {
    await supabase.from('erp_purchase_requests').insert({
      solicitante: data.solicitante, fecha: data.fecha, prioridad: data.prioridad,
      motivo: data.motivo, product_id: data.productId,
      cantidad: data.cantidad, estatus: data.estatus,
    })
    await get().loadPurchases()
  },

  async updateSolicitud(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.solicitante !== undefined) patch.solicitante = data.solicitante
    if (data.fecha !== undefined) patch.fecha = data.fecha
    if (data.prioridad !== undefined) patch.prioridad = data.prioridad
    if (data.motivo !== undefined) patch.motivo = data.motivo
    if (data.productId !== undefined) patch.product_id = data.productId
    if (data.cantidad !== undefined) patch.cantidad = data.cantidad
    if (data.estatus !== undefined) patch.estatus = data.estatus
    await supabase.from('erp_purchase_requests').update(patch).eq('id', id)
    await get().loadPurchases()
  },

  async deleteSolicitud(id) {
    await supabase.from('erp_purchase_requests').delete().eq('id', id)
    set(s => ({ solicitudes: s.solicitudes.filter(sc => sc.solicitudId !== id) }))
  },

  async addOrdenCompra(data) {
    const { count } = await supabase.from('erp_purchase_orders').select('*', { count: 'exact', head: true })
    const folio = `OC-${String((count ?? 0) + 1).padStart(4, '0')}`
    const { data: row } = await supabase
      .from('erp_purchase_orders')
      .insert({
        folio, supplier_id: data.supplierId, fecha: data.fecha,
        fecha_entrega_esperada: data.fechaEntregaEsperada,
        monto: data.monto, iva_pct: data.ivaPct ?? 16,
        estatus: data.estatus, items: data.items, notas: data.notas,
      })
      .select('*')
      .maybeSingle()
    await get().loadPurchases()
    return row ? toOrden(row as DbOrden) : { ...data, ordenCompraId: '', folio }
  },

  async updateOrdenCompra(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.supplierId !== undefined) patch.supplier_id = data.supplierId
    if (data.fecha !== undefined) patch.fecha = data.fecha
    if (data.fechaEntregaEsperada !== undefined) patch.fecha_entrega_esperada = data.fechaEntregaEsperada
    if (data.monto !== undefined) patch.monto = data.monto
    if (data.ivaPct !== undefined) patch.iva_pct = data.ivaPct
    if (data.estatus !== undefined) patch.estatus = data.estatus
    if (data.items !== undefined) patch.items = data.items
    if (data.notas !== undefined) patch.notas = data.notas
    await supabase.from('erp_purchase_orders').update(patch).eq('id', id)
    await get().loadPurchases()
  },

  async deleteOrdenCompra(id) {
    await supabase.from('erp_purchase_orders').delete().eq('id', id)
    set(s => ({ ordenesCompra: s.ordenesCompra.filter(oc => oc.ordenCompraId !== id) }))
  },
}))
