import { create } from 'zustand'
import type { SalesOrder } from '../types'
import { SEED_SALES_ORDERS } from '../data/seed'

let folioCounter = SEED_SALES_ORDERS.length + 1

interface SalesOrdersState {
  orders: SalesOrder[]
  addOrder: (o: Omit<SalesOrder, 'pedidoId' | 'folio'>) => SalesOrder
  updateOrder: (id: string, data: Partial<SalesOrder>) => void
}

export const useSalesOrdersStore = create<SalesOrdersState>((set) => ({
  orders: SEED_SALES_ORDERS,
  addOrder(data) {
    const order: SalesOrder = {
      ...data,
      pedidoId: `so${Date.now()}`,
      folio: `PV-${String(folioCounter++).padStart(4, '0')}`,
    }
    set((s) => ({ orders: [order, ...s.orders] }))
    return order
  },
  updateOrder(id, data) {
    set((s) => ({ orders: s.orders.map((o) => (o.pedidoId === id ? { ...o, ...data } : o)) }))
  },
}))
