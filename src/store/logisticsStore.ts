import { create } from 'zustand'
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
    origen: r.origen, destino: r.destino, transportistaId: r.transportista_id,
    fechaProgramada: r.fecha_programada, fechaEntrega: r.fecha_entrega ?? undefined,
    costoFlete: r.costo_flete, estatus: r.estatus as Embarque['estatus'], notas: r.notas,
  }
}

interface LogisticsState {
  embarques: Embarque[]
  transportistas: Transportista[]
  loading: boolean
  loadLogistics: () => Promise<void>
  subscribeRealtime: () => () => void
  addEmbarque: (e: Omit<Embarque, 'embarqueId' | 'folio'>) => Promise<void>
  updateEmbarque: (id: string, data: Partial<Embarque>) => Promise<void>
  addTransportista: (t: Omit<Transportista, 'transportistaId'>) => Promise<void>
  updateTransportista: (id: string, data: Partial<Transportista>) => Promise<void>
  deleteTransportista: (id: string) => Promise<void>
}

export const useLogisticsStore = create<LogisticsState>()((set, get) => ({
  embarques: [], transportistas: [], loading: false,

  subscribeRealtime() {
    const ch = supabase
      .channel('erp_logistics_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_shipments' }, () => { void get().loadLogistics() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_carriers' }, () => { void get().loadLogistics() })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  async loadLogistics() {
    set({ loading: true })
    try {
      const [{ data: sd }, { data: cd }] = await Promise.all([
        supabase.from('erp_shipments').select('*').order('created_at', { ascending: false }),
        supabase.from('erp_carriers').select('*').order('nombre'),
      ])
      if (sd) set({ embarques: (sd as DbShipment[]).map(toShipment) })
      if (cd) set({ transportistas: (cd as DbCarrier[]).map(toCarrier) })
    } finally {
      set({ loading: false })
    }
  },

  async addEmbarque(data) {
    const { count } = await supabase.from('erp_shipments').select('*', { count: 'exact', head: true })
    const folio = `EMB-${String((count ?? 0) + 1).padStart(4, '0')}`
    await supabase.from('erp_shipments').insert({
      folio, pedido_id: data.pedidoId ?? null, origen: data.origen,
      destino: data.destino, transportista_id: data.transportistaId,
      fecha_programada: data.fechaProgramada, fecha_entrega: data.fechaEntrega ?? null,
      costo_flete: data.costoFlete, estatus: data.estatus, notas: data.notas ?? '',
    })
    await get().loadLogistics()
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
    await supabase.from('erp_shipments').update(patch).eq('id', id)
    await get().loadLogistics()
  },

  async addTransportista(data) {
    await supabase.from('erp_carriers').insert({
      nombre: data.nombre, contacto: data.contacto, telefono: data.telefono,
      tarifa_base: data.tarifaBase, activo: data.activo,
    })
    await get().loadLogistics()
  },

  async updateTransportista(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.nombre !== undefined) patch.nombre = data.nombre
    if (data.contacto !== undefined) patch.contacto = data.contacto
    if (data.telefono !== undefined) patch.telefono = data.telefono
    if (data.tarifaBase !== undefined) patch.tarifa_base = data.tarifaBase
    if (data.activo !== undefined) patch.activo = data.activo
    await supabase.from('erp_carriers').update(patch).eq('id', id)
    await get().loadLogistics()
  },

  async deleteTransportista(id) {
    await supabase.from('erp_carriers').delete().eq('id', id)
    set(s => ({ transportistas: s.transportistas.filter(t => t.transportistaId !== id) }))
  },
}))
