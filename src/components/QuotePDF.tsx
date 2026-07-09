import { forwardRef } from 'react'
import type { Quote, Client, Product } from '../types'
import { useConfigStore, type CompanyInfo } from '../store/configStore'

// Color principal del documento (teal de la imagen)
const TEAL = '#4a8c8c'
const TEAL_DARK = '#3a7070'

interface Props {
  quote: Quote
  client: Client | undefined
  products: Product[]
  /** Nombre del usuario que elabora la cotización */
  atiende?: string
  /** Optional override - pass when rendering outside React context (e.g. iframe print) */
  companyOverride?: CompanyInfo
}

/** Renders a formal, print-ready quotation document matching the F&A format. */
export const QuotePDF = forwardRef<HTMLDivElement, Props>(
  ({ quote, client, products, atiende, companyOverride }, ref) => {
    const { company: storeCompany } = useConfigStore()
    const company = companyOverride ?? storeCompany

    // Nombre del cliente (registrado o eventual)
    const nombreCliente =
      client?.razonSocial ?? quote.clienteNombre ?? '—'
    const rfcCliente      = client?.rfc ?? quote.clienteRfc ?? ''
    const correoCliente   = client?.correo ?? quote.clienteCorreo ?? ''
    const telCliente      = client?.telefono ?? quote.clienteTelefono ?? ''
    const dirCliente      = client?.direccionFiscal ?? quote.clienteDireccion ?? ''

    // Vigencia en texto corto (ej: "15 días")
    const vigenciaLabel = quote.vigencia
      ? formatDateShort(quote.vigencia)
      : '15 días'

    return (
      <div
        ref={ref}
        id="quote-pdf-root"
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

        {/* ── HEADER BANNER ─────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          {/* Columna izquierda — vacía para balance */}
          <div />

          {/* Centro — banner teal "COTIZACIÓN" */}
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
            COTIZACIÓN
          </div>

          {/* Derecha — logo */}
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

        {/* ── DATOS EMPRESA ─────────────────────────────────────────────── */}
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

        {/* ── BLOQUE ATENCIÓN + FOLIO ───────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 18, alignItems: 'flex-start' }}>

          {/* Tabla Atención a / Atiende */}
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <InfoRow label="Atención a:" value={nombreCliente.toUpperCase()} />
                <InfoRow label="Atiende:"    value={(atiende ?? company.nombre).toUpperCase()} />
                {rfcCliente    && <InfoRow label="RFC cliente:" value={rfcCliente} />}
                {correoCliente && <InfoRow label="Correo:"      value={correoCliente} />}
                {telCliente    && <InfoRow label="Teléfono:"    value={telCliente} />}
              </tbody>
            </table>
          </div>

          {/* Tabla Fecha / Folio / Vigencia */}
          <div style={{ flexShrink: 0, minWidth: 160 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <tbody>
                <FolioRow label="Fecha:"    value={formatDateShort(quote.fecha)} />
                <FolioRow label="Folio:"    value={quote.folio} bold />
                <FolioRow label="Vigencia:" value={vigenciaLabel} />
              </tbody>
            </table>
          </div>
        </div>

        {/* ── TEXTO INTRO ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 16, fontSize: 12 }}>
          <span style={{ fontWeight: 700 }}>Estimado Cliente:</span>
          <br />
          Sirva la presente para enviarle un afectuoso saludo y, a su vez,
          proporcionarle el precio del producto que nos solicitó y que a continuación le presentamos:
        </div>

        {/* ── TABLA DE PRODUCTOS ───────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 11 }}>
          <thead>
            <tr style={{ background: TEAL, color: '#fff' }}>
              <Th align="left"  w="34%">Descripción</Th>
              <Th align="center" w="10%">Unidad</Th>
              <Th align="center" w="18%">Presentación</Th>
              <Th align="center" w="12%">Papel</Th>
              <Th align="right"  w="13%">Cantidades mínimas</Th>
              <Th align="right"  w="13%">Precio Unitario</Th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it, idx) => {
              const prod     = products.find(p => p.productId === it.productId)
              const rowBg    = idx % 2 === 0 ? '#ffffff' : '#f5f5f5'
              return (
                <tr key={it.detalleId} style={{ background: rowBg }}>
                  <td style={tdStyle('left')}>
                    <span style={{ fontWeight: 600, fontSize: 11 }}>
                      {prod?.descripcion ?? '—'}
                    </span>
                    {it.descuento > 0 && (
                      <span style={{ marginLeft: 6, color: '#059669', fontSize: 10, fontWeight: 600 }}>
                        -{it.descuento}%
                      </span>
                    )}
                  </td>
                  <td style={tdStyle('center')}>{prod?.unidadMedida ?? ''}</td>
                  {/* Presentación: usando categoría del producto */}
                  <td style={{ ...tdStyle('center'), fontSize: 10 }}>
                    {prod?.categoria ?? ''}
                  </td>
                  {/* Papel: marca del producto */}
                  <td style={{ ...tdStyle('center'), fontSize: 10 }}>{prod?.marca ?? ''}</td>
                  <td style={tdStyle('right')}>
                    {it.cantidad.toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                  </td>
                  <td style={{ ...tdStyle('right'), fontWeight: 600 }}>
                    {fmtMXN(it.precio)}
                  </td>
                </tr>
              )
            })}
            {/* Fila de totales */}
            <tr style={{ background: '#f0f0f0' }}>
              <td colSpan={4} style={{ ...tdStyle('right'), fontSize: 11, paddingRight: 12 }}>
                Subtotal:
              </td>
              <td colSpan={2} style={{ ...tdStyle('right'), fontWeight: 600 }}>
                {fmtMXN(quote.subtotal)}
              </td>
            </tr>
            <tr style={{ background: '#f0f0f0' }}>
              <td colSpan={4} style={{ ...tdStyle('right'), fontSize: 11, paddingRight: 12 }}>
                IVA (16%):
              </td>
              <td colSpan={2} style={{ ...tdStyle('right'), fontWeight: 600 }}>
                {fmtMXN(quote.impuestos)}
              </td>
            </tr>
            <tr style={{ background: TEAL }}>
              <td colSpan={4} style={{ ...tdStyle('right'), color: '#fff', fontWeight: 700, paddingRight: 12 }}>
                TOTAL:
              </td>
              <td colSpan={2} style={{ ...tdStyle('right'), color: '#fff', fontWeight: 700, fontSize: 13 }}>
                {fmtMXN(quote.total)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── FORMA DE ENVÍO ────────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 11 }}>
          <tbody>
            <tr>
              <td style={{
                background: TEAL, color: '#fff', fontWeight: 600,
                padding: '5px 12px', width: '16%', textAlign: 'center',
              }}>
                Forma de envío:
              </td>
              <EnvioCell label="Granel" />
              <EnvioCell label="" />
              <EnvioCell label="Unitizado" />
              <td style={{ ...envioTd, textAlign: 'center', fontWeight: 600 }}>x</td>
              <EnvioCell label="Entarimado" />
            </tr>
          </tbody>
        </table>

        {/* ── NOTAS ─────────────────────────────────────────────────────── */}
        {quote.notas && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 4, fontSize: 11 }}>
            <span style={{ fontWeight: 700 }}>Notas: </span>{quote.notas}
          </div>
        )}

        {/* ── TÉRMINOS Y CONDICIONES ────────────────────────────────────── */}
        <div style={{ marginBottom: 20, fontSize: 11 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Términos y condiciones:</div>
          <ul style={{ paddingLeft: 14, margin: 0, lineHeight: 2 }}>
            <li>Precios + IVA,</li>
            <li>Moneda: MXN,</li>
            <li>
              <strong>Dirección de entrega: <em>{dirCliente || nombreCliente}</em></strong>
            </li>
            <li>
              Forma de Pago:{' '}
              <strong>50 % Anticipo 50 % contra entrega.</strong>
            </li>
            <li>Precios sujetos a cambio sin previo aviso,</li>
            <li>Precios considerados para las cantidades mínimas señaladas,</li>
            <li>Tiempo de entrega: 1 - 2 Días</li>
          </ul>
        </div>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 24, textAlign: 'center', fontSize: 10,
          color: '#888', borderTop: '1px solid #e5e7eb', paddingTop: 10,
        }}>
          {company.nombre}
          {company.correo    && ` · ${company.correo}`}
          {company.telefono  && ` · ${company.telefono}`}
          <br />
          Documento generado electrónicamente — {quote.folio}
        </div>
      </div>
    )
  }
)

QuotePDF.displayName = 'QuotePDF'

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

const envioTd: React.CSSProperties = {
  border: `1px solid ${TEAL}`, padding: '5px 10px',
  fontSize: 11, textAlign: 'center', background: '#f9f9f9',
}

function EnvioCell({ label }: { label: string }) {
  return (
    <td style={{ ...envioTd, fontWeight: label ? 600 : 400 }}>{label}</td>
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
