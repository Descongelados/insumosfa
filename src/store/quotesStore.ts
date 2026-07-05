import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Quote } from '../types'
import { SEED_QUOTES } from '../data/seed'

interface QuotesState {
  quotes: Quote[]
  folioCounter: number
  addQuote: (q: Omit<Quote, 'cotizacionId' | 'folio'>) => Quote
  updateQuote: (id: string, data: Partial<Quote>) => void
  deleteQuote: (id: string) => void
}

export const useQuotesStore = create<QuotesState>()(
  persist(
    (set, get) => ({
      quotes: SEED_QUOTES,
      folioCounter: SEED_QUOTES.length + 1,
      addQuote(data) {
        const n = get().folioCounter
        const quote: Quote = {
          ...data,
          cotizacionId: `q${Date.now()}`,
          folio: `COT-${String(n).padStart(4, '0')}`,
        }
        set((s) => ({ quotes: [quote, ...s.quotes], folioCounter: s.folioCounter + 1 }))
        return quote
      },
      updateQuote(id, data) {
        set((s) => ({ quotes: s.quotes.map((q) => (q.cotizacionId === id ? { ...q, ...data } : q)) }))
      },
      deleteQuote(id) {
        set((s) => ({ quotes: s.quotes.filter((q) => q.cotizacionId !== id) }))
      },
    }),
    { name: 'erp_quotes' }
  )
)
