import { create } from 'zustand'
import type { Transportista, Embarque } from '../types'
import { SEED_TRANSPORTISTAS, SEED_EMBARQUES } from '../data/seed'

let embCounter = SEED_EMBARQUES.length + 1

interface LogisticsState {
  transportistas: Transportista[]
  embarques: Embarque[]
  addTransportista: (t: Omit<Transportista, 'transportistaId'>) => void
  addEmbarque: (e: Omit<Embarque, 'embarqueId' | 'folio'>) => void
  updateEmbarque: (id: string, data: Partial<Embarque>) => void
}

export const useLogisticsStore = create<LogisticsState>((set) => ({
  transportistas: SEED_TRANSPORTISTAS,
  embarques: SEED_EMBARQUES,
  addTransportista(data) {
    set((s) => ({ transportistas: [...s.transportistas, { ...data, transportistaId: `t${Date.now()}` }] }))
  },
  addEmbarque(data) {
    const emb: Embarque = {
      ...data,
      embarqueId: `em${Date.now()}`,
      folio: `EMB-${String(embCounter++).padStart(4, '0')}`,
    }
    set((s) => ({ embarques: [emb, ...s.embarques] }))
  },
  updateEmbarque(id, data) {
    set((s) => ({ embarques: s.embarques.map((e) => (e.embarqueId === id ? { ...e, ...data } : e)) }))
  },
}))
