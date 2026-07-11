import { useState, useEffect } from 'react'
import { usePurchasesStore } from '../../store/purchasesStore'
import { useSuppliersStore } from '../../store/suppliersStore'
import { useProductsStore } from '../../store/productsStore'
import { useInventoryStore } from '../../store/inventoryStore'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import { toast } from '../../store/toastStore'
import type { OrdenCompra, OrdenCompraItem, OrdenCompraEstatus } from '../../types'
import { ClipboardList, Plus, Truck, CreditCard, Trash2, Pencil } from 'lucide-react'

const OC_ESTADOS: OrdenCompraEstatus[] = ['borrador', 'emitida', 'confirmada', 'enviarLogistica', 'parcialLogistica', 'cerrada']
const IVA_OPCIONES: OrdenCompra['ivaPct'][] = [16, 8, 0]

const MXN = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

type OCForm = {
  supplierId: string
  fechaEntregaEsperada: string
  notas: string
  ivaPct: OrdenCompra['ivaPct']
  items: OrdenCompraItem[]
}

const BLANK_FORM: OCForm = {
  supplierId: '',
  fechaEntregaEsperada: '',
  notas: '',
  ivaPct: 16,
  items: [],
}

export function PurchasesPage() {
  const { solicitudes, updateSolicitud, deleteSolicitud, ordenesCompra, loadPurchases, subscribeRealtime: subPurchases, addOrdenCompra, updateOrdenCompra, deleteOrdenCompra } = usePurchasesStore()
  const { suppliers, loadSuppliers, subscribeRealtime: subSuppliers } = useSuppliersStore()
  const { products, loadProducts, subscribeRealtime: subProducts } = useProductsStore()
  const { loadInventory, subscribeRealtime: subInventory } = useInventoryStore()
  const { addEmbarque } = useLogisticsStore()
  const { user } = useAuthStore()

  useEffect(() => {
    void loadPurchases()
    void loadSuppliers()
    void loadProducts()
    void loadInventory()
    const u1 = subPurchases()
    const u2 = subSuppliers()
    const u3 = subProducts()
    const u4 = subInventory()
    return () => { u1(); u2(); u3(); u4() }
  }, [])

  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'oc' | 'sol'>('oc')
  const [modal, setModal] = useState<'new' | 'edit' | 'view' | 'del_oc' | 'del_sol' | null>(null)
  const [selOC, setSelOC] = useState<OrdenCompra | null>(null)
  const [delOC, setDelOC] = useState<OrdenCompra | null>(null)
  const [form, setForm] = useState<OCForm>(BLANK_FORM)

  const canDelete  = user ? hasRole(user, 'director', 'compras', 'administracion') : false
  const canEdit    = user ? hasRole(user, 'director', 'compras', 'administracion') : false
  const isDirector = user ? hasRole(user, 'director') : false

  const filteredOC = ordenesCompra.filter((o) => {
    if (['enviarLogistica', 'parcialLogistica', 'enviarPago', 'cerrada'].includes(o.estatus)) return false
    const sup = suppliers.find(s => s.supplierId === o.supplierId)
    return [o.folio, sup?.razonSocial ?? ''].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  // ── item helpers ────────────────────────────────────────────────────────────
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

  // ── totales ─────────────────────────────────────────────────────────────────
  function calcTotals(items: OrdenCompraItem[], ivaPct: number) {
    const subtotal = items.reduce((a, it) => a + it.cantidad * it.precioUnitario, 0)
    const iva      = subtotal * ivaPct / 100
    const total    = subtotal + iva
    return { subtotal, iva, total }
  }

  // ── open modals ─────────────────────────────────────────────────────────────
  function openNew() {
    setForm({ ...BLANK_FORM, supplierId: suppliers[0]?.supplierId ?? '' })
    setModal('new')
  }

  function openEdit(oc: OrdenCompra) {
    setSelOC(oc)
    setForm({
      supplierId: oc.supplierId,
      fechaEntregaEsperada: oc.fechaEntregaEsperada,
      notas: oc.notas,
      ivaPct: oc.ivaPct,
      items: oc.items.map(it => ({ ...it })),
    })
    setModal('edit')
  }

  // ── save handlers ───────────────────────────────────────────────────────────
  async function handleSave() {
    if (form.items.length === 0) { toast.error('Agrega al menos un producto a la OC.'); return }
    const { total } = calcTotals(form.items, form.ivaPct)
    const oc = await addOrdenCompra({ ...form, fecha: new Date().toISOString().split('T')[0], monto: total, estatus: 'borrador' })
    toast.success(`OC ${oc.folio} creada.`)
    setModal(null)
    setForm(BLANK_FORM)
  }

  async function handleSaveEdit() {
    if (!selOC) return
    if (form.items.length === 0) { toast.error('Agrega al menos un producto a la OC.'); return }
    const { total } = calcTotals(form.items, form.ivaPct)
    await updateOrdenCompra(selOC.ordenCompraId, {
      supplierId: form.supplierId,
      fechaEntregaEsperada: form.fechaEntregaEsperada,
      notas: form.notas,
      ivaPct: form.ivaPct,
      items: form.items,
      monto: total,
    })
    toast.success(`OC ${selOC.folio} actualizada.`)
    setModal(null)
    setSelOC(null)
  }

  function handleEnviarCxP(oc: OrdenCompra) {
    void updateOrdenCompra(oc.ordenCompraId, { estatus: 'enviarPago' })
    toast.success(`OC ${oc.folio} enviada a CxP para proceso de pago.`)
    setModal(null)
    setSelOC(null)
  }

  async function handleEnviarCxPLogistica(oc: OrdenCompra) {
    const totalKg = oc.items.reduce((a, it) => a + it.cantidad, 0)
    const supplier = suppliers.find(s => s.supplierId === oc.supplierId)
    await addEmbarque({
      pedidoId: undefined,
      ordenesIds: [{ ordenCompraId: oc.ordenCompraId, folio: oc.folio, kgEmbarcados: totalKg }],
      origen: supplier?.razonSocial ?? '',
      destino: '',
      transportistaId: '',
      fechaProgramada: oc.fechaEntregaEsperada ?? '',
      costoFlete: 0,
      estatus: 'solicitado',
      notas: '',
    })
    await updateOrdenCompra(oc.ordenCompraId, { estatus: 'enviarPago' })
    toast.success(`OC ${oc.folio} → Embarque creado en Logística y OC disponible en CxP para pago.`)
    setModal(null)
    setSelOC(null)
  }

  function handleDeleteOC() {
    if (delOC) { deleteOrdenCompra(delOC.ordenCompraId); toast.success(`OC ${delOC.folio} eliminada.`) }
    setModal(null); setDelOC(null)
  }

  // ── form items UI ────────────────────────────────────────────────────────────
  function renderItems() {
    const { subtotal, iva, total } = calcTotals(form.items, form.ivaPct)
    return (
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
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1 text-sm text-right">
            <div className="text-gray-600">Subtotal: <span className="font-semibold text-gray-900">{MXN(subtotal)}</span></div>
            <div className="text-gray-600">IVA ({form.ivaPct}%): <span className="font-semibold text-gray-900 ml-1">{MXN(iva)}</span></div>
            <div className="text-base font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1">Total: {MXN(total)}</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><ClipboardList size={24} /> Compras</h1>
          <p className="page-subtitle">Órdenes de Compra y Solicitudes</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={16} /> Nueva OC
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <button className={`btn ${tab === 'oc' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('oc')}>
          Órdenes de Compra ({filteredOC.length})
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
              { key: 'iva', header: 'IVA', render: (o) => <span className="text-xs font-medium text-gray-600">{o.ivaPct ?? 16}%</span> },
              { key: 'monto', header: 'Total', render: (o) => <Currency value={o.monto} /> },
              { key: 'estatus', header: 'Estatus', render: (o) => <StatusBadge status={o.estatus} /> },
              {
                key: 'acc', header: '', render: (o) => (
                  <div className="flex gap-1">
                    <button className="btn btn-secondary btn-sm" onClick={() => { setSelOC(o); setModal('view') }}>Ver</button>
                    {canEdit && ['borrador'].includes(o.estatus) && (
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(o)} title="Editar">
                        <Pencil size={13} />
                      </button>
                    )}
                    {o.estatus === 'confirmada' && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => handleEnviarCxP(o)} title="Solo CxP — sin logística">
                          <CreditCard size={13} /> CxP
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => { void handleEnviarCxPLogistica(o) }} title="CxP + crear embarque en Logística">
                          <Truck size={13} /> CxP & Logística
                        </button>
                      </>
                    )}
                    {o.estatus === 'parcialLogistica' && (
                      <span className="text-xs font-medium text-amber-600 px-2 py-1 bg-amber-50 rounded-full border border-amber-200">
                        Parcialmente entregado
                      </span>
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
                    {isDirector && o.estatus === 'cerrada' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(o)} title="Editar (Admin)">
                        <Pencil size={13} />
                      </button>
                    )}
                    {isDirector && o.estatus === 'cerrada' && (
                      <button className="btn btn-danger btn-sm" onClick={() => { setDelOC(o); setModal('del_oc') }} title="Eliminar (Admin)">
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

      {/* Nueva OC */}
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
            <div className="form-group">
              <label className="label">IVA</label>
              <select className="select" value={form.ivaPct} onChange={(e) => setForm(f => ({ ...f, ivaPct: Number(e.target.value) as OrdenCompra['ivaPct'] }))}>
                {IVA_OPCIONES.map(p => <option key={p} value={p}>{p}%</option>)}
              </select>
            </div>
            {renderItems()}
            <div className="form-group">
              <label className="label">Notas</label>
              <textarea className="textarea" rows={2} value={form.notas} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Editar OC */}
      {modal === 'edit' && selOC && (
        <Modal title={`Editar OC ${selOC.folio}`} onClose={() => setModal(null)} size="lg"
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveEdit}>Guardar cambios</button></>}
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
            <div className="form-group">
              <label className="label">IVA</label>
              <select className="select" value={form.ivaPct} onChange={(e) => setForm(f => ({ ...f, ivaPct: Number(e.target.value) as OrdenCompra['ivaPct'] }))}>
                {IVA_OPCIONES.map(p => <option key={p} value={p}>{p}%</option>)}
              </select>
            </div>
            {renderItems()}
            <div className="form-group">
              <label className="label">Notas</label>
              <textarea className="textarea" rows={2} value={form.notas} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Ver OC */}
      {modal === 'view' && selOC && (() => {
        const ivaPct  = selOC.ivaPct ?? 16
        const subtotal = selOC.items.reduce((a, it) => a + it.cantidad * it.precioUnitario, 0)
        const iva      = subtotal * ivaPct / 100
        const total    = subtotal + iva
        return (
          <Modal title={`OC ${selOC.folio}`} onClose={() => setModal(null)} size="lg"
            footer={
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setModal(null)}>Cerrar</button>
                {selOC.estatus === 'confirmada' && (
                  <>
                    <button className="btn-success" onClick={() => handleEnviarCxP(selOC)}>
                      <CreditCard size={15} /> Enviar a CxP
                    </button>
                    <button className="btn-primary" onClick={() => { void handleEnviarCxPLogistica(selOC) }}>
                      <Truck size={15} /> CxP & Logística
                    </button>
                  </>
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
              <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm text-right">
                <div className="text-gray-600">Subtotal: <span className="font-semibold text-gray-900">{MXN(subtotal)}</span></div>
                <div className="text-gray-600">IVA ({ivaPct}%): <span className="font-semibold text-gray-900">{MXN(iva)}</span></div>
                <div className="text-base font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1">Total: {MXN(total)}</div>
              </div>
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
        )
      })()}

      {/* Eliminar OC */}
      {modal === 'del_oc' && delOC && (
        <Modal title="Eliminar Orden de Compra" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-danger" onClick={handleDeleteOC}><Trash2 size={14} /> Eliminar</button></>}
        >
          <div className="space-y-2 text-sm text-gray-700">
            <p>¿Eliminar la OC <strong>{delOC.folio}</strong>? Esta acción no se puede deshacer.</p>
            {delOC.estatus === 'cerrada' && (
              <p className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs font-medium">
                ⚠️ Esta OC está <strong>cerrada</strong>. Solo el director del sistema puede eliminarla.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
