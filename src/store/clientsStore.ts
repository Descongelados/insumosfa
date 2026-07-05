import { create } from 'zustand'
import type { Client, ContactoCliente } from '../types'
import { SEED_CLIENTS, SEED_CONTACTOS } from '../data/seed'

interface ClientsState {
  clients: Client[]
  contactos: ContactoCliente[]
  addClient: (c: Omit<Client, 'clientId' | 'fechaAlta'>) => void
  updateClient: (id: string, data: Partial<Client>) => void
  deleteClient: (id: string) => void
  addContacto: (c: Omit<ContactoCliente, 'contactoId'>) => void
  removeContacto: (id: string) => void
}

export const useClientsStore = create<ClientsState>((set) => ({
  clients: SEED_CLIENTS,
  contactos: SEED_CONTACTOS,
  addClient(data) {
    const client: Client = { ...data, clientId: `c${Date.now()}`, fechaAlta: new Date().toISOString().split('T')[0] }
    set((s) => ({ clients: [...s.clients, client] }))
  },
  updateClient(id, data) {
    set((s) => ({ clients: s.clients.map((c) => (c.clientId === id ? { ...c, ...data } : c)) }))
  },
  deleteClient(id) {
    set((s) => ({
      clients: s.clients.filter((c) => c.clientId !== id),
      // Eliminar también los contactos asociados
      contactos: s.contactos.filter((c) => c.clienteId !== id),
    }))
  },
  addContacto(data) {
    const contacto: ContactoCliente = { ...data, contactoId: `cc${Date.now()}` }
    set((s) => ({ contactos: [...s.contactos, contacto] }))
  },
  removeContacto(id) {
    set((s) => ({ contactos: s.contactos.filter((c) => c.contactoId !== id) }))
  },
}))
