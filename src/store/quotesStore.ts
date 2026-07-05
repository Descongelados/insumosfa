import { create } from 'zustand'
import type { Quote } from '../types'
import { SEED_QUOTES } from '../data/seed'

let folioCounter = SEED_QUOTES.length + 1

interface QuotesState {
  quotes: Quote[]
  addQuote: (q: Omit<Quote, 'cotizacionId' | 'folio'>) => Quote
  updateQuote: (id: string, data: Partial<Quote>) => void
}

export const useQuotesStore = create<QuotesState>((set, get) => ({
  quotes: SEED_QUOTES,
  addQuote(data) {
    const quote: Quote = {
      ...data,
      cotizacionId: `q${Date.now()}`,
      folio: `COT-${String(folioCounter++).padStart(4, '0')}`,
    }
    set((s) => ({ quotes: [quote, ...s.quotes] }))
    return quote
  },
  updateQuote(id, data) {
    set((s) => ({ quotes: s.quotes.map((q) => (q.cotizacionId === id ? { ...q, ...data } : q)) }))
  },
}))
