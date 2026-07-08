import { useState, useEffect } from 'react'
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
import { toast } from '../../store/toastStore'
import type { SalesOrder, SalesOrderItem, PedidoEstatus } from '../../types'
import { ShoppingCart, CreditCard as Edit2, Plus, Trash2 } from 'lucide-react'

// 'facturado' moves to Finance — excluded from active pipeline display
const ESTADOS: PedidoEstatus[] = ['nuevo', 'confirmado', 'surtiendo', 'embarcado', 'entregado', 'facturado', 'cerrado']
const ESTADOS_ACTIVOS: PedidoEstatus[] = ['nuevo', 'confirmado', 'surtiendo', 'embarcado', 'entregado', 'cerrado']

export function SalesOrdersPage() {
  const { orders, loadOrders, subscribeRealtime: subOrders, addOrder, updateOrder, deleteOrder } = useSalesOrdersStore()
  const { clients, loadClients, subscribeRealtime: subClients } = useClientsStore()
  const { products, loadProducts, subscribeRealtime: subProducts } = useProductsStore()
  const { user: me } = useAuthStore()

  useEffect(() => {
    void loadOrders()
    void loadClients()
    void loadProducts()
    const u1 = subOrders()
    const u2 = subClients()
    const u3 = subProducts()
    return () => { u1(); u2(); u3() }
  }, [])

  const [q, setQ] = useState('')
  const [modal, setModal] = useState<'edit' | 'new' | 'del' | null>(null)
  const [sel, setSel] = useState<SalesOrder | null>(null)
  const [delTarget, setDelTarget] = useState<SalesOrder | null>(null)
  const [form, setForm] = useState({ clienteId: '', fechaEntrega: '', notas: '', items: [] as SalesOrderItem[] })

  const canDelete = me ? hasRole(me, 'director', 'administracion') : false

  // Facturado orders are handled in Finance — only show active pipeline here
  const activeOrders = orders.filter((o) => o.estatus !== 'facturado')
  const facturadosCount = orders.filter((o) => o.estatus === 'facturado').length

  const filtered = activeOrders.filter((o) => {
    const client = clients.find((c) => c.clientId === o.clienteId)
    return [o.folio, client?.razonSocial ?? ''].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  function openEdit(o: SalesOrder) { setSel(o); setModal('edit') }
  function openNew() {
    setForm({ clienteId: clients[0]?.clientId ?? '', fechaEntrega: '', notas: '', items: [] })
    setModal('new')
  }
  function openDel(o: SalesOrder) { setDelTarget(o); setModal('del') }

  function handleStatusChange(status: PedidoEstatus) {
    if (sel) { updateOrder(sel.pedidoId, { estatus: status }); toast.info(`Pedido ${sel.folio} → ${status}`) }
    setModal(null); setSel(null)
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { detalleId: `soi${Date.now()}`, productId: '', cantidad: 1, precio: 0, descuento: 0 }] }))
  }
  function updateItem(idx: number, key: keyof SalesOrderItem, value: string | number) {
    setForm(f => ({
      ...f, items: f.items.map((it, i) => {
        if (i !== idx) return it
        const updated = { ...it, [key]: value } as SalesOrderItem
        if (key === 'productId') updated.precio = products.find(p => p.productId === value)?.precioVenta ?? 0
        return updated
      })
    }))
  }
  function removeItem(idx: number) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })) }

  async function handleSaveNew() {
    if (!form.clienteId) { toast.error('Selecciona un cliente.'); return }
    if (form.items.length === 0) { toast.error('Agrega al menos una partida.'); return }
    const subtotal = form.items.reduce((a, it) => a + it.cantidad * it.precio * (1 - it.descuento / 100), 0)
    const impuestos = subtotal * 0.16
    const total = subtotal + impuestos
    const order = await addOrder({ ...form, fechaPedido: new Date().toISOString().split('T')[0], estatus: 'nuevo', subtotal, impuestos, total })
    toast.success(`Pedido ${order.folio} creado.`)
    setModal(null)
    setForm({ clienteId: '', fechaEntrega: '', notas: '', items: [] })
  }

  function handleDelete() {
    if (delTarget) { deleteOrder(delTarget.pedidoId); toast.success(`Pedido ${delTarget.folio} eliminado.`) }
    setModal(null); setDelTarget(null)
  }

  const byStatus = ESTADOS.map((e) => ({ e, count: orders.filter((o) => o.estatus === e).length }))

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><ShoppingCart size={24} /> Pedidos de Venta</h1>
          <p className="page-subtitle">{activeOrders.length} pedidos activos en pipeline</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Pedido</button>
      </div>

      {/* Pipeline status counters — only active statuses */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {byStatus.filter(({ e }) => ESTADOS_ACTIVOS.includes(e)).map(({ e, count }) => (
          <div key={e} className="card-sm flex-shrink-0 min-w-[110px] text-center">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <StatusBadge status={e} />
          </div>
        ))}
        {facturadosCount > 0 && (
          <div className="card-sm flex-shrink-0 min-w-[130px] text-center border-purple-200 bg-purple-50">
            <div className="text-2xl font-bold text-purple-700">{facturadosCount}</div>
            <div className="text-xs text-purple-600 font-medium mt-1">Facturado → Finanzas</div>
          </div>
        )}
      </div>

      {/* Info banner when there are facturado orders */}
      {facturadosCount > 0 && (
        <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-800">
          <ShoppingCart size={15} className="flex-shrink-0 mt-0.5" />
          <span>
            <strong>{facturadosCount} pedido(s) facturado(s)</strong> han pasado al módulo de <strong>Finanzas → CxC</strong> para su cobro. Ya no aparecen en esta lista.
          </span>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between mb-4">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar folio o cliente..." />
        </div>
        <DataTable
          data={filtered}
          rowKey={(o) => o.pedidoId}
          columns={[
            { key: 'folio', header: 'Folio', render: (o) => <span className="font-mono font-semibold text-blue-700">{o.folio}</span> },
            { key: 'cliente', header: 'Cliente', render: (o) => clients.find(c => c.clientId === o.clienteId)?.razonSocial ?? '-' },
            { key: 'fechaPedido', header: 'Fecha Pedido' },
            { key: 'fechaEntrega', header: 'Fecha Entrega', render: (o) => o.fechaEntrega || '-' },
            { key: 'items', header: 'Partidas', render: (o) => o.items.length },
            { key: 'total', header: 'Total', render: (o) => <Currency value={o.total} /> },
            { key: 'estatus', header: 'Estatus', render: (o) => <StatusBadge status={o.estatus} /> },
            {
              key: 'acc', header: '', render: (o) => (
                <div className="flex gap-1">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(o)}>
                    <Edit2 size={13} /> Estatus
                  </button>
                  {canDelete && (
                    <button className="btn btn-danger btn-sm" onClick={() => openDel(o)} title="Eliminar">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )
            },
          ]}
        />
      </div>

      {/* Edit status modal */}
      {modal === 'edit' && sel && (
        <Modal title={`Pedido ${sel.folio}`} onClose={() => setModal(null)} size="lg"
          footer={<button className="btn-secondary" onClick={() => setModal(null)}>Cerrar</button>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Cliente:</span> <strong>{clients.find(c => c.clientId === sel.clienteId)?.razonSocial}</strong></div>
              <div><span className="text-gray-500">Total:</span> <Currency value={sel.total} /></div>
              <div><span className="text-gray-500">Estatus actual:</span> <StatusBadge status={sel.estatus} /></div>
              <div><span className="text-gray-500">F. Pedido:</span> {sel.fechaPedido}</div>
            </div>
            <div>
              <p className="label mb-2">Detalle de partidas</p>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>SKU</th><th>Descripción</th><th>Cant</th><th>Precio</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {sel.items.map((it: SalesOrderItem) => {
                      const prod = products.find(p => p.productId === it.productId)
                      return (
                        <tr key={it.detalleId}>
                          <td className="font-mono text-xs">{prod?.sku}</td>
                          <td>{prod?.descripcion}</td>
                          <td>{it.cantidad}</td>
                          <td><Currency value={it.precio} /></td>
                          <td className="font-semibold"><Currency value={it.cantidad * it.precio * (1 - it.descuento / 100)} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <p className="label mb-2">Cambiar estatus</p>
              <p className="text-xs text-gray-400 mb-2">Al marcar como <strong>Facturado</strong> el pedido pasa automáticamente a Finanzas y desaparece de esta lista.</p>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.map((e) => (
                  <button key={e} className={`btn btn-sm ${sel.estatus === e ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleStatusChange(e)}>
                    <StatusBadge status={e} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* New Order Modal */}
      {modal === 'new' && (
        <Modal title="Nuevo Pedido de Venta" onClose={() => setModal(null)} size="lg"
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveNew}>Guardar Pedido</button></>}
        >
          <div className="space-y-4">
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Cliente *</label>
                <select className="select" value={form.clienteId} onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))}>
                  {clients.filter(c => c.estatus === 'activo').map(c => <option key={c.clientId} value={c.clientId}>{c.razonSocial}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Fecha de Entrega</label>
                <input type="date" className="input" value={form.fechaEntrega} onChange={e => setForm(f => ({ ...f, fechaEntrega: e.target.value }))} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Partidas</label>
                <button className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={13} /> Agregar</button>
              </div>
              {form.items.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-300 rounded-lg">Sin partidas. Agrega productos.</div>
              )}
              {form.items.map((it, idx) => (
                <div key={it.detalleId} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-5">
                    {idx === 0 && <label className="label">Producto</label>}
                    <select className="select" value={it.productId} onChange={e => updateItem(idx, 'productId', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {products.filter(p => p.activo).map(p => <option key={p.productId} value={p.productId}>{p.sku} — {p.descripcion}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="label">Cant</label>}
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
                const sub = form.items.reduce((a, it) => a + it.cantidad * it.precio * (1 - it.descuento / 100), 0)
                const iva = sub * 0.16
                return (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-right space-y-1">
                    <div>Subtotal: <span className="font-semibold">{sub.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span></div>
                    <div>IVA 16%: <span className="font-semibold">{iva.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span></div>
                    <div className="text-base font-bold text-gray-900">Total: {(sub + iva).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</div>
                  </div>
                )
              })()}
            </div>
            <div className="form-group">
              <label className="label">Notas</label>
              <textarea className="textarea" rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {modal === 'del' && delTarget && (
        <Modal title="Eliminar pedido" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar</button></>}
        >
          <p className="text-sm text-gray-700">
            ¿Eliminar el pedido <strong>{delTarget.folio}</strong>? Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  )
}
