import { useState, useEffect } from 'react'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { useClientsStore } from '../../store/clientsStore'
import { useProductsStore } from '../../store/productsStore'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useFinanceStore } from '../../store/financeStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import { toast } from '../../store/toastStore'
import { exportToCsv } from '../../utils/exportCsv'
import type { SalesOrder, SalesOrderItem, PedidoEstatus } from '../../types'
import { ShoppingCart, CreditCard as Edit2, Plus, Trash2, Download, Truck } from 'lucide-react'

const ESTADOS: PedidoEstatus[] = ['nuevo', 'confirmado', 'embarcado', 'cerrado']

export function SalesOrdersPage() {
  const { orders, loadOrders, subscribeRealtime: subOrders, addOrder, updateOrder, deleteOrder } = useSalesOrdersStore()
  const { clients, loadClients, subscribeRealtime: subClients } = useClientsStore()
  const { products, loadProducts, subscribeRealtime: subProducts } = useProductsStore()
  const { addEmbarque, loadLogistics, subscribeRealtime: subLogistics } = useLogisticsStore()
  const { addFacturaVenta, loadFinance, subscribeRealtime: subFinance } = useFinanceStore()
  const { user: me } = useAuthStore()

  useEffect(() => {
    void loadOrders()
    void loadClients()
    void loadProducts()
    void loadLogistics()
    void loadFinance()
    const u1 = subOrders()
    const u2 = subClients()
    const u3 = subProducts()
    const u4 = subLogistics()
    const u5 = subFinance()
    return () => { u1(); u2(); u3(); u4(); u5() }
  }, [])

  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<'edit' | 'new' | 'del' | null>(null)
  const [sel, setSel] = useState<SalesOrder | null>(null)
  const [delTarget, setDelTarget] = useState<SalesOrder | null>(null)
  const [form, setForm] = useState({ clienteId: '', fechaEntrega: '', notas: '', ivaPct: 16 as 0 | 8 | 16, items: [] as SalesOrderItem[] })

  const canDelete = me ? hasRole(me, 'director', 'administracion') : false

  const filtered = orders.filter((o) => {
    const client = clients.find((c) => c.clientId === o.clienteId)
    return [o.folio, client?.razonSocial ?? ''].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  function openEdit(o: SalesOrder) { setSel(o); setModal('edit') }
  function openNew() {
    setForm({ clienteId: clients[0]?.clientId ?? '', fechaEntrega: '', notas: '', ivaPct: 16, items: [] })
    setModal('new')
  }
  function openDel(o: SalesOrder) { setDelTarget(o); setModal('del') }

  async function handleStatusChange(status: PedidoEstatus) {
    if (!sel) return

    if (status === 'embarcado') {
      setSaving(true)
      try {
        // 1. Crear embarque en logística vinculado al pedido
        await addEmbarque({
          pedidoId: sel.pedidoId,
          ordenesIds: [],
          origen: '',
          destino: '',
          transportistaId: '',
          fechaProgramada: sel.fechaEntrega ?? '',
          costoFlete: 0,
          estatus: 'solicitado',
          notas: `Generado desde pedido ${sel.folio}`,
        })

        // 2. Crear factura de venta en finanzas (CxC)
        const today = new Date().toISOString().split('T')[0]
        const venc = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        await addFacturaVenta({
          clienteId: sel.clienteId,
          pedidoId: sel.pedidoId,
          fecha: today,
          fechaVencimiento: venc,
          subtotal: sel.subtotal,
          impuestos: sel.impuestos,
          total: sel.total,
          saldoPendiente: sel.total,
          estatus: 'emitida',
        })

        // 3. Actualizar estatus del pedido
        await updateOrder(sel.pedidoId, { estatus: 'embarcado' })
        toast.success(`Pedido ${sel.folio} embarcado → Embarque creado en Logística + Factura generada en Finanzas.`)
      } finally {
        setSaving(false)
      }
    } else {
      await updateOrder(sel.pedidoId, { estatus: status })
      toast.info(`Pedido ${sel.folio} → ${status}`)
    }

    setModal(null)
    setSel(null)
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
    setSaving(true)
    try {
      const subtotal = form.items.reduce((a, it) => a + it.cantidad * it.precio * (1 - it.descuento / 100), 0)
      const impuestos = subtotal * (form.ivaPct / 100)
      const total = subtotal + impuestos
      const order = await addOrder({ ...form, fechaPedido: new Date().toISOString().split('T')[0], estatus: 'nuevo', subtotal, impuestos, total })
      toast.success(`Pedido ${order.folio} creado.`)
      setModal(null)
      setForm({ clienteId: '', fechaEntrega: '', notas: '', ivaPct: 16, items: [] })
    } finally {
      setSaving(false)
    }
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
          <p className="page-subtitle">{orders.length} pedidos en pipeline</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => exportToCsv(
            filtered.map(o => ({ folio: o.folio, cliente: clients.find(c => c.clientId === o.clienteId)?.razonSocial ?? '-', fecha: o.fechaPedido, entrega: o.fechaEntrega, total: o.total, estatus: o.estatus })),
            { folio: 'Folio', cliente: 'Cliente', fecha: 'Fecha Pedido', entrega: 'Fecha Entrega', total: 'Total', estatus: 'Estatus' },
            `pedidos_${new Date().toISOString().slice(0,10)}`
          )} title="Exportar CSV"><Download size={15} /> CSV</button>
          <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Pedido</button>
        </div>
      </div>

      {/* Pipeline status counters */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {byStatus.map(({ e, count }) => (
          <div key={e} className="card-sm flex-shrink-0 min-w-[110px] text-center">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <StatusBadge status={e} />
          </div>
        ))}
      </div>

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
        <Modal title={`Pedido ${sel.folio}`} onClose={() => { setModal(null); setSel(null) }} size="lg"
          footer={<button className="btn-secondary" onClick={() => { setModal(null); setSel(null) }}>Cerrar</button>}
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
              {sel.estatus === 'confirmado' && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                  <Truck size={14} className="flex-shrink-0" />
                  Al marcar como <strong>Embarcado</strong> se creará automáticamente un embarque en <strong>Logística</strong> y una factura de cobro en <strong>Finanzas → CxC</strong>.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {ESTADOS.map((e) => (
                  <button
                    key={e}
                    className={`btn btn-sm ${sel.estatus === e ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { void handleStatusChange(e) }}
                    disabled={saving}
                  >
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
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveNew} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Pedido'}</button></>}
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
              <div className="form-group">
                <label className="label">IVA</label>
                <select className="select" value={form.ivaPct} onChange={e => setForm(f => ({ ...f, ivaPct: Number(e.target.value) as 0 | 8 | 16 }))}>
                  <option value={16}>16%</option>
                  <option value={8}>8% (zona fronteriza)</option>
                  <option value={0}>0% (exento)</option>
                </select>
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
                const iva = sub * (form.ivaPct / 100)
                return (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-right space-y-1">
                    <div>Subtotal: <span className="font-semibold">{sub.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span></div>
                    <div>IVA {form.ivaPct}%: <span className="font-semibold">{iva.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span></div>
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
