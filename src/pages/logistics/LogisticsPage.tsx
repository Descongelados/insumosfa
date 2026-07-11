import { useState, useEffect } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { usePurchasesStore } from '../../store/purchasesStore'
import { toast } from '../../store/toastStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import type { Embarque, EmbarqueEstatus, Transportista } from '../../types'
import { Truck, Plus, CreditCard as Edit2, Trash2, CircleAlert as AlertCircle, ToggleLeft, ToggleRight, CheckCircle, Send } from 'lucide-react'

// ─── constantes ────────────────────────────────────────────────────────────
// Estatus visibles en la tabla de embarques activos (cerrado va a CxP)
const ESTADOS_ACTIVOS: EmbarqueEstatus[] = ['solicitado', 'programado', 'recolectado', 'enTransito', 'entregado']
// Todos los estatus disponibles para cambiar
const ESTADOS: EmbarqueEstatus[] = ['solicitado', 'programado', 'recolectado', 'enTransito', 'entregado', 'cerrado']

const BLANK_TRANS: Omit<Transportista, 'transportistaId'> = {
  nombre: '', contacto: '', telefono: '', tarifaBase: 0, activo: true,
}

// Solo director y operaciones pueden gestionar transportistas
const TRANS_MANAGE_ROLES = ['director', 'operaciones', 'almacen'] as const

// ─── componente ────────────────────────────────────────────────────────────
export function LogisticsPage() {
  const {
    embarques, transportistas, loadLogistics, subscribeRealtime: subLogistics,
    updateEmbarque,
    addTransportista, updateTransportista, deleteTransportista,
  } = useLogisticsStore()
  const { orders, loadOrders, subscribeRealtime: subOrders } = useSalesOrdersStore()
  const { ordenesCompra, loadPurchases, subscribeRealtime: subPurchases, updateOrdenCompra } = usePurchasesStore()
  const { user: me } = useAuthStore()

  useEffect(() => {
    void loadLogistics()
    void loadOrders()
    void loadPurchases()
    const u1 = subLogistics()
    const u2 = subOrders()
    const u3 = subPurchases()
    return () => { u1(); u2(); u3() }
  }, [])

  const canManageTrans = me ? hasRole(me, ...TRANS_MANAGE_ROLES) : false

  // ── estado de pestañas ───────────────────────────────────────────────────
  const [tab, setTab] = useState<'embarques' | 'transportistas'>('embarques')

  // ── búsqueda ─────────────────────────────────────────────────────────────
  const [q, setQ] = useState('')

  // ── modal embarque ───────────────────────────────────────────────────────
  type EmbModal = 'view_emb' | null
  const [embModal, setEmbModal] = useState<EmbModal>(null)
  const [selEmb, setSelEmb] = useState<Embarque | null>(null)
  // transportista editable en el modal
  const [editTransId, setEditTransIdEmb] = useState<string>('')
  // confirmación "enviar a CxP"
  const [confirmCxP, setConfirmCxP] = useState(false)

  // ── modal transportista ──────────────────────────────────────────────────
  type TransModal = 'new_trans' | 'edit_trans' | 'del_trans' | null
  const [transModal, setTransModal] = useState<TransModal>(null)
  const [selTrans, setSelTrans] = useState<Transportista | null>(null)
  const [formTrans, setFormTrans] = useState(BLANK_TRANS)
  const [editTransIdTrans, setEditTransIdTrans] = useState<string | null>(null)

  // ── embarques activos (no cerrados) ─────────────────────────────────────
  const embarquesActivos = embarques.filter(e => e.estatus !== 'cerrado')

  // ── filtros ──────────────────────────────────────────────────────────────
  const filteredEmb = embarquesActivos.filter(e =>
    [e.folio, e.destino, e.origen].join(' ').toLowerCase().includes(q.toLowerCase())
  )
  const filteredTrans = transportistas.filter(t =>
    [t.nombre, t.contacto].join(' ').toLowerCase().includes(q.toLowerCase())
  )

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const onTime = embarques.filter(e => e.estatus === 'entregado').length
  const totalEmb = embarques.filter(e => ['entregado', 'cerrado'].includes(e.estatus)).length
  const pct = totalEmb > 0 ? Math.round(onTime / totalEmb * 100) : 100

  // ── abrir modal embarque ──────────────────────────────────────────────────
  function openViewEmb(e: Embarque) {
    setSelEmb(e)
    setEditTransIdEmb(e.transportistaId ?? '')
    setConfirmCxP(false)
    setEmbModal('view_emb')
  }

  // ── guardar transportista editado ─────────────────────────────────────────
  async function handleSaveTransportista() {
    if (!selEmb) return
    await updateEmbarque(selEmb.embarqueId, { transportistaId: editTransId })
    setSelEmb(prev => prev ? { ...prev, transportistaId: editTransId } : prev)
    toast.success('Transportista actualizado.')
  }

  // ── cambiar estatus del embarque ──────────────────────────────────────────
  async function handleCambiarEstatus(e: EmbarqueEstatus) {
    if (!selEmb) return
    await updateEmbarque(selEmb.embarqueId, { estatus: e })
    setSelEmb(prev => prev ? { ...prev, estatus: e } : prev)
    toast.success(`Estatus actualizado: ${e}`)
  }

  // ── enviar a CxP ─────────────────────────────────────────────────────────
  async function handleEnviarCxP() {
    if (!selEmb) return
    // marcar embarque como cerrado
    await updateEmbarque(selEmb.embarqueId, { estatus: 'cerrado' })
    // mover cada OC referenciada a estatus enviarPago
    const ocs = selEmb.ordenesIds ?? []
    for (const ref of ocs) {
      const oc = ordenesCompra.find(o => o.ordenCompraId === ref.ordenCompraId)
      if (oc) await updateOrdenCompra(oc.ordenCompraId, { estatus: 'enviarPago' })
    }
    toast.success(`Embarque ${selEmb.folio} cerrado → OC(s) enviadas a CxP.`)
    setEmbModal(null)
    setSelEmb(null)
  }

  // ── handlers transportista ───────────────────────────────────────────────
  const FTrans = (k: keyof typeof formTrans) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormTrans(f => ({ ...f, [k]: k === 'tarifaBase' ? Number(e.target.value) : e.target.value }))

  function openNewTrans() {
    setFormTrans(BLANK_TRANS); setEditTransIdTrans(null); setTransModal('new_trans')
  }
  function openEditTrans(t: Transportista) {
    const { transportistaId, ...rest } = t
    setFormTrans(rest); setEditTransIdTrans(t.transportistaId); setTransModal('edit_trans')
  }
  function openDelTrans(t: Transportista) {
    setSelTrans(t); setTransModal('del_trans')
  }
  function handleSaveTrans() {
    if (!formTrans.nombre.trim()) { toast.error('El nombre del transportista es obligatorio.'); return }
    if (editTransIdTrans) { updateTransportista(editTransIdTrans, formTrans); toast.success('Transportista actualizado.') }
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
          <Truck size={15} /> Embarques ({embarquesActivos.length})
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
            <SearchBar value={q} onChange={setQ} placeholder="Buscar folio, destino u origen..." />
          </div>
          {filteredEmb.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Truck size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay embarques activos.</p>
              <p className="text-xs mt-1 text-gray-300">Los embarques se generan desde el módulo de Compras.</p>
            </div>
          ) : (
            <DataTable
              data={filteredEmb}
              rowKey={e => e.embarqueId}
              columns={[
                { key: 'folio', header: 'Folio', render: e => <span className="font-mono font-semibold text-blue-700">{e.folio}</span> },
                { key: 'ocs', header: 'OC(s)', render: e => e.ordenesIds?.length
                  ? <span className="text-xs font-mono text-gray-600">{e.ordenesIds.map(r => r.folio).join(', ')}</span>
                  : <span className="text-gray-400 text-xs">—</span>
                },
                { key: 'origen', header: 'Origen', render: e => <span className="text-xs text-gray-600">{e.origen}</span> },
                { key: 'destino', header: 'Destino' },
                { key: 'trans', header: 'Transportista', render: e =>
                  transportistas.find(t => t.transportistaId === e.transportistaId)?.nombre
                    ?? <span className="text-amber-600 text-xs font-medium">Sin asignar</span>
                },
                { key: 'fechaProg', header: 'F. Programada', render: e => e.fechaProgramada || '-' },
                { key: 'flete', header: 'Flete', render: e => <Currency value={e.costoFlete} /> },
                { key: 'estatus', header: 'Estatus', render: e => <StatusBadge status={e.estatus} /> },
                {
                  key: 'acc', header: '', render: e => (
                    <button className="btn btn-secondary btn-sm" onClick={() => openViewEmb(e)}>Ver</button>
                  )
                },
              ]}
            />
          )}
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

      {/* ══ MODAL VER / GESTIONAR EMBARQUE ══════════════════════════════════ */}
      {embModal === 'view_emb' && selEmb && (
        <Modal
          title={`Embarque ${selEmb.folio}`}
          onClose={() => { setEmbModal(null); setSelEmb(null); setConfirmCxP(false) }}
          footer={
            <div className="flex gap-2 flex-wrap justify-end">
              <button className="btn-secondary" onClick={() => { setEmbModal(null); setSelEmb(null); setConfirmCxP(false) }}>
                Cerrar
              </button>
              {/* Botón guardar transportista solo si cambió */}
              {editTransId !== (selEmb.transportistaId ?? '') && (
                <button className="btn btn-warning" onClick={handleSaveTransportista}>
                  <Edit2 size={13} /> Guardar Transportista
                </button>
              )}
              {/* Enviar a CxP — solo si está entregado y tiene OCs */}
              {selEmb.estatus === 'entregado' && (selEmb.ordenesIds?.length ?? 0) > 0 && !confirmCxP && (
                <button className="btn btn-primary" onClick={() => setConfirmCxP(true)}>
                  <Send size={13} /> Enviar a CxP
                </button>
              )}
              {confirmCxP && (
                <>
                  <span className="text-xs text-amber-700 self-center font-medium">¿Confirmar envío a CxP?</span>
                  <button className="btn-secondary" onClick={() => setConfirmCxP(false)}>No</button>
                  <button className="btn btn-primary" onClick={handleEnviarCxP}>
                    <CheckCircle size={13} /> Sí, enviar
                  </button>
                </>
              )}
            </div>
          }
          size="lg"
        >
          <div className="space-y-5">
            {/* Info del embarque */}
            <div className="grid grid-cols-2 gap-3 text-sm p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">Origen</span>
                <span className="text-gray-800">{selEmb.origen}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">Destino</span>
                <span className="text-gray-800">{selEmb.destino}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">Flete</span>
                <span className="text-gray-800"><Currency value={selEmb.costoFlete} /></span>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">F. Programada</span>
                <span className="text-gray-800">{selEmb.fechaProgramada || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">Estatus</span>
                <StatusBadge status={selEmb.estatus} />
              </div>
              {(selEmb.ordenesIds?.length ?? 0) > 0 && (
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">OC(s)</span>
                  <span className="text-xs font-mono text-blue-700">{selEmb.ordenesIds!.map(r => r.folio).join(', ')}</span>
                </div>
              )}
            </div>

            {/* Editar transportista */}
            <div className="space-y-1">
              <label className="label">Transportista</label>
              <select
                className="select"
                value={editTransId}
                onChange={e => setEditTransIdEmb(e.target.value)}
              >
                <option value="">— Sin asignar —</option>
                {transportistas.filter(t => t.activo).map(t => (
                  <option key={t.transportistaId} value={t.transportistaId}>
                    {t.nombre}{t.tarifaBase > 0 ? ` — ${t.tarifaBase.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}` : ''}
                  </option>
                ))}
              </select>
              {editTransId !== (selEmb.transportistaId ?? '') && (
                <p className="text-xs text-amber-600">Cambio pendiente — presiona "Guardar Transportista" para confirmar.</p>
              )}
            </div>

            {/* Cambiar estatus */}
            <div className="space-y-2">
              <p className="label">Cambiar estatus</p>
              <div className="flex flex-wrap gap-2">
                {ESTADOS_ACTIVOS.map(est => (
                  <button
                    key={est}
                    className={`btn btn-sm ${selEmb.estatus === est ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => void handleCambiarEstatus(est)}
                  >
                    <StatusBadge status={est} />
                  </button>
                ))}
              </div>
              {selEmb.estatus === 'entregado' && (selEmb.ordenesIds?.length ?? 0) > 0 && (
                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs mt-2">
                  <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Embarque entregado. Presiona <strong>"Enviar a CxP"</strong> para cerrar el embarque
                    y mover la(s) OC(s) a Cuentas por Pagar.
                  </span>
                </div>
              )}
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
