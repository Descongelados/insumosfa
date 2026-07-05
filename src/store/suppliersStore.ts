import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Supplier } from '../types'
import { SEED_SUPPLIERS } from '../data/seed'

interface SuppliersState {
  suppliers: Supplier[]
  addSupplier: (s: Omit<Supplier, 'supplierId'>) => void
  updateSupplier: (id: string, data: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void
}

export const useSuppliersStore = create<SuppliersState>()(
  persist(
    (set) => ({
      suppliers: SEED_SUPPLIERS,
      addSupplier(data) {
        const supplier: Supplier = { ...data, supplierId: `s${Date.now()}` }
        set((s) => ({ suppliers: [...s.suppliers, supplier] }))
      },
      updateSupplier(id, data) {
        set((s) => ({ suppliers: s.suppliers.map((s) => (s.supplierId === id ? { ...s, ...data } : s)) }))
      },
      deleteSupplier(id) {
        set((s) => ({ suppliers: s.suppliers.filter((s) => s.supplierId !== id) }))
      },
    }),
    { name: 'erp_suppliers' }
  )
)
