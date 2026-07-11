import { useState, useEffect } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { usePurchasesStore } from '../../store/purchasesStore'
import { useSuppliersStore } from '../../store/suppliersStore'
import { useProductsStore } from '../../store/productsStore'
import { toast } from '../../store/toastStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import type { Embarque, EmbarqueEstatus, EmbarqueOCRef, OrdenCompra, Transportista } from '../../types'
import { Truck, Plus, CreditCard as Edit2, Trash2, CircleAlert as AlertCircle, ToggleLeft, ToggleRight, Package } from 'lucide-react'

// ─── constantes ────────────────────────────────────────────────────────────
const ESTADOS: EmbarqueEstatus[] = ['solicitado', 'programado', 'recolectado', 'enTransito', 'entregado', 'cerrado']

const BLANK_TRANS: Omit<Transportista, 'transportistaId'> = {
  nombre: '', contacto: '', telefono: '', tarifaBase: 0, activo: true,
}

const TRANS_MANAGE_ROLES = ['director', 'operaciones', 'almacen'] as const

// ─── helpers ────────────────────────────────────────────────────────────────
// Kg totales de una OC (suma de cantidad * unidad, aquí simplificamos a suma de cantidades de items)
function ocTotalKg(oc: OrdenCompra): number {
  return oc.items.reduce((a, it) => a + it.cantidad, 0)
}

// ─── componente ────────────────────────────────────────────────────────────
export function LogisticsPage() {
  const {
    embarques, transportistas, loadLogistics, subscribeRealtime: subLogistics,
    addEmbarque, updateEmbarque,
    addTransportista, updateTransportista, deleteTransportista,
  } = useLogisticsStore()
  const { ordenesCompra, loadPurchases, subscribeRealtime: subPurchases, updateOrdenCompra } = usePurchasesStore()
  const { suppliers, loadSuppliers } = useSuppliersStore()
  const { products, loadProducts } = useProductsStore()
  const { user: me } = useAuthStore()

  useEffect(() => {
    void loadLogistics()
    void loadPurchases()
    void loadSuppliers()
    void loadProducts()
    const u1 = subLogistics()
    const u2 = subPurchases()
    return () => { u1(); u2() }
  }, [])

  const canManageTrans = me ? hasRole(me, ...TRANS_MANAGE_ROLES) : false

  // OCs listas para logística (enviarLogistica o parcialLogistica)
  const ocsLogistica = ordenesCompra.filter(o =>
    o.estatus === 'enviarLogistica' || o.estatus === 'parcialLogistica'
  )

  // ── estado de pestañas ───────────────────────────────────────────────────
  const [tab, setTab] = useState<'dashboard' | 'embarques' | 'transportistas'>('dashboard')
  const [q, setQ] = useState('')

  // ── modal embarque ───────────────────────────────────────────────────────
  type EmbModal = 'new_emb' | 'view_emb' | null
  const [embModal, setEmbModal] = useState<EmbModal>(null)
  const [selEmb, setSelEmb] = useState<Embarque | null>(null)

  // form nuevo embarque
  const [formTransId, setFormTransId] = useState('')
  const [formOrigen, setFormOrigen] = useState('Almacén Central')
  const [formDestino, setFormDestino] = useState('')
  const [formFecha, setFormFecha] = useState('')
  const [formFlete, setFormFlete] = useState(0)
  const [formNotas, setFormNotas] = useState('')
  // OCs seleccionadas para el embarque: Map<ordenCompraId, kgEmbarcados>
  const [selOCs, setSelOCs] = useState<Record<string, number>>({})

  // ── modal transportista ──────────────────────────────────────────────────
  type TransModal = 'new_trans' | 'edit_trans' | 'del_trans' | null
  const [transModal, setTransModal] = useState<TransModal>(null)
  const [selTrans, setSelTrans] = useState<Transportista | null>(null)
  const [formTrans, setFormTrans] = useState(BLANK_TRANS)
  const [editTransId, setEditTransId] = useState<string | null>(null)

  // ── filtros ──────────────────────────────────────────────────────────────
  const filteredEmb = embarques.filter(e =>
    [e.folio, e.destino].join(' ').toLowerCase().includes(q.toLowerCase())
  )
  const filteredTrans = transportistas.filter(t =>
    [t.nombre, t.contacto].join(' ').toLowerCase().includes(q.toLowerCase())
  )

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const onTime = embarques.filter(e => e.estatus === 'entregado').length
  const totalEmb = embarques.filter(e => ['entregado', 'cerrado'].includes(e.estatus)).length
  const pct = totalEmb > 0 ? Math.round(onTime / totalEmb * 100) : 100

  // ── helpers embarque ─────────────────────────────────────────────────────
  function toggleOC(oc: OrdenCompra) {
    const maxKg = ocTotalKg(oc)
    setSelOCs(prev => {
      if (prev[oc.ordenCompraId] !== undefined) {
        const next = { ...prev }
        delete next[oc.ordenCompraId]
        return next
      }
      return { ...prev, [oc.ordenCompraId]: maxKg }
    })
  }

  function setKgForOC(ordenCompraId: string, kg: number) {
    setSelOCs(prev => ({ ...prev, [ordenCompraId]: kg }))
  }

  function openNewEmb() {
    setFormTransId(transportistas[0]?.transportistaId ?? '')
    setFormOrigen('Almacén Central')
    setFormDestino('')
    setFormFecha('')
    setFormFlete(0)
    setFormNotas('')
    setSelOCs({})
    setEmbModal('new_emb')
  }

  async function handleSaveEmb() {
    if (!formTransId) { toast.error('Selecciona un transportista.'); return }
    if (!formDestino.trim()) { toast.error('El destino es obligatorio.'); return }
    const ocIds = Object.keys(selOCs)
    if (ocIds.length === 0) { toast.error('Selecciona al menos una Orden de Compra.'); return }

    // Construir refs de OCs y determinar si alguna es parcial
    const ordenesRefs: EmbarqueOCRef[] = ocIds.map(id => {
      const oc = ocsLogistica.find(o => o.ordenCompraId === id)!
      return { ordenCompraId: id, folio: oc.folio, kgEmbarcados: selOCs[id] }
    })

    // Si alguna OC es parcial el embarque arranca directo en enTransito
    const hayParcial = ordenesRefs.some(ref => {
      const oc = ocsLogistica.find(o => o.ordenCompraId === ref.ordenCompraId)!
      return ref.kgEmbarcados < ocTotalKg(oc)
    })

    await addEmbarque({
      pedidoId: undefined,
      ordenesIds: ordenesRefs,
      origen: formOrigen,
      destino: formDestino,
      transportistaId: formTransId,
      fechaProgramada: formFecha,
      costoFlete: formFlete,
      estatus: hayParcial ? 'enTransito' : 'solicitado',
      notas: formNotas,
    })

    // Actualizar estatus de cada OC según KGs embarcados vs total
    for (const ref of ordenesRefs) {
      const oc = ocsLogistica.find(o => o.ordenCompraId === ref.ordenCompraId)!
      const totalKg = ocTotalKg(oc)
      const nuevoEstatus = ref.kgEmbarcados >= totalKg ? 'cerrada' : 'parcialLogistica'
      await updateOrdenCompra(ref.ordenCompraId, { estatus: nuevoEstatus })
    }

    toast.success(`Embarque creado con ${ordenesRefs.length} OC(s).`)
    setEmbModal(null)
    setTab('embarques')
  }

  // ── handlers transportista ───────────────────────────────────────────────
  const FTrans = (k: keyof typeof formTrans) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormTrans(f => ({ ...f, [k]: k === 'tarifaBase' ? Number(e.target.value) : e.target.value }))

  function openNewTrans() {
    setFormTrans(BLANK_TRANS); setEditTransId(null); setTransModal('new_trans')
  }
  function openEditTrans(t: Transportista) {
    const { transportistaId, ...rest } = t
    setFormTrans(rest); setEditTransId(t.transportistaId); setTransModal('edit_trans')
  }
  function openDelTrans(t: Transportista) {
    setSelTrans(t); setTransModal('del_trans')
  }
  function handleSaveTrans() {
    if (!formTrans.nombre.trim()) { toast.error('El nombre del transportista es obligatorio.'); return }
    if (editTransId) { updateTransportista(editTransId, formTrans); toast.success('Transportista actualizado.') }
    else { addTransportista(formTrans); toast.success('Transportista creado.') }
    setTransModal(null)
  }
  function handleDeleteTrans() {
    if (selTrans) { deleteTransportista(selTrans.transportistaId); toast.success(`Transportista "${selTrans.nombre}" eliminado.`) }
    setTransModal(null); setSelTrans(null)
  }

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Truck size={24} /> Logística</h1>
          <p className="page-subtitle">Órdenes de compra, embarques y transportistas</p>
        </div>
        <div className="flex gap-2">
          {tab === 'embarques' && (
            <button className="btn-primary" onClick={openNewEmb}>
              <Plus size={16} /> Nuevo Embarque
            </button>
          )}
          {tab === 'transportistas' && canManageTrans && (
            <button className="btn-primary" onClick={openNewTrans}>
              <Plus size={16} /> Nuevo Transportista
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-sm text-center">
          <div className="text-2xl font-bold text-amber-600">{ocsLogistica.length}</div>
          <div className="text-xs text-gray-500 mt-1">OCs pendientes logística</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-2xl font-bold text-gray-900">{embarques.filter(e => e.estatus === 'enTransito').length}</div>
          <div className="text-xs text-gray-500 mt-1">En Tránsito</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-2xl font-bold text-green-600">{pct}%</div>
          <div className="text-xs text-gray-500 mt-1">Entregas a Tiempo</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-2xl font-bold text-gray-900">{transportistas.filter(t => t.activo).length}</div>
          <div className="text-xs text-gray-500 mt-1">Transportistas activos</div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2">
        <button
          className={`btn ${tab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setTab('dashboard'); setQ('') }}
        >
          <Package size={15} /> Órdenes ({ocsLogistica.length})
        </button>
        <button
          className={`btn ${tab === 'embarques' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setTab('embarques'); setQ('') }}
        >
          <Truck size={15} /> Embarques ({embarques.length})
        </button>
        <button
          className={`btn ${tab === 'transportistas' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setTab('transportistas'); setQ('') }}
        >
          Transportistas ({transportistas.length})
        </button>
      </div>

      {/* ── DASHBOARD: OCs pendientes de embarque ───────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-4">
          {ocsLogistica.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              <Package size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay órdenes de compra pendientes de logística.</p>
            </div>
          ) : (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Órdenes listas para embarque</h3>
                <button className="btn-primary" onClick={openNewEmb}>
                  <Plus size={15} /> Nuevo Embarque
                </button>
              </div>
              {ocsLogistica.map(oc => {
                const proveedor = suppliers.find(s => s.supplierId === oc.supplierId)
                const totalKg = ocTotalKg(oc)
                const isParcial = oc.estatus === 'parcialLogistica'
                return (
                  <div key={oc.ordenCompraId} className={`p-3 rounded-lg border ${isParcial ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 text-sm">{oc.folio}</span>
                          {isParcial && (
                            <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              Parcialmente entregado
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700">{proveedor?.razonSocial ?? '-'}</div>
                        <div className="text-xs text-gray-500">
                          {oc.items.map(it => {
                            const p = products.find(pr => pr.productId === it.productId)
                            return `${p?.sku ?? it.productId}: ${it.cantidad} ${p?.unidadMedida ?? ''}`
                          }).join(' · ')}
                        </div>
                        <div className="text-xs font-medium text-gray-600">
                          Total: {totalKg.toLocaleString()} kg · F. Entrega esperada: {oc.fechaEntregaEsperada || '—'}
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm shrink-0"
                        onClick={() => {
                          setSelOCs({ [oc.ordenCompraId]: totalKg })
                          setFormTransId(transportistas[0]?.transportistaId ?? '')
                          setFormOrigen('Almacén Central')
                          setFormDestino('')
                          setFormFecha('')
                          setFormFlete(0)
                          setFormNotas('')
                          setEmbModal('new_emb')
                        }}
                      >
                        <Truck size={13} /> Embarcar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TABLA EMBARQUES ─────────────────────────────────────────────── */}
      {tab === 'embarques' && (
        <div className="card">
          <div className="flex justify-between mb-4">
            <SearchBar value={q} onChange={setQ} placeholder="Buscar folio o destino..." />
          </div>
          <DataTable
            data={filteredEmb}
            rowKey={e => e.embarqueId}
            columns={[
              { key: 'folio', header: 'Folio', render: e => <span className="font-mono font-semibold text-blue-700">{e.folio}</span> },
              { key: 'ocs', header: 'OC(s)', render: e => (
                e.ordenesIds.length > 0
                  ? <div className="flex flex-wrap gap-1">
                      {e.ordenesIds.map(r => (
                        <span key={r.ordenCompraId} className="font-mono text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {r.folio} ({r.kgEmbarcados.toLocaleString()} kg)
                        </span>
                      ))}
                    </div>
                  : <span className="text-gray-400 text-xs">—</span>
              )},
              { key: 'destino', header: 'Destino' },
              { key: 'trans', header: 'Transportista', render: e => transportistas.find(t => t.transportistaId === e.transportistaId)?.nombre ?? <span className="text-red-500 text-xs">Sin asignar</span> },
              { key: 'fechaProg', header: 'F. Programada', render: e => e.fechaProgramada || '-' },
              { key: 'flete', header: 'Flete', render: e => <Currency value={e.costoFlete} /> },
              { key: 'estatus', header: 'Estatus', render: e => <StatusBadge status={e.estatus} /> },
              {
                key: 'acc', header: '', render: e => (
                  <div className="flex gap-1">
                    <button className="btn btn-secondary btn-sm" onClick={() => { setSelEmb(e); setEmbModal('view_emb') }}>Ver</button>
                    {['solicitado', 'programado', 'recolectado'].includes(e.estatus) && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => { updateEmbarque(e.embarqueId, { estatus: 'enTransito' }); toast.success(`EMB ${e.folio} → En tránsito`) }}
                      >
                        <Truck size={13} /> En tránsito
                      </button>
                    )}
                  </div>
                )
              },
            ]}
          />
        </div>
      )}

      {/* ── TABLA TRANSPORTISTAS ────────────────────────────────────────── */}
      {tab === 'transportistas' && (
        <div className="card">
          <div className="flex justify-between mb-4">
            <SearchBar value={q} onChange={setQ} placeholder="Buscar transportista..." />
          </div>
          <DataTable
            data={filteredTrans}
            rowKey={t => t.transportistaId}
            columns={[
              { key: 'nombre', header: 'Nombre' },
              { key: 'contacto', header: 'Contacto' },
              { key: 'telefono', header: 'Teléfono' },
              { key: 'tarifaBase', header: 'Tarifa Base', render: t => <Currency value={t.tarifaBase} /> },
              { key: 'embarques', header: 'Embarques', render: t => (
                <span className="badge badge-blue">
                  {embarques.filter(e => e.transportistaId === t.transportistaId).length}
                </span>
              )},
              { key: 'activo', header: 'Estatus', render: t => <StatusBadge status={t.activo ? 'activo' : 'inactivo'} /> },
              {
                key: 'acc', header: '', render: t => (
                  <div className="flex gap-1">
                    {canManageTrans ? (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditTrans(t)} title="Editar">
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => updateTransportista(t.transportistaId, { activo: !t.activo })}
                          title={t.activo ? 'Desactivar' : 'Activar'}
                        >
                          {t.activo
                            ? <ToggleRight size={16} className="text-green-600" />
                            : <ToggleLeft size={16} className="text-gray-400" />}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => openDelTrans(t)} title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">Solo lectura</span>
                    )}
                  </div>
                )
              },
            ]}
          />
        </div>
      )}

      {/* ══ MODAL: Nuevo Embarque ════════════════════════════════════════════ */}
      {embModal === 'new_emb' && (
        <Modal title="Nuevo Embarque" onClose={() => setEmbModal(null)} size="lg"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setEmbModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveEmb}>Guardar Embarque</button>
            </>
          }
        >
          <div className="space-y-5">
            {/* Selección de OCs */}
            <div>
              <label className="label mb-2">Órdenes de Compra a embarcar *</label>
              {ocsLogistica.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No hay OCs listas para embarcar.</p>
              ) : (
                <div className="space-y-2">
                  {ocsLogistica.map(oc => {
                    const isSelected = selOCs[oc.ordenCompraId] !== undefined
                    const maxKg = ocTotalKg(oc)
                    const proveedor = suppliers.find(s => s.supplierId === oc.supplierId)
                    const isParcial = oc.estatus === 'parcialLogistica'
                    return (
                      <div key={oc.ordenCompraId}
                        className={`border rounded-lg p-3 transition-colors ${isSelected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={isSelected}
                            onChange={() => toggleOC(oc)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-blue-700 text-sm">{oc.folio}</span>
                              <span className="text-xs text-gray-500">{proveedor?.razonSocial ?? '-'}</span>
                              {isParcial && (
                                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                  Parcialmente entregado
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {oc.items.map(it => {
                                const p = products.find(pr => pr.productId === it.productId)
                                return `${p?.sku ?? ''}: ${it.cantidad} ${p?.unidadMedida ?? 'kg'}`
                              }).join(' · ')}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="shrink-0 flex items-center gap-1.5 text-sm">
                              <label className="text-gray-500 text-xs">KG a embarcar:</label>
                              <input
                                type="number"
                                className="input w-28 text-right"
                                min={1}
                                max={maxKg}
                                value={selOCs[oc.ordenCompraId]}
                                onChange={e => setKgForOC(oc.ordenCompraId, Math.min(maxKg, Math.max(1, Number(e.target.value))))}
                              />
                              <span className="text-gray-400 text-xs">/ {maxKg.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Datos del embarque */}
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Transportista *</label>
                <select className="select" value={formTransId} onChange={e => setFormTransId(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {transportistas.filter(t => t.activo).map(t => (
                    <option key={t.transportistaId} value={t.transportistaId}>
                      {t.nombre} — {t.tarifaBase.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Fecha Programada</label>
                <input type="date" className="input" value={formFecha} onChange={e => setFormFecha(e.target.value)} />
              </div>
              <div className="form-group sm:col-span-2">
                <label className="label">Origen</label>
                <input className="input" value={formOrigen} onChange={e => setFormOrigen(e.target.value)} />
              </div>
              <div className="form-group sm:col-span-2">
                <label className="label">Destino *</label>
                <input className="input" value={formDestino} onChange={e => setFormDestino(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Costo Flete (MXN)</label>
                <input type="number" className="input" value={formFlete} onChange={e => setFormFlete(Number(e.target.value))} min={0} />
              </div>
              <div className="form-group">
                <label className="label">Notas</label>
                <input className="input" value={formNotas} onChange={e => setFormNotas(e.target.value)} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Ver embarque ══════════════════════════════════════════════ */}
      {embModal === 'view_emb' && selEmb && (
        <Modal title={`Embarque ${selEmb.folio}`} onClose={() => setEmbModal(null)}
          footer={<button className="btn-secondary" onClick={() => setEmbModal(null)}>Cerrar</button>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Origen:</span> {selEmb.origen}</div>
              <div><span className="text-gray-500">Destino:</span> {selEmb.destino}</div>
              <div><span className="text-gray-500">Transportista:</span> {transportistas.find(t => t.transportistaId === selEmb.transportistaId)?.nombre ?? '—'}</div>
              <div><span className="text-gray-500">Flete:</span> <Currency value={selEmb.costoFlete} /></div>
              <div><span className="text-gray-500">F. Programada:</span> {selEmb.fechaProgramada || '—'}</div>
              <div><span className="text-gray-500">Estatus:</span> <StatusBadge status={selEmb.estatus} /></div>
            </div>
            {selEmb.ordenesIds.length > 0 && (
              <div>
                <p className="label mb-2">Órdenes de Compra incluidas</p>
                <div className="space-y-1">
                  {selEmb.ordenesIds.map(r => (
                    <div key={r.ordenCompraId} className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg text-sm">
                      <span className="font-mono font-semibold text-blue-700">{r.folio}</span>
                      <span className="text-gray-600">{r.kgEmbarcados.toLocaleString()} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="label mb-2">Cambiar estatus</p>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.map(e => (
                  <button key={e} className={`btn btn-sm ${selEmb.estatus === e ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { updateEmbarque(selEmb.embarqueId, { estatus: e }); setEmbModal(null); setSelEmb(null) }}>
                    <StatusBadge status={e} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODALES TRANSPORTISTA ════════════════════════════════════════════ */}

      {(transModal === 'new_trans' || transModal === 'edit_trans') && (
        <Modal
          title={transModal === 'new_trans' ? 'Nuevo Transportista' : `Editar — ${selTrans?.nombre ?? ''}`}
          onClose={() => setTransModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setTransModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveTrans}>Guardar</button></>}
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Nombre / Razón Social *</label>
              <input className="input" value={formTrans.nombre} onChange={FTrans('nombre')} />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Contacto</label>
                <input className="input" value={formTrans.contacto} onChange={FTrans('contacto')} />
              </div>
              <div className="form-group">
                <label className="label">Teléfono</label>
                <input className="input" value={formTrans.telefono} onChange={FTrans('telefono')} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Tarifa Base (MXN)</label>
              <input type="number" className="input" value={formTrans.tarifaBase} onChange={FTrans('tarifaBase')} min={0} />
            </div>
          </div>
        </Modal>
      )}

      {transModal === 'del_trans' && selTrans && (
        <Modal
          title="Eliminar transportista"
          onClose={() => setTransModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setTransModal(null)}>Cancelar</button>
              <button className="btn-danger" onClick={handleDeleteTrans}><Trash2 size={14} /> Eliminar definitivamente</button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>¿Estás seguro de que deseas eliminar al transportista:</p>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
              <div className="font-semibold text-gray-900">{selTrans.nombre}</div>
              <div className="text-gray-500">{selTrans.contacto} · {selTrans.telefono}</div>
              <div className="text-gray-500">Tarifa base: <Currency value={selTrans.tarifaBase} /></div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>
                Este transportista tiene {embarques.filter(e => e.transportistaId === selTrans.transportistaId).length} embarque(s) asociado(s).
                Esta acción no se puede deshacer.
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
