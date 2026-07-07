import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SolicitudCompra, OrdenCompra } from '../types'
import { SEED_SOLICITUDES, SEED_ORDENES_COMPRA } from '../data/seed'

interface PurchasesState {
  solicitudes: SolicitudCompra[]
  ordenesCompra: OrdenCompra[]
  ocCounter: number
  addSolicitud: (s: Omit<SolicitudCompra, 'solicitudId'>) => void
  updateSolicitud: (id: string, data: Partial<SolicitudCompra>) => void
  deleteSolicitud: (id: string) => void
  addOrdenCompra: (o: Omit<OrdenCompra, 'ordenCompraId' | 'folio'>) => OrdenCompra
  updateOrdenCompra: (id: string, data: Partial<OrdenCompra>) => void
  deleteOrdenCompra: (id: string) => void
}

export const usePurchasesStore = create<PurchasesState>()(
  persist(
    (set, get) => ({
      solicitudes: SEED_SOLICITUDES,
      ordenesCompra: SEED_ORDENES_COMPRA,
      ocCounter: 1,
      addSolicitud(data) {
        set((s) => ({ solicitudes: [...s.solicitudes, { ...data, solicitudId: `sc${Date.now()}` }] }))
      },
      updateSolicitud(id, data) {
        set((s) => ({ solicitudes: s.solicitudes.map((sc) => (sc.solicitudId === id ? { ...sc, ...data } : sc)) }))
      },
      deleteSolicitud(id) {
        set((s) => ({ solicitudes: s.solicitudes.filter((sc) => sc.solicitudId !== id) }))
      },
      addOrdenCompra(data) {
        const n = get().ocCounter
        const oc: OrdenCompra = {
          ...data,
          ordenCompraId: `oc${Date.now()}`,
          folio: `OC-${String(n).padStart(4, '0')}`,
        }
        set((s) => ({ ordenesCompra: [oc, ...s.ordenesCompra], ocCounter: s.ocCounter + 1 }))
        return oc
      },
      updateOrdenCompra(id, data) {
        set((s) => ({ ordenesCompra: s.ordenesCompra.map((oc) => (oc.ordenCompraId === id ? { ...oc, ...data } : oc)) }))
      },
      deleteOrdenCompra(id) {
        set((s) => ({ ordenesCompra: s.ordenesCompra.filter((oc) => oc.ordenCompraId !== id) }))
      },
    }),
    { name: 'erp_purchases' }
  )
)
