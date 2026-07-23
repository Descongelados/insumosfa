import { create } from 'zustand'
import type { Prospect, ContactNote } from '../types'
import { supabase } from '../lib/supabase'
import { toast } from './toastStore'
import { useClientsStore } from './clientsStore'

export interface DatosFiscales {
  rfc: string; regimenFiscal: string; direccionFiscal: string; limiteCredito: number
}

type DbProspect = {
  id: string; empresa: string; contacto: string; correo: string
  telefono: string; origen: string; estatus: string
  valor_potencial: number; fecha_alta: string; creado_por: string
  ciudad: string; productos_actividad: string
}
type DbProspectNote = {
  id: string; prospecto_id: string; fecha: string; texto: string
}

function toProspect(r: DbProspect): Prospect {
  return {
    prospectoId: r.id, empresa: r.empresa, contacto: r.contacto,
    correo: r.correo, telefono: r.telefono, origen: r.origen,
    estatus: r.estatus as Prospect['estatus'],
    valorPotencial: r.valor_potencial, fechaAlta: r.fecha_alta,
    creadoPor: r.creado_por ?? '',
    ciudad: r.ciudad ?? '', productosActividad: r.productos_actividad ?? '',
  }
}
function toProspectNote(r: DbProspectNote): ContactNote {
  return { noteId: r.id, entidadId: r.prospecto_id, fecha: r.fecha, texto: r.texto }
}

// ── Helpers de recarga individual ────────────────────────────────────────────

async function fetchProspects() {
  const { data } = await supabase.from('erp_prospects').select('*').order('created_at', { ascending: false })
  return data ? (data as DbProspect[]).map(toProspect) : null
}
async function fetchProspectNotes() {
  const { data } = await supabase.from('erp_prospect_notes').select('*').order('fecha', { ascending: false })
  return data ? (data as DbProspectNote[]).map(toProspectNote) : null
}

interface ProspectsState {
  prospects: Prospect[]
  prospectNotes: ContactNote[]
  loading: boolean
  initialized: boolean
  loadProspects: () => Promise<void>
  subscribeRealtime: () => () => void
  addProspect: (p: Omit<Prospect, 'prospectoId' | 'fechaAlta'>) => Promise<void>
  updateProspect: (id: string, data: Partial<Prospect>) => Promise<void>
  deleteProspect: (id: string) => Promise<void>
  convertirACliente: (id: string, fiscal: DatosFiscales) => Promise<void>
  addProspectNote: (prospectoId: string, texto: string) => Promise<void>
  removeProspectNote: (noteId: string) => Promise<void>
}

export const useProspectsStore = create<ProspectsState>()((set, get) => ({
  prospects: [], prospectNotes: [], loading: false, initialized: false,

  subscribeRealtime() {
    const ch = supabase
      .channel('erp_prospects_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_prospects' }, async () => {
        const d = await fetchProspects(); if (d) set({ prospects: d })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_prospect_notes' }, async () => {
        const d = await fetchProspectNotes(); if (d) set({ prospectNotes: d })
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  async loadProspects() {
    if (get().initialized) return
    set({ loading: true })
    try {
      const [prospects, prospectNotes] = await Promise.all([fetchProspects(), fetchProspectNotes()])
      if (prospects)     set({ prospects })
      if (prospectNotes) set({ prospectNotes })
      set({ initialized: true })
    } finally {
      set({ loading: false })
    }
  },

  async addProspect(data) {
    await supabase.from('erp_prospects').insert({
      empresa: data.empresa, contacto: data.contacto, correo: data.correo,
      telefono: data.telefono, origen: data.origen, estatus: data.estatus,
      valor_potencial: data.valorPotencial, creado_por: data.creadoPor ?? '',
      ciudad: data.ciudad ?? '', productos_actividad: data.productosActividad ?? '',
    })
    const d = await fetchProspects()
    if (d) set({ prospects: d })
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
    if (data.ciudad !== undefined) patch.ciudad = data.ciudad
    if (data.productosActividad !== undefined) patch.productos_actividad = data.productosActividad

    // Optimistic update
    set(s => ({ prospects: s.prospects.map(p => p.prospectoId === id ? { ...p, ...data } : p) }))

    const { error } = await supabase.from('erp_prospects').update(patch).eq('id', id)
    if (error) {
      toast.error('Error al guardar. Intenta de nuevo.')
      const d = await fetchProspects()
      if (d) set({ prospects: d })
    }
  },

  async deleteProspect(id) {
    set(s => ({ prospects: s.prospects.filter(p => p.prospectoId !== id) }))
    await supabase.from('erp_prospects').delete().eq('id', id)
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
    set(s => ({ prospects: s.prospects.filter(p => p.prospectoId !== id) }))
    await supabase.from('erp_prospects').delete().eq('id', id)
  },

  async addProspectNote(prospectoId, texto) {
    await supabase.from('erp_prospect_notes').insert({ prospecto_id: prospectoId, texto })
    const d = await fetchProspectNotes()
    if (d) set({ prospectNotes: d })
  },

  async removeProspectNote(noteId) {
    set(s => ({ prospectNotes: s.prospectNotes.filter(n => n.noteId !== noteId) }))
    await supabase.from('erp_prospect_notes').delete().eq('id', noteId)
  },
}))
