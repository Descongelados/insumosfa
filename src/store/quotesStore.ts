import { create } from 'zustand'
import type { Quote, QuoteItem } from '../types'
import { supabase } from '../lib/supabase'

// Columnas que existen siempre en erp_quotes
type DbQuoteBase = {
  id: string; folio: string; cliente_id: string
  fecha: string; vigencia: string; subtotal: number; impuestos: number; total: number
  estatus: string; items: unknown; notas: string
}
// Columnas opcionales (agregadas por migración 20260708)
type DbQuote = DbQuoteBase & {
  cliente_nombre?: string; cliente_rfc?: string
  cliente_correo?: string; cliente_telefono?: string
}

/**
 * Normaliza un item crudo del JSONB.
 * Supabase JS puede entregar las claves dentro del JSONB en snake_case
 * (product_id, detalle_id) si el cliente aplicó transformación, o en
 * camelCase si no lo hizo. Soportamos ambos formatos.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeItem(raw: any): QuoteItem {
  return {
    detalleId: raw.detalleId ?? raw.detalle_id ?? '',
    productId:  raw.productId  ?? raw.product_id  ?? '',
    cantidad:   raw.cantidad   ?? 0,
    precio:     raw.precio     ?? 0,
    descuento:  raw.descuento  ?? 0,
  }
}

function toQuote(r: DbQuote): Quote {
  const rawItems = Array.isArray(r.items) ? r.items : []
  return {
    cotizacionId: r.id, folio: r.folio, clienteId: r.cliente_id ?? '',
    clienteNombre:   r.cliente_nombre   || undefined,
    clienteRfc:      r.cliente_rfc      || undefined,
    clienteCorreo:   r.cliente_correo   || undefined,
    clienteTelefono: r.cliente_telefono || undefined,
    fecha: r.fecha, vigencia: r.vigencia ?? '',
    subtotal: r.subtotal, impuestos: r.impuestos, total: r.total,
    estatus: r.estatus as Quote['estatus'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: rawItems.map((it: any) => normalizeItem(it)),
    notas: r.notas ?? '',
  }
}

async function nextFolio(prefix: string, table: string): Promise<string> {
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
  return `${prefix}-${String((count ?? 0) + 1).padStart(4, '0')}`
}

interface QuotesState {
  quotes: Quote[]
  loading: boolean
  loadQuotes: () => Promise<void>
  subscribeRealtime: () => () => void
  addQuote: (q: Omit<Quote, 'cotizacionId' | 'folio'>) => Promise<Quote>
  updateQuote: (id: string, data: Partial<Quote>) => Promise<void>
  deleteQuote: (id: string) => Promise<void>
}

export const useQuotesStore = create<QuotesState>()((set, get) => ({
  quotes: [], loading: false,

  async loadQuotes() {
    set({ loading: true })
    try {
      const { data } = await supabase
        .from('erp_quotes')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) set({ quotes: (data as DbQuote[]).map(toQuote) })
    } finally {
      set({ loading: false })
    }
  },

  subscribeRealtime() {
    const channel = supabase
      .channel('erp_quotes_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_quotes' }, () => {
        void get().loadQuotes()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  },

  async addQuote(data) {
    const folio = await nextFolio('COT', 'erp_quotes')

    // Serializar items explícitamente para preservar claves camelCase en JSONB
    const itemsJson = JSON.parse(JSON.stringify(data.items)) as QuoteItem[]

    // Intentar insertar con las columnas de cliente eventual (post-migración)
    const { data: row, error } = await supabase
      .from('erp_quotes')
      .insert({
        folio,
        cliente_id:       data.clienteId        ?? '',
        cliente_nombre:   data.clienteNombre     ?? '',
        cliente_rfc:      data.clienteRfc        ?? '',
        cliente_correo:   data.clienteCorreo     ?? '',
        cliente_telefono: data.clienteTelefono   ?? '',
        fecha:            data.fecha,
        vigencia:         data.vigencia || null,
        subtotal:         data.subtotal,
        impuestos:        data.impuestos,
        total:            data.total,
        estatus:          data.estatus,
        items:            itemsJson,
        notas:            data.notas             ?? '',
      })
      .select('*')
      .maybeSingle()

    if (error) {
      // Fallback: insertar sin las columnas eventuales (migración no aplicada aún)
      const { data: row2 } = await supabase
        .from('erp_quotes')
        .insert({
          folio,
          cliente_id: data.clienteId ?? '',
          fecha:      data.fecha,
          vigencia:   data.vigencia || null,
          subtotal:   data.subtotal,
          impuestos:  data.impuestos,
          total:      data.total,
          estatus:    data.estatus,
          items:      itemsJson,
          notas:      data.notas ?? '',
        })
        .select('*')
        .maybeSingle()

      await get().loadQuotes()

      if (row2) {
        // Enriquecer con los datos eventuales que no se guardaron en BD
        const base = toQuote(row2 as DbQuote)
        return {
          ...base,
          clienteNombre:   data.clienteNombre   || undefined,
          clienteRfc:      data.clienteRfc      || undefined,
          clienteCorreo:   data.clienteCorreo   || undefined,
          clienteTelefono: data.clienteTelefono || undefined,
        }
      }
      // Último recurso: devolver objeto en memoria con items normalizados
      return { ...data, items: itemsJson, cotizacionId: '', folio }
    }

    await get().loadQuotes()
    return row ? toQuote(row as DbQuote) : { ...data, items: itemsJson, cotizacionId: '', folio }
  },

  async updateQuote(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.clienteId        !== undefined) patch.cliente_id       = data.clienteId
    if (data.clienteNombre    !== undefined) patch.cliente_nombre   = data.clienteNombre
    if (data.clienteRfc       !== undefined) patch.cliente_rfc      = data.clienteRfc
    if (data.clienteCorreo    !== undefined) patch.cliente_correo   = data.clienteCorreo
    if (data.clienteTelefono  !== undefined) patch.cliente_telefono = data.clienteTelefono
    if (data.fecha     !== undefined) patch.fecha      = data.fecha
    if (data.vigencia  !== undefined) patch.vigencia   = data.vigencia || null
    if (data.subtotal  !== undefined) patch.subtotal   = data.subtotal
    if (data.impuestos !== undefined) patch.impuestos  = data.impuestos
    if (data.total     !== undefined) patch.total      = data.total
    if (data.estatus   !== undefined) patch.estatus    = data.estatus
    if (data.items     !== undefined) patch.items      = JSON.parse(JSON.stringify(data.items))
    if (data.notas     !== undefined) patch.notas      = data.notas
    await supabase.from('erp_quotes').update(patch).eq('id', id)
    await get().loadQuotes()
  },

  async deleteQuote(id) {
    await supabase.from('erp_quotes').delete().eq('id', id)
    set(s => ({ quotes: s.quotes.filter(q => q.cotizacionId !== id) }))
  },
}))
