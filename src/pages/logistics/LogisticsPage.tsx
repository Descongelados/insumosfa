import { useState, useEffect } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { toast } from '../../store/toastStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import type { Embarque, EmbarqueEstatus, Transportista } from '../../types'
import { Truck, Plus, CreditCard as Edit2, Trash2, CircleAlert as AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'

// ─── constantes ────────────────────────────────────────────────────────────
const ESTADOS: EmbarqueEstatus[] = ['solicitado', 'programado', 'recolectado', 'enTransito', 'entregado', 'cerrado']

const BLANK_EMB = {
  pedidoId: '' as string | undefined,
  origen: 'Almacén Central, MTY',
  destino: '',
  transportistaId: '',
  fechaProgramada: '',
  costoFlete: 0,
  notas: '',
}

const BLANK_TRANS: Omit<Transportista, 'transportistaId'> = {
  nombre: '', contacto: '', telefono: '', tarifaBase: 0, activo: true,
}

// Solo director y operaciones pueden gestionar transportistas
const TRANS_MANAGE_ROLES = ['director', 'operaciones', 'almacen'] as const

// ─── componente ────────────────────────────────────────────────────────────
export function LogisticsPage() {
  const {
    embarques, transportistas, loadLogistics, subscribeRealtime: subLogistics,
    addEmbarque, updateEmbarque,
    addTransportista, updateTransportista, deleteTransportista,
  } = useLogisticsStore()
  const { orders, loadOrders, subscribeRealtime: subOrders } = useSalesOrdersStore()
  const { user: me } = useAuthStore()

  useEffect(() => {
    void loadLogistics()
    void loadOrders()
    const u1 = subLogistics()
    const u2 = subOrders()
    return () => { u1(); u2() }
  }, [])

  const canManageTrans = me ? hasRole(me, ...TRANS_MANAGE_ROLES) : false

  // ── estado de pestañas ───────────────────────────────────────────────────
  const [tab, setTab] = useState<'embarques' | 'transportistas'>('embarques')

  // ── búsqueda ─────────────────────────────────────────────────────────────
  const [q, setQ] = useState('')

  // ── modal embarque ───────────────────────────────────────────────────────
  type EmbModal = 'new_emb' | 'view_emb' | null
  const [embModal, setEmbModal] = useState<EmbModal>(null)
  const [selEmb, setSelEmb] = useState<Embarque | null>(null)
  const [formEmb, setFormEmb] = useState(BLANK_EMB)

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

  // ── handlers embarque ────────────────────────────────────────────────────
  const FEmb = (k: keyof typeof formEmb) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormEmb(f => ({ ...f, [k]: k === 'costoFlete' ? Number(e.target.value) : e.target.value }))

  function handleSaveEmb() {
    if (!formEmb.transportistaId) { toast.error('Selecciona un transportista.'); return }
    if (!formEmb.destino.trim()) { toast.error('El destino es obligatorio.'); return }
    addEmbarque({ ...formEmb, ordenesIds: [], estatus: 'solicitado' })
    toast.success('Embarque registrado.')
    setEmbModal(null)
    setFormEmb(BLANK_EMB)
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
    setTransModal(null)
    setSelTrans(null)
  }

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Truck size={24} /> Logística</h1>
          <p className="page-subtitle">Embarques y transportistas</p>
        </div>
        <div className="flex gap-2">
          {tab === 'embarques' && (
            <button className="btn-primary" onClick={() => { setFormEmb(BLANK_EMB); setEmbModal('new_emb') }}>
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
          <div className="text-2xl font-bold text-gray-900">{embarques.filter(e => e.estatus === 'enTransito').length}</div>
          <div className="text-xs text-gray-500 mt-1">En Tránsito</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-2xl font-bold text-gray-900">{embarques.filter(e => e.estatus === 'programado').length}</div>
          <div className="text-xs text-gray-500 mt-1">Programados</div>
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
              { key: 'pedido', header: 'Pedido', render: e => e.pedidoId ? orders.find(o => o.pedidoId === e.pedidoId)?.folio ?? '-' : '-' },
              { key: 'destino', header: 'Destino' },
              { key: 'trans', header: 'Transportista', render: e => transportistas.find(t => t.transportistaId === e.transportistaId)?.nombre ?? <span className="text-red-500 text-xs">Sin asignar</span> },
              { key: 'fechaProg', header: 'F. Programada', render: e => e.fechaProgramada || '-' },
              { key: 'flete', header: 'Flete', render: e => <Currency value={e.costoFlete} /> },
              { key: 'estatus', header: 'Estatus', render: e => <StatusBadge status={e.estatus} /> },
              {
                key: 'acc', header: '', render: e => (
                  <button className="btn btn-secondary btn-sm" onClick={() => { setSelEmb(e); setEmbModal('view_emb') }}>Ver</button>
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

      {/* ══ MODALES EMBARQUE ════════════════════════════════════════════════ */}

      {/* Nuevo embarque */}
      {embModal === 'new_emb' && (
        <Modal title="Nuevo Embarque" onClose={() => setEmbModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setEmbModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveEmb}>Guardar</button></>}
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="label">Pedido (opcional)</label>
              <select className="select" value={formEmb.pedidoId ?? ''} onChange={e => setFormEmb(f => ({ ...f, pedidoId: e.target.value || undefined }))}>
                <option value="">— Sin pedido —</option>
                {orders.map(o => <option key={o.pedidoId} value={o.pedidoId}>{o.folio}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Transportista *</label>
              <select className="select" value={formEmb.transportistaId} onChange={FEmb('transportistaId')}>
                <option value="">— Seleccionar —</option>
                {transportistas.filter(t => t.activo).map(t => (
                  <option key={t.transportistaId} value={t.transportistaId}>
                    {t.nombre} — {t.tarifaBase.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group sm:col-span-2">
              <label className="label">Origen</label>
              <input className="input" value={formEmb.origen} onChange={FEmb('origen')} />
            </div>
            <div className="form-group sm:col-span-2">
              <label className="label">Destino *</label>
              <input className="input" value={formEmb.destino} onChange={FEmb('destino')} />
            </div>
            <div className="form-group">
              <label className="label">Fecha Programada</label>
              <input type="date" className="input" value={formEmb.fechaProgramada} onChange={FEmb('fechaProgramada')} />
            </div>
            <div className="form-group">
              <label className="label">Costo Flete (MXN)</label>
              <input type="number" className="input" value={formEmb.costoFlete} onChange={FEmb('costoFlete')} min={0} />
            </div>
          </div>
        </Modal>
      )}

      {/* Ver / cambiar estatus embarque */}
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

      {/* Nuevo / editar transportista */}
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

      {/* Confirmar eliminar transportista */}
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
