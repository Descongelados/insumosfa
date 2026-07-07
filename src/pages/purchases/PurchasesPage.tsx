import { useState, useEffect } from 'react'
import { usePurchasesStore } from '../../store/purchasesStore'
import { useSuppliersStore } from '../../store/suppliersStore'
import { useProductsStore } from '../../store/productsStore'
import { useInventoryStore } from '../../store/inventoryStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import { toast } from '../../store/toastStore'
import type { OrdenCompra, OrdenCompraItem, OrdenCompraEstatus } from '../../types'
import { ClipboardList, Plus, CircleCheck as CheckCircle, Trash2 } from 'lucide-react'

const OC_ESTADOS: OrdenCompraEstatus[] = ['borrador', 'emitida', 'confirmada', 'recibida', 'cerrada']

export function PurchasesPage() {
  const { solicitudes, updateSolicitud, deleteSolicitud, ordenesCompra, loadPurchases, addOrdenCompra, updateOrdenCompra, deleteOrdenCompra } = usePurchasesStore()
  const { suppliers, loadSuppliers } = useSuppliersStore()
  const { products, loadProducts } = useProductsStore()
  const { applyMovimiento, loadInventory } = useInventoryStore()
  const { user } = useAuthStore()

  useEffect(() => { void loadPurchases(); void loadSuppliers(); void loadProducts(); void loadInventory() }, [])

  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'oc' | 'sol'>('oc')
  const [modal, setModal] = useState<'new' | 'view' | 'del_oc' | 'del_sol' | null>(null)
  const [selOC, setSelOC] = useState<OrdenCompra | null>(null)
  const [delOC, setDelOC] = useState<OrdenCompra | null>(null)
  const [form, setForm] = useState({ supplierId: '', fechaEntregaEsperada: '', notas: '', items: [] as OrdenCompraItem[] })

  const canDelete = user ? hasRole(user, 'director', 'compras', 'administracion') : false

  const filteredOC = ordenesCompra.filter((o) => {
    const sup = suppliers.find(s => s.supplierId === o.supplierId)
    return [o.folio, sup?.razonSocial ?? ''].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { detalleId: `ocd${Date.now()}`, productId: '', cantidad: 1, precioUnitario: 0 }] }))
  }
  function updateItem(idx: number, key: keyof OrdenCompraItem, val: string | number) {
    setForm(f => ({
      ...f, items: f.items.map((it, i) => i !== idx ? it : {
        ...it, [key]: val,
        ...(key === 'productId' ? { precioUnitario: products.find(p => p.productId === val)?.costoPromedio ?? 0 } : {})
      })
    }))
  }
  function removeItem(idx: number) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })) }

  async function handleSave() {
    if (form.items.length === 0) { toast.error('Agrega al menos un producto a la OC.'); return }
    const monto = form.items.reduce((a, it) => a + it.cantidad * it.precioUnitario, 0)
    const oc = await addOrdenCompra({ ...form, fecha: new Date().toISOString().split('T')[0], monto, estatus: 'borrador' })
    toast.success(`OC ${oc.folio} creada.`)
    setModal(null)
    setForm({ supplierId: '', fechaEntregaEsperada: '', notas: '', items: [] })
  }

  function handleRecibir(oc: OrdenCompra) {
    oc.items.forEach((it) => {
      applyMovimiento({
        productId: it.productId,
        tipo: 'EntradaCompra',
        cantidad: it.cantidad,
        documentoOrigen: oc.folio,
        usuario: user?.email ?? 'sistema',
        notas: `Recepción ${oc.folio}`,
      })
    })
    updateOrdenCompra(oc.ordenCompraId, { estatus: 'recibida' })
    toast.success(`OC ${oc.folio} recibida — inventario actualizado.`)
    setModal(null)
    setSelOC(null)
  }

  function handleDeleteOC() {
    if (delOC) { deleteOrdenCompra(delOC.ordenCompraId); toast.success(`OC ${delOC.folio} eliminada.`) }
    setModal(null); setDelOC(null)
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><ClipboardList size={24} /> Compras</h1>
          <p className="page-subtitle">Órdenes de Compra y Solicitudes</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ supplierId: suppliers[0]?.supplierId ?? '', fechaEntregaEsperada: '', notas: '', items: [] }); setModal('new') }}>
          <Plus size={16} /> Nueva OC
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <button className={`btn ${tab === 'oc' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('oc')}>
          Órdenes de Compra ({ordenesCompra.length})
        </button>
        <button className={`btn ${tab === 'sol' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('sol')}>
          Solicitudes ({solicitudes.length})
        </button>
      </div>

      <div className="card">
        <div className="mb-4"><SearchBar value={q} onChange={setQ} placeholder="Buscar folio o proveedor..." /></div>

        {tab === 'oc' ? (
          <DataTable
            data={filteredOC}
            rowKey={(o) => o.ordenCompraId}
            columns={[
              { key: 'folio', header: 'Folio', render: (o) => <span className="font-mono font-semibold text-blue-700">{o.folio}</span> },
              { key: 'proveedor', header: 'Proveedor', render: (o) => suppliers.find(s => s.supplierId === o.supplierId)?.razonSocial ?? '-' },
              { key: 'fecha', header: 'Fecha' },
              { key: 'fechaEnt', header: 'F. Entrega', render: (o) => o.fechaEntregaEsperada },
              { key: 'monto', header: 'Monto', render: (o) => <Currency value={o.monto} /> },
              { key: 'estatus', header: 'Estatus', render: (o) => <StatusBadge status={o.estatus} /> },
              {
                key: 'acc', header: '', render: (o) => (
                  <div className="flex gap-1">
                    <button className="btn btn-secondary btn-sm" onClick={() => { setSelOC(o); setModal('view') }}>Ver</button>
                      {o.estatus === 'confirmada' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleRecibir(o)}>
                          <CheckCircle size={13} /> Recibir
                        </button>
                      )}
                      {['borrador', 'emitida'].includes(o.estatus) && (
                        <button className="btn btn-secondary btn-sm" onClick={() => { updateOrdenCompra(o.ordenCompraId, { estatus: o.estatus === 'borrador' ? 'emitida' : 'confirmada' }); toast.info(`OC ${o.folio} → ${o.estatus === 'borrador' ? 'emitida' : 'confirmada'}`) }}>
                          {o.estatus === 'borrador' ? 'Emitir' : 'Confirmar'}
                        </button>
                      )}
                      {canDelete && ['borrador'].includes(o.estatus) && (
                        <button className="btn btn-danger btn-sm" onClick={() => { setDelOC(o); setModal('del_oc') }} title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      )}
                  </div>
                )
              },
            ]}
          />
        ) : (
          <DataTable
            data={solicitudes}
            rowKey={(s) => s.solicitudId}
            columns={[
              { key: 'fecha', header: 'Fecha' },
              { key: 'solicitante', header: 'Solicitante' },
              { key: 'producto', header: 'Producto', render: (s) => {
                const p = products.find(pr => pr.productId === s.productId)
                return `${p?.sku ?? ''} — ${p?.descripcion ?? '-'}`
              }},
              { key: 'cantidad', header: 'Cantidad' },
              { key: 'prioridad', header: 'Prioridad', render: (s) => <StatusBadge status={s.prioridad} /> },
              { key: 'motivo', header: 'Motivo' },
              { key: 'estatus', header: 'Estatus', render: (s) => <StatusBadge status={s.estatus} /> },
              {
                key: 'acc', header: '', render: (s) => (
                  <div className="flex gap-1">
                    {s.estatus === 'enRevision' && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => { updateSolicitud(s.solicitudId, { estatus: 'aprobada' }); toast.success('Solicitud aprobada.') }}>Aprobar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { updateSolicitud(s.solicitudId, { estatus: 'rechazada' }); toast.warning('Solicitud rechazada.') }}>Rechazar</button>
                      </>
                    )}
                    {canDelete && ['enRevision', 'rechazada'].includes(s.estatus) && (
                      <button className="btn btn-danger btn-sm" onClick={() => { deleteSolicitud(s.solicitudId); toast.success('Solicitud eliminada.') }} title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )
              },
            ]}
          />
        )}
      </div>

      {/* New OC Modal */}
      {modal === 'new' && (
        <Modal title="Nueva Orden de Compra" onClose={() => setModal(null)} size="lg"
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSave}>Guardar OC</button></>}
        >
          <div className="space-y-4">
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Proveedor *</label>
                <select className="select" value={form.supplierId} onChange={(e) => setForm(f => ({ ...f, supplierId: e.target.value }))}>
                  {suppliers.filter(s => s.activo).map((s) => <option key={s.supplierId} value={s.supplierId}>{s.razonSocial}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Fecha Entrega Esperada</label>
                <input type="date" className="input" value={form.fechaEntregaEsperada} onChange={(e) => setForm(f => ({ ...f, fechaEntregaEsperada: e.target.value }))} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Productos</label>
                <button className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={13} /> Agregar</button>
              </div>
              {form.items.map((it, idx) => (
                <div key={it.detalleId} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-6">
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
                  <div className="col-span-3">
                    {idx === 0 && <label className="label">Precio Unit.</label>}
                    <input type="number" className="input" min={0} step="0.01" value={it.precioUnitario} onChange={(e) => updateItem(idx, 'precioUnitario', Number(e.target.value))} />
                  </div>
                  <div className="col-span-1">
                    {idx === 0 && <div className="label opacity-0">X</div>}
                    <button className="btn btn-danger btn-sm w-full justify-center" onClick={() => removeItem(idx)}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              {form.items.length > 0 && (
                <div className="mt-2 text-right text-sm font-bold text-gray-900">
                  Monto: {form.items.reduce((a, it) => a + it.cantidad * it.precioUnitario, 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
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

      {/* View OC Modal */}
      {modal === 'view' && selOC && (
        <Modal title={`OC ${selOC.folio}`} onClose={() => setModal(null)} size="lg"
          footer={
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cerrar</button>
              {selOC.estatus === 'confirmada' && (
                <button className="btn-success" onClick={() => handleRecibir(selOC)}>
                  <CheckCircle size={15} /> Marcar como Recibida
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Proveedor:</span> <strong>{suppliers.find(s => s.supplierId === selOC.supplierId)?.razonSocial}</strong></div>
              <div><span className="text-gray-500">Estatus:</span> <StatusBadge status={selOC.estatus} /></div>
              <div><span className="text-gray-500">Fecha:</span> {selOC.fecha}</div>
              <div><span className="text-gray-500">F. Entrega:</span> {selOC.fechaEntregaEsperada}</div>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>SKU</th><th>Descripción</th><th>Cantidad</th><th>P. Unitario</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {selOC.items.map((it) => {
                    const p = products.find(pr => pr.productId === it.productId)
                    return (
                      <tr key={it.detalleId}>
                        <td className="font-mono text-xs">{p?.sku}</td>
                        <td>{p?.descripcion}</td>
                        <td>{it.cantidad}</td>
                        <td><Currency value={it.precioUnitario} /></td>
                        <td className="font-semibold"><Currency value={it.cantidad * it.precioUnitario} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-right font-bold text-lg">Total: <Currency value={selOC.monto} /></div>
            <div>
              <p className="label mb-2">Cambiar estatus</p>
              <div className="flex flex-wrap gap-2">
                {OC_ESTADOS.map((e) => (
                  <button key={e} className={`btn btn-sm ${selOC.estatus === e ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { updateOrdenCompra(selOC.ordenCompraId, { estatus: e }); toast.info(`OC ${selOC.folio} → ${e}`); setModal(null); setSelOC(null) }}>
                    <StatusBadge status={e} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete OC confirm */}
      {modal === 'del_oc' && delOC && (
        <Modal title="Eliminar Orden de Compra" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-danger" onClick={handleDeleteOC}><Trash2 size={14} /> Eliminar</button></>}
        >
          <p className="text-sm text-gray-700">
            ¿Eliminar la OC <strong>{delOC.folio}</strong> (borrador)? Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  )
}
