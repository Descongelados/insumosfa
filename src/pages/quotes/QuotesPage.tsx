import { useRef, useState } from 'react'
import { useQuotesStore } from '../../store/quotesStore'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { useClientsStore } from '../../store/clientsStore'
import { useProductsStore } from '../../store/productsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import { QuotePDF } from '../../components/QuotePDF'
import { toast } from '../../store/toastStore'
import type { Quote, QuoteItem, CotizacionEstatus } from '../../types'
import { Plus, FileText, ArrowRight, Trash2, Eye, Printer, Share2, X } from 'lucide-react'

const TAX = 0.16
const ESTADOS: CotizacionEstatus[] = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida']
const DELETE_ROLES = ['director', 'administracion', 'ventas'] as const

export function QuotesPage() {
  const { quotes, addQuote, updateQuote, deleteQuote } = useQuotesStore()
  const { addOrder } = useSalesOrdersStore()
  const { clients } = useClientsStore()
  const { products } = useProductsStore()
  const { user: me } = useAuthStore()

  const canDelete = me ? hasRole(me, ...DELETE_ROLES) : false

  const [q, setQ] = useState<string>('')
  const [modal, setModal] = useState<'new' | 'preview' | 'del' | null>(null)
  const [selQuote, setSelQuote] = useState<Quote | null>(null)
  const [delTarget, setDelTarget] = useState<Quote | null>(null)
  const [form, setForm] = useState({ clienteId: '', vigencia: '', notas: '', items: [] as QuoteItem[] })

  // ref to the rendered PDF div for printing
  const printFrameRef = useRef<HTMLDivElement>(null)

  const filtered = quotes.filter((qt) => {
    const client = clients.find((c) => c.clientId === qt.clienteId)
    return [qt.folio, client?.razonSocial ?? ''].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  // ── Helpers ────────────────────────────────────────────────────────────────
  function calcTotals(items: QuoteItem[]) {
    const subtotal = items.reduce((a, it) => a + it.cantidad * it.precio * (1 - it.descuento / 100), 0)
    return { subtotal, impuestos: subtotal * TAX, total: subtotal * (1 + TAX) }
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { detalleId: `qd${Date.now()}`, productId: '', cantidad: 1, precio: 0, descuento: 0 }] }))
  }

  function updateItem(idx: number, key: keyof QuoteItem, value: string | number) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => {
        if (i !== idx) return it
        const updated = { ...it, [key]: value } as QuoteItem
        if (key === 'productId') updated.precio = products.find((p) => p.productId === value)?.precioVenta ?? 0
        return updated
      }),
    }))
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  // ── Save new ───────────────────────────────────────────────────────────────
  function handleSave() {
    if (!form.clienteId) { toast.error('Selecciona un cliente.'); return }
    if (form.items.length === 0) { toast.error('Agrega al menos una partida.'); return }
    const { subtotal, impuestos, total } = calcTotals(form.items)
    const quote = addQuote({ ...form, fecha: new Date().toISOString().split('T')[0], subtotal, impuestos, total, estatus: 'borrador' })
    toast.success(`Cotización ${quote.folio} creada.`)
    setModal(null)
    setForm({ clienteId: '', vigencia: '', notas: '', items: [] })
    // Immediately open preview of the new quote
    setSelQuote(quote)
    setModal('preview')
  }

  // ── Convert to order ───────────────────────────────────────────────────────
  function convertirAPedido(quote: Quote) {
    const order = addOrder({
      clienteId: quote.clienteId,
      cotizacionId: quote.cotizacionId,
      fechaPedido: new Date().toISOString().split('T')[0],
      fechaEntrega: '',
      estatus: 'nuevo',
      items: quote.items.map(i => ({ ...i, detalleId: `sod${Date.now()}${Math.random()}` })),
      subtotal: quote.subtotal,
      impuestos: quote.impuestos,
      total: quote.total,
      notas: quote.notas,
    })
    updateQuote(quote.cotizacionId, { estatus: 'aceptada' })
    toast.success(`Pedido ${order.folio} creado desde ${quote.folio}.`)
    setModal(null)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function handleDelete() {
    if (delTarget) { deleteQuote(delTarget.cotizacionId); toast.success(`Cotización ${delTarget.folio} eliminada.`) }
    setModal(null); setDelTarget(null)
  }

  // ── Print / Export PDF ─────────────────────────────────────────────────────
  function handlePrint() {
    window.print()
  }

  // ── Share ──────────────────────────────────────────────────────────────────
  async function handleShare(quote: Quote) {
    const client = clients.find(c => c.clientId === quote.clienteId)
    const text = `Cotización ${quote.folio} — ${client?.razonSocial ?? ''}\nTotal: ${quote.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}\nVigencia: ${quote.vigencia || 'N/A'}\n\nGenerado por InsumosFa ERP`
    if (navigator.share) {
      try {
        await navigator.share({ title: `Cotización ${quote.folio}`, text })
        return
      } catch { /* user cancelled */ }
    }
    // fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text)
      toast.info('Resumen de la cotización copiado al portapapeles.')
    } catch {
      toast.error('No fue posible compartir. Usa el botón Imprimir para exportar el PDF.')
    }
  }

  const mxn = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><FileText size={24} /> Cotizaciones</h1>
          <p className="page-subtitle">{quotes.length} cotizaciones registradas</p>
        </div>
        <button className="btn-primary" onClick={() => {
          setForm({ clienteId: clients[0]?.clientId ?? '', vigencia: '', notas: '', items: [] })
          setModal('new')
        }}>
          <Plus size={16} /> Nueva Cotización
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex justify-between mb-4">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar folio o cliente..." />
        </div>
        <DataTable
          data={filtered}
          rowKey={(qt) => qt.cotizacionId}
          columns={[
            { key: 'folio', header: 'Folio', render: (qt) => <span className="font-mono font-semibold text-blue-700">{qt.folio}</span> },
            { key: 'cliente', header: 'Cliente', render: (qt) => clients.find(c => c.clientId === qt.clienteId)?.razonSocial ?? '-' },
            { key: 'fecha', header: 'Fecha' },
            { key: 'vigencia', header: 'Vigencia' },
            { key: 'items', header: 'Partidas', render: (qt) => qt.items.length },
            { key: 'total', header: 'Total', render: (qt) => <Currency value={qt.total} /> },
            { key: 'estatus', header: 'Estatus', render: (qt) => <StatusBadge status={qt.estatus} /> },
            {
              key: 'acc', header: '', render: (qt) => (
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
              )
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
              <button className="btn-primary" onClick={handleSave}>Guardar y Ver Cotización</button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Cliente *</label>
                <select className="select" value={form.clienteId} onChange={(e) => setForm(f => ({ ...f, clienteId: e.target.value }))}>
                  {clients.filter(c => c.estatus === 'activo').map((c) => (
                    <option key={c.clientId} value={c.clientId}>{c.razonSocial}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Vigencia</label>
                <input type="date" className="input" value={form.vigencia} onChange={(e) => setForm(f => ({ ...f, vigencia: e.target.value }))} />
              </div>
            </div>
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
                    <select className="select" value={it.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {products.filter(p => p.activo).map((p) => (
                        <option key={p.productId} value={p.productId}>{p.sku} — {p.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="label">Cantidad</label>}
                    <input type="number" className="input" min={1} value={it.cantidad} onChange={(e) => updateItem(idx, 'cantidad', Number(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="label">Precio</label>}
                    <input type="number" className="input" min={0} step="0.01" value={it.precio} onChange={(e) => updateItem(idx, 'precio', Number(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="label">Desc%</label>}
                    <input type="number" className="input" min={0} max={100} value={it.descuento} onChange={(e) => updateItem(idx, 'descuento', Number(e.target.value))} />
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
            <div className="form-group">
              <label className="label">Notas</label>
              <textarea className="textarea" rows={2} value={form.notas} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Preview / PDF Modal ─────────────────────────────────────────── */}
      {modal === 'preview' && selQuote && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-800/80" onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white flex-shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={18} className="flex-shrink-0 text-blue-400" />
              <span className="font-semibold truncate">{selQuote.folio} — {clients.find(c => c.clientId === selQuote.clienteId)?.razonSocial}</span>
              <StatusBadge status={selQuote.estatus} />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Change status */}
              <select
                className="text-xs bg-gray-700 text-white border border-gray-600 rounded-lg px-2 py-1"
                value={selQuote.estatus}
                onChange={(e) => { updateQuote(selQuote.cotizacionId, { estatus: e.target.value as CotizacionEstatus }); setSelQuote({ ...selQuote, estatus: e.target.value as CotizacionEstatus }) }}
              >
                {ESTADOS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              {/* Convert to order */}
              {(selQuote.estatus === 'borrador' || selQuote.estatus === 'enviada') && (
                <button className="btn btn-success btn-sm" onClick={() => convertirAPedido(selQuote)}>
                  <ArrowRight size={13} /> Crear Pedido
                </button>
              )}
              {/* Share */}
              <button className="btn btn-secondary btn-sm" onClick={() => handleShare(selQuote)}>
                <Share2 size={13} /> Compartir
              </button>
              {/* Print / Export PDF */}
              <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                <Printer size={13} /> Exportar PDF
              </button>
              <button className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white" onClick={() => setModal(null)}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable document area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="shadow-2xl rounded-xl overflow-hidden">
              {/* Hidden print frame — only this div is shown when printing */}
              <div id="quote-print-frame" style={{ display: 'none' }}>
                <QuotePDF
                  ref={printFrameRef}
                  quote={selQuote}
                  client={clients.find(c => c.clientId === selQuote.clienteId)}
                  products={products}
                />
              </div>
              {/* Visible preview */}
              <QuotePDF
                quote={selQuote}
                client={clients.find(c => c.clientId === selQuote.clienteId)}
                products={products}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar eliminación ────────────────────────────────── */}
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
              <div className="font-semibold">{clients.find(c => c.clientId === delTarget.clienteId)?.razonSocial}</div>
              <div className="text-gray-500">Total: <Currency value={delTarget.total} /> · {delTarget.items.length} partida(s)</div>
              <div><StatusBadge status={delTarget.estatus} /></div>
            </div>
            <p className="text-gray-500">Esta acción no se puede deshacer.</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
