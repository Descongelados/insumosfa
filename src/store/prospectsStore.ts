import { create } from 'zustand'
import type { Prospect } from '../types'
import { supabase } from '../lib/supabase'
import { useClientsStore } from './clientsStore'

export interface DatosFiscales {
  rfc: string; regimenFiscal: string; direccionFiscal: string; limiteCredito: number
}

type DbProspect = {
  id: string; empresa: string; contacto: string; correo: string
  telefono: string; origen: string; estatus: string
  valor_potencial: number; fecha_alta: string
}

function toProspect(r: DbProspect): Prospect {
  return {
    prospectoId: r.id, empresa: r.empresa, contacto: r.contacto,
    correo: r.correo, telefono: r.telefono, origen: r.origen,
    estatus: r.estatus as Prospect['estatus'],
    valorPotencial: r.valor_potencial, fechaAlta: r.fecha_alta,
  }
}

interface ProspectsState {
  prospects: Prospect[]
  loading: boolean
  loadProspects: () => Promise<void>
  subscribeRealtime: () => () => void
  addProspect: (p: Omit<Prospect, 'prospectoId' | 'fechaAlta'>) => Promise<void>
  updateProspect: (id: string, data: Partial<Prospect>) => Promise<void>
  deleteProspect: (id: string) => Promise<void>
  convertirACliente: (id: string, fiscal: DatosFiscales) => Promise<void>
}

export const useProspectsStore = create<ProspectsState>()((set, get) => ({
  prospects: [], loading: false,

  subscribeRealtime() {
    const ch = supabase
      .channel('erp_prospects_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_prospects' }, () => { void get().loadProspects() })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  async loadProspects() {
    set({ loading: true })
    try {
      const { data } = await supabase.from('erp_prospects').select('*').order('created_at', { ascending: false })
      if (data) set({ prospects: (data as DbProspect[]).map(toProspect) })
    } finally {
      set({ loading: false })
    }
  },

  async addProspect(data) {
    await supabase.from('erp_prospects').insert({
      empresa: data.empresa, contacto: data.contacto, correo: data.correo,
      telefono: data.telefono, origen: data.origen, estatus: data.estatus,
      valor_potencial: data.valorPotencial,
    })
    await get().loadProspects()
  },

  async updateProspect(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.empresa !== undefined) patch.empresa = data.empresa
    if (data.contacto !== undefined) patch.contacto = data.contacto
    if (data.correo !== undefined) patch.correo = data.correo
    if (data.telefono !== undefined) patch.telefono = data.telefono
    if (data.origen !== undefined) patch.origen = data.origen
    if (data.estatus !== undefined) patch.estatus = data.estatus
    if (data.valorPotencial !== undefined) patch.valor_potencial = data.valorPotencial
    await supabase.from('erp_prospects').update(patch).eq('id', id)
    await get().loadProspects()
  },

  async deleteProspect(id) {
    await supabase.from('erp_prospects').delete().eq('id', id)
    set(s => ({ prospects: s.prospects.filter(p => p.prospectoId !== id) }))
  },

  async convertirACliente(id, fiscal) {
    const prospect = get().prospects.find(p => p.prospectoId === id)
    if (!prospect) return
    await useClientsStore.getState().addClient({
      razonSocial: prospect.empresa, rfc: fiscal.rfc,
      regimenFiscal: fiscal.regimenFiscal, direccionFiscal: fiscal.direccionFiscal,
      correo: prospect.correo, telefono: prospect.telefono,
      limiteCredito: fiscal.limiteCredito, estatus: 'activo',
    })
    await supabase.from('erp_prospects').delete().eq('id', id)
    await get().loadProspects()
  },
}))
