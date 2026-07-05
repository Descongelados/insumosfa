import { create } from 'zustand'
import type { SolicitudCompra, OrdenCompra } from '../types'
import { SEED_SOLICITUDES, SEED_ORDENES_COMPRA } from '../data/seed'

let ocCounter = SEED_ORDENES_COMPRA.length + 1

interface PurchasesState {
  solicitudes: SolicitudCompra[]
  ordenesCompra: OrdenCompra[]
  addSolicitud: (s: Omit<SolicitudCompra, 'solicitudId'>) => void
  updateSolicitud: (id: string, data: Partial<SolicitudCompra>) => void
  addOrdenCompra: (o: Omit<OrdenCompra, 'ordenCompraId' | 'folio'>) => OrdenCompra
  updateOrdenCompra: (id: string, data: Partial<OrdenCompra>) => void
}

export const usePurchasesStore = create<PurchasesState>((set) => ({
  solicitudes: SEED_SOLICITUDES,
  ordenesCompra: SEED_ORDENES_COMPRA,
  addSolicitud(data) {
    set((s) => ({ solicitudes: [...s.solicitudes, { ...data, solicitudId: `sc${Date.now()}` }] }))
  },
  updateSolicitud(id, data) {
    set((s) => ({ solicitudes: s.solicitudes.map((sc) => (sc.solicitudId === id ? { ...sc, ...data } : sc)) }))
  },
  addOrdenCompra(data) {
    const oc: OrdenCompra = {
      ...data,
      ordenCompraId: `oc${Date.now()}`,
      folio: `OC-${String(ocCounter++).padStart(4, '0')}`,
    }
    set((s) => ({ ordenesCompra: [oc, ...s.ordenesCompra] }))
    return oc
  },
  updateOrdenCompra(id, data) {
    set((s) => ({ ordenesCompra: s.ordenesCompra.map((oc) => (oc.ordenCompraId === id ? { ...oc, ...data } : oc)) }))
  },
}))
