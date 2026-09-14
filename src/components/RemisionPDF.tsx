import { forwardRef } from 'react'
import type { FacturaVenta, Client, SalesOrder, Product } from '../types'
import { useConfigStore, type CompanyInfo } from '../store/configStore'

const TEAL      = '#4a8c8c'
const TEAL_DARK = '#3a7070'

interface Props {
  factura: FacturaVenta
  client:  Client | undefined
  order:   SalesOrder | undefined
  products: Product[]
  companyOverride?: CompanyInfo
}

/** Remisión de cobro — documento sin efectos fiscales para clientes sin factura. */
export const RemisionPDF = forwardRef<HTMLDivElement, Props>(
  ({ factura, client, order, products, companyOverride }, ref) => {
    const { company: storeCompany } = useConfigStore()
    const company = companyOverride ?? storeCompany

    const nombreCliente = client?.razonSocial ?? '—'
    const rfcCliente    = client?.rfc ?? ''
    const correoCliente = client?.correo ?? ''
    const telCliente    = client?.telefono ?? ''
    const dirCliente    = client?.direccionFiscal ?? ''

    const items = order?.items ?? []

    return (
      <div
        ref={ref}
        id="remision-pdf-root"
        style={{
          fontFamily: "'Segoe UI', Arial, system-ui, sans-serif",
          fontSize: '12px',
          color: '#1a1a1a',
          background: '#fff',
          padding: '28px 36px',
          maxWidth: '800px',
          margin: '0 auto',
          lineHeight: 1.45,
        }}
      >
        {/* ── HEADER BANNER ──────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <div />
          <div style={{
            background: TEAL,
            color: '#fff',
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: 3,
            textTransform: 'uppercase',
            padding: '10px 60px',
            textAlign: 'center',
            borderRadius: 4,
          }}>
            REMISIÓN
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt="Logo"
                style={{ width: 80, height: 80, objectFit: 'contain' }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                border: `3px solid ${TEAL}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 22, color: TEAL, letterSpacing: -1,
              }}>
                {initials(company.nombre)}
              </div>
            )}
          </div>
        </div>

        {/* ── NOTA SIN EFECTOS FISCALES ──────────────────────────────────── */}
        <div style={{
          textAlign: 'center', fontSize: 10, color: '#888',
          border: '1px dashed #ccc', borderRadius: 4,
          padding: '4px 12px', marginBottom: 14,
          letterSpacing: 1,
        }}>
          DOCUMENTO SIN EFECTOS FISCALES
        </div>

        {/* ── DATOS EMPRESA ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{company.nombre}</div>
          {company.rfc && (
            <div style={{ fontSize: 11, color: '#333' }}>R.F.C. {company.rfc}</div>
          )}
          {company.direccion && (
            <div style={{ fontSize: 11, color: '#333', textTransform: 'uppercase' }}>
              {company.direccion}
            </div>
          )}
          {(company.telefono || company.correo) && (
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              {company.telefono && `Tel: ${company.telefono}`}
              {company.telefono && company.correo && '  ·  '}
              {company.correo}
            </div>
          )}
        </div>

        {/* ── BLOQUE CLIENTE + FOLIO ─────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 18, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <InfoRow label="Cliente:"    value={nombreCliente.toUpperCase()} />
                {rfcCliente    && <InfoRow label="RFC:"         value={rfcCliente} />}
                {correoCliente && <InfoRow label="Correo:"      value={correoCliente} />}
                {telCliente    && <InfoRow label="Teléfono:"    value={telCliente} />}
                {dirCliente    && <InfoRow label="Dirección:"   value={dirCliente} />}
              </tbody>
            </table>
          </div>
          <div style={{ flexShrink: 0, minWidth: 170 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <tbody>
                <FolioRow label="Fecha:"    value={formatDateShort(factura.fecha)} />
                <FolioRow label="Remisión:" value={factura.folio} bold />
                {order && <FolioRow label="Pedido:"   value={order.folio} />}
                <FolioRow label="Vencimiento:" value={formatDateShort(factura.fechaVencimiento)} />
              </tbody>
            </table>
          </div>
        </div>

        {/* ── TABLA DE PRODUCTOS ─────────────────────────────────────────── */}
        {items.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 11 }}>
            <thead>
              <tr style={{ background: TEAL, color: '#fff' }}>
                <Th align="left"   w="10%">SKU</Th>
                <Th align="left"   w="38%">Descripción</Th>
                <Th align="center" w="10%">Unidad</Th>
                <Th align="right"  w="12%">Cantidad</Th>
                <Th align="right"  w="15%">Precio Unit.</Th>
                <Th align="right"  w="15%">Importe</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const prod      = products.find(p => p.productId === it.productId)
                const rowBg     = idx % 2 === 0 ? '#ffffff' : '#f5f5f5'
                const precioNeto = it.precio * (1 - it.descuento / 100)
                const importe    = it.cantidad * precioNeto
                return (
                  <tr key={it.detalleId} style={{ background: rowBg }}>
                    <td style={tdStyle('left')}>
                      <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{prod?.sku ?? '—'}</span>
                    </td>
                    <td style={tdStyle('left')}>
                      <span style={{ fontWeight: 600 }}>{prod?.descripcion ?? '—'}</span>
                      {it.descuento > 0 && (
                        <span style={{ fontSize: 10, color: '#059669', marginLeft: 6 }}>
                          (Desc. {it.descuento}%)
                        </span>
                      )}
                    </td>
                    <td style={tdStyle('center')}>{prod?.unidadMedida ?? ''}</td>
                    <td style={tdStyle('right')}>
                      {it.cantidad.toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </td>
                    <td style={tdStyle('right')}>{fmtMXN(precioNeto)}</td>
                    <td style={{ ...tdStyle('right'), fontWeight: 600 }}>{fmtMXN(importe)}</td>
                  </tr>
                )
              })}

              {/* Totales */}
              <tr style={{ background: '#f0f0f0' }}>
                <td colSpan={5} style={{ ...tdStyle('right'), fontSize: 11, paddingRight: 12 }}>Subtotal:</td>
                <td style={{ ...tdStyle('right'), fontWeight: 600 }}>{fmtMXN(factura.subtotal)}</td>
              </tr>
              <tr style={{ background: '#f0f0f0' }}>
                <td colSpan={5} style={{ ...tdStyle('right'), fontSize: 11, paddingRight: 12 }}>IVA:</td>
                <td style={{ ...tdStyle('right'), fontWeight: 600 }}>{fmtMXN(factura.impuestos)}</td>
              </tr>
              <tr style={{ background: TEAL }}>
                <td colSpan={5} style={{ ...tdStyle('right'), color: '#fff', fontWeight: 700, paddingRight: 12 }}>TOTAL A PAGAR:</td>
                <td style={{ ...tdStyle('right'), color: '#fff', fontWeight: 700, fontSize: 13 }}>{fmtMXN(factura.total)}</td>
              </tr>
              {factura.saldoPendiente < factura.total && (
                <tr style={{ background: '#fffbeb' }}>
                  <td colSpan={5} style={{ ...tdStyle('right'), fontSize: 11, paddingRight: 12, color: '#92400e' }}>Saldo pendiente:</td>
                  <td style={{ ...tdStyle('right'), fontWeight: 700, color: '#b45309' }}>{fmtMXN(factura.saldoPendiente)}</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* Sin partidas de pedido: mostrar resumen de la factura */
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 11 }}>
            <thead>
              <tr style={{ background: TEAL, color: '#fff' }}>
                <Th align="left" w="70%">Concepto</Th>
                <Th align="right" w="30%">Importe</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle('left')}>Servicios / Productos según folio {factura.folio}</td>
                <td style={{ ...tdStyle('right'), fontWeight: 600 }}>{fmtMXN(factura.subtotal)}</td>
              </tr>
              <tr style={{ background: '#f0f0f0' }}>
                <td style={{ ...tdStyle('right'), paddingRight: 12 }}>IVA:</td>
                <td style={{ ...tdStyle('right'), fontWeight: 600 }}>{fmtMXN(factura.impuestos)}</td>
              </tr>
              <tr style={{ background: TEAL }}>
                <td style={{ ...tdStyle('right'), color: '#fff', fontWeight: 700, paddingRight: 12 }}>TOTAL A PAGAR:</td>
                <td style={{ ...tdStyle('right'), color: '#fff', fontWeight: 700, fontSize: 13 }}>{fmtMXN(factura.total)}</td>
              </tr>
              {factura.saldoPendiente < factura.total && (
                <tr style={{ background: '#fffbeb' }}>
                  <td style={{ ...tdStyle('right'), paddingRight: 12, color: '#92400e' }}>Saldo pendiente:</td>
                  <td style={{ ...tdStyle('right'), fontWeight: 700, color: '#b45309' }}>{fmtMXN(factura.saldoPendiente)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* ── CONDICIONES DE PAGO ────────────────────────────────────────── */}
        <div style={{ marginBottom: 20, fontSize: 11 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Condiciones:</div>
          <ul style={{ paddingLeft: 14, margin: 0, lineHeight: 2 }}>
            <li>Precios incluyen IVA donde aplica. Moneda: MXN.</li>
            <li>Forma de pago: <strong>Transferencia bancaria, cheque o efectivo.</strong></li>
            <li>Vencimiento: <strong>{formatDateShort(factura.fechaVencimiento)}</strong></li>
            {dirCliente && <li>Entrega en: <strong>{dirCliente}</strong></li>}
          </ul>
        </div>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 24, textAlign: 'center', fontSize: 10,
          color: '#888', borderTop: '1px solid #e5e7eb', paddingTop: 10,
        }}>
          {company.nombre}
          {company.correo   && ` · ${company.correo}`}
          {company.telefono && ` · ${company.telefono}`}
          <br />
          Documento generado electrónicamente — {factura.folio} — Sin efectos fiscales
        </div>
      </div>
    )
  }
)

RemisionPDF.displayName = 'RemisionPDF'

// ── Sub-componentes ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{
        background: TEAL, color: '#fff', fontWeight: 600,
        padding: '5px 12px', fontSize: 11, width: '36%',
        border: '1px solid #fff', textAlign: 'right',
      }}>
        {label}
      </td>
      <td style={{
        padding: '5px 12px', fontSize: 12, fontWeight: 700,
        border: `1px solid ${TEAL}`, background: '#f9f9f9',
      }}>
        {value}
      </td>
    </tr>
  )
}

function FolioRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr>
      <td style={{
        background: TEAL, color: '#fff', fontWeight: 600,
        padding: '4px 10px', fontSize: 11,
        border: '1px solid #fff', textAlign: 'right', width: '45%',
      }}>
        {label}
      </td>
      <td style={{
        padding: '4px 10px', fontSize: 11,
        fontWeight: bold ? 700 : 400,
        fontStyle: bold ? 'italic' : 'normal',
        border: `1px solid ${TEAL}`, background: '#f9f9f9',
        color: bold ? TEAL_DARK : '#1a1a1a',
      }}>
        {value}
      </td>
    </tr>
  )
}

function Th({ children, align, w }: { children: React.ReactNode; align: string; w?: string }) {
  return (
    <th style={{
      padding: '7px 8px', fontWeight: 700, fontSize: 11,
      textAlign: align as React.CSSProperties['textAlign'],
      borderRight: '1px solid rgba(255,255,255,0.3)',
      width: w,
    }}>
      {children}
    </th>
  )
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function tdStyle(align: 'left' | 'center' | 'right'): React.CSSProperties {
  return {
    padding: '6px 8px',
    borderBottom: '1px solid #e0e0e0',
    borderRight: '1px solid #e8e8e8',
    textAlign: align,
    verticalAlign: 'middle',
  }
}

function fmtMXN(v: number) {
  return v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function formatDateShort(iso: string) {
  try {
    const d = new Date(iso + 'T12:00:00')
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  } catch { return iso }
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}
