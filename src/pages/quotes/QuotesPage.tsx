import { useRef, useState, useEffect } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useQuotesStore } from '../../store/quotesStore'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { useClientsStore } from '../../store/clientsStore'
import { useProductsStore } from '../../store/productsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { useConfigStore, type CompanyInfo } from '../../store/configStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import { QuotePDF } from '../../components/QuotePDF'
import { toast } from '../../store/toastStore'
import type { Quote, QuoteItem, CotizacionEstatus, Client, Product } from '../../types'
import { Plus, FileText, ArrowRight, Trash2, Eye, Download, Share2, X, Copy, Check, UserCheck, User } from 'lucide-react'

const TAX = 0.16
const ESTADOS: CotizacionEstatus[] = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida']
const DELETE_ROLES = ['director', 'administracion', 'ventas'] as const

// ── helpers ──────────────────────────────────────────────────────────────────
/** Nombre a mostrar en tabla/share: registrado tiene prioridad, luego eventual */
function resolveNombre(qt: Quote, clients: Client[]): string {
  if (qt.clienteId) return clients.find(c => c.clientId === qt.clienteId)?.razonSocial ?? qt.clienteNombre ?? '—'
  return qt.clienteNombre || '—'
}

/** Badge visual: registrado vs eventual */
function ClienteBadge({ qt }: { qt: Quote }) {
  return qt.clienteId ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
      <UserCheck size={11} /> Registrado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <User size={11} /> Eventual
    </span>
  )
}

// ── Print via hidden iframe ───────────────────────────────────────────────────
function printQuoteInIframe(quote: Quote, client: Client | undefined, products: Product[], company: CompanyInfo, atiende?: string) {
  const html = renderToStaticMarkup(
    <QuotePDF quote={quote} client={client} products={products} companyOverride={company} atiende={atiende} />
  )
  const doc = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${quote.folio}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; }
    @page { margin: 15mm; size: A4; }
  </style>
</head>
<body>${html}</body>
</html>`
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:none;opacity:0;pointer-events:none;'
  document.body.appendChild(iframe)
  const win = iframe.contentWindow!
  win.document.open(); win.document.write(doc); win.document.close()
  win.onload = () => { win.focus(); win.print(); setTimeout(() => document.body.removeChild(iframe), 1000) }
}

// ── Form types ────────────────────────────────────────────────────────────────
type ClienteMode = 'registrado' | 'eventual'

const BLANK_FORM = {
  clienteMode: 'registrado' as ClienteMode,
  // registrado
  clienteId: '',
  // eventual
  clienteNombre: '', clienteRfc: '', clienteCorreo: '', clienteTelefono: '',
  // común
  vigencia: '', notas: '',
  items: [] as QuoteItem[],
  previewOpen: false,
}

// ─────────────────────────────────────────────────────────────────────────────
export function QuotesPage() {
  const { quotes, loadQuotes, subscribeRealtime, addQuote, updateQuote, deleteQuote } = useQuotesStore()
  const { addOrder }                   = useSalesOrdersStore()
  const { clients, loadClients }       = useClientsStore()
  const { products, loadProducts }     = useProductsStore()
  const { user: me }                   = useAuthStore()
  const { company }                    = useConfigStore()

  // Carga inicial + suscripción realtime para ver cotizaciones de otros usuarios
  useEffect(() => {
    void loadQuotes()
    void loadClients()
    void loadProducts()
    return subscribeRealtime()
  }, [])

  const canDelete = me ? hasRole(me, ...DELETE_ROLES) : false

  // ── estados ───────────────────────────────────────────────────────────────
  const [q, setQ]                 = useState('')
  const [modal, setModal]         = useState<'new' | 'preview' | 'del' | null>(null)
  const [selQuote, setSelQuote]   = useState<Quote | null>(null)
  const [delTarget, setDelTarget] = useState<Quote | null>(null)
  const [form, setForm]           = useState(BLANK_FORM)

  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied]       = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  // ── búsqueda — incluye clientes eventuales ────────────────────────────────
  const filtered = quotes.filter(qt => {
    const nombre = resolveNombre(qt, clients).toLowerCase()
    return [qt.folio, nombre].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  // ── helpers de form ───────────────────────────────────────────────────────
  function calcTotals(items: QuoteItem[]) {
    const subtotal = items.reduce((a, it) => a + it.cantidad * it.precio * (1 - it.descuento / 100), 0)
    return { subtotal, impuestos: subtotal * TAX, total: subtotal * (1 + TAX) }
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { detalleId: `qd${Date.now()}`, productId: '', cantidad: 1, precio: 0, descuento: 0 }] }))
  }

  function updateItem(idx: number, key: keyof QuoteItem, value: string | number) {
    setForm(f => ({
      ...f,
      items: f.items.map((it, i) => {
        if (i !== idx) return it
        const updated = { ...it, [key]: value } as QuoteItem
        if (key === 'productId') updated.precio = products.find(p => p.productId === value)?.precioVenta ?? 0
        return updated
      }),
    }))
  }

  function removeItem(idx: number) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  /** Construye un Quote provisional para el panel de preview (sin guardar) */
  function buildPreviewQuote(): Quote {
    const { subtotal, impuestos, total } = calcTotals(form.items)
    return {
      cotizacionId: 'preview', folio: 'PREV-0000',
      clienteId:       form.clienteMode === 'registrado' ? form.clienteId : '',
      clienteNombre:   form.clienteMode === 'eventual'   ? form.clienteNombre   : undefined,
      clienteRfc:      form.clienteMode === 'eventual'   ? form.clienteRfc      : undefined,
      clienteCorreo:   form.clienteMode === 'eventual'   ? form.clienteCorreo   : undefined,
      clienteTelefono: form.clienteMode === 'eventual'   ? form.clienteTelefono : undefined,
      vigencia: form.vigencia, notas: form.notas, items: form.items,
      fecha: new Date().toISOString().split('T')[0],
      subtotal, impuestos, total, estatus: 'borrador',
    }
  }

  // ── guardar ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (form.clienteMode === 'registrado' && !form.clienteId) {
      toast.error('Selecciona un cliente.'); return
    }
    if (form.clienteMode === 'eventual' && !form.clienteNombre.trim()) {
      toast.error('El nombre del cliente es obligatorio.'); return
    }
    if (form.items.length === 0) { toast.error('Agrega al menos una partida.'); return }

    const { subtotal, impuestos, total } = calcTotals(form.items)
    const quote = await addQuote({
      clienteId:       form.clienteMode === 'registrado' ? form.clienteId : '',
      clienteNombre:   form.clienteMode === 'eventual'   ? form.clienteNombre   : '',
      clienteRfc:      form.clienteMode === 'eventual'   ? form.clienteRfc      : '',
      clienteCorreo:   form.clienteMode === 'eventual'   ? form.clienteCorreo   : '',
      clienteTelefono: form.clienteMode === 'eventual'   ? form.clienteTelefono : '',
      vigencia: form.vigencia, notas: form.notas, items: form.items,
      fecha: new Date().toISOString().split('T')[0],
      subtotal, impuestos, total, estatus: 'borrador',
    })
    toast.success(`Cotización ${quote.folio} creada.`)
    setModal(null)
    setForm(BLANK_FORM)
    setSelQuote(quote)
    setModal('preview')
  }

  // ── convertir a pedido ────────────────────────────────────────────────────
  async function convertirAPedido(quote: Quote) {
    const order = await addOrder({
      clienteId: quote.clienteId,
      cotizacionId: quote.cotizacionId,
      fechaPedido: new Date().toISOString().split('T')[0],
      fechaEntrega: '', estatus: 'nuevo',
      items: quote.items.map(i => ({ ...i, detalleId: `sod${Date.now()}${Math.random()}` })),
      subtotal: quote.subtotal, impuestos: quote.impuestos, total: quote.total, notas: quote.notas,
    })
    void updateQuote(quote.cotizacionId, { estatus: 'aceptada' })
    toast.success(`Pedido ${order.folio} creado desde ${quote.folio}.`)
    setModal(null)
  }

  // ── eliminar ──────────────────────────────────────────────────────────────
  function handleDelete() {
    if (delTarget) { deleteQuote(delTarget.cotizacionId); toast.success(`Cotización ${delTarget.folio} eliminada.`) }
    setModal(null); setDelTarget(null)
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  function handlePrint(quote: Quote) {
    const client = clients.find(c => c.clientId === quote.clienteId)
    printQuoteInIframe(quote, client, products, company, me?.name)
  }

  // ── share — funciona tanto para registrados como para eventuales ──────────
  function buildShareText(quote: Quote) {
    const nombre = resolveNombre(quote, clients)
    const mxn = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
    const lines = [
      `Cotización ${quote.folio}`,
      `Cliente: ${nombre}`,
    ]
    // Datos extra del eventual
    if (!quote.clienteId) {
      if (quote.clienteRfc)      lines.push(`RFC: ${quote.clienteRfc}`)
      if (quote.clienteCorreo)   lines.push(`Correo: ${quote.clienteCorreo}`)
      if (quote.clienteTelefono) lines.push(`Tel: ${quote.clienteTelefono}`)
    }
    lines.push(
      `Fecha: ${quote.fecha}${quote.vigencia ? `  ·  Vigente hasta: ${quote.vigencia}` : ''}`,
      '',
      ...quote.items.map(it => {
        const prod = products.find(p => p.productId === it.productId)
        const importe = it.cantidad * it.precio * (1 - it.descuento / 100)
        return ` ${prod?.sku ?? '?'} ${prod?.descripcion ?? '—'}  x${it.cantidad}  ${mxn(importe)}`
      }),
      '',
      `Subtotal:  ${mxn(quote.subtotal)}`,
      `IVA 16%:   ${mxn(quote.impuestos)}`,
      `TOTAL:     ${mxn(quote.total)}`,
      '',
      'Generado por InsumosFa ERP',
    )
    return lines.join('\n')
  }

  async function handleCopyText(quote: Quote) {
    try {
      await navigator.clipboard.writeText(buildShareText(quote))
      setCopied(true); toast.success('Cotización copiada al portapapeles.')
      setTimeout(() => setCopied(false), 2500)
    } catch { toast.error('No fue posible copiar al portapapeles.') }
  }

  async function handleNativeShare(quote: Quote) {
    const nombre = resolveNombre(quote, clients)
    if ('share' in navigator) {
      try {
        await navigator.share({ title: `Cotización ${quote.folio} — ${nombre}`, text: buildShareText(quote) })
        setShareOpen(false)
      } catch { /* user cancelled */ }
    } else { await handleCopyText(quote); setShareOpen(false) }
  }

  const mxn = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><FileText size={24} /> Cotizaciones</h1>
          <p className="page-subtitle">{quotes.length} cotizaciones registradas</p>
        </div>
        <button className="btn-primary" onClick={() => {
          setForm({ ...BLANK_FORM, clienteId: clients.filter(c => c.estatus === 'activo')[0]?.clientId ?? '' })
          setModal('new')
        }}>
          <Plus size={16} /> Nueva Cotización
        </button>
      </div>

      {/* ── Tabla ───────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex justify-between mb-4">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar folio o cliente..." />
        </div>
        <DataTable
          data={filtered}
          rowKey={qt => qt.cotizacionId}
          columns={[
            { key: 'folio',    header: 'Folio',    render: qt => <span className="font-mono font-semibold text-blue-700">{qt.folio}</span> },
            {
              key: 'cliente', header: 'Cliente',
              render: qt => (
                <div className="flex flex-col gap-0.5">
                  <span>{resolveNombre(qt, clients)}</span>
                  <ClienteBadge qt={qt} />
                </div>
              ),
            },
            { key: 'fecha',    header: 'Fecha' },
            { key: 'vigencia', header: 'Vigencia' },
            { key: 'items',    header: 'Partidas', render: qt => qt.items.length },
            { key: 'total',    header: 'Total',    render: qt => <Currency value={qt.total} /> },
            { key: 'estatus',  header: 'Estatus',  render: qt => <StatusBadge status={qt.estatus} /> },
            {
              key: 'acc', header: '',
              render: qt => (
                <div className="flex gap-1 flex-wrap">
                  <button className="btn btn-secondary btn-sm" onClick={() => { setSelQuote(qt); setModal('preview') }}>
                    <Eye size={13} /> Ver
                  </button>
                  {(qt.estatus === 'borrador' || qt.estatus === 'enviada') && (
                    <button className="btn btn-success btn-sm" onClick={() => convertirAPedido(qt)}>
                      <ArrowRight size={13} /> Pedido
                    </button>
                  )}
                  {canDelete && (qt.estatus === 'borrador' || qt.estatus === 'rechazada' || qt.estatus === 'vencida') && (
                    <button className="btn btn-danger btn-sm" onClick={() => { setDelTarget(qt); setModal('del') }} title="Eliminar">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ── Modal: Nueva Cotización ──────────────────────────────────────── */}
      {modal === 'new' && (
        <Modal title="Nueva Cotización" onClose={() => setModal(null)} size="lg"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setForm(f => ({ ...f, previewOpen: !f.previewOpen }))}
              >
                <Eye size={14} /> {form.previewOpen ? 'Ocultar preview' : 'Vista previa'}
              </button>
              <button className="btn-primary" onClick={handleSave}>Guardar y Ver Cotización</button>
            </>
          }
        >
          <div className="space-y-4">

            {/* Toggle tipo de cliente */}
            <div>
              <label className="label">Tipo de cliente</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, clienteMode: 'registrado' }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.clienteMode === 'registrado'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <UserCheck size={15} /> Registrado
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, clienteMode: 'eventual' }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.clienteMode === 'eventual'
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <User size={15} /> Eventual (sin registro)
                </button>
              </div>
            </div>

            {/* Campos según modo */}
            {form.clienteMode === 'registrado' ? (
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">Cliente *</label>
                  <select className="select" value={form.clienteId} onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {clients.filter(c => c.estatus === 'activo').map(c => (
                      <option key={c.clientId} value={c.clientId}>{c.razonSocial}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Vigencia</label>
                  <input type="date" className="input" value={form.vigencia} onChange={e => setForm(f => ({ ...f, vigencia: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700 font-medium">
                  Datos del cliente eventual — se guardan en la cotización y aparecen en el PDF y al compartir.
                </p>
                <div className="form-grid">
                  <div className="form-group sm:col-span-2">
                    <label className="label">Nombre / Razón Social *</label>
                    <input
                      className="input"
                      value={form.clienteNombre}
                      onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))}
                      placeholder="Nombre o empresa"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">RFC</label>
                    <input
                      className="input" maxLength={13}
                      value={form.clienteRfc}
                      onChange={e => setForm(f => ({ ...f, clienteRfc: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Correo</label>
                    <input
                      type="email" className="input"
                      value={form.clienteCorreo}
                      onChange={e => setForm(f => ({ ...f, clienteCorreo: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Teléfono</label>
                    <input
                      className="input"
                      value={form.clienteTelefono}
                      onChange={e => setForm(f => ({ ...f, clienteTelefono: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Vigencia</label>
                    <input type="date" className="input" value={form.vigencia} onChange={e => setForm(f => ({ ...f, vigencia: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}

            {/* Partidas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Partidas</label>
                <button className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={13} /> Agregar</button>
              </div>
              {form.items.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-300 rounded-lg">
                  Sin partidas. Agrega productos.
                </div>
              )}
              {form.items.map((it, idx) => (
                <div key={it.detalleId} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-5">
                    {idx === 0 && <label className="label">Producto</label>}
                    <select className="select" value={it.productId} onChange={e => updateItem(idx, 'productId', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {products.filter(p => p.activo).map(p => (
                        <option key={p.productId} value={p.productId}>{p.sku} — {p.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="label">Cantidad</label>}
                    <input type="number" className="input" min={1} value={it.cantidad} onChange={e => updateItem(idx, 'cantidad', Number(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="label">Precio</label>}
                    <input type="number" className="input" min={0} step="0.01" value={it.precio} onChange={e => updateItem(idx, 'precio', Number(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="label">Desc%</label>}
                    <input type="number" className="input" min={0} max={100} value={it.descuento} onChange={e => updateItem(idx, 'descuento', Number(e.target.value))} />
                  </div>
                  <div className="col-span-1">
                    {idx === 0 && <div className="label opacity-0">X</div>}
                    <button className="btn btn-danger btn-sm w-full justify-center" onClick={() => removeItem(idx)}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              {form.items.length > 0 && (() => {
                const t = calcTotals(form.items)
                return (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-right space-y-1">
                    <div>Subtotal: <span className="font-semibold">{mxn(t.subtotal)}</span></div>
                    <div>IVA 16%: <span className="font-semibold">{mxn(t.impuestos)}</span></div>
                    <div className="text-base font-bold text-gray-900">Total: {mxn(t.total)}</div>
                  </div>
                )
              })()}
            </div>

            {/* Notas */}
            <div className="form-group">
              <label className="label">Notas</label>
              <textarea className="textarea" rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>

            {/* Panel de vista previa en vivo */}
            {form.previewOpen && (
              <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Eye size={13} /> Vista previa — borrador
                  </span>
                  <span className="text-xs text-gray-400 italic">No guardada · El folio se asignará al guardar</span>
                </div>
                <div className="overflow-y-auto max-h-[560px] bg-white p-2">
                  <QuotePDF
                    quote={buildPreviewQuote()}
                    client={clients.find(c => c.clientId === form.clienteId)}
                    products={products}
                    atiende={me?.name}
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Preview / PDF Modal ──────────────────────────────────────────── */}
      {modal === 'preview' && selQuote && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-gray-800/80"
          onClick={e => { if (e.target === e.currentTarget) { setModal(null); setShareOpen(false) } }}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white flex-shrink-0 gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={18} className="flex-shrink-0 text-blue-400" />
              <span className="font-semibold truncate text-sm">
                {selQuote.folio} — {resolveNombre(selQuote, clients)}
              </span>
              <StatusBadge status={selQuote.estatus} />
              <ClienteBadge qt={selQuote} />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {/* Cambiar estatus */}
              <select
                className="text-xs bg-gray-700 text-white border border-gray-600 rounded-lg px-2 py-1.5"
                value={selQuote.estatus}
                onChange={e => {
                  updateQuote(selQuote.cotizacionId, { estatus: e.target.value as CotizacionEstatus })
                  setSelQuote({ ...selQuote, estatus: e.target.value as CotizacionEstatus })
                }}
              >
                {ESTADOS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>

              {(selQuote.estatus === 'borrador' || selQuote.estatus === 'enviada') && (
                <button className="btn btn-success btn-sm" onClick={() => convertirAPedido(selQuote)}>
                  <ArrowRight size={13} /> Crear Pedido
                </button>
              )}

              {/* Compartir */}
              <div className="relative" ref={shareRef}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShareOpen(o => !o)}>
                  <Share2 size={13} /> Compartir
                </button>
                {shareOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-56 bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-200 z-10 overflow-hidden"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      Compartir cotización
                    </div>
                    <button
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 text-left transition-colors"
                      onClick={() => { handleCopyText(selQuote); setShareOpen(false) }}
                    >
                      {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} className="text-gray-500" />}
                      <span>{copied ? 'Copiado' : 'Copiar como texto'}</span>
                    </button>
                    <button
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 text-left transition-colors border-t border-gray-100"
                      onClick={() => handleNativeShare(selQuote)}
                    >
                      <Share2 size={15} className="text-blue-500" />
                      <span>{'share' in navigator ? 'Compartir (WhatsApp, Email…)' : 'Copiar al portapapeles'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* PDF */}
              <button className="btn btn-primary btn-sm" onClick={() => { handlePrint(selQuote); setShareOpen(false) }}>
                <Download size={13} /> Descargar PDF
              </button>

              <button
                className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                onClick={() => { setModal(null); setShareOpen(false) }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8" onClick={() => setShareOpen(false)}>
            <div className="shadow-2xl rounded-xl overflow-hidden">
              <QuotePDF
                quote={selQuote}
                client={clients.find(c => c.clientId === selQuote.clienteId)}
                products={products}
                atiende={me?.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar eliminación ─────────────────────────────────── */}
      {modal === 'del' && delTarget && (
        <Modal title="Eliminar cotización" onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar definitivamente</button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>¿Eliminar la cotización <strong className="font-mono">{delTarget.folio}</strong>?</p>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
              <div className="font-semibold flex items-center gap-2">
                {resolveNombre(delTarget, clients)}
                <ClienteBadge qt={delTarget} />
              </div>
              <div className="text-gray-500">
                Total: <Currency value={delTarget.total} /> · {delTarget.items.length} partida(s)
              </div>
              <div><StatusBadge status={delTarget.estatus} /></div>
            </div>
            <p className="text-gray-500">Esta acción no se puede deshacer.</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
