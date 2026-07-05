import { forwardRef } from 'react'
import type { Quote, Client, Product } from '../types'

interface Props {
  quote: Quote
  client: Client | undefined
  products: Product[]
}

/** Renders a formal, print-ready quotation document.
 *  Wrap in a container with id="quote-pdf-root" for window.print() targeting.
 */
export const QuotePDF = forwardRef<HTMLDivElement, Props>(({ quote, client, products }, ref) => {
  const mxn = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  return (
    <div
      ref={ref}
      id="quote-pdf-root"
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        fontSize: '13px',
        color: '#1f2328',
        background: '#fff',
        padding: '40px 48px',
        maxWidth: '780px',
        margin: '0 auto',
        lineHeight: 1.5,
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, borderBottom: '3px solid #1e40af', paddingBottom: 20 }}>
        {/* Company */}
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1e40af', letterSpacing: '-0.5px' }}>InsumosFa</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Distribución Industrial y Comercial</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, lineHeight: 1.7 }}>
            Av. Industrial 1200, Parque Norte<br />
            Monterrey, N.L. · C.P. 64720<br />
            Tel: (81) 8000-1234 · ventas@insumosfa.com<br />
            RFC: IFA210301AB3
          </div>
        </div>
        {/* Folio box */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ background: '#1e40af', color: '#fff', padding: '6px 18px', borderRadius: 8, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            COTIZACIÓN
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e40af' }}>{quote.folio}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, lineHeight: 1.8 }}>
            <div><span style={{ fontWeight: 600 }}>Fecha:</span> {formatDate(quote.fecha)}</div>
            <div><span style={{ fontWeight: 600 }}>Vigencia:</span> {quote.vigencia ? formatDate(quote.vigencia) : '15 días'}</div>
            <div style={{ marginTop: 4 }}>
              <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                background: statusColor(quote.estatus).bg, color: statusColor(quote.estatus).text,
                fontWeight: 600, fontSize: 11
              }}>
                {quote.estatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CLIENTE ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Estimado cliente
        </div>
        <div style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '14px 18px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>
            {client?.razonSocial ?? '—'}
          </div>
          <div style={{ color: '#374151', lineHeight: 1.8, fontSize: 12 }}>
            {client?.rfc && <div>RFC: {client.rfc}</div>}
            {client?.regimenFiscal && <div>{client.regimenFiscal}</div>}
            {client?.direccionFiscal && <div>{client.direccionFiscal}</div>}
            {client?.correo && <div>Correo: {client.correo}</div>}
            {client?.telefono && <div>Tel: {client.telefono}</div>}
          </div>
        </div>
      </div>

      {/* ── INTRO ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20, fontSize: 12, color: '#374151' }}>
        Por medio de la presente, tenemos el agrado de presentarle nuestra cotización de los siguientes productos y servicios, sujeta a los términos y condiciones indicados al final del documento.
      </div>

      {/* ── TABLA DE PARTIDAS ──────────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#1e40af', color: '#fff' }}>
            <th style={th}>#</th>
            <th style={{ ...th, textAlign: 'left' }}>SKU</th>
            <th style={{ ...th, textAlign: 'left', width: '38%' }}>Descripción</th>
            <th style={{ ...th, textAlign: 'right' }}>U/M</th>
            <th style={{ ...th, textAlign: 'right' }}>Cant.</th>
            <th style={{ ...th, textAlign: 'right' }}>Precio Unit.</th>
            <th style={{ ...th, textAlign: 'right' }}>Desc.</th>
            <th style={{ ...th, textAlign: 'right' }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((it, idx) => {
            const prod = products.find(p => p.productId === it.productId)
            const importe = it.cantidad * it.precio * (1 - it.descuento / 100)
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
            return (
              <tr key={it.detalleId} style={{ background: rowBg }}>
                <td style={{ ...td, textAlign: 'center', color: '#6b7280' }}>{idx + 1}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#1e40af', fontWeight: 600 }}>{prod?.sku ?? '—'}</td>
                <td style={{ ...td }}>{prod?.descripcion ?? '—'}</td>
                <td style={{ ...td, textAlign: 'right', color: '#6b7280' }}>{prod?.unidadMedida ?? ''}</td>
                <td style={{ ...td, textAlign: 'right' }}>{it.cantidad.toLocaleString()}</td>
                <td style={{ ...td, textAlign: 'right' }}>{mxn(it.precio)}</td>
                <td style={{ ...td, textAlign: 'right', color: it.descuento > 0 ? '#059669' : '#9ca3af' }}>
                  {it.descuento > 0 ? `${it.descuento}%` : '—'}
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{mxn(importe)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ── TOTALES ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
        <div style={{ minWidth: 260 }}>
          <TotalRow label="Subtotal" value={mxn(quote.subtotal)} />
          <TotalRow label="IVA (16%)" value={mxn(quote.impuestos)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#1e40af', color: '#fff', borderRadius: 6, fontWeight: 700, fontSize: 15 }}>
            <span>TOTAL</span>
            <span>{mxn(quote.total)}</span>
          </div>
        </div>
      </div>

      {/* ── NOTAS ──────────────────────────────────────────────────────── */}
      {quote.notas && (
        <div style={{ marginBottom: 24, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#92400e' }}>Notas:</div>
          <div style={{ color: '#374151' }}>{quote.notas}</div>
        </div>
      )}

      {/* ── CONDICIONES ────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Términos y Condiciones
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 11, color: '#6b7280' }}>
          <Cond label="Moneda" value="Pesos Mexicanos (MXN)" />
          <Cond label="Forma de pago" value="Transferencia / Cheque" />
          <Cond label="Condiciones" value={client?.limiteCredito && client.limiteCredito > 0 ? 'Crédito según convenio' : 'Contado'} />
          <Cond label="Vigencia" value={quote.vigencia ? `Hasta ${formatDate(quote.vigencia)}` : '15 días naturales'} />
          <Cond label="Entrega" value="Sujeta a disponibilidad de inventario" />
          <Cond label="Precios" value="No incluyen flete, salvo acuerdo" />
        </div>
      </div>

      {/* ── FIRMA ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, gap: 32 }}>
        <SigBox label="Elaboró — InsumosFa" />
        <SigBox label="Aceptado por — Cliente" />
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 28, textAlign: 'center', fontSize: 10, color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
        InsumosFa · Distribución Industrial y Comercial · ventas@insumosfa.com · (81) 8000-1234<br />
        Este documento fue generado electrónicamente por InsumosFa ERP — {quote.folio}
      </div>
    </div>
  )
})

QuotePDF.displayName = 'QuotePDF'

// ── Helpers ─────────────────────────────────────────────────────────────────

const th: React.CSSProperties = {
  padding: '8px 10px', fontWeight: 600, fontSize: 11,
  textTransform: 'uppercase', letterSpacing: 0.3,
}
const td: React.CSSProperties = {
  padding: '7px 10px', borderBottom: '1px solid #e5e7eb',
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 12px', fontSize: 12, color: '#374151' }}>
      <span>{label}</span><span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function Cond({ label, value }: { label: string; value: string }) {
  return (
    <div><span style={{ fontWeight: 600, color: '#374151' }}>{label}: </span>{value}</div>
  )
}

function SigBox({ label }: { label: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ borderBottom: '1px solid #374151', marginBottom: 6, height: 40 }} />
      <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
    </div>
  )
}

function formatDate(iso: string) {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return iso }
}

function statusColor(s: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    borrador: { bg: '#f3f4f6', text: '#374151' },
    enviada:  { bg: '#dbeafe', text: '#1e40af' },
    aceptada: { bg: '#d1fae5', text: '#065f46' },
    rechazada:{ bg: '#fee2e2', text: '#991b1b' },
    vencida:  { bg: '#fef3c7', text: '#92400e' },
  }
  return map[s] ?? { bg: '#f3f4f6', text: '#374151' }
}
