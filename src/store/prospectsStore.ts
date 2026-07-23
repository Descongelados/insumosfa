import { create } from 'zustand'
import type { Prospect, ContactNote } from '../types'
import { supabase } from '../lib/supabase'
import { toast } from './toastStore'
import { refChannel } from './realtimeChannel'
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
  const { data, error } = await supabase.from('erp_prospects').select('*').order('created_at', { ascending: false })
  if (error) { toast.error('Error al cargar prospectos.'); return null }
  return (data as DbProspect[]).map(toProspect)
}
async function fetchProspectNotes() {
  const { data, error } = await supabase.from('erp_prospect_notes').select('*').order('fecha', { ascending: false })
  if (error) return null
  return (data as DbProspectNote[]).map(toProspectNote)
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
    return refChannel('erp_prospects_rt', (ch) => ch
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_prospects' }, async () => {
        if (!get().initialized) return
        const d = await fetchProspects(); if (d) set({ prospects: d })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_prospect_notes' }, async () => {
        if (!get().initialized) return
        const d = await fetchProspectNotes(); if (d) set({ prospectNotes: d })
      })
    )
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
    const backup = get().prospects
    set(s => ({ prospects: s.prospects.filter(p => p.prospectoId !== id) }))
    const { error } = await supabase.from('erp_prospects').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar prospecto. Intenta de nuevo.')
      set({ prospects: backup })
    }
  },

  async convertirACliente(id, fiscal) {
    const prospect = get().prospects.find(p => p.prospectoId === id)
    if (!prospect) return

    // Crear cliente y obtener su nuevo ID
    const newClientId = await useClientsStore.getState().addClient({
      razonSocial: prospect.empresa, rfc: fiscal.rfc,
      regimenFiscal: fiscal.regimenFiscal, direccionFiscal: fiscal.direccionFiscal,
      correo: prospect.correo, telefono: prospect.telefono,
      limiteCredito: fiscal.limiteCredito, estatus: 'activo',
      ciudad: prospect.ciudad ?? '',
      productosActividad: prospect.productosActividad ?? '',
    })

    // Migrar notas del prospecto al nuevo cliente
    if (newClientId) {
      const notasProspecto = get().prospectNotes.filter(n => n.entidadId === id)
      if (notasProspecto.length > 0) {
        await supabase.from('erp_client_notes').insert(
          notasProspecto.map(n => ({ cliente_id: newClientId, texto: n.texto, fecha: n.fecha }))
        )
        const clientNotes = await supabase.from('erp_client_notes').select('*').order('fecha', { ascending: false })
        if (clientNotes.data) {
          useClientsStore.setState({
            clientNotes: (clientNotes.data as { id: string; cliente_id: string; fecha: string; texto: string }[])
              .map(r => ({ noteId: r.id, entidadId: r.cliente_id, fecha: r.fecha, texto: r.texto }))
          })
        }
      }
    }

    set(s => ({ prospects: s.prospects.filter(p => p.prospectoId !== id) }))
    await supabase.from('erp_prospects').delete().eq('id', id)
  },

  async addProspectNote(prospectoId, texto) {
    await supabase.from('erp_prospect_notes').insert({ prospecto_id: prospectoId, texto })
    const d = await fetchProspectNotes()
    if (d) set({ prospectNotes: d })
  },

  async removeProspectNote(noteId) {
    const backup = get().prospectNotes
    set(s => ({ prospectNotes: s.prospectNotes.filter(n => n.noteId !== noteId) }))
    const { error } = await supabase.from('erp_prospect_notes').delete().eq('id', noteId)
    if (error) {
      toast.error('Error al eliminar nota.')
      set({ prospectNotes: backup })
    }
  },
}))
