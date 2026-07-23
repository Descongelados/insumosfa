import { create } from 'zustand'
import { toast } from './toastStore'
import type { Embarque, Transportista } from '../types'
import { supabase } from '../lib/supabase'

type DbCarrier = {
  id: string; nombre: string; contacto: string
  telefono: string; tarifa_base: number; activo: boolean
}
type DbShipment = {
  id: string; folio: string; pedido_id: string | null; origen: string
  destino: string; transportista_id: string; fecha_programada: string
  fecha_entrega: string | null; costo_flete: number; estatus: string; notas: string
  ordenes_ids: unknown
}

function toCarrier(r: DbCarrier): Transportista {
  return {
    transportistaId: r.id, nombre: r.nombre, contacto: r.contacto,
    telefono: r.telefono, tarifaBase: r.tarifa_base, activo: r.activo,
  }
}
function toShipment(r: DbShipment): Embarque {
  return {
    embarqueId: r.id, folio: r.folio, pedidoId: r.pedido_id ?? undefined,
    ordenesIds: (r.ordenes_ids as import('../types').EmbarqueOCRef[]) ?? [],
    origen: r.origen, destino: r.destino, transportistaId: r.transportista_id,
    fechaProgramada: r.fecha_programada, fechaEntrega: r.fecha_entrega ?? undefined,
    costoFlete: r.costo_flete, estatus: r.estatus as Embarque['estatus'], notas: r.notas,
  }
}

// ── Helpers de recarga individual ────────────────────────────────────────────

async function fetchEmbarques() {
  const { data } = await supabase
    .from('erp_shipments')
    .select('*')
    .order('created_at', { ascending: false })
  return data ? (data as DbShipment[]).map(toShipment) : null
}
async function fetchCarriers() {
  const { data } = await supabase
    .from('erp_carriers')
    .select('*')
    .order('nombre')
  return data ? (data as DbCarrier[]).map(toCarrier) : null
}

interface LogisticsState {
  embarques: Embarque[]
  transportistas: Transportista[]
  loading: boolean
  initialized: boolean
  loadLogistics: () => Promise<void>
  subscribeRealtime: () => () => void
  addEmbarque: (e: Omit<Embarque, 'embarqueId' | 'folio'>) => Promise<void>
  updateEmbarque: (id: string, data: Partial<Embarque>) => Promise<void>
  deleteEmbarque: (id: string) => Promise<void>
  addTransportista: (t: Omit<Transportista, 'transportistaId'>) => Promise<void>
  updateTransportista: (id: string, data: Partial<Transportista>) => Promise<void>
  deleteTransportista: (id: string) => Promise<void>
}

export const useLogisticsStore = create<LogisticsState>()((set, get) => ({
  embarques: [], transportistas: [], loading: false, initialized: false,

  // ── Realtime granular ─────────────────────────────────────────────────────
  subscribeRealtime() {
    const ch = supabase
      .channel('erp_logistics_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_shipments' }, async () => {
        const d = await fetchEmbarques(); if (d) set({ embarques: d })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_carriers' }, async () => {
        const d = await fetchCarriers(); if (d) set({ transportistas: d })
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  async loadLogistics() {
    if (get().initialized) return
    set({ loading: true })
    try {
      const [embarques, transportistas] = await Promise.all([fetchEmbarques(), fetchCarriers()])
      if (embarques)       set({ embarques })
      if (transportistas)  set({ transportistas })
      set({ initialized: true })
    } finally {
      set({ loading: false })
    }
  },

  async addEmbarque(data) {
    // Folio atómico en servidor
    const { data: folioRow } = await supabase
      .rpc('erp_next_folio', { p_prefix: 'EMB', p_seq: 'erp_seq_folio_shipments' })
    const folio = (folioRow as string | null) ?? `EMB-${Date.now()}`

    await supabase.from('erp_shipments').insert({
      folio, pedido_id: data.pedidoId ?? null, origen: data.origen,
      destino: data.destino, transportista_id: data.transportistaId,
      fecha_programada: data.fechaProgramada, fecha_entrega: data.fechaEntrega ?? null,
      costo_flete: data.costoFlete, estatus: data.estatus, notas: data.notas ?? '',
      ordenes_ids: data.ordenesIds ?? [],
    })
    const d = await fetchEmbarques()
    if (d) set({ embarques: d })
  },

  async updateEmbarque(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.pedidoId !== undefined) patch.pedido_id = data.pedidoId
    if (data.origen !== undefined) patch.origen = data.origen
    if (data.destino !== undefined) patch.destino = data.destino
    if (data.transportistaId !== undefined) patch.transportista_id = data.transportistaId
    if (data.fechaProgramada !== undefined) patch.fecha_programada = data.fechaProgramada
    if (data.fechaEntrega !== undefined) patch.fecha_entrega = data.fechaEntrega
    if (data.costoFlete !== undefined) patch.costo_flete = data.costoFlete
    if (data.estatus !== undefined) patch.estatus = data.estatus
    if (data.notas !== undefined) patch.notas = data.notas
    if (data.ordenesIds !== undefined) patch.ordenes_ids = data.ordenesIds

    // Optimistic update
    set(s => ({ embarques: s.embarques.map(e => e.embarqueId === id ? { ...e, ...data } : e) }))

    const { error } = await supabase.from('erp_shipments').update(patch).eq('id', id)
    if (error) {
      toast.error('Error al guardar. Intenta de nuevo.')
      const d = await fetchEmbarques()
      if (d) set({ embarques: d })
    }
  },

  async deleteEmbarque(id) {
    set(s => ({ embarques: s.embarques.filter(e => e.embarqueId !== id) }))
    await supabase.from('erp_shipments').delete().eq('id', id)
  },

  async addTransportista(data) {
    await supabase.from('erp_carriers').insert({
      nombre: data.nombre, contacto: data.contacto, telefono: data.telefono,
      tarifa_base: data.tarifaBase, activo: data.activo,
    })
    const d = await fetchCarriers()
    if (d) set({ transportistas: d })
  },

  async updateTransportista(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.nombre !== undefined) patch.nombre = data.nombre
    if (data.contacto !== undefined) patch.contacto = data.contacto
    if (data.telefono !== undefined) patch.telefono = data.telefono
    if (data.tarifaBase !== undefined) patch.tarifa_base = data.tarifaBase
    if (data.activo !== undefined) patch.activo = data.activo

    // Optimistic update
    set(s => ({ transportistas: s.transportistas.map(t => t.transportistaId === id ? { ...t, ...data } : t) }))

    const { error } = await supabase.from('erp_carriers').update(patch).eq('id', id)
    if (error) {
      toast.error('Error al guardar. Intenta de nuevo.')
      const d = await fetchCarriers()
      if (d) set({ transportistas: d })
    }
  },

  async deleteTransportista(id) {
    set(s => ({ transportistas: s.transportistas.filter(t => t.transportistaId !== id) }))
    await supabase.from('erp_carriers').delete().eq('id', id)
  },
}))
