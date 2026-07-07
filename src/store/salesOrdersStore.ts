import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SalesOrder } from '../types'
import { SEED_SALES_ORDERS } from '../data/seed'
import { useFinanceStore } from './financeStore'

interface SalesOrdersState {
  orders: SalesOrder[]
  folioCounter: number
  addOrder: (o: Omit<SalesOrder, 'pedidoId' | 'folio'>) => SalesOrder
  updateOrder: (id: string, data: Partial<SalesOrder>) => void
  deleteOrder: (id: string) => void
}

export const useSalesOrdersStore = create<SalesOrdersState>()(
  persist(
    (set, get) => ({
      orders: SEED_SALES_ORDERS,
      folioCounter: 1,
      addOrder(data) {
        const n = get().folioCounter
        const order: SalesOrder = {
          ...data,
          pedidoId: `so${Date.now()}`,
          folio: `PV-${String(n).padStart(4, '0')}`,
        }
        set((s) => ({ orders: [order, ...s.orders], folioCounter: s.folioCounter + 1 }))
        return order
      },
      updateOrder(id, data) {
        set((s) => ({ orders: s.orders.map((o) => (o.pedidoId === id ? { ...o, ...data } : o)) }))
        // When an order is marked as 'facturado', automatically create a FacturaVenta in Finance
        if (data.estatus === 'facturado') {
          const order = get().orders.find((o) => o.pedidoId === id)
          if (order) {
            const alreadyExists = useFinanceStore.getState().facturasVenta.some(
              (f) => f.pedidoId === id
            )
            if (!alreadyExists) {
              const today = new Date().toISOString().split('T')[0]
              const venc = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              useFinanceStore.getState().addFacturaVenta({
                clienteId: order.clienteId,
                pedidoId: order.pedidoId,
                fecha: today,
                fechaVencimiento: venc,
                subtotal: order.subtotal,
                impuestos: order.impuestos,
                total: order.total,
                saldoPendiente: order.total,
                estatus: 'emitida',
              })
            }
          }
        }
      },
      deleteOrder(id) {
        set((s) => ({ orders: s.orders.filter((o) => o.pedidoId !== id) }))
      },
    }),
    { name: 'erp_sales_orders' }
  )
)
