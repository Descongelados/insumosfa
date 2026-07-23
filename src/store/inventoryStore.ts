import { create } from 'zustand'
import type { Inventario, KardexMovimiento, MovimientoTipo } from '../types'
import { supabase } from '../lib/supabase'

type DbInv = {
  id: string; product_id: string; cantidad_disponible: number
  cantidad_comprometida: number; cantidad_transito: number
}
type DbKardex = {
  id: string; product_id: string; fecha: string; usuario: string
  documento_origen: string; tipo: string; cantidad: number
  existencia_anterior: number; existencia_nueva: number; notas: string
}

function toInv(r: DbInv): Inventario {
  return {
    inventarioId: r.id, productId: r.product_id,
    cantidadDisponible: r.cantidad_disponible,
    cantidadComprometida: r.cantidad_comprometida,
    cantidadTransito: r.cantidad_transito,
  }
}
function toKardex(r: DbKardex): KardexMovimiento {
  return {
    movimientoId: r.id, productId: r.product_id, fecha: r.fecha,
    usuario: r.usuario, documentoOrigen: r.documento_origen,
    tipo: r.tipo as MovimientoTipo, cantidad: r.cantidad,
    existenciaAnterior: r.existencia_anterior,
    existenciaNueva: r.existencia_nueva, notas: r.notas,
  }
}

interface InventoryState {
  inventario: Inventario[]
  kardex: KardexMovimiento[]
  loading: boolean
  loadInventory: () => Promise<void>
  /** Carga el historial de movimientos de un producto específico (lazy). */
  loadKardexByProduct: (productId: string) => Promise<void>
  subscribeRealtime: () => () => void
  applyMovimiento: (params: {
    productId: string; tipo: MovimientoTipo; cantidad: number
    documentoOrigen: string; usuario: string; notas?: string
  }) => Promise<void>
  updateCantidadDisponible: (productId: string, nuevaCantidad: number, usuario: string) => Promise<void>
  getStock: (productId: string) => number
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  inventario: [], kardex: [], loading: false,

  subscribeRealtime() {
    const ch = supabase
      .channel('erp_inventory_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_inventory' }, () => { void get().loadInventory() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_kardex' }, () => { void get().loadInventory() })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  getStock(productId) {
    return get().inventario.find(i => i.productId === productId)?.cantidadDisponible ?? 0
  },

  async loadInventory() {
    set({ loading: true })
    try {
      // Solo carga el inventario en la carga inicial; el kardex se carga bajo demanda por producto.
      const { data: id } = await supabase.from('erp_inventory').select('*')
      if (id) set({ inventario: (id as DbInv[]).map(toInv) })
    } finally {
      set({ loading: false })
    }
  },

  /** Carga el kardex de un producto específico (máx. 200 mov.) — llamar al abrir el detalle. */
  async loadKardexByProduct(productId) {
    const { data: kd } = await supabase
      .from('erp_kardex')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (kd) set({ kardex: (kd as DbKardex[]).map(toKardex) })
  },

  async updateCantidadDisponible(productId, nuevaCantidad, usuario) {
    const existing = get().inventario.find(i => i.productId === productId)
    const anterior = existing?.cantidadDisponible ?? 0

    // Optimistic update del inventario
    set(s => ({
      inventario: s.inventario.map(i =>
        i.productId === productId ? { ...i, cantidadDisponible: nuevaCantidad } : i,
      ),
    }))

    // updated_at lo maneja el trigger en BD (no se envía desde el cliente)
    const { error } = await supabase
      .from('erp_inventory')
      .update({ cantidad_disponible: nuevaCantidad })
      .eq('product_id', productId)

    if (error) {
      // Rollback
      set(s => ({
        inventario: s.inventario.map(i =>
          i.productId === productId ? { ...i, cantidadDisponible: anterior } : i,
        ),
      }))
      return
    }

    await supabase.from('erp_kardex').insert({
      product_id: productId, tipo: 'Ajuste', cantidad: Math.abs(nuevaCantidad - anterior),
      documento_origen: 'Ajuste Manual', usuario,
      notas: `Ajuste directo de ${anterior} a ${nuevaCantidad}`,
      fecha: new Date().toISOString().split('T')[0],
      existencia_anterior: anterior, existencia_nueva: nuevaCantidad,
    })
  },

  async applyMovimiento({ productId, tipo, cantidad, documentoOrigen, usuario, notas = '' }) {
    const existing = get().inventario.find(i => i.productId === productId)
    const anterior = existing?.cantidadDisponible ?? 0
    const esEntrada = ['EntradaCompra', 'Devolucion'].includes(tipo)
    const nueva = esEntrada ? anterior + cantidad : Math.max(0, anterior - cantidad)

    // Optimistic update
    if (existing) {
      set(s => ({
        inventario: s.inventario.map(i =>
          i.productId === productId ? { ...i, cantidadDisponible: nueva } : i,
        ),
      }))
    }

    if (existing) {
      // updated_at lo maneja el trigger en BD
      await supabase
        .from('erp_inventory')
        .update({ cantidad_disponible: nueva })
        .eq('product_id', productId)
    } else {
      await supabase.from('erp_inventory').insert({
        product_id: productId, cantidad_disponible: nueva,
        cantidad_comprometida: 0, cantidad_transito: 0,
      })
      // Recargar para obtener el id asignado
      const { data: fresh } = await supabase.from('erp_inventory').select('*').eq('product_id', productId)
      if (fresh) set(s => ({ inventario: [...s.inventario, ...(fresh as DbInv[]).map(toInv)] }))
    }

    await supabase.from('erp_kardex').insert({
      product_id: productId, tipo, cantidad, documento_origen: documentoOrigen,
      usuario, notas, fecha: new Date().toISOString().split('T')[0],
      existencia_anterior: anterior, existencia_nueva: nueva,
    })
  },
}))
