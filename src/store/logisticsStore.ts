import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Embarque, Transportista, EmbarqueEstatus } from '../types'
import { SEED_EMBARQUES, SEED_TRANSPORTISTAS } from '../data/seed'

interface LogisticsState {
  embarques: Embarque[]
  transportistas: Transportista[]
  embCounter: number
  addEmbarque: (e: Omit<Embarque, 'embarqueId' | 'folio'>) => void
  updateEmbarque: (id: string, data: Partial<Embarque>) => void
  addTransportista: (t: Omit<Transportista, 'transportistaId'>) => void
  updateTransportista: (id: string, data: Partial<Transportista>) => void
  deleteTransportista: (id: string) => void
}

export const useLogisticsStore = create<LogisticsState>()(
  persist(
    (set, get) => ({
      embarques: SEED_EMBARQUES,
      transportistas: SEED_TRANSPORTISTAS,
      embCounter: SEED_EMBARQUES.length + 1,
      addEmbarque(data) {
        const n = get().embCounter
        const embarque: Embarque = {
          ...data,
          embarqueId: `em${Date.now()}`,
          folio: `EMB-${String(n).padStart(4, '0')}`,
          notas: data.notas ?? '',
        }
        set((s) => ({ embarques: [embarque, ...s.embarques], embCounter: s.embCounter + 1 }))
      },
      updateEmbarque(id, data) {
        set((s) => ({ embarques: s.embarques.map((e) => (e.embarqueId === id ? { ...e, ...data } : e)) }))
      },
      addTransportista(data) {
        const t: Transportista = { ...data, transportistaId: `t${Date.now()}` }
        set((s) => ({ transportistas: [...s.transportistas, t] }))
      },
      updateTransportista(id, data) {
        set((s) => ({ transportistas: s.transportistas.map((t) => (t.transportistaId === id ? { ...t, ...data } : t)) }))
      },
      deleteTransportista(id) {
        set((s) => ({ transportistas: s.transportistas.filter((t) => t.transportistaId !== id) }))
      },
    }),
    { name: 'erp_logistics' }
  )
)
