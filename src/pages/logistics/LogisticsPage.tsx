import { useState, useEffect } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { usePurchasesStore } from '../../store/purchasesStore'
import { useInventoryStore } from '../../store/inventoryStore'
import { useProductsStore } from '../../store/productsStore'
import { toast } from '../../store/toastStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import type { Embarque, EmbarqueEstatus, EmbarqueOCRef, Transportista } from '../../types'
import { Truck, Plus, CreditCard as Edit2, Trash2, CircleAlert as AlertCircle, ToggleLeft, ToggleRight, CheckCircle, Send, Save, XCircle } from 'lucide-react'

// ── constantes ─────────────────────────────────────────────────────────────
const ESTADOS_ACTIVOS: EmbarqueEstatus[] = ['solicitado', 'programado', 'recolectado', 'enTransito', 'entregado']
const TRANS_MANAGE_ROLES = ['director', 'operaciones', 'almacen'] as const

const BLANK_TRANS: Omit<Transportista, 'transportistaId'> = {
  nombre: '', contacto: '', telefono: '', tarifaBase: 0, activo: true,
}

// ── helpers ─────────────────────────────────────────────────────────────────

/**
 * Distribuye `total` entre los elementos de `refs` proporcionalmente a sus
 * kgEmbarcados actuales. El último elemento absorbe el residuo para que la
 * suma sea exacta (sin pérdida por Math.round).
 */
function distribuirKg(refs: EmbarqueOCRef[], total: number): EmbarqueOCRef[] {
  if (refs.length === 0) return refs
  const sumaActual = refs.reduce((a, r) => a + r.kgEmbarcados, 0)
  if (sumaActual === 0) {
    const porCada = Math.floor(total / refs.length)
    const residuo = total - porCada * refs.length
    return refs.map((r, i) => ({ ...r, kgEmbarcados: porCada + (i === refs.length - 1 ? residuo : 0) }))
  }
  let asignado = 0
  return refs.map((r, i) => {
    if (i === refs.length - 1) return { ...r, kgEmbarcados: total - asignado }
    const kg = Math.round(total * (r.kgEmbarcados / sumaActual))
    asignado += kg
    return { ...r, kgEmbarcados: kg }
  })
}

// ── componente ─────────────────────────────────────────────────────────────
export function LogisticsPage() {
  const {
    embarques, transportistas, loadLogistics, subscribeRealtime: subLogistics,
    addEmbarque: addEmbarqueStore, updateEmbarque,
    addTransportista, updateTransportista, deleteTransportista,
  } = useLogisticsStore()
  const { orders, loadOrders, subscribeRealtime: subOrders } = useSalesOrdersStore()
  const { ordenesCompra, loadPurchases, subscribeRealtime: subPurchases, updateOrdenCompra } = usePurchasesStore()
  const { applyMovimiento } = useInventoryStore()
  const { products, loadProducts } = useProductsStore()
  const { user: me } = useAuthStore()

  useEffect(() => {
    void loadLogistics()
    void loadOrders()
    void loadPurchases()
    void loadProducts()
    const u1 = subLogistics()
    const u2 = subOrders()
    const u3 = subPurchases()
    return () => { u1(); u2(); u3() }
  }, [])

  const canManageTrans = me ? hasRole(me, ...TRANS_MANAGE_ROLES) : false

  // ── pestañas / búsqueda ───────────────────────────────────────────────────
  const [tab, setTab] = useState<'embarques' | 'transportistas'>('embarques')
  const [q, setQ] = useState('')

  // ── modal embarque ────────────────────────────────────────────────────────
  type EmbModal = 'view_emb' | null
  const [embModal, setEmbModal] = useState<EmbModal>(null)
  const [selEmb, setSelEmb] = useState<Embarque | null>(null)
  const [editTransId, setEditTransIdEmb] = useState<string>('')
  const [editOrigen, setEditOrigen] = useState<string>('')
  const [editDestino, setEditDestino] = useState('')
  const [editCantidad, setEditCantidad] = useState<number>(0)
  const [editFechaProgramada, setEditFechaProgramada] = useState('')
  const [editCostoFlete, setEditCostoFlete] = useState<number>(0)
  const [confirmCxP, setConfirmCxP] = useState(false)
  const [confirmCancelar, setConfirmCancelar] = useState(false)

  // ── modal transportista ──────────────────────────────────────────────────
  type TransModal = 'new_trans' | 'edit_trans' | 'del_trans' | null
  const [transModal, setTransModal] = useState<TransModal>(null)
  const [selTrans, setSelTrans] = useState<Transportista | null>(null)
  const [formTrans, setFormTrans] = useState(BLANK_TRANS)
  const [editTransIdTrans, setEditTransIdTrans] = useState<string | null>(null)

  // ── derivados ─────────────────────────────────────────────────────────────
  const embarquesActivos = embarques.filter(e => e.estatus !== 'cerrado' && e.estatus !== 'cancelado')
  const filteredEmb = embarquesActivos.filter(e =>
    [e.folio, e.destino, e.origen].join(' ').toLowerCase().includes(q.toLowerCase())
  )
  const filteredTrans = transportistas.filter(t =>
    [t.nombre, t.contacto].join(' ').toLowerCase().includes(q.toLowerCase())
  )
  const onTime = embarques.filter(e => e.estatus === 'entregado').length
  const totalEmb = embarques.filter(e => ['entregado', 'cerrado'].includes(e.estatus)).length
  const pct = totalEmb > 0 ? Math.round(onTime / totalEmb * 100) : 100

  // ── kg originales del embarque ────────────────────────────────────────────
  // Lee kg_original guardado en BD; si no existe (embarques viejos), suma kgEmbarcados.
  function getKgOriginal(emb: Embarque): number {
    const raw = (emb as any).kgOriginal as number | undefined
    if (raw && raw > 0) return raw
    return (emb.ordenesIds ?? []).reduce((a, r) => a + r.kgEmbarcados, 0)
  }

  // ── abrir modal ───────────────────────────────────────────────────────────
  function openViewEmb(e: Embarque) {
    setSelEmb(e)
    setEditTransIdEmb(e.transportistaId ?? '')
    setEditOrigen(e.origen ?? '')
    setEditDestino(e.destino ?? '')
    // Precarga con la suma actual de kgEmbarcados (puede ser < kg_original si ya fue editado)
    setEditCantidad((e.ordenesIds ?? []).reduce((a, r) => a + r.kgEmbarcados, 0))
    setEditFechaProgramada(e.fechaProgramada ?? '')
    setEditCostoFlete(e.costoFlete ?? 0)
    setConfirmCxP(false)
    setEmbModal('view_emb')
  }

  // ── guardar transportista / origen (estados post-solicitado) ───────────────
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

  // ── guardar campos de embarque solicitado ──────────────────────────────────
  async function handleGuardarSolicitado() {
    if (!selEmb) return
    // Distribución exacta entre OC refs (sin pérdida por redondeo)
    const nuevasOCs: EmbarqueOCRef[] = selEmb.ordenesIds?.length
      ? distribuirKg(selEmb.ordenesIds, editCantidad)
      : []
    const kgOriginalActual = getKgOriginal(selEmb)
    const patch: any = {
      origen: editOrigen,
      destino: editDestino,
      fechaProgramada: editFechaProgramada,
      costoFlete: editCostoFlete,
      ordenesIds: nuevasOCs,
    }
    // Primera vez que se guarda: fijar kg_original
    if (kgOriginalActual === 0) patch.kgOriginal = editCantidad
    await updateEmbarque(selEmb.embarqueId, patch)
    setSelEmb(prev => prev
      ? { ...prev, origen: editOrigen, destino: editDestino,
          fechaProgramada: editFechaProgramada, costoFlete: editCostoFlete, ordenesIds: nuevasOCs }
      : prev
    )
    toast.success('Datos del embarque actualizados.')
  }

  // ── cambiar estatus ───────────────────────────────────────────────────────
  async function handleCambiarEstatus(est: EmbarqueEstatus) {
    if (!selEmb) return

    if (est === 'recolectado') {
      if (editCantidad <= 0) { toast.error('Los KG a recolectar deben ser mayor a cero.'); return }
      const kgOriginal = getKgOriginal(selEmb)
      if (kgOriginal > 0 && editCantidad < kgOriginal) {
        const pendiente = kgOriginal - editCantidad
        const idsRecolectados = distribuirKg(selEmb.ordenesIds ?? [], editCantidad)
        await updateEmbarque(selEmb.embarqueId, { estatus: 'recolectado', ordenesIds: idsRecolectados })
        const idsPendiente = distribuirKg(selEmb.ordenesIds ?? [], pendiente)
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
        } as any)
        toast.success(`${editCantidad} kg recolectados. Nuevo embarque creado con ${pendiente} kg pendientes.`)
        setEmbModal(null); setSelEmb(null)
        return
      }
    }

    await updateEmbarque(selEmb.embarqueId, { estatus: est })
    setSelEmb(prev => prev ? { ...prev, estatus: est } : prev)
    toast.success(`Estatus actualizado: ${est}`)
  }

  // ── enviar a CxP ──────────────────────────────────────────────────────────
  async function handleEnviarCxP() {
    if (!selEmb) return
    await updateEmbarque(selEmb.embarqueId, { estatus: 'cerrado' })
    const usuario = me?.email ?? 'sistema'
    const ocs = selEmb.ordenesIds ?? []
    for (const ref of ocs) {
      const oc = ordenesCompra.find(o => o.ordenCompraId === ref.ordenCompraId)
      if (!oc) continue
      // Actualizar inventario: entrada proporcional por cada producto de la OC
      for (const item of (oc.items ?? [])) {
        if (!item.productId || item.cantidad <= 0) continue
        const kgTotalOCItems = (oc.items ?? []).reduce((a: number, it: typeof item) => a + it.cantidad, 0)
        const fraccion = kgTotalOCItems > 0 ? ref.kgEmbarcados / kgTotalOCItems : 1
        const cantidadEntregada = Math.round(item.cantidad * fraccion * 100) / 100
        if (cantidadEntregada <= 0) continue
        await applyMovimiento({
          productId: item.productId,
          tipo: 'EntradaCompra',
          cantidad: cantidadEntregada,
          documentoOrigen: `${oc.folio} / ${selEmb.folio}`,
          usuario,
          notas: `Entrada por embarque ${selEmb.folio} (${ref.kgEmbarcados} kg)`,
        })
      }
      // Si no quedan embarques activos para esta OC → enviarPago; si no → parcialLogistica
      const hayPendientes = embarques.some(e =>
        e.embarqueId !== selEmb.embarqueId &&
        e.estatus !== 'cerrado' &&
        (e.ordenesIds ?? []).some(r => r.ordenCompraId === ref.ordenCompraId)
      )
      await updateOrdenCompra(oc.ordenCompraId, {
        estatus: hayPendientes ? 'parcialLogistica' : 'enviarPago',
      })
    }
    toast.success(`Embarque ${selEmb.folio} cerrado. Inventario actualizado. OC(s) procesadas.`)
    setEmbModal(null); setSelEmb(null)
  }

  // ── cancelar embarque ─────────────────────────────────────────────────────
  // Solo disponible en estados solicitado / programado (antes de que haya movimiento físico).
  // Revierte las OCs referenciadas de enviarPago → confirmada para que puedan volver a logística.
  async function handleCancelarEmbarque() {
    if (!selEmb) return
    await updateEmbarque(selEmb.embarqueId, { estatus: 'cancelado' })
    for (const ref of (selEmb.ordenesIds ?? [])) {
      const oc = ordenesCompra.find(o => o.ordenCompraId === ref.ordenCompraId)
      if (oc && ['enviarPago', 'parcialLogistica', 'enviarLogistica'].includes(oc.estatus)) {
        await updateOrdenCompra(oc.ordenCompraId, { estatus: 'confirmada' })
      }
    }
    toast.success(`Embarque ${selEmb.folio} cancelado. OC(s) devueltas a estado Confirmada.`)
    setEmbModal(null); setSelEmb(null); setConfirmCancelar(false)
  }

  // ── detectar cambios en formulario solicitado ─────────────────────────────
  function solicitadoCambiado(): boolean {
    if (!selEmb) return false
    const kgActual = (selEmb.ordenesIds ?? []).reduce((a, r) => a + r.kgEmbarcados, 0)
    return (
      editOrigen !== (selEmb.origen ?? '') ||
      editDestino !== (selEmb.destino ?? '') ||
      editFechaProgramada !== (selEmb.fechaProgramada ?? '') ||
      editCostoFlete !== (selEmb.costoFlete ?? 0) ||
      editCantidad !== kgActual
    )
  }

  // ── handlers transportista ────────────────────────────────────────────────
  const FTrans = (k: keyof typeof formTrans) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormTrans(f => ({ ...f, [k]: k === 'tarifaBase' ? Number(e.target.value) : e.target.value }))

  function openNewTrans() { setFormTrans(BLANK_TRANS); setEditTransIdTrans(null); setTransModal('new_trans') }
  function openEditTrans(t: Transportista) {
    const { transportistaId, ...rest } = t
    setFormTrans(rest); setEditTransIdTrans(t.transportistaId); setTransModal('edit_trans')
  }
  function openDelTrans(t: Transportista) { setSelTrans(t); setTransModal('del_trans') }
  function handleSaveTrans() {
    if (!formTrans.nombre.trim()) { toast.error('El nombre del transportista es obligatorio.'); return }
    if (editTransIdTrans) { updateTransportista(editTransIdTrans, formTrans); toast.success('Transportista actualizado.') }
    else { addTransportista(formTrans); toast.success('Transportista creado.') }
    setTransModal(null)
  }
  function handleDeleteTrans() {
    if (selTrans) { deleteTransportista(selTrans.transportistaId); toast.success(`Transportista "${selTrans.nombre}" eliminado.`) }
    setTransModal(null); setSelTrans(null)
  }

  // ─── render ────────────────────────────────────────────────────────────────
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
            <button className="btn-primary" onClick={openNewTrans}><Plus size={16} /> Nuevo Transportista</button>
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
        <button className={`btn ${tab === 'embarques' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('embarques'); setQ('') }}>
          <Truck size={15} /> Embarques ({embarquesActivos.length})
        </button>
        <button className={`btn ${tab === 'transportistas' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('transportistas'); setQ('') }}>
          Transportistas ({transportistas.length})
        </button>
      </div>

      {/* ── TABLA EMBARQUES ──────────────────────────────────────────────── */}
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
                  : <span className="text-gray-400 text-xs">-</span>
                },
                // Columna KG: muestra "60 / 100" cuando es parcial (ámbar), o simplemente "100"
                { key: 'kg', header: 'KG', render: e => {
                  const kgActual = (e.ordenesIds ?? []).reduce((a, r) => a + r.kgEmbarcados, 0)
                  const kgOrig   = getKgOriginal(e)
                  return kgOrig > kgActual
                    ? <span className="text-xs font-semibold text-amber-700">{kgActual} / {kgOrig}</span>
                    : <span className="text-xs text-gray-700">{kgActual}</span>
                }},
                { key: 'origen', header: 'Origen', render: e => <span className="text-xs text-gray-600">{e.origen}</span> },
                { key: 'destino', header: 'Destino' },
                { key: 'trans', header: 'Transportista', render: e =>
                  transportistas.find(t => t.transportistaId === e.transportistaId)?.nombre
                    ?? <span className="text-amber-600 text-xs font-medium">Sin asignar</span>
                },
                { key: 'fechaProg', header: 'F. Programada', render: e => e.fechaProgramada || '-' },
                { key: 'flete', header: 'Flete', render: e => <Currency value={e.costoFlete} /> },
                { key: 'estatus', header: 'Estatus', render: e => <StatusBadge status={e.estatus} /> },
                { key: 'acc', header: '', render: e => (
                  <button className="btn btn-secondary btn-sm" onClick={() => openViewEmb(e)}>Ver</button>
                )},
              ]}
            />
          )}
        </div>
      )}

      {/* ── TABLA TRANSPORTISTAS ─────────────────────────────────────────── */}
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
                <span className="badge badge-blue">{embarques.filter(e => e.transportistaId === t.transportistaId).length}</span>
              )},
              { key: 'activo', header: 'Estatus', render: t => <StatusBadge status={t.activo ? 'activo' : 'inactivo'} /> },
              { key: 'acc', header: '', render: t => (
                <div className="flex gap-1">
                  {canManageTrans ? (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditTrans(t)} title="Editar"><Edit2 size={13} /></button>
                      <button className="btn btn-secondary btn-sm" onClick={() => updateTransportista(t.transportistaId, { activo: !t.activo })} title={t.activo ? 'Desactivar' : 'Activar'}>
                        {t.activo ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} className="text-gray-400" />}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => openDelTrans(t)} title="Eliminar"><Trash2 size={13} /></button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">Solo lectura</span>
                  )}
                </div>
              )},
            ]}
          />
        </div>
      )}

      {/* ── MODAL VER / GESTIONAR EMBARQUE ─────────────────────────────────── */}
      {embModal === 'view_emb' && selEmb && (() => {
        const kgOriginal = getKgOriginal(selEmb)
        const kgActual   = (selEmb.ordenesIds ?? []).reduce((a, r) => a + r.kgEmbarcados, 0)
        const esParcial  = kgOriginal > 0 && editCantidad < kgOriginal
        const pctKg      = kgOriginal > 0 ? Math.round((editCantidad / kgOriginal) * 100) : 100

        return (
          <Modal
            title={`Embarque ${selEmb.folio}`}
            onClose={() => { setEmbModal(null); setSelEmb(null); setConfirmCxP(false); setConfirmCancelar(false) }}
            footer={
              <div className="flex gap-2 flex-wrap justify-end">
                <button className="btn-secondary" onClick={() => { setEmbModal(null); setSelEmb(null); setConfirmCxP(false); setConfirmCancelar(false) }}>Cerrar</button>
                {/* Cancelar embarque — solo en estados previos al movimiento físico */}
                {['solicitado', 'programado'].includes(selEmb.estatus) && !confirmCancelar && !confirmCxP && (
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmCancelar(true)}>
                    <XCircle size={13} /> Cancelar embarque
                  </button>
                )}
                {confirmCancelar && (
                  <>
                    <span className="text-xs text-red-700 self-center font-medium">¿Cancelar este embarque?</span>
                    <button className="btn-secondary" onClick={() => setConfirmCancelar(false)}>No</button>
                    <button className="btn btn-danger" onClick={() => void handleCancelarEmbarque()}>
                      <XCircle size={13} /> Sí, cancelar
                    </button>
                  </>
                )}
                {selEmb.estatus === 'solicitado' && solicitadoCambiado() && (
                  <button className="btn btn-warning" onClick={() => void handleGuardarSolicitado()}><Save size={13} /> Guardar cambios</button>
                )}
                {selEmb.estatus !== 'solicitado' && (editTransId !== (selEmb.transportistaId ?? '') || editOrigen !== (selEmb.origen ?? '')) && (
                  <button className="btn btn-warning" onClick={() => void handleSaveTransportista()}><Edit2 size={13} /> Guardar cambios</button>
                )}
                {selEmb.estatus === 'entregado' && (selEmb.ordenesIds?.length ?? 0) > 0 && !confirmCxP && (
                  <button className="btn btn-primary" onClick={() => setConfirmCxP(true)}><Send size={13} /> Enviar a CxP</button>
                )}
                {confirmCxP && (
                  <>
                    <span className="text-xs text-amber-700 self-center font-medium">¿Confirmar envío a CxP?</span>
                    <button className="btn-secondary" onClick={() => setConfirmCxP(false)}>No</button>
                    <button className="btn btn-primary" onClick={() => void handleEnviarCxP()}><CheckCircle size={13} /> Sí, enviar</button>
                  </>
                )}
              </div>
            }
            size="lg"
          >
            <div className="space-y-5">
              {/* Info estática */}
              <div className="grid grid-cols-2 gap-3 text-sm p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">Origen</span>
                  <span className="text-gray-800">{selEmb.origen || <span className="text-gray-400 italic">Sin definir</span>}</span>
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
                      <span className="text-gray-800">{selEmb.fechaProgramada || '-'}</span>
                    </div>
                    {(selEmb.ordenesIds?.length ?? 0) > 0 && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">OC(s)</span>
                        <span className="text-xs font-mono text-blue-700">
                          {selEmb.ordenesIds!.map(r => `${r.folio} (${r.kgEmbarcados} kg)`).join(', ')}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {/* Badge de embarque parcial en info estática (estados post-solicitado) */}
                {selEmb.estatus !== 'solicitado' && kgOriginal > 0 && kgActual < kgOriginal && (
                  <div className="col-span-2 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    <span><strong>Embarque parcial:</strong> {kgActual} de {kgOriginal} kg totales de la OC.</span>
                  </div>
                )}
              </div>

              {/* ── Edición estado solicitado ────────────────────────────── */}
              {selEmb.estatus === 'solicitado' && (
                <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                    Datos del embarque — editable en estado Solicitado
                  </p>

                  {/* OC — solo lectura */}
                  {(selEmb.ordenesIds?.length ?? 0) > 0 && (
                    <div className="form-group">
                      <label className="label">Orden(es) de Compra</label>
                      <div className="input bg-gray-100 text-gray-700 font-mono text-sm cursor-not-allowed">
                        {selEmb.ordenesIds!.map(r => `${r.folio} (${r.kgEmbarcados} kg)`).join(', ')}
                        {kgOriginal > kgActual && (
                          <span className="ml-2 text-amber-600 font-normal text-xs">— orig. {kgOriginal} kg</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="label">Origen del envío</label>
                    <input className="input" value={editOrigen} onChange={e => setEditOrigen(e.target.value)} placeholder="Ej. Bodega Tepatitlán, Jalisco" />
                  </div>

                  <div className="form-group">
                    <label className="label">Destino</label>
                    <input className="input" value={editDestino} onChange={e => setEditDestino(e.target.value)} placeholder="Dirección o ciudad de destino" />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      {/* Label con indicador de kg seleccionados / total disponible */}
                      <div className="flex items-center justify-between mb-1">
                        <label className="label mb-0">Cantidad a transportar (kg)</label>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          esParcial
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'bg-green-50 border-green-300 text-green-700'
                        }`}>
                          {editCantidad} / {kgOriginal} kg
                          {esParcial ? ' · Parcial' : ' · Completo'}
                        </span>
                      </div>
                      <input
                        type="number"
                        className="input"
                        value={editCantidad}
                        min={1}
                        max={kgOriginal > 0 ? kgOriginal : undefined}
                        onChange={e => setEditCantidad(Number(e.target.value))}
                      />
                      {/* Barra de progreso visual */}
                      {kgOriginal > 0 && (
                        <div className="mt-1.5 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${esParcial ? 'bg-amber-400' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(pctKg, 100)}%` }}
                          />
                        </div>
                      )}
                      {/* Leyenda de embarque parcial */}
                      {esParcial && (
                        <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} />
                          Embarque parcial — se crearán 2 despachos al pasar a Recolectado
                          ({editCantidad} kg ahora + {kgOriginal - editCantidad} kg pendientes).
                        </p>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="label">Fecha programada</label>
                      <input type="date" className="input" value={editFechaProgramada} onChange={e => setEditFechaProgramada(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label">Costo del flete (MXN)</label>
                    <input type="number" className="input" value={editCostoFlete} min={0} onChange={e => setEditCostoFlete(Number(e.target.value))} />
                  </div>

                  {solicitadoCambiado() && (
                    <p className="text-xs text-blue-600">Cambios pendientes — presiona "Guardar cambios" para confirmar.</p>
                  )}
                </div>
              )}

              {/* Editar origen (estados post-solicitado) */}
              {selEmb.estatus !== 'solicitado' && (
                <div className="space-y-1">
                  <label className="label">Origen del envío</label>
                  <input className="input" value={editOrigen} onChange={e => setEditOrigen(e.target.value)} placeholder="Ej. Bodega Tepatitlán, Jalisco" />
                </div>
              )}

              {/* Transportista */}
              <div className="space-y-1">
                <label className="label">Transportista</label>
                <select className="select" value={editTransId} onChange={e => setEditTransIdEmb(e.target.value)}>
                  <option value="">- Sin asignar -</option>
                  {transportistas.filter(t => t.activo).map(t => (
                    <option key={t.transportistaId} value={t.transportistaId}>
                      {t.nombre}{t.tarifaBase > 0 ? ` - ${t.tarifaBase.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}` : ''}
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
                      Embarque entregado. Presiona <strong>"Enviar a CxP"</strong> para cerrar el embarque,
                      actualizar el inventario y mover la(s) OC(s) a Cuentas por Pagar.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )
      })()}

      {/* ── MODALES TRANSPORTISTA ─────────────────────────────────────────── */}
      {(transModal === 'new_trans' || transModal === 'edit_trans') && (
        <Modal
          title={transModal === 'new_trans' ? 'Nuevo Transportista' : `Editar - ${selTrans?.nombre ?? ''}`}
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
