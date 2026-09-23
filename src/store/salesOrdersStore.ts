import { create } from 'zustand'
import type { SalesOrder } from '../types'
import { supabase } from '../lib/supabase'
import { toast } from './toastStore'
import { refChannel } from './realtimeChannel'
import { useInventoryStore } from './inventoryStore'

type DbOrder = {
  id: string; folio: string; cliente_id: string; cliente_nombre: string; cotizacion_id: string | null
  fecha_pedido: string; fecha_entrega: string; estatus: string; iva_pct: number | null
  items: unknown; subtotal: number; impuestos: number; total: number; notas: string
}

function toOrder(r: DbOrder): SalesOrder {
  return {
    pedidoId: r.id, folio: r.folio, clienteId: r.cliente_id,
    clienteNombre: r.cliente_nombre || undefined,
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
  fetchOrderById: (id: string) => Promise<SalesOrder | null>
  addOrder: (o: Omit<SalesOrder, 'pedidoId' | 'folio'>, userEmail?: string) => Promise<SalesOrder>
  updateOrder: (id: string, data: Partial<SalesOrder>, userEmail?: string) => Promise<void>
  deleteOrder: (id: string, userEmail?: string) => Promise<void>
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

  async fetchOrderById(id) {
    const { data, error } = await supabase
      .from('erp_sales_orders').select('*').eq('id', id).maybeSingle()
    if (error || !data) return null
    const order = toOrder(data as DbOrder)
    // Actualizar en el store local también
    set(s => ({ orders: s.orders.map(o => o.pedidoId === id ? order : o) }))
    return order
  },

  async addOrder(data, userEmail = 'sistema') {
    // Folio atómico en servidor
    const { data: folioRow, error: folioErr } = await supabase
      .rpc('erp_next_folio', { p_prefix: 'PV', p_seq: 'erp_seq_folio_sales' })
    if (folioErr) toast.error('Error al generar folio. Se usará folio temporal.')
    const folio = (folioRow as string | null) ?? `PV-${Date.now()}`

    const { data: row, error } = await supabase
      .from('erp_sales_orders')
      .insert({
        folio, cliente_id: data.clienteId, cliente_nombre: data.clienteNombre ?? '',
        cotizacion_id: data.cotizacionId ?? null,
        fecha_pedido: data.fechaPedido, fechaEntrega: data.fechaEntrega,
        estatus: data.estatus, iva_pct: data.ivaPct ?? 16, items: data.items,
        subtotal: data.subtotal, impuestos: data.impuestos, total: data.total, notas: data.notas,
      })
      .select('*')
      .maybeSingle()
    if (error) { toast.error('Error al crear pedido. Intenta de nuevo.'); throw error }

    // Descontar inventario (SalidaVenta) para cada producto del pedido
    const { applyMovimiento, loadInventory } = useInventoryStore.getState()
    await loadInventory()
    for (const item of data.items) {
      if (item.productId && item.cantidad > 0) {
        try {
          await applyMovimiento({
            productId: item.productId,
            tipo: 'SalidaVenta',
            cantidad: item.cantidad,
            documentoOrigen: folio,
            usuario: userEmail,
            notas: `Venta registrada por pedido ${folio}`,
          })
        } catch (err) {
          console.error('Error descontando inventario para producto:', item.productId, err)
        }
      }
    }

    const d = await fetchOrders()
    if (d) set({ orders: d })
    return row ? toOrder(row as DbOrder) : { ...data, pedidoId: '', folio }
  },

  async updateOrder(id, data, userEmail = 'sistema') {
    const prevOrder = get().orders.find(o => o.pedidoId === id)
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

    // Si se cancela el pedido y antes no estaba cancelado, revertir stock
    if (data.estatus === 'cancelado' && prevOrder && prevOrder.estatus !== 'cancelado') {
      const { applyMovimiento, loadInventory } = useInventoryStore.getState()
      await loadInventory()
      for (const item of prevOrder.items) {
        if (item.productId && item.cantidad > 0) {
          try {
            await applyMovimiento({
              productId: item.productId,
              tipo: 'Devolucion',
              cantidad: item.cantidad,
              documentoOrigen: `Cancelación ${prevOrder.folio}`,
              usuario: userEmail,
              notas: `Reversión por cancelación de pedido ${prevOrder.folio}`,
            })
          } catch (err) {
            console.error('Error al revertir inventario por cancelación:', err)
          }
        }
      }
    }

    // Si se reactiva un pedido cancelado, volver a descontar
    if (prevOrder && prevOrder.estatus === 'cancelado' && data.estatus && data.estatus !== 'cancelado') {
      const itemsToDeduct = data.items ?? prevOrder.items
      const { applyMovimiento, loadInventory } = useInventoryStore.getState()
      await loadInventory()
      for (const item of itemsToDeduct) {
        if (item.productId && item.cantidad > 0) {
          try {
            await applyMovimiento({
              productId: item.productId,
              tipo: 'SalidaVenta',
              cantidad: item.cantidad,
              documentoOrigen: prevOrder.folio,
              usuario: userEmail,
              notas: `Reactivación de pedido ${prevOrder.folio}`,
            })
          } catch (err) {
            console.error('Error al descontar inventario por reactivación:', err)
          }
        }
      }
    }

    // Optimistic update
    set(s => ({ orders: s.orders.map(o => o.pedidoId === id ? { ...o, ...data } : o) }))

    const { error } = await supabase.from('erp_sales_orders').update(patch).eq('id', id)
    if (error) {
      toast.error('Error al guardar. Intenta de nuevo.')
      const d = await fetchOrders()
      if (d) set({ orders: d })
      return
    }
  },

  async deleteOrder(id, userEmail = 'sistema') {
    const target = get().orders.find(o => o.pedidoId === id)
    const backup = get().orders
    set(s => ({ orders: s.orders.filter(o => o.pedidoId !== id) }))

    // Si se elimina un pedido que NO estaba cancelado, revertir el stock al inventario
    if (target && target.estatus !== 'cancelado') {
      const { applyMovimiento, loadInventory } = useInventoryStore.getState()
      await loadInventory()
      for (const item of target.items) {
        if (item.productId && item.cantidad > 0) {
          try {
            await applyMovimiento({
              productId: item.productId,
              tipo: 'Devolucion',
              cantidad: item.cantidad,
              documentoOrigen: `Eliminación ${target.folio}`,
              usuario: userEmail,
              notas: `Reversión por eliminación de pedido ${target.folio}`,
            })
          } catch (err) {
            console.error('Error al revertir inventario por eliminación:', err)
          }
        }
      }
    }

    const { error } = await supabase.from('erp_sales_orders').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar pedido. Intenta de nuevo.')
      set({ orders: backup })
    }
  },
}))
