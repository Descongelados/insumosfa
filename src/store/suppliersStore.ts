import { create } from 'zustand'
import type { Supplier } from '../types'
import { SEED_SUPPLIERS } from '../data/seed'

interface SuppliersState {
  suppliers: Supplier[]
  addSupplier: (s: Omit<Supplier, 'supplierId'>) => void
  updateSupplier: (id: string, data: Partial<Supplier>) => void
}

export const useSuppliersStore = create<SuppliersState>((set) => ({
  suppliers: SEED_SUPPLIERS,
  addSupplier(data) {
    const s: Supplier = { ...data, supplierId: `s${Date.now()}` }
    set((st) => ({ suppliers: [...st.suppliers, s] }))
  },
  updateSupplier(id, data) {
    set((st) => ({ suppliers: st.suppliers.map((s) => (s.supplierId === id ? { ...s, ...data } : s)) }))
  },
}))
