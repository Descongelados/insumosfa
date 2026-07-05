import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Prospect } from '../types'
import { SEED_PROSPECTS } from '../data/seed'
import { useClientsStore } from './clientsStore'

/** Datos fiscales que se capturan al momento de convertir un prospecto a cliente */
export interface DatosFiscales {
  rfc: string
  regimenFiscal: string
  direccionFiscal: string
  limiteCredito: number
}

interface ProspectsState {
  prospects: Prospect[]
  addProspect: (p: Omit<Prospect, 'prospectoId' | 'fechaAlta'>) => void
  updateProspect: (id: string, data: Partial<Prospect>) => void
  deleteProspect: (id: string) => void
  /** Convierte un prospecto ganado en cliente y lo elimina de prospectos */
  convertirACliente: (id: string, fiscal: DatosFiscales) => void
}

export const useProspectsStore = create<ProspectsState>()(
  persist(
    (set, get) => ({
      prospects: SEED_PROSPECTS,
      addProspect(data) {
        const p: Prospect = { ...data, prospectoId: `p${Date.now()}`, fechaAlta: new Date().toISOString().split('T')[0] }
        set((s) => ({ prospects: [...s.prospects, p] }))
      },
      updateProspect(id, data) {
        set((s) => ({ prospects: s.prospects.map((p) => (p.prospectoId === id ? { ...p, ...data } : p)) }))
      },
      deleteProspect(id) {
        set((s) => ({ prospects: s.prospects.filter((p) => p.prospectoId !== id) }))
      },
      convertirACliente(id, fiscal) {
        const prospect = get().prospects.find((p) => p.prospectoId === id)
        if (!prospect) return
        useClientsStore.getState().addClient({
          razonSocial: prospect.empresa,
          rfc: fiscal.rfc,
          regimenFiscal: fiscal.regimenFiscal,
          direccionFiscal: fiscal.direccionFiscal,
          correo: prospect.correo,
          telefono: prospect.telefono,
          limiteCredito: fiscal.limiteCredito,
          estatus: 'activo',
        })
        set((s) => ({ prospects: s.prospects.filter((p) => p.prospectoId !== id) }))
      },
    }),
    { name: 'erp_prospects' }
  )
)
