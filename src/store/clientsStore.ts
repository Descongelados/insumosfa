import { create } from 'zustand'
import type { Client, ContactoCliente, ContactNote } from '../types'
import { supabase } from '../lib/supabase'
import { toast } from './toastStore'

type DbClient = {
  id: string; razon_social: string; rfc: string; regimen_fiscal: string
  direccion_fiscal: string; correo: string; telefono: string
  limite_credito: number; estatus: string; fecha_alta: string
}
type DbContact = {
  id: string; cliente_id: string; nombre: string
  puesto: string; correo: string; telefono: string
}
type DbClientNote = {
  id: string; cliente_id: string; fecha: string; texto: string
}

function toClient(r: DbClient): Client {
  return {
    clientId: r.id, razonSocial: r.razon_social, rfc: r.rfc,
    regimenFiscal: r.regimen_fiscal, direccionFiscal: r.direccion_fiscal,
    correo: r.correo, telefono: r.telefono, limiteCredito: r.limite_credito,
    estatus: r.estatus as 'activo' | 'inactivo', fechaAlta: r.fecha_alta,
  }
}
function toContacto(r: DbContact): ContactoCliente {
  return {
    contactoId: r.id, clienteId: r.cliente_id, nombre: r.nombre,
    puesto: r.puesto, correo: r.correo, telefono: r.telefono,
  }
}
function toClientNote(r: DbClientNote): ContactNote {
  return { noteId: r.id, entidadId: r.cliente_id, fecha: r.fecha, texto: r.texto }
}

// ── Helpers de recarga individual ────────────────────────────────────────────

async function fetchClients() {
  const { data } = await supabase.from('erp_clients').select('*').order('created_at', { ascending: false })
  return data ? (data as DbClient[]).map(toClient) : null
}
async function fetchContactos() {
  const { data } = await supabase.from('erp_client_contacts').select('*')
  return data ? (data as DbContact[]).map(toContacto) : null
}
async function fetchClientNotes() {
  const { data } = await supabase.from('erp_client_notes').select('*').order('fecha', { ascending: false })
  return data ? (data as DbClientNote[]).map(toClientNote) : null
}

interface ClientsState {
  clients: Client[]
  contactos: ContactoCliente[]
  clientNotes: ContactNote[]
  loading: boolean
  initialized: boolean
  loadClients: () => Promise<void>
  subscribeRealtime: () => () => void
  addClient: (c: Omit<Client, 'clientId' | 'fechaAlta'>) => Promise<string>
  updateClient: (id: string, data: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  addContacto: (c: Omit<ContactoCliente, 'contactoId'>) => Promise<void>
  removeContacto: (id: string) => Promise<void>
  addClientNote: (clienteId: string, texto: string) => Promise<void>
  removeClientNote: (noteId: string) => Promise<void>
}

export const useClientsStore = create<ClientsState>()((set, get) => ({
  clients: [], contactos: [], clientNotes: [], loading: false, initialized: false,

  // ── Realtime granular: cada tabla recarga solo su entidad ─────────────────
  subscribeRealtime() {
    const ch = supabase
      .channel('erp_clients_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_clients' }, async () => {
        const d = await fetchClients(); if (d) set({ clients: d })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_client_contacts' }, async () => {
        const d = await fetchContactos(); if (d) set({ contactos: d })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_client_notes' }, async () => {
        const d = await fetchClientNotes(); if (d) set({ clientNotes: d })
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  async loadClients() {
    if (get().initialized) return
    set({ loading: true })
    try {
      const [clients, contactos, clientNotes] = await Promise.all([
        fetchClients(), fetchContactos(), fetchClientNotes(),
      ])
      if (clients)     set({ clients })
      if (contactos)   set({ contactos })
      if (clientNotes) set({ clientNotes })
      set({ initialized: true })
    } finally {
      set({ loading: false })
    }
  },

  async addClient(data) {
    const { data: row } = await supabase
      .from('erp_clients')
      .insert({
        razon_social: data.razonSocial, rfc: data.rfc,
        regimen_fiscal: data.regimenFiscal, direccion_fiscal: data.direccionFiscal,
        correo: data.correo, telefono: data.telefono,
        limite_credito: data.limiteCredito, estatus: data.estatus,
      })
      .select('id')
      .maybeSingle()
    const d = await fetchClients()
    if (d) set({ clients: d })
    return (row as { id: string } | null)?.id ?? ''
  },

  async updateClient(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.razonSocial !== undefined) patch.razon_social = data.razonSocial
    if (data.rfc !== undefined) patch.rfc = data.rfc
    if (data.regimenFiscal !== undefined) patch.regimen_fiscal = data.regimenFiscal
    if (data.direccionFiscal !== undefined) patch.direccion_fiscal = data.direccionFiscal
    if (data.correo !== undefined) patch.correo = data.correo
    if (data.telefono !== undefined) patch.telefono = data.telefono
    if (data.limiteCredito !== undefined) patch.limite_credito = data.limiteCredito
    if (data.estatus !== undefined) patch.estatus = data.estatus

    // Optimistic update
    set(s => ({ clients: s.clients.map(c => c.clientId === id ? { ...c, ...data } : c) }))

    const { error } = await supabase.from('erp_clients').update(patch).eq('id', id)
    if (error) {
      toast.error('Error al guardar. Intenta de nuevo.')
      const d = await fetchClients()
      if (d) set({ clients: d })
    }
  },

  async deleteClient(id) {
    set(s => ({
      clients: s.clients.filter(c => c.clientId !== id),
      contactos: s.contactos.filter(c => c.clienteId !== id),
    }))
    await supabase.from('erp_clients').delete().eq('id', id)
  },

  async addContacto(data) {
    await supabase.from('erp_client_contacts').insert({
      cliente_id: data.clienteId, nombre: data.nombre,
      puesto: data.puesto, correo: data.correo, telefono: data.telefono,
    })
    const d = await fetchContactos()
    if (d) set({ contactos: d })
  },

  async removeContacto(id) {
    set(s => ({ contactos: s.contactos.filter(c => c.contactoId !== id) }))
    await supabase.from('erp_client_contacts').delete().eq('id', id)
  },

  async addClientNote(clienteId, texto) {
    await supabase.from('erp_client_notes').insert({ cliente_id: clienteId, texto })
    const d = await fetchClientNotes()
    if (d) set({ clientNotes: d })
  },

  async removeClientNote(noteId) {
    set(s => ({ clientNotes: s.clientNotes.filter(n => n.noteId !== noteId) }))
    await supabase.from('erp_client_notes').delete().eq('id', noteId)
  },
}))
