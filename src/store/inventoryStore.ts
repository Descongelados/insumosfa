import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Inventario, KardexMovimiento, MovimientoTipo } from '../types'
import { SEED_INVENTARIO, SEED_KARDEX } from '../data/seed'

interface InventoryState {
  inventario: Inventario[]
  kardex: KardexMovimiento[]
  applyMovimiento: (params: {
    productId: string
    tipo: MovimientoTipo
    cantidad: number
    documentoOrigen: string
    usuario: string
    notas?: string
  }) => void
  getStock: (productId: string) => number
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      inventario: SEED_INVENTARIO,
      kardex: SEED_KARDEX,

      getStock(productId) {
        return get().inventario.find((i) => i.productId === productId)?.cantidadDisponible ?? 0
      },

      applyMovimiento({ productId, tipo, cantidad, documentoOrigen, usuario, notas = '' }) {
        set((s) => {
          const inv = s.inventario.find((i) => i.productId === productId)
          const anterior = inv?.cantidadDisponible ?? 0
          const esEntrada = ['EntradaCompra', 'Devolucion'].includes(tipo)
          const nueva = esEntrada ? anterior + cantidad : Math.max(0, anterior - cantidad)

          const movimiento: KardexMovimiento = {
            movimientoId: `k${Date.now()}`,
            productId, tipo, cantidad, documentoOrigen, usuario, notas,
            fecha: new Date().toISOString().split('T')[0],
            existenciaAnterior: anterior,
            existenciaNueva: nueva,
          }

          const updatedInv = inv
            ? s.inventario.map((i) => i.productId === productId ? { ...i, cantidadDisponible: nueva } : i)
            : [...s.inventario, { inventarioId: `i${Date.now()}`, productId, cantidadDisponible: nueva, cantidadComprometida: 0, cantidadTransito: 0 }]

          return { inventario: updatedInv, kardex: [movimiento, ...s.kardex] }
        })
      },
    }),
    { name: 'erp_inventory' }
  )
)
