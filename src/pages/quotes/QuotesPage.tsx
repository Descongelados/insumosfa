import { useState } from 'react'
import { useQuotesStore } from '../../store/quotesStore'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { useClientsStore } from '../../store/clientsStore'
import { useProductsStore } from '../../store/productsStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import type { Quote, QuoteItem, CotizacionEstatus } from '../../types'
import { Plus, FileText, ArrowRight, Trash2 } from 'lucide-react'

const TAX = 0.16
const ESTADOS: CotizacionEstatus[] = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida']

export function QuotesPage() {
  const { quotes, addQuote, updateQuote } = useQuotesStore()
  const { addOrder } = useSalesOrdersStore()
  const { clients } = useClientsStore()
  const { products } = useProductsStore()
  const [q, setQ] = useState<string>('')
  const [modal, setModal] = useState<'new' | 'view' | null>(null)
  const [selQuote, setSelQuote] = useState<Quote | null>(null)
  const [form, setForm] = useState({ clienteId: '', vigencia: '', notas: '', items: [] as QuoteItem[] })

  const filtered = quotes.filter((qt) => {
    const client = clients.find((c) => c.clientId === qt.clienteId)
    return [qt.folio, client?.razonSocial ?? ''].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  function calcTotals(items: QuoteItem[]) {
    const subtotal = items.reduce((a, it) => a + it.cantidad * it.precio * (1 - it.descuento / 100), 0)
    return { subtotal, impuestos: subtotal * TAX, total: subtotal * (1 + TAX) }
  }

  function addItem() {
    const newItem: QuoteItem = { detalleId: `qd${Date.now()}`, productId: '', cantidad: 1, precio: 0, descuento: 0 }
    setForm((f) => ({ ...f, items: [...f.items, newItem] }))
  }

  function updateItem(idx: number, key: keyof QuoteItem, value: string | number) {
    setForm((f) => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it
        const updated = { ...it, [key]: value } as QuoteItem
        if (key === 'productId') {
          const prod = products.find((p) => p.productId === value)
          updated.precio = prod?.precioVenta ?? 0
        }
        return updated
      })
      return { ...f, items }
    })
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  function handleSave() {
    const { subtotal, impuestos, total } = calcTotals(form.items)
    addQuote({ ...form, fecha: new Date().toISOString().split('T')[0], subtotal, impuestos, total, estatus: 'borrador' })
    setModal(null)
    setForm({ clienteId: '', vigencia: '', notas: '', items: [] })
  }

  function convertirAPedido(quote: Quote) {
    addOrder({
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
    alert(`Pedido creado desde ${quote.folio}`)
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><FileText size={24} /> Cotizaciones</h1>
          <p className="page-subtitle">{quotes.length} cotizaciones registradas</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ clienteId: clients[0]?.clientId ?? '', vigencia: '', notas: '', items: [] }); setModal('new') }}>
          <Plus size={16} /> Nueva Cotización
        </button>
      </div>

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
                <div className="flex gap-1">
                  <button className="btn btn-secondary btn-sm" onClick={() => { setSelQuote(qt); setModal('view') }}>Ver</button>
                  {qt.estatus === 'borrador' || qt.estatus === 'enviada' ? (
                    <button className="btn btn-success btn-sm" onClick={() => convertirAPedido(qt)}>
                      <ArrowRight size={13} /> Pedido
                    </button>
                  ) : null}
                </div>
              )
            },
          ]}
        />
      </div>

      {/* New Quote Modal */}
      {modal === 'new' && (
        <Modal title="Nueva Cotización" onClose={() => setModal(null)} size="lg"
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSave}>Guardar Cotización</button></>}
        >
          <div className="space-y-4">
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Cliente *</label>
                <select className="select" value={form.clienteId} onChange={(e) => setForm(f => ({ ...f, clienteId: e.target.value }))}>
                  {clients.filter(c => c.estatus === 'activo').map((c) => <option key={c.clientId} value={c.clientId}>{c.razonSocial}</option>)}
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
                      {products.filter(p => p.activo).map((p) => <option key={p.productId} value={p.productId}>{p.sku} — {p.descripcion}</option>)}
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
              {form.items.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-right space-y-1">
                  {(() => {
                    const t = calcTotals(form.items)
                    return <>
                      <div>Subtotal: <span className="font-semibold">{t.subtotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span></div>
                      <div>IVA 16%: <span className="font-semibold">{t.impuestos.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span></div>
                      <div className="text-base font-bold text-gray-900">Total: {t.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</div>
                    </>
                  })()}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="label">Notas</label>
              <textarea className="textarea" rows={2} value={form.notas} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* View Quote Modal */}
      {modal === 'view' && selQuote && (
        <Modal title={`Cotización ${selQuote.folio}`} onClose={() => setModal(null)} size="lg"
          footer={<button className="btn-secondary" onClick={() => setModal(null)}>Cerrar</button>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Cliente:</span> <strong>{clients.find(c => c.clientId === selQuote.clienteId)?.razonSocial}</strong></div>
              <div><span className="text-gray-500">Estatus:</span> <StatusBadge status={selQuote.estatus} /></div>
              <div><span className="text-gray-500">Fecha:</span> {selQuote.fecha}</div>
              <div><span className="text-gray-500">Vigencia:</span> {selQuote.vigencia}</div>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Desc%</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {selQuote.items.map((it) => {
                    const p = products.find(pr => pr.productId === it.productId)
                    const sub = it.cantidad * it.precio * (1 - it.descuento / 100)
                    return (
                      <tr key={it.detalleId}>
                        <td>{p?.sku} — {p?.descripcion}</td>
                        <td>{it.cantidad}</td>
                        <td>{it.precio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                        <td>{it.descuento}%</td>
                        <td className="font-semibold">{sub.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-right text-sm space-y-1">
              <div>Subtotal: <Currency value={selQuote.subtotal} /></div>
              <div>IVA 16%: <Currency value={selQuote.impuestos} /></div>
              <div className="text-base font-bold">Total: <Currency value={selQuote.total} /></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
