import { useState } from 'react'
import { useFinanceStore } from '../../store/financeStore'
import { useClientsStore } from '../../store/clientsStore'
import { useSuppliersStore } from '../../store/suppliersStore'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { useProductsStore } from '../../store/productsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import { toast } from '../../store/toastStore'
import type { FacturaVenta, SalesOrder, Banco } from '../../types'
import {
  DollarSign, CreditCard, Building, Eye,
  CheckCircle, Clock, FileText, Plus,
  Edit2, Trash2,
} from 'lucide-react'

const MXN = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
const FORMAS_PAGO = ['Transferencia', 'Cheque', 'Efectivo', 'Tarjeta']

export function FinancePage() {
  const {
    facturasVenta, pagosClientes,
    facturasProveedor, bancos,
    addPagoCliente, addPagoProveedor,
    addFacturaProveedor,
    addBanco, updateBanco, deleteBanco,
  } = useFinanceStore()
  const { clients } = useClientsStore()
  const { suppliers } = useSuppliersStore()
  const { orders } = useSalesOrdersStore()
  const { products } = useProductsStore()
  const { user: me } = useAuthStore()

  const canManageBancos = me ? hasRole(me, 'director', 'administracion') : false

  // Main tabs
  const [tab, setTab] = useState<'cxc' | 'cxp' | 'bancos'>('cxc')
  // CxC sub-tabs
  const [cxcTab, setCxcTab] = useState<'cobrar' | 'pagadas'>('cobrar')

  // Payment / invoice modals
  type ModalType =
    | 'pago_cli' | 'pago_prov'
    | 'recibo'
    | 'new_fp'          // nueva factura proveedor
    | 'new_banco' | 'edit_banco' | 'del_banco'
    | null
  const [modal, setModal] = useState<ModalType>(null)

  // CxC
  const [selFv, setSelFv] = useState<string>('')
  const [selRecibo, setSelRecibo] = useState<FacturaVenta | null>(null)

  // CxP
  const [selFp, setSelFp] = useState<string>('')

  // Shared payment form
  const [pagoForm, setPagoForm] = useState({ monto: 0, formaPago: 'Transferencia', referencia: '' })

  // Nueva factura proveedor
  const BLANK_FP = { supplierId: '', fecha: new Date().toISOString().split('T')[0], fechaVencimiento: '', monto: 0, notas: '' }
  const [fpForm, setFpForm] = useState(BLANK_FP)

  // Banco CRUD
  const BLANK_BANCO: Omit<Banco, 'bancoId'> = { banco: '', cuenta: '', saldo: 0, moneda: 'MXN', activo: true }
  const [bancoForm, setBancoForm] = useState(BLANK_BANCO)
  const [selBanco, setSelBanco] = useState<Banco | null>(null)

  // ── Derived data ────────────────────────────────────────────────────────────
  const porCobrar = facturasVenta.filter(f => f.saldoPendiente > 0)
  const pagadas = facturasVenta.filter(f => f.saldoPendiente === 0 && f.estatus === 'pagada')

  const cxcPendiente = porCobrar.reduce((a, f) => a + f.saldoPendiente, 0)
  const cxcVencida = facturasVenta.filter(f => f.estatus === 'vencida').reduce((a, f) => a + f.saldoPendiente, 0)
  const cxpPendiente = facturasProveedor.filter(f => f.saldoPendiente > 0).reduce((a, f) => a + f.saldoPendiente, 0)
  const saldoTotal = bancos.filter(b => b.moneda === 'MXN').reduce((a, b) => a + b.saldo, 0)

  function getOrder(pedidoId?: string): SalesOrder | undefined {
    if (!pedidoId) return undefined
    return orders.find(o => o.pedidoId === pedidoId)
  }

  // ── Cobro cliente ────────────────────────────────────────────────────────────
  function openCobro(fv: FacturaVenta) {
    setSelFv(fv.facturaId)
    setPagoForm({ monto: fv.saldoPendiente, formaPago: 'Transferencia', referencia: '' })
    setModal('pago_cli')
  }

  function handlePagoCliente() {
    const fv = facturasVenta.find(f => f.facturaId === selFv)
    if (!fv) return
    if (pagoForm.monto <= 0) { toast.error('El monto debe ser mayor a cero.'); return }
    addPagoCliente({ facturaId: selFv, clienteId: fv.clienteId, fecha: new Date().toISOString().split('T')[0], ...pagoForm })
    toast.success(`Cobro registrado: ${MXN(pagoForm.monto)}. Factura actualizada.`)
    setModal(null)
    setPagoForm({ monto: 0, formaPago: 'Transferencia', referencia: '' })
    const remaining = fv.saldoPendiente - pagoForm.monto
    if (remaining <= 0) setCxcTab('pagadas')
  }

  // ── Pago proveedor ───────────────────────────────────────────────────────────
  function handlePagoProveedor() {
    const fp = facturasProveedor.find(f => f.facturaProvId === selFp)
    if (!fp) return
    if (pagoForm.monto <= 0) { toast.error('El monto debe ser mayor a cero.'); return }
    addPagoProveedor({ facturaProvId: selFp, supplierId: fp.supplierId, fecha: new Date().toISOString().split('T')[0], ...pagoForm })
    toast.success(`Pago a proveedor registrado: ${MXN(pagoForm.monto)}.`)
    setModal(null)
    setPagoForm({ monto: 0, formaPago: 'Transferencia', referencia: '' })
  }

  // ── Nueva Factura Proveedor ──────────────────────────────────────────────────
  function handleSaveFP() {
    if (!fpForm.supplierId) { toast.error('Selecciona un proveedor.'); return }
    if (fpForm.monto <= 0) { toast.error('El monto debe ser mayor a cero.'); return }
    if (!fpForm.fechaVencimiento) { toast.error('Ingresa la fecha de vencimiento.'); return }
    const subtotal = fpForm.monto / 1.16
    const impuestos = fpForm.monto - subtotal
    const fp = addFacturaProveedor({
      supplierId: fpForm.supplierId,
      fecha: fpForm.fecha,
      fechaVencimiento: fpForm.fechaVencimiento,
      subtotal,
      impuestos,
      total: fpForm.monto,
      saldoPendiente: fpForm.monto,
      estatus: 'recibida',
    })
    toast.success(`Factura proveedor ${fp.folio} registrada.`)
    setModal(null)
    setFpForm(BLANK_FP)
  }

  // ── Recibo viewer ────────────────────────────────────────────────────────────
  function openRecibo(fv: FacturaVenta) { setSelRecibo(fv); setModal('recibo') }

  // ── Banco handlers ───────────────────────────────────────────────────────────
  function openNewBanco() { setBancoForm(BLANK_BANCO); setSelBanco(null); setModal('new_banco') }
  function openEditBanco(b: Banco) { const { bancoId, ...rest } = b; void bancoId; setBancoForm(rest); setSelBanco(b); setModal('edit_banco') }
  function openDelBanco(b: Banco) { setSelBanco(b); setModal('del_banco') }

  function handleSaveBanco() {
    if (!bancoForm.banco.trim()) { toast.error('Nombre del banco requerido.'); return }
    if (!bancoForm.cuenta.trim()) { toast.error('Número de cuenta requerido.'); return }
    if (selBanco) {
      updateBanco(selBanco.bancoId, bancoForm)
      toast.success(`Cuenta ${selBanco.banco} actualizada.`)
    } else {
      addBanco(bancoForm)
      toast.success(`Cuenta ${bancoForm.banco} agregada.`)
    }
    setModal(null)
  }

  function handleDeleteBanco() {
    if (selBanco) { deleteBanco(selBanco.bancoId); toast.success(`Cuenta ${selBanco.banco} eliminada.`) }
    setModal(null); setSelBanco(null)
  }

  // ── CxC table columns ────────────────────────────────────────────────────────
  function cxcColumns(showCobrar: boolean) {
    return [
      { key: 'folio', header: 'Factura', render: (f: FacturaVenta) => <span className="font-mono font-semibold text-blue-700">{f.folio}</span> },
      { key: 'pedido', header: 'Pedido', render: (f: FacturaVenta) => {
        const o = getOrder(f.pedidoId)
        return o ? <span className="font-mono text-xs text-gray-600">{o.folio}</span> : <span className="text-gray-400">—</span>
      }},
      { key: 'cliente', header: 'Cliente', render: (f: FacturaVenta) => clients.find(c => c.clientId === f.clienteId)?.razonSocial ?? '-' },
      { key: 'fecha', header: 'Fecha' },
      { key: 'fechaVenc', header: 'Vencimiento', render: (f: FacturaVenta) => f.fechaVencimiento },
      { key: 'total', header: 'Total', render: (f: FacturaVenta) => <Currency value={f.total} /> },
      { key: 'saldo', header: showCobrar ? 'Saldo Pendiente' : 'Cobrado', render: (f: FacturaVenta) => (
        <span className={showCobrar ? 'font-bold text-red-600' : 'font-bold text-green-600'}>
          <Currency value={showCobrar ? f.saldoPendiente : f.total} />
        </span>
      )},
      { key: 'estatus', header: 'Estatus', render: (f: FacturaVenta) => <StatusBadge status={f.estatus} /> },
      { key: 'acc', header: '', render: (f: FacturaVenta) => (
        <div className="flex gap-1">
          <button className="btn btn-secondary btn-sm" onClick={() => openRecibo(f)} title="Ver recibo/factura">
            <Eye size={13} /> Recibo
          </button>
          {showCobrar && f.saldoPendiente > 0 && (
            <button className="btn btn-success btn-sm" onClick={() => openCobro(f)}>
              <CheckCircle size={13} /> Cobrar
            </button>
          )}
        </div>
      )},
    ]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><DollarSign size={24} /> Finanzas</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-sm text-center">
          <div className="text-xl font-bold text-green-700">{MXN(cxcPendiente)}</div>
          <div className="text-xs text-gray-500 mt-1">CxC Pendiente</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-xl font-bold text-red-600">{MXN(cxcVencida)}</div>
          <div className="text-xs text-gray-500 mt-1">CxC Vencida</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-xl font-bold text-orange-600">{MXN(cxpPendiente)}</div>
          <div className="text-xs text-gray-500 mt-1">CxP Pendiente</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-xl font-bold text-blue-700">{MXN(saldoTotal)}</div>
          <div className="text-xs text-gray-500 mt-1">Saldo Bancario MXN</div>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2">
        <button className={`btn ${tab === 'cxc' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('cxc')}>
          <CreditCard size={15} /> CxC
          <span className="ml-1 text-xs opacity-75">({porCobrar.length} pendientes)</span>
        </button>
        <button className={`btn ${tab === 'cxp' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('cxp')}>
          <CreditCard size={15} /> CxP
          <span className="ml-1 text-xs opacity-75">({facturasProveedor.filter(f => f.saldoPendiente > 0).length} pendientes)</span>
        </button>
        <button className={`btn ${tab === 'bancos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('bancos')}>
          <Building size={15} /> Bancos
        </button>
      </div>

      {/* ── CXC ─────────────────────────────────────────────────────────────── */}
      {tab === 'cxc' && (
        <div className="space-y-4">
          {/* CxC sub-tabs */}
          <div className="flex gap-2 border-b border-gray-200 pb-0">
            <button
              onClick={() => setCxcTab('cobrar')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                cxcTab === 'cobrar'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock size={15} />
              Por Cobrar
              {porCobrar.length > 0 && (
                <span className="ml-1 bg-red-100 text-red-700 text-xs font-bold rounded-full px-1.5 py-0.5">
                  {porCobrar.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setCxcTab('pagadas')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                cxcTab === 'pagadas'
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckCircle size={15} />
              Pagadas
              {pagadas.length > 0 && (
                <span className="ml-1 bg-green-100 text-green-700 text-xs font-bold rounded-full px-1.5 py-0.5">
                  {pagadas.length}
                </span>
              )}
            </button>
          </div>

          {/* Por Cobrar */}
          {cxcTab === 'cobrar' && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Facturas por Cobrar</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Generadas automáticamente al marcar un pedido como <strong>Facturado</strong>
                  </p>
                </div>
                {porCobrar.length > 0 && (
                  <button className="btn-primary" onClick={() => openCobro(porCobrar[0])}>
                    <CheckCircle size={15} /> Registrar Cobro
                  </button>
                )}
              </div>
              {porCobrar.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Clock size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No hay facturas pendientes de cobro.</p>
                  <p className="text-xs mt-1">Cuando un pedido se marque como <strong>Facturado</strong> aparecerá aquí.</p>
                </div>
              ) : (
                <DataTable data={porCobrar} rowKey={(f) => f.facturaId} columns={cxcColumns(true)} />
              )}
            </div>
          )}

          {/* Pagadas */}
          {cxcTab === 'pagadas' && (
            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-green-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Facturas Pagadas</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pagadas.length} factura(s) cobradas · {MXN(pagadas.reduce((a, f) => a + f.total, 0))} en total
                  </p>
                </div>
              </div>
              {pagadas.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CheckCircle size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Aún no hay facturas pagadas.</p>
                </div>
              ) : (
                <DataTable data={pagadas} rowKey={(f) => f.facturaId} columns={cxcColumns(false)} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CXP ─────────────────────────────────────────────────────────────── */}
      {tab === 'cxp' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Cuentas por Pagar</h3>
              <p className="text-xs text-gray-500 mt-0.5">Facturas de proveedores pendientes de pago</p>
            </div>
            <button className="btn-primary" onClick={() => { setFpForm({ ...BLANK_FP, supplierId: suppliers[0]?.supplierId ?? '' }); setModal('new_fp') }}>
              <Plus size={15} /> Registrar Factura Proveedor
            </button>
          </div>
          {facturasProveedor.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <FileText size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay facturas de proveedor registradas.</p>
              <p className="text-xs mt-1">Usa el botón <strong>"Registrar Factura Proveedor"</strong> para capturar una.</p>
            </div>
          ) : (
            <DataTable
              data={facturasProveedor}
              rowKey={(f) => f.facturaProvId}
              columns={[
                { key: 'folio', header: 'Folio', render: (f) => <span className="font-mono font-semibold text-blue-700">{f.folio}</span> },
                { key: 'proveedor', header: 'Proveedor', render: (f) => suppliers.find(s => s.supplierId === f.supplierId)?.razonSocial ?? '-' },
                { key: 'fecha', header: 'Fecha' },
                { key: 'fechaVenc', header: 'Vencimiento', render: (f) => f.fechaVencimiento },
                { key: 'total', header: 'Total', render: (f) => <Currency value={f.total} /> },
                { key: 'saldo', header: 'Saldo', render: (f) => (
                  <span className={f.saldoPendiente > 0 ? 'font-bold text-orange-600' : 'text-green-600'}>
                    <Currency value={f.saldoPendiente} />
                  </span>
                )},
                { key: 'estatus', header: 'Estatus', render: (f) => <StatusBadge status={f.estatus} /> },
                { key: 'acc', header: '', render: (f) => f.saldoPendiente > 0 ? (
                  <button className="btn btn-success btn-sm" onClick={() => {
                    setSelFp(f.facturaProvId)
                    setPagoForm({ monto: f.saldoPendiente, formaPago: 'Transferencia', referencia: '' })
                    setModal('pago_prov')
                  }}>
                    Pagar
                  </button>
                ) : <span className="text-xs text-green-600 font-semibold">Pagado</span> },
              ]}
            />
          )}
        </div>
      )}

      {/* ── BANCOS ──────────────────────────────────────────────────────────── */}
      {tab === 'bancos' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Cuentas Bancarias</h3>
            {canManageBancos && (
              <button className="btn-primary" onClick={openNewBanco}>
                <Plus size={15} /> Nueva Cuenta
              </button>
            )}
          </div>
          {bancos.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Building size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay cuentas bancarias registradas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bancos.map((b) => (
                <div key={b.bancoId} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div>
                    <div className="font-semibold text-gray-900">{b.banco}</div>
                    <div className="text-sm text-gray-500">Cuenta: {b.cuenta} &bull; {b.moneda}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        {b.saldo.toLocaleString('es-MX', { style: 'currency', currency: b.moneda })}
                      </div>
                      <StatusBadge status={b.activo ? 'activo' : 'inactivo'} />
                    </div>
                    {canManageBancos && (
                      <div className="flex gap-1 ml-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditBanco(b)} title="Editar">
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => openDelBanco(b)} title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Saldo total */}
          {bancos.length > 0 && (
            <div className="flex justify-end pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Saldo total MXN: <span className="font-bold text-gray-900 text-base">{MXN(saldoTotal)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MODALES ══════════════════════════════════════════════════════════ */}

      {/* ── Registrar Cobro ──────────────────────────────────────────────── */}
      {modal === 'pago_cli' && (
        <Modal title="Registrar Cobro" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handlePagoCliente}><CheckCircle size={14} /> Registrar Cobro</button></>}
        >
          <div className="space-y-4">
            {(() => {
              const fv = facturasVenta.find(f => f.facturaId === selFv)
              const o = getOrder(fv?.pedidoId)
              const cli = clients.find(c => c.clientId === fv?.clienteId)
              return fv ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1">
                  <div className="font-semibold text-blue-800">{fv.folio} {o ? `— Pedido ${o.folio}` : ''}</div>
                  <div className="text-blue-700">{cli?.razonSocial}</div>
                  <div className="text-blue-600">Total: {MXN(fv.total)} · Saldo: <strong>{MXN(fv.saldoPendiente)}</strong></div>
                </div>
              ) : null
            })()}
            <div className="form-group">
              <label className="label">Factura</label>
              <select className="select" value={selFv} onChange={(e) => {
                setSelFv(e.target.value)
                const fv = facturasVenta.find(f => f.facturaId === e.target.value)
                if (fv) setPagoForm(p => ({ ...p, monto: fv.saldoPendiente }))
              }}>
                {porCobrar.map((f) => (
                  <option key={f.facturaId} value={f.facturaId}>
                    {f.folio} — {clients.find(c => c.clientId === f.clienteId)?.razonSocial} ({MXN(f.saldoPendiente)})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Monto a cobrar</label>
              <input type="number" className="input" value={pagoForm.monto} min={0} step="0.01"
                onChange={(e) => setPagoForm(f => ({ ...f, monto: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="label">Forma de Pago</label>
              <select className="select" value={pagoForm.formaPago} onChange={(e) => setPagoForm(f => ({ ...f, formaPago: e.target.value }))}>
                {FORMAS_PAGO.map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Referencia / Número de transacción</label>
              <input className="input" value={pagoForm.referencia} placeholder="TRF-20240101-001"
                onChange={(e) => setPagoForm(f => ({ ...f, referencia: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Registrar Pago Proveedor ─────────────────────────────────────── */}
      {modal === 'pago_prov' && (
        <Modal title="Registrar Pago a Proveedor" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handlePagoProveedor}>Registrar Pago</button></>}
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Factura Proveedor</label>
              <select className="select" value={selFp} onChange={(e) => {
                setSelFp(e.target.value)
                const fp = facturasProveedor.find(f => f.facturaProvId === e.target.value)
                if (fp) setPagoForm(p => ({ ...p, monto: fp.saldoPendiente }))
              }}>
                {facturasProveedor.filter(f => f.saldoPendiente > 0).map((f) => (
                  <option key={f.facturaProvId} value={f.facturaProvId}>
                    {f.folio} — {suppliers.find(s => s.supplierId === f.supplierId)?.razonSocial} ({MXN(f.saldoPendiente)})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Monto</label>
              <input type="number" className="input" value={pagoForm.monto} min={0} step="0.01"
                onChange={(e) => setPagoForm(f => ({ ...f, monto: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="label">Forma de Pago</label>
              <select className="select" value={pagoForm.formaPago} onChange={(e) => setPagoForm(f => ({ ...f, formaPago: e.target.value }))}>
                {FORMAS_PAGO.map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Referencia</label>
              <input className="input" value={pagoForm.referencia} placeholder="TRF-20240101-001"
                onChange={(e) => setPagoForm(f => ({ ...f, referencia: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Nueva Factura Proveedor ──────────────────────────────────────── */}
      {modal === 'new_fp' && (
        <Modal title="Registrar Factura de Proveedor" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveFP}><Plus size={14} /> Registrar</button></>}
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Proveedor *</label>
              <select className="select" value={fpForm.supplierId} onChange={(e) => setFpForm(f => ({ ...f, supplierId: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {suppliers.filter(s => s.activo).map(s => (
                  <option key={s.supplierId} value={s.supplierId}>{s.razonSocial}</option>
                ))}
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Fecha de Factura *</label>
                <input type="date" className="input" value={fpForm.fecha} onChange={(e) => setFpForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Fecha de Vencimiento *</label>
                <input type="date" className="input" value={fpForm.fechaVencimiento} onChange={(e) => setFpForm(f => ({ ...f, fechaVencimiento: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Monto Total (con IVA) *</label>
              <input type="number" className="input" value={fpForm.monto} min={0} step="0.01"
                onChange={(e) => setFpForm(f => ({ ...f, monto: Number(e.target.value) }))} />
              {fpForm.monto > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Subtotal: {MXN(fpForm.monto / 1.16)} · IVA 16%: {MXN(fpForm.monto - fpForm.monto / 1.16)}
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Banco: Nueva / Editar ────────────────────────────────────────── */}
      {(modal === 'new_banco' || modal === 'edit_banco') && (
        <Modal
          title={modal === 'new_banco' ? 'Nueva Cuenta Bancaria' : `Editar — ${selBanco?.banco}`}
          onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveBanco}>Guardar</button></>}
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Banco / Institución *</label>
              <input className="input" value={bancoForm.banco} onChange={(e) => setBancoForm(f => ({ ...f, banco: e.target.value }))} placeholder="BBVA, Santander, Banorte..." />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Número de Cuenta *</label>
                <input className="input" value={bancoForm.cuenta} onChange={(e) => setBancoForm(f => ({ ...f, cuenta: e.target.value }))} placeholder="0123456789" />
              </div>
              <div className="form-group">
                <label className="label">Moneda</label>
                <select className="select" value={bancoForm.moneda} onChange={(e) => setBancoForm(f => ({ ...f, moneda: e.target.value }))}>
                  <option>MXN</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Saldo Inicial</label>
              <input type="number" className="input" min={0} step="0.01" value={bancoForm.saldo} onChange={(e) => setBancoForm(f => ({ ...f, saldo: Number(e.target.value) }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Banco: Confirmar Eliminar ────────────────────────────────────── */}
      {modal === 'del_banco' && selBanco && (
        <Modal title="Eliminar cuenta bancaria" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-danger" onClick={handleDeleteBanco}><Trash2 size={14} /> Eliminar</button></>}
        >
          <p className="text-sm text-gray-700">
            ¿Eliminar la cuenta <strong>{selBanco.banco}</strong> — {selBanco.cuenta}? Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}

      {/* ── Ver Recibo / Factura ─────────────────────────────────────────── */}
      {modal === 'recibo' && selRecibo && (() => {
        const order = getOrder(selRecibo.pedidoId)
        const client = clients.find(c => c.clientId === selRecibo.clienteId)
        const pagos = pagosClientes.filter(p => p.facturaId === selRecibo.facturaId)
        return (
          <Modal title={`Recibo — ${selRecibo.folio}`} onClose={() => setModal(null)} size="lg"
            footer={
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setModal(null)}>Cerrar</button>
                {selRecibo.saldoPendiente > 0 && (
                  <button className="btn-primary" onClick={() => { setModal(null); openCobro(selRecibo) }}>
                    <CheckCircle size={14} /> Cobrar
                  </button>
                )}
              </div>
            }
          >
            <div className="space-y-5">
              {/* Header recibo */}
              <div className="flex justify-between items-start p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">InsumosFa ERP</div>
                  <div className="text-xl font-bold text-blue-700 font-mono">{selRecibo.folio}</div>
                  <div className="text-sm text-gray-500 mt-1">Fecha: {selRecibo.fecha}</div>
                  <div className="text-sm text-gray-500">Vence: {selRecibo.fechaVencimiento}</div>
                </div>
                <div className="text-right">
                  <StatusBadge status={selRecibo.estatus} />
                  {order && (
                    <div className="text-xs text-gray-500 mt-2">
                      Pedido: <span className="font-mono font-semibold">{order.folio}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cliente */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm">
                <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Cliente</div>
                <div className="font-semibold text-gray-900">{client?.razonSocial ?? '—'}</div>
                {client?.rfc && <div className="text-gray-500">RFC: {client.rfc}</div>}
                {client?.correo && <div className="text-gray-500">{client.correo}</div>}
              </div>

              {/* Partidas del pedido */}
              {order && order.items.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <FileText size={12} /> Partidas del Pedido {order.folio}
                  </div>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr><th>SKU</th><th>Descripción</th><th>Cant</th><th>Precio</th><th>Importe</th></tr>
                      </thead>
                      <tbody>
                        {order.items.map(it => {
                          const prod = products.find(p => p.productId === it.productId)
                          return (
                            <tr key={it.detalleId}>
                              <td className="font-mono text-xs text-blue-700">{prod?.sku ?? '—'}</td>
                              <td>{prod?.descripcion ?? '—'}</td>
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
              )}

              {/* Totales */}
              <div className="flex justify-end">
                <div className="min-w-[240px] space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span><span>{MXN(selRecibo.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA (16%)</span><span>{MXN(selRecibo.impuestos)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base text-gray-900 pt-1 border-t border-gray-200">
                    <span>Total</span><span>{MXN(selRecibo.total)}</span>
                  </div>
                  {selRecibo.saldoPendiente > 0 && (
                    <div className="flex justify-between font-bold text-red-600">
                      <span>Saldo Pendiente</span><span>{MXN(selRecibo.saldoPendiente)}</span>
                    </div>
                  )}
                  {selRecibo.saldoPendiente === 0 && (
                    <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-semibold">
                      <CheckCircle size={15} /> PAGADO COMPLETAMENTE
                    </div>
                  )}
                </div>
              </div>

              {/* Historial de pagos */}
              {pagos.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Pagos Registrados</div>
                  <div className="space-y-2">
                    {pagos.map(p => (
                      <div key={p.pagoId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                        <div>
                          <span className="font-semibold text-green-800">{MXN(p.monto)}</span>
                          <span className="text-green-600 ml-2">· {p.formaPago}</span>
                          {p.referencia && <span className="text-green-600 ml-2">· Ref: {p.referencia}</span>}
                        </div>
                        <div className="text-green-600 text-xs">{p.fecha}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
