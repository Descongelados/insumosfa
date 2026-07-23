import { create } from 'zustand'
import type { SalesOrder } from '../types'
import { supabase } from '../lib/supabase'
import { useFinanceStore } from './financeStore'
import { toast } from './toastStore'
import { refChannel } from './realtimeChannel'

type DbOrder = {
  id: string; folio: string; cliente_id: string; cotizacion_id: string | null
  fecha_pedido: string; fecha_entrega: string; estatus: string; iva_pct: number | null
  items: unknown; subtotal: number; impuestos: number; total: number; notas: string
}

function toOrder(r: DbOrder): SalesOrder {
  return {
    pedidoId: r.id, folio: r.folio, clienteId: r.cliente_id,
    cotizacionId: r.cotizacion_id ?? undefined,
    fechaPedido: r.fecha_pedido, fechaEntrega: r.fecha_entrega,
    estatus: r.estatus as SalesOrder['estatus'],
    ivaPct: (r.iva_pct ?? 16) as SalesOrder['ivaPct'],
    items: (r.items as SalesOrder['items']) ?? [],
    subtotal: r.subtotal, impuestos: r.impuestos, total: r.total, notas: r.notas,
  }
}

async function fetchOrders() {
  const { data, error } = await supabase
    .from('erp_sales_orders').select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) { toast.error('Error al cargar pedidos.'); return null }
  return (data as DbOrder[]).map(toOrder)
}

interface SalesOrdersState {
  orders: SalesOrder[]
  loading: boolean
  initialized: boolean
  loadOrders: () => Promise<void>
  subscribeRealtime: () => () => void
  addOrder: (o: Omit<SalesOrder, 'pedidoId' | 'folio'>) => Promise<SalesOrder>
  updateOrder: (id: string, data: Partial<SalesOrder>) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
}

export const useSalesOrdersStore = create<SalesOrdersState>()((set, get) => ({
  orders: [], loading: false, initialized: false,

  subscribeRealtime() {
    return refChannel('erp_sales_orders_rt', (ch) => ch
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_sales_orders' }, async () => {
        if (!get().initialized) return
        const d = await fetchOrders(); if (d) set({ orders: d })
      })
    )
  },

  async loadOrders() {
    if (get().initialized) return
    set({ loading: true })
    try {
      const d = await fetchOrders()
      if (d) set({ orders: d, initialized: true })
    } finally {
      set({ loading: false })
    }
  },

  async addOrder(data) {
    // Folio atómico en servidor
    const { data: folioRow, error: folioErr } = await supabase
      .rpc('erp_next_folio', { p_prefix: 'PV', p_seq: 'erp_seq_folio_sales' })
    if (folioErr) toast.error('Error al generar folio. Se usará folio temporal.')
    const folio = (folioRow as string | null) ?? `PV-${Date.now()}`

    const { data: row, error } = await supabase
      .from('erp_sales_orders')
      .insert({
        folio, cliente_id: data.clienteId, cotizacion_id: data.cotizacionId ?? null,
        fecha_pedido: data.fechaPedido, fecha_entrega: data.fechaEntrega,
        estatus: data.estatus, iva_pct: data.ivaPct ?? 16, items: data.items,
        subtotal: data.subtotal, impuestos: data.impuestos, total: data.total, notas: data.notas,
      })
      .select('*')
      .maybeSingle()
    if (error) { toast.error('Error al crear pedido. Intenta de nuevo.'); throw error }
    const d = await fetchOrders()
    if (d) set({ orders: d })
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
    if (data.ivaPct !== undefined) patch.iva_pct = data.ivaPct
    if (data.notas !== undefined) patch.notas = data.notas

    // Optimistic update
    set(s => ({ orders: s.orders.map(o => o.pedidoId === id ? { ...o, ...data } : o) }))

    const { error } = await supabase.from('erp_sales_orders').update(patch).eq('id', id)
    if (error) {
      toast.error('Error al guardar. Intenta de nuevo.')
      const d = await fetchOrders()
      if (d) set({ orders: d })
      return
    }

    // Auto-generar factura al facturar, verificando con select('id') + índice
    if (data.estatus === 'facturado') {
      const order = get().orders.find(o => o.pedidoId === id)
      if (order) {
        const { count } = await supabase
          .from('erp_invoices_sale')
          .select('id', { count: 'exact', head: true })
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
  },

  async deleteOrder(id) {
    const backup = get().orders
    set(s => ({ orders: s.orders.filter(o => o.pedidoId !== id) }))
    const { error } = await supabase.from('erp_sales_orders').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar pedido. Intenta de nuevo.')
      set({ orders: backup })
    }
  },
}))
