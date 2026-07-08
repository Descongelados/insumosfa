import { create } from 'zustand'
import type { Client, ContactoCliente } from '../types'
import { supabase } from '../lib/supabase'

type DbClient = {
  id: string; razon_social: string; rfc: string; regimen_fiscal: string
  direccion_fiscal: string; correo: string; telefono: string
  limite_credito: number; estatus: string; fecha_alta: string
}
type DbContact = {
  id: string; cliente_id: string; nombre: string
  puesto: string; correo: string; telefono: string
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

interface ClientsState {
  clients: Client[]
  contactos: ContactoCliente[]
  loading: boolean
  loadClients: () => Promise<void>
  subscribeRealtime: () => () => void
  addClient: (c: Omit<Client, 'clientId' | 'fechaAlta'>) => Promise<string>
  updateClient: (id: string, data: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  addContacto: (c: Omit<ContactoCliente, 'contactoId'>) => Promise<void>
  removeContacto: (id: string) => Promise<void>
}

export const useClientsStore = create<ClientsState>()((set, get) => ({
  clients: [], contactos: [], loading: false,

  subscribeRealtime() {
    const ch = supabase
      .channel('erp_clients_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_clients' }, () => { void get().loadClients() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_client_contacts' }, () => { void get().loadClients() })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  async loadClients() {
    set({ loading: true })
    try {
      const [{ data: cd }, { data: ctd }] = await Promise.all([
        supabase.from('erp_clients').select('*').order('created_at', { ascending: false }),
        supabase.from('erp_client_contacts').select('*'),
      ])
      if (cd) set({ clients: (cd as DbClient[]).map(toClient) })
      if (ctd) set({ contactos: (ctd as DbContact[]).map(toContacto) })
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
    await get().loadClients()
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
    await supabase.from('erp_clients').update(patch).eq('id', id)
    await get().loadClients()
  },

  async deleteClient(id) {
    await supabase.from('erp_clients').delete().eq('id', id)
    set(s => ({
      clients: s.clients.filter(c => c.clientId !== id),
      contactos: s.contactos.filter(c => c.clienteId !== id),
    }))
  },

  async addContacto(data) {
    await supabase.from('erp_client_contacts').insert({
      cliente_id: data.clienteId, nombre: data.nombre,
      puesto: data.puesto, correo: data.correo, telefono: data.telefono,
    })
    await get().loadClients()
  },

  async removeContacto(id) {
    await supabase.from('erp_client_contacts').delete().eq('id', id)
    set(s => ({ contactos: s.contactos.filter(c => c.contactoId !== id) }))
  },
}))
