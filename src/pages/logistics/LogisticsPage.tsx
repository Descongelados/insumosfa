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
import type { Embarque, EmbarqueEstatus, EmbarqueOCRef, Transportista } from '../../types'
import { Truck, Plus, CreditCard as Edit2, Trash2, CircleAlert as AlertCircle, ToggleLeft, ToggleRight, CheckCircle, Send, Save } from 'lucide-react'

// ─── constantes ────────────────────────────────────────────────────────────
const ESTADOS_ACTIVOS: EmbarqueEstatus[] = ['solicitado', 'programado', 'recolectado', 'enTransito', 'entregado']
const ESTADOS: EmbarqueEstatus[] = ['solicitado', 'programado', 'recolectado', 'enTransito', 'entregado', 'cerrado']

const BLANK_TRANS: Omit<Transportista, 'transportistaId'> = {
  nombre: '', contacto: '', telefono: '', tarifaBase: 0, activo: true,
}

const TRANS_MANAGE_ROLES = ['director', 'operaciones', 'almacen'] as const

// ─── componente ────────────────────────────────────────────────────────────
export function LogisticsPage() {
  const {
    embarques, transportistas, loadLogistics, subscribeRealtime: subLogistics,
    addEmbarque: addEmbarqueStore, updateEmbarque, deleteEmbarque,
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

  const canManageTrans  = me ? hasRole(me, ...TRANS_MANAGE_ROLES) : false
  const canDeleteEmbarque = me ? hasRole(me, 'director', 'operaciones') : false

  // ── estado de pestañas ───────────────────────────────────────────────────
  const [tab, setTab] = useState<'embarques' | 'transportistas'>('embarques')

  // ── búsqueda ─────────────────────────────────────────────────────────────
  const [q, setQ] = useState('')

  // ── eliminar embarque ────────────────────────────────────────────────────
  const [delEmb, setDelEmb] = useState<Embarque | null>(null)

  async function handleDeleteEmbarque() {
    if (!delEmb) return
    // Revertir OCs asociadas a confirmada para que vuelvan a Compras
    for (const ref of delEmb.ordenesIds ?? []) {
      await updateOrdenCompra(ref.ordenCompraId, { estatus: 'confirmada' })
    }
    await deleteEmbarque(delEmb.embarqueId)
    toast.success(`Embarque ${delEmb.folio} eliminado.`)
    setDelEmb(null)
  }

  // ── modal embarque ───────────────────────────────────────────────────────
  type EmbModal = 'view_emb' | null
  const [embModal, setEmbModal] = useState<EmbModal>(null)
  const [selEmb, setSelEmb] = useState<Embarque | null>(null)

  // campos editables comunes
  const [editTransId, setEditTransIdEmb] = useState<string>('')
  const [editOrigen, setEditOrigen] = useState<string>('')

  // campos editables solo en estatus "solicitado"
  const [editDestino, setEditDestino] = useState('')
  const [editCantidad, setEditCantidad] = useState<number>(0)
  const [editFechaProgramada, setEditFechaProgramada] = useState('')
  const [editCostoFlete, setEditCostoFlete] = useState<number>(0)

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
    setEditOrigen(e.origen ?? '')
    setEditDestino(e.destino ?? '')
    setEditCantidad(e.ordenesIds?.[0]?.kgEmbarcados ?? 0)
    setEditFechaProgramada(e.fechaProgramada ?? '')
    setEditCostoFlete(e.costoFlete ?? 0)
    setConfirmCxP(false)
    setEmbModal('view_emb')
  }

  // ── guardar transportista y origen ────────────────────────────────────────
  async function handleSaveTransportista() {
    if (!selEmb) return
    const patch: Partial<Embarque> = {}
    if (editTransId !== (selEmb.transportistaId ?? '')) patch.transportistaId = editTransId
    if (editOrigen !== (selEmb.origen ?? '')) patch.origen = editOrigen
    if (Object.keys(patch).length === 0) return
    await updateEmbarque(selEmb.embarqueId, patch)
    setSelEmb(prev => prev ? { ...prev, ...patch } : prev)
    toast.success('Embarque actualizado.')
  }

  // ── guardar campos de embarque solicitado ────────────────────────────────
  async function handleGuardarSolicitado() {
    if (!selEmb) return

    // Los kg editados actualizan la OC ref existente (OC no cambia)
    let nuevasOCs: EmbarqueOCRef[] = selEmb.ordenesIds ?? []
    if (nuevasOCs.length > 0) {
      nuevasOCs = [{ ...nuevasOCs[0], kgEmbarcados: editCantidad }, ...nuevasOCs.slice(1)]
    }

    await updateEmbarque(selEmb.embarqueId, {
      origen: editOrigen,
      destino: editDestino,
      fechaProgramada: editFechaProgramada,
      costoFlete: editCostoFlete,
      ordenesIds: nuevasOCs,
    })

    setSelEmb(prev => prev
      ? { ...prev, origen: editOrigen, destino: editDestino, fechaProgramada: editFechaProgramada, costoFlete: editCostoFlete, ordenesIds: nuevasOCs }
      : prev
    )
    toast.success('Datos del embarque actualizados.')
  }

  // ── cambiar estatus del embarque ──────────────────────────────────────────
  async function handleCambiarEstatus(est: EmbarqueEstatus) {
    if (!selEmb) return

    // Al pasar a "recolectado" verificar si hay KG parciales
    if (est === 'recolectado') {
      const totalKgOC = (selEmb.ordenesIds ?? []).reduce((a, r) => a + r.kgEmbarcados, 0)
      if (totalKgOC > 0 && editCantidad < totalKgOC) {
        const pendiente = totalKgOC - editCantidad
        if (editCantidad <= 0) { toast.error('Los KG recolectados deben ser mayor a cero.'); return }
        // Actualizar el embarque actual con los kg reales
        const idsActualizados = (selEmb.ordenesIds ?? []).map(r => ({
          ...r, kgEmbarcados: Math.round(editCantidad * (r.kgEmbarcados / totalKgOC)),
        }))
        await updateEmbarque(selEmb.embarqueId, { estatus: 'recolectado', ordenesIds: idsActualizados })
        // Crear nuevo embarque pendiente
        const idsPendiente = (selEmb.ordenesIds ?? []).map(r => ({
          ...r, kgEmbarcados: Math.round(pendiente * (r.kgEmbarcados / totalKgOC)),
        }))
        await addEmbarqueStore({
          pedidoId: selEmb.pedidoId,
          ordenesIds: idsPendiente,
          origen: selEmb.origen,
          destino: selEmb.destino,
          transportistaId: selEmb.transportistaId,
          fechaProgramada: selEmb.fechaProgramada,
          costoFlete: 0,
          estatus: 'solicitado',
          notas: `Pendiente de ${pendiente} kg — split de ${selEmb.folio}`,
        })
        toast.success(`${editCantidad} kg recolectados. Nuevo embarque creado con ${pendiente} kg pendientes.`)
        setEmbModal(null); setSelEmb(null)
        return
      }
    }

    await updateEmbarque(selEmb.embarqueId, { estatus: est })
    setSelEmb(prev => prev ? { ...prev, estatus: est } : prev)
    toast.success(`Estatus actualizado: ${est}`)
  }

  // ── enviar a CxP ─────────────────────────────────────────────────────────
  async function handleEnviarCxP() {
    if (!selEmb) return
    await updateEmbarque(selEmb.embarqueId, { estatus: 'cerrado' })
    const ocs = selEmb.ordenesIds ?? []
    for (const ref of ocs) {
      const oc = ordenesCompra.find(o => o.ordenCompraId === ref.ordenCompraId)
      if (oc) await updateOrdenCompra(oc.ordenCompraId, { estatus: 'enviarPago' })
    }
    toast.success(`Embarque ${selEmb.folio} cerrado → OC(s) enviadas a CxP.`)
    setEmbModal(null)
    setSelEmb(null)
  }

  // ── detectar si cambió algún campo de solicitado ─────────────────────────
  function solicitadoCambiado(): boolean {
    if (!selEmb) return false
    const cantActual = selEmb.ordenesIds?.[0]?.kgEmbarcados ?? 0
    return (
      editOrigen !== (selEmb.origen ?? '') ||
      editDestino !== (selEmb.destino ?? '') ||
      editFechaProgramada !== (selEmb.fechaProgramada ?? '') ||
      editCostoFlete !== (selEmb.costoFlete ?? 0) ||
      editCantidad !== cantActual
    )
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
                    <div className="flex gap-1">
                      <button className="btn btn-secondary btn-sm" onClick={() => openViewEmb(e)}>Ver</button>
                      {canDeleteEmbarque && e.estatus === 'solicitado' && (
                        <button className="btn btn-danger btn-sm" title="Eliminar embarque" onClick={() => setDelEmb(e)}>
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
              {/* Guardar campos de embarque solicitado */}
              {selEmb.estatus === 'solicitado' && solicitadoCambiado() && (
                <button className="btn btn-warning" onClick={() => void handleGuardarSolicitado()}>
                  <Save size={13} /> Guardar cambios
                </button>
              )}
              {/* Guardar transportista / origen cuando NO está en solicitado */}
              {selEmb.estatus !== 'solicitado' && (editTransId !== (selEmb.transportistaId ?? '') || editOrigen !== (selEmb.origen ?? '')) && (
                <button className="btn btn-warning" onClick={() => void handleSaveTransportista()}>
                  <Edit2 size={13} /> Guardar cambios
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
            {/* Info estática del embarque */}
            <div className="grid grid-cols-2 gap-3 text-sm p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">Origen</span>
                <span className="text-gray-800">{selEmb.origen}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">Estatus</span>
                <StatusBadge status={selEmb.estatus} />
              </div>
              {selEmb.estatus !== 'solicitado' && (
                <>
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
                  {(selEmb.ordenesIds?.length ?? 0) > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">OC(s)</span>
                      <span className="text-xs font-mono text-blue-700">{selEmb.ordenesIds!.map(r => r.folio).join(', ')}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Edición de campos cuando estatus = "solicitado" ─────────── */}
            {selEmb.estatus === 'solicitado' && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Datos del embarque — editable en estado Solicitado
                </p>

                {/* OC de compras — solo lectura */}
                {(selEmb.ordenesIds?.length ?? 0) > 0 && (
                  <div className="form-group">
                    <label className="label">Orden(es) de Compra</label>
                    <div className="input bg-gray-100 text-gray-700 font-mono text-sm cursor-not-allowed">
                      {selEmb.ordenesIds!.map(r => `${r.folio} (${r.kgEmbarcados} kg)`).join(', ')}
                    </div>
                  </div>
                )}

                {/* Origen */}
                <div className="form-group">
                  <label className="label">Origen del envío</label>
                  <input
                    className="input"
                    value={editOrigen}
                    onChange={e => setEditOrigen(e.target.value)}
                    placeholder="Ej. Bodega Tepatitlán, Jalisco"
                  />
                </div>

                {/* Destino */}
                <div className="form-group">
                  <label className="label">Destino</label>
                  <input
                    className="input"
                    value={editDestino}
                    onChange={e => setEditDestino(e.target.value)}
                    placeholder="Dirección o ciudad de destino"
                  />
                </div>

                {/* Cantidad a transportar y fecha programada en grid */}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="label">Cantidad a transportar (kg)</label>
                    <input
                      type="number"
                      className="input"
                      value={editCantidad}
                      min={0}
                      onChange={e => setEditCantidad(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Fecha programada</label>
                    <input
                      type="date"
                      className="input"
                      value={editFechaProgramada}
                      onChange={e => setEditFechaProgramada(e.target.value)}
                    />
                  </div>
                </div>

                {/* Costo del flete */}
                <div className="form-group">
                  <label className="label">Costo del flete (MXN)</label>
                  <input
                    type="number"
                    className="input"
                    value={editCostoFlete}
                    min={0}
                    onChange={e => setEditCostoFlete(Number(e.target.value))}
                  />
                </div>

                {solicitadoCambiado() && (
                  <p className="text-xs text-blue-600">Cambios pendientes — presiona "Guardar cambios" para confirmar.</p>
                )}
              </div>
            )}

            {/* Editar origen + transportista (cuando no es solicitado) */}
            {selEmb.estatus !== 'solicitado' && (
              <div className="space-y-1">
                <label className="label">Origen del envío</label>
                <input
                  className="input"
                  value={editOrigen}
                  onChange={e => setEditOrigen(e.target.value)}
                  placeholder="Ej. Bodega Tepatitlán, Jalisco"
                />
              </div>
            )}
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
              {(editTransId !== (selEmb.transportistaId ?? '') || (selEmb.estatus !== 'solicitado' && editOrigen !== (selEmb.origen ?? ''))) && (
                <p className="text-xs text-amber-600">Cambios pendientes — presiona "Guardar cambios" para confirmar.</p>
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

      {/* Confirmar eliminar embarque */}
      {delEmb && (
        <Modal
          title="Eliminar embarque"
          onClose={() => setDelEmb(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setDelEmb(null)}>Cancelar</button>
              <button className="btn-danger" onClick={() => void handleDeleteEmbarque()}>
                <Trash2 size={14} /> Eliminar definitivamente
              </button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>¿Estás seguro de que deseas eliminar el embarque:</p>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
              <div className="font-semibold text-gray-900">{delEmb.folio}</div>
              {(delEmb.ordenesIds?.length ?? 0) > 0 && (
                <div className="text-gray-500 font-mono text-xs">OC(s): {delEmb.ordenesIds!.map(r => r.folio).join(', ')}</div>
              )}
            </div>
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>Las OC(s) asociadas regresarán a Compras con estatus <strong>confirmada</strong>. Esta acción no se puede deshacer.</span>
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
