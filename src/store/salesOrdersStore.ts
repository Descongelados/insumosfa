import { create } from 'zustand'
import type { SalesOrder } from '../types'
import { supabase } from '../lib/supabase'
import { useFinanceStore } from './financeStore'

type DbOrder = {
  id: string; folio: string; cliente_id: string; cotizacion_id: string | null
  fecha_pedido: string; fecha_entrega: string; estatus: string
  items: unknown; subtotal: number; impuestos: number; total: number; notas: string
}

function toOrder(r: DbOrder): SalesOrder {
  return {
    pedidoId: r.id, folio: r.folio, clienteId: r.cliente_id,
    cotizacionId: r.cotizacion_id ?? undefined,
    fechaPedido: r.fecha_pedido, fechaEntrega: r.fecha_entrega,
    estatus: r.estatus as SalesOrder['estatus'],
    items: (r.items as SalesOrder['items']) ?? [],
    subtotal: r.subtotal, impuestos: r.impuestos, total: r.total, notas: r.notas,
  }
}

async function nextFolio(): Promise<string> {
  const { count } = await supabase.from('erp_sales_orders').select('*', { count: 'exact', head: true })
  return `PV-${String((count ?? 0) + 1).padStart(4, '0')}`
}

interface SalesOrdersState {
  orders: SalesOrder[]
  loading: boolean
  loadOrders: () => Promise<void>
  addOrder: (o: Omit<SalesOrder, 'pedidoId' | 'folio'>) => Promise<SalesOrder>
  updateOrder: (id: string, data: Partial<SalesOrder>) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
}

export const useSalesOrdersStore = create<SalesOrdersState>()((set, get) => ({
  orders: [], loading: false,

  async loadOrders() {
    set({ loading: true })
    try {
      const { data } = await supabase.from('erp_sales_orders').select('*').order('created_at', { ascending: false })
      if (data) set({ orders: (data as DbOrder[]).map(toOrder) })
    } finally {
      set({ loading: false })
    }
  },

  async addOrder(data) {
    const folio = await nextFolio()
    const { data: row } = await supabase
      .from('erp_sales_orders')
      .insert({
        folio, cliente_id: data.clienteId, cotizacion_id: data.cotizacionId ?? null,
        fecha_pedido: data.fechaPedido, fecha_entrega: data.fechaEntrega,
        estatus: data.estatus, items: data.items,
        subtotal: data.subtotal, impuestos: data.impuestos, total: data.total, notas: data.notas,
      })
      .select('*')
      .maybeSingle()
    await get().loadOrders()
    return row ? toOrder(row as DbOrder) : { ...data, pedidoId: '', folio }
  },

  async updateOrder(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.clienteId !== undefined) patch.cliente_id = data.clienteId
    if (data.cotizacionId !== undefined) patch.cotizacion_id = data.cotizacionId
    if (data.fechaPedido !== undefined) patch.fecha_pedido = data.fechaPedido
    if (data.fechaEntrega !== undefined) patch.fecha_entrega = data.fechaEntrega
    if (data.estatus !== undefined) patch.estatus = data.estatus
    if (data.items !== undefined) patch.items = data.items
    if (data.subtotal !== undefined) patch.subtotal = data.subtotal
    if (data.impuestos !== undefined) patch.impuestos = data.impuestos
    if (data.total !== undefined) patch.total = data.total
    if (data.notas !== undefined) patch.notas = data.notas
    await supabase.from('erp_sales_orders').update(patch).eq('id', id)

    if (data.estatus === 'facturado') {
      const orders = get().orders
      const order = orders.find(o => o.pedidoId === id)
      if (order) {
        const { count } = await supabase
          .from('erp_invoices_sale')
          .select('*', { count: 'exact', head: true })
          .eq('pedido_id', id)
        if ((count ?? 0) === 0) {
          const today = new Date().toISOString().split('T')[0]
          const venc = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          await useFinanceStore.getState().addFacturaVenta({
            clienteId: order.clienteId, pedidoId: order.pedidoId,
            fecha: today, fechaVencimiento: venc,
            subtotal: order.subtotal, impuestos: order.impuestos,
            total: order.total, saldoPendiente: order.total, estatus: 'emitida',
          })
        }
      }
    }

    await get().loadOrders()
  },

  async deleteOrder(id) {
    await supabase.from('erp_sales_orders').delete().eq('id', id)
    set(s => ({ orders: s.orders.filter(o => o.pedidoId !== id) }))
  },
}))
