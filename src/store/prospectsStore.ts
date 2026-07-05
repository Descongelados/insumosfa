import { create } from 'zustand'
import type { Prospect } from '../types'
import { SEED_PROSPECTS } from '../data/seed'

interface ProspectsState {
  prospects: Prospect[]
  addProspect: (p: Omit<Prospect, 'prospectoId' | 'fechaAlta'>) => void
  updateProspect: (id: string, data: Partial<Prospect>) => void
}

export const useProspectsStore = create<ProspectsState>((set) => ({
  prospects: SEED_PROSPECTS,
  addProspect(data) {
    const p: Prospect = { ...data, prospectoId: `p${Date.now()}`, fechaAlta: new Date().toISOString().split('T')[0] }
    set((s) => ({ prospects: [...s.prospects, p] }))
  },
  updateProspect(id, data) {
    set((s) => ({ prospects: s.prospects.map((p) => (p.prospectoId === id ? { ...p, ...data } : p)) }))
  },
}))
