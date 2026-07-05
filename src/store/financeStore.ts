import { create } from 'zustand'
import type { FacturaVenta, PagoCliente, FacturaProveedor, PagoProveedor, Banco } from '../types'
import {
  SEED_FACTURAS_VENTA, SEED_PAGOS_CLIENTES,
  SEED_FACTURAS_PROVEEDOR, SEED_PAGOS_PROVEEDORES, SEED_BANCOS
} from '../data/seed'

let fvCounter = SEED_FACTURAS_VENTA.length + 1
let fpCounter = SEED_FACTURAS_PROVEEDOR.length + 1

interface FinanceState {
  facturasVenta: FacturaVenta[]
  pagosClientes: PagoCliente[]
  facturasProveedor: FacturaProveedor[]
  pagosProveedores: PagoProveedor[]
  bancos: Banco[]
  addFacturaVenta: (f: Omit<FacturaVenta, 'facturaId' | 'folio'>) => void
  addPagoCliente: (p: Omit<PagoCliente, 'pagoId'>) => void
  addFacturaProveedor: (f: Omit<FacturaProveedor, 'facturaProvId' | 'folio'>) => void
  addPagoProveedor: (p: Omit<PagoProveedor, 'pagoId'>) => void
  updateBanco: (id: string, data: Partial<Banco>) => void
}

export const useFinanceStore = create<FinanceState>((set) => ({
  facturasVenta: SEED_FACTURAS_VENTA,
  pagosClientes: SEED_PAGOS_CLIENTES,
  facturasProveedor: SEED_FACTURAS_PROVEEDOR,
  pagosProveedores: SEED_PAGOS_PROVEEDORES,
  bancos: SEED_BANCOS,

  addFacturaVenta(data) {
    const f: FacturaVenta = { ...data, facturaId: `fv${Date.now()}`, folio: `FAC-${String(fvCounter++).padStart(4, '0')}` }
    set((s) => ({ facturasVenta: [f, ...s.facturasVenta] }))
  },

  addPagoCliente(data) {
    const p: PagoCliente = { ...data, pagoId: `pc${Date.now()}` }
    set((s) => {
      const updated = s.facturasVenta.map((f) => {
        if (f.facturaId !== data.facturaId) return f
        const nuevo = Math.max(0, f.saldoPendiente - data.monto)
        return { ...f, saldoPendiente: nuevo, estatus: nuevo === 0 ? 'pagada' : 'parcial' } as FacturaVenta
      })
      return { pagosClientes: [...s.pagosClientes, p], facturasVenta: updated }
    })
  },

  addFacturaProveedor(data) {
    const f: FacturaProveedor = { ...data, facturaProvId: `fp${Date.now()}`, folio: `FPROV-${String(fpCounter++).padStart(4, '0')}` }
    set((s) => ({ facturasProveedor: [f, ...s.facturasProveedor] }))
  },

  addPagoProveedor(data) {
    const p: PagoProveedor = { ...data, pagoId: `pp${Date.now()}` }
    set((s) => {
      const updated = s.facturasProveedor.map((f) => {
        if (f.facturaProvId !== data.facturaProvId) return f
        const nuevo = Math.max(0, f.saldoPendiente - data.monto)
        return { ...f, saldoPendiente: nuevo, estatus: nuevo === 0 ? 'pagada' : 'parcial' } as FacturaProveedor
      })
      return { pagosProveedores: [...s.pagosProveedores, p], facturasProveedor: updated }
    })
  },

  updateBanco(id, data) {
    set((s) => ({ bancos: s.bancos.map((b) => (b.bancoId === id ? { ...b, ...data } : b)) }))
  },
}))
