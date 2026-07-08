import { create } from 'zustand'
import type { Quote } from '../types'
import { supabase } from '../lib/supabase'

type DbQuote = {
  id: string; folio: string; cliente_id: string; fecha: string
  vigencia: string; subtotal: number; impuestos: number; total: number
  estatus: string; items: unknown; notas: string
}

function toQuote(r: DbQuote): Quote {
  return {
    cotizacionId: r.id, folio: r.folio, clienteId: r.cliente_id,
    fecha: r.fecha, vigencia: r.vigencia, subtotal: r.subtotal,
    impuestos: r.impuestos, total: r.total,
    estatus: r.estatus as Quote['estatus'],
    items: (r.items as Quote['items']) ?? [],
    notas: r.notas,
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
  addQuote: (q: Omit<Quote, 'cotizacionId' | 'folio'>) => Promise<Quote>
  updateQuote: (id: string, data: Partial<Quote>) => Promise<void>
  deleteQuote: (id: string) => Promise<void>
}

export const useQuotesStore = create<QuotesState>()((set, get) => ({
  quotes: [], loading: false,

  async loadQuotes() {
    set({ loading: true })
    try {
      const { data } = await supabase.from('erp_quotes').select('*').order('created_at', { ascending: false })
      if (data) set({ quotes: (data as DbQuote[]).map(toQuote) })
    } finally {
      set({ loading: false })
    }
  },

  async addQuote(data) {
    const folio = await nextFolio('COT', 'erp_quotes')
    const { data: row } = await supabase
      .from('erp_quotes')
      .insert({
        folio, cliente_id: data.clienteId, fecha: data.fecha,
        vigencia: data.vigencia, subtotal: data.subtotal,
        impuestos: data.impuestos, total: data.total,
        estatus: data.estatus, items: data.items, notas: data.notas,
      })
      .select('*')
      .maybeSingle()
    await get().loadQuotes()
    return row ? toQuote(row as DbQuote) : { ...data, cotizacionId: '', folio }
  },

  async updateQuote(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.clienteId !== undefined) patch.cliente_id = data.clienteId
    if (data.fecha !== undefined) patch.fecha = data.fecha
    if (data.vigencia !== undefined) patch.vigencia = data.vigencia
    if (data.subtotal !== undefined) patch.subtotal = data.subtotal
    if (data.impuestos !== undefined) patch.impuestos = data.impuestos
    if (data.total !== undefined) patch.total = data.total
    if (data.estatus !== undefined) patch.estatus = data.estatus
    if (data.items !== undefined) patch.items = data.items
    if (data.notas !== undefined) patch.notas = data.notas
    await supabase.from('erp_quotes').update(patch).eq('id', id)
    await get().loadQuotes()
  },

  async deleteQuote(id) {
    await supabase.from('erp_quotes').delete().eq('id', id)
    set(s => ({ quotes: s.quotes.filter(q => q.cotizacionId !== id) }))
  },
}))
