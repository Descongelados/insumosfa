import { useState } from 'react'
import { Tag, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react'

// ── Datos de referencia ──────────────────────────────────────────────────────
const LIST_PRICE = 18.50   // $/kg

interface VolumeTier {
  label: string       // texto del umbral
  minKg: number       // cantidad mínima en kg
  discountPct: number // porcentaje de descuento (negativo)
  price: number       // precio resultante $/kg
}

const VOLUME_TIERS: VolumeTier[] = [
  { label: '1,500 kg', minKg: 1_500,  discountPct: -4.1, price: LIST_PRICE * (1 - 0.041) },
  { label: '5,000 kg', minKg: 5_000,  discountPct: -6.8, price: LIST_PRICE * (1 - 0.068) },
  { label: '10,000 kg', minKg: 10_000, discountPct: -9.5, price: LIST_PRICE * (1 - 0.095) },
]

// Formatea $/kg con 2 decimales
function fmtKg(v: number) {
  return v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─────────────────────────────────────────────────────────────────────────────
export function PriceReferencePanel() {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
      {/* ── Cabecera colapsable ─────────────────────────────────────────── */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-100 transition-colors"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-blue-800">
          <Tag size={15} className="flex-shrink-0" />
          Referencia de precios — Precio lista y descuentos por volumen
        </span>
        {open
          ? <ChevronUp size={16} className="text-blue-500 flex-shrink-0" />
          : <ChevronDown size={16} className="text-blue-500 flex-shrink-0" />
        }
      </button>

      {/* ── Contenido ───────────────────────────────────────────────────── */}
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4">

          {/* Precio lista */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                Precio lista
              </span>
              <span className="text-2xl font-bold text-blue-900">
                ${fmtKg(LIST_PRICE)}
                <span className="text-sm font-normal text-blue-600 ml-1">/kg</span>
              </span>
            </div>
          </div>

          {/* Tabla de descuentos por volumen */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown size={14} className="text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Descuentos por volumen
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-xs text-blue-600 uppercase tracking-wide">
                    <th className="text-left py-1.5 pr-4 font-semibold border-b border-blue-200">
                      Volumen mínimo
                    </th>
                    <th className="text-right py-1.5 px-4 font-semibold border-b border-blue-200">
                      Descuento
                    </th>
                    <th className="text-right py-1.5 pl-4 font-semibold border-b border-blue-200">
                      Precio neto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {VOLUME_TIERS.map((tier, idx) => (
                    <tr
                      key={tier.minKg}
                      className={idx % 2 === 0 ? 'bg-white/60' : 'bg-blue-100/40'}
                    >
                      {/* Volumen */}
                      <td className="py-2 pr-4 font-medium text-gray-800">
                        {tier.label}
                      </td>

                      {/* Descuento */}
                      <td className="py-2 px-4 text-right">
                        <span className="inline-flex items-center justify-end gap-1 font-semibold text-red-600">
                          <TrendingDown size={13} />
                          {tier.discountPct.toFixed(1)}%
                        </span>
                      </td>

                      {/* Precio neto */}
                      <td className="py-2 pl-4 text-right font-bold text-blue-900">
                        ${fmtKg(tier.price)}<span className="text-xs font-normal text-blue-500 ml-0.5">/kg</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Nota al pie */}
            <p className="mt-2 text-xs text-blue-500 italic">
              * Precios de referencia en MXN. Aplica según volumen total cotizado.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
