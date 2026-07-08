import { useState, useEffect } from 'react'
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
import { DollarSign, CreditCard, Building, Eye, CircleCheck as CheckCircle, Clock, FileText, Plus, CreditCard as Edit2, Trash2, History, CirclePlus as PlusCircle } from 'lucide-react'

const MXN = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
const FORMAS_PAGO = ['Transferencia', 'Cheque', 'Efectivo', 'Tarjeta']

export function FinancePage() {
  const {
    facturasVenta, pagosClientes,
    facturasProveedor, bancos, loadFinance, subscribeRealtime: subFinance,
    addPagoCliente, addPagoProveedor,
    addFacturaProveedor,
    addBanco, updateBanco, deleteBanco,
  } = useFinanceStore()
  const { clients, loadClients, subscribeRealtime: subClients } = useClientsStore()
  const { suppliers, loadSuppliers, subscribeRealtime: subSuppliers } = useSuppliersStore()
  const { orders } = useSalesOrdersStore()
  const { products } = useProductsStore()
  const { user: me } = useAuthStore()

  useEffect(() => {
    void loadFinance()
    void loadClients()
    void loadSuppliers()
    const u1 = subFinance()
    const u2 = subClients()
    const u3 = subSuppliers()
    return () => { u1(); u2(); u3() }
  }, [])

  const canManageBancos = me ? hasRole(me, 'director', 'administracion') : false

  const [tab, setTab] = useState<'cxc' | 'cxp' | 'bancos'>('cxc')
  const [cxcTab, setCxcTab] = useState<'cobrar' | 'pagadas'>('cobrar')

  type ModalType =
    | 'pago_cli'
    | 'pago_prov'
    | 'recibo'
    | 'historial'
    | 'new_fp'
    | 'new_banco' | 'edit_banco' | 'del_banco'
    | null
  const [modal, setModal] = useState<ModalType>(null)

  const [selFv, setSelFv] = useState<string>('')
  const [selRecibo, setSelRecibo] = useState<FacturaVenta | null>(null)
  const [esAbono, setEsAbono] = useState(false)

  const [selFp, setSelFp] = useState<string>('')
  const [pagoForm, setPagoForm] = useState({ monto: 0, formaPago: 'Transferencia', referencia: '' })

  const BLANK_FP = { supplierId: '', fecha: new Date().toISOString().split('T')[0], fechaVencimiento: '', monto: 0, notas: '' }
  const [fpForm, setFpForm] = useState(BLANK_FP)

  const BLANK_BANCO: Omit<Banco, 'bancoId'> = { banco: '', cuenta: '', saldo: 0, moneda: 'MXN', activo: true }
  const [bancoForm, setBancoForm] = useState(BLANK_BANCO)
  const [selBanco, setSelBanco] = useState<Banco | null>(null)

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

  function getPagos(facturaId: string) {
    return pagosClientes.filter(p => p.facturaId === facturaId)
  }

  function openCobro(fv: FacturaVenta) {
    setSelFv(fv.facturaId)
    setEsAbono(false)
    setPagoForm({ monto: fv.saldoPendiente, formaPago: 'Transferencia', referencia: '' })
    setModal('pago_cli')
  }

  function openAbono(fv: FacturaVenta) {
    setSelFv(fv.facturaId)
    setEsAbono(true)
    setPagoForm({ monto: 0, formaPago: 'Transferencia', referencia: '' })
    setModal('pago_cli')
  }

  function handlePagoCliente() {
    const fv = facturasVenta.find(f => f.facturaId === selFv)
    if (!fv) return
    if (pagoForm.monto <= 0) { toast.error('El monto debe ser mayor a cero.'); return }
    if (pagoForm.monto > fv.saldoPendiente) { toast.error(`El monto no puede superar el saldo pendiente (${MXN(fv.saldoPendiente)}).`); return }
    addPagoCliente({ facturaId: selFv, clienteId: fv.clienteId, fecha: new Date().toISOString().split('T')[0], ...pagoForm })
    toast.success(`${esAbono ? 'Abono' : 'Cobro'} registrado: ${MXN(pagoForm.monto)}.`)
    setModal(null)
    setPagoForm({ monto: 0, formaPago: 'Transferencia', referencia: '' })
    if (fv.saldoPendiente - pagoForm.monto <= 0) setCxcTab('pagadas')
  }

  function handlePagoProveedor() {
    const fp = facturasProveedor.find(f => f.facturaProvId === selFp)
    if (!fp) return
    if (pagoForm.monto <= 0) { toast.error('El monto debe ser mayor a cero.'); return }
    addPagoProveedor({ facturaProvId: selFp, supplierId: fp.supplierId, fecha: new Date().toISOString().split('T')[0], ...pagoForm })
    toast.success(`Pago a proveedor registrado: ${MXN(pagoForm.monto)}.`)
    setModal(null)
    setPagoForm({ monto: 0, formaPago: 'Transferencia', referencia: '' })
  }

  async function handleSaveFP() {
    if (!fpForm.supplierId) { toast.error('Selecciona un proveedor.'); return }
    if (fpForm.monto <= 0) { toast.error('El monto debe ser mayor a cero.'); return }
    if (!fpForm.fechaVencimiento) { toast.error('Ingresa la fecha de vencimiento.'); return }
    const subtotal = fpForm.monto / 1.16
    const impuestos = fpForm.monto - subtotal
    const fp = await addFacturaProveedor({
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

  function openRecibo(fv: FacturaVenta) { setSelRecibo(fv); setModal('recibo') }
  function openHistorial(fv: FacturaVenta) { setSelRecibo(fv); setModal('historial') }

  function openNewBanco() { setBancoForm(BLANK_BANCO); setSelBanco(null); setModal('new_banco') }
  function openEditBanco(b: Banco) { const { bancoId, ...rest } = b; void bancoId; setBancoForm(rest); setSelBanco(b); setModal('edit_banco') }
  function openDelBanco(b: Banco) { setSelBanco(b); setModal('del_banco') }

  function handleSaveBanco() {
    if (!bancoForm.banco.trim()) { toast.error('Nombre del banco requerido.'); return }
    if (!bancoForm.cuenta.trim()) { toast.error('Numero de cuenta requerido.'); return }
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

  function cxcColumns(showCobrar: boolean) {
    return [
      { key: 'folio', header: 'Factura', render: (f: FacturaVenta) => <span className="font-mono font-semibold text-blue-700">{f.folio}</span> },
      { key: 'pedido', header: 'Pedido', render: (f: FacturaVenta) => {
        const o = getOrder(f.pedidoId)
        return o ? <span className="font-mono text-xs text-gray-600">{o.folio}</span> : <span className="text-gray-400">-</span>
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
      { key: 'acc', header: '', render: (f: FacturaVenta) => {
        const pagos = getPagos(f.facturaId)
        return (
          <div className="flex gap-1 flex-wrap justify-end">
            <button className="btn btn-secondary btn-sm" onClick={() => openRecibo(f)} title="Ver recibo">
              <Eye size={13} /> Recibo
            </button>
            {pagos.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => openHistorial(f)} title="Ver historial de abonos">
                <History size={13} />
                <span className="ml-1 text-xs font-bold text-indigo-600">{pagos.length}</span>
              </button>
            )}
            {showCobrar && f.saldoPendiente > 0 && (
              <button className="btn btn-warning btn-sm" onClick={() => openAbono(f)} title="Registrar abono parcial">
                <PlusCircle size={13} /> Abonar
              </button>
            )}
            {showCobrar && f.saldoPendiente > 0 && (
              <button className="btn btn-success btn-sm" onClick={() => openCobro(f)} title="Cobrar saldo completo">
                <CheckCircle size={13} /> Cobrar
              </button>
            )}
          </div>
        )
      }},
    ]
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><DollarSign size={24} /> Finanzas</h1>
      </div>

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

      {tab === 'cxc' && (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-gray-200 pb-0">
            <button
              onClick={() => setCxcTab('cobrar')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                cxcTab === 'cobrar' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
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
                cxcTab === 'pagadas' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
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

          {cxcTab === 'cobrar' && (
            <div className="card space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Facturas por Cobrar</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Usa <strong>Abonar</strong> para pagos parciales o <strong>Cobrar</strong> para liquidar el saldo completo.
                  El icono <History size={11} className="inline" /> muestra el historial de abonos.
                </p>
              </div>
              {porCobrar.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Clock size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No hay facturas pendientes de cobro.</p>
                </div>
              ) : (
                <DataTable data={porCobrar} rowKey={(f) => f.facturaId} columns={cxcColumns(true)} />
              )}
            </div>
          )}

          {cxcTab === 'pagadas' && (
            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-green-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Facturas Pagadas</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pagadas.length} factura(s) cobradas &middot; {MXN(pagadas.reduce((a, f) => a + f.total, 0))} en total
                  </p>
                </div>
              </div>
              {pagadas.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CheckCircle size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Aun no hay facturas pagadas.</p>
                </div>
              ) : (
                <DataTable data={pagadas} rowKey={(f) => f.facturaId} columns={cxcColumns(false)} />
              )}
            </div>
          )}
        </div>
      )}

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
                  }}>Pagar</button>
                ) : <span className="text-xs text-green-600 font-semibold">Pagado</span> },
              ]}
            />
          )}
        </div>
      )}

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
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditBanco(b)}><Edit2 size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => openDelBanco(b)}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {bancos.length > 0 && (
            <div className="flex justify-end pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Saldo total MXN: <span className="font-bold text-gray-900 text-base">{MXN(saldoTotal)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Cobro / Abono */}
      {modal === 'pago_cli' && (
        <Modal
          title={esAbono ? 'Registrar Abono' : 'Registrar Cobro'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handlePagoCliente}>
                {esAbono ? <><PlusCircle size={14} /> Registrar Abono</> : <><CheckCircle size={14} /> Registrar Cobro</>}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {(() => {
              const fv = facturasVenta.find(f => f.facturaId === selFv)
              const o = getOrder(fv?.pedidoId)
              const cli = clients.find(c => c.clientId === fv?.clienteId)
              const totalAbonado = fv ? getPagos(fv.facturaId).reduce((a, p) => a + p.monto, 0) : 0
              return fv ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1">
                  <div className="font-semibold text-blue-800">{fv.folio}{o ? ` - Pedido ${o.folio}` : ''}</div>
                  <div className="text-blue-700">{cli?.razonSocial}</div>
                  <div className="text-blue-600 flex gap-4 flex-wrap">
                    <span>Total: {MXN(fv.total)}</span>
                    {totalAbonado > 0 && <span>Abonado: <strong className="text-green-700">{MXN(totalAbonado)}</strong></span>}
                    <span>Saldo: <strong>{MXN(fv.saldoPendiente)}</strong></span>
                  </div>
                  {esAbono && (
                    <div className="text-xs text-indigo-600 font-medium pt-1">
                      Ingresa el monto del abono parcial (maximo {MXN(fv.saldoPendiente)})
                    </div>
                  )}
                </div>
              ) : null
            })()}
            <div className="form-group">
              <label className="label">Factura</label>
              <select className="select" value={selFv} onChange={(e) => {
                setSelFv(e.target.value)
                const fv = facturasVenta.find(f => f.facturaId === e.target.value)
                if (fv) setPagoForm(p => ({ ...p, monto: esAbono ? 0 : fv.saldoPendiente }))
              }}>
                {porCobrar.map((f) => (
                  <option key={f.facturaId} value={f.facturaId}>
                    {f.folio} - {clients.find(c => c.clientId === f.clienteId)?.razonSocial} ({MXN(f.saldoPendiente)})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">{esAbono ? 'Monto del abono' : 'Monto a cobrar'}</label>
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
              <label className="label">Referencia / Numero de transaccion</label>
              <input className="input" value={pagoForm.referencia} placeholder="TRF-20240101-001"
                onChange={(e) => setPagoForm(f => ({ ...f, referencia: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Historial de Abonos */}
      {modal === 'historial' && selRecibo && (() => {
        const fv = selRecibo
        const cli = clients.find(c => c.clientId === fv.clienteId)
        const pagos = getPagos(fv.facturaId)
        const totalAbonado = pagos.reduce((a, p) => a + p.monto, 0)
        return (
          <Modal
            title={`Historial de Abonos \u2014 ${fv.folio}`}
            onClose={() => setModal(null)}
            size="lg"
            footer={
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setModal(null)}>Cerrar</button>
                {fv.saldoPendiente > 0 && (
                  <button className="btn btn-warning" onClick={() => { setModal(null); openAbono(fv) }}>
                    <PlusCircle size={14} /> Nuevo Abono
                  </button>
                )}
                {fv.saldoPendiente > 0 && (
                  <button className="btn-primary" onClick={() => { setModal(null); openCobro(fv) }}>
                    <CheckCircle size={14} /> Cobrar Saldo
                  </button>
                )}
              </div>
            }
          >
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                <div>
                  <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Factura</div>
                  <div className="font-mono font-bold text-blue-700 text-base">{fv.folio}</div>
                  <div className="text-gray-600 mt-1">{cli?.razonSocial ?? '-'}</div>
                  {cli?.rfc && <div className="text-gray-400 text-xs">RFC: {cli.rfc}</div>}
                </div>
                <div className="text-right space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Fecha:</span><span className="font-medium">{fv.fecha}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Vencimiento:</span><span className="font-medium">{fv.fechaVencimiento}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total factura:</span><span className="font-semibold">{MXN(fv.total)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total abonado:</span><span className="font-semibold text-green-700">{MXN(totalAbonado)}</span></div>
                  <div className="flex justify-between border-t border-gray-200 pt-1">
                    <span className="text-gray-700 font-semibold">Saldo pendiente:</span>
                    <span className={`font-bold text-base ${fv.saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>{MXN(fv.saldoPendiente)}</span>
                  </div>
                </div>
              </div>

              {fv.total > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progreso de cobro</span>
                    <span>{Math.round((totalAbonado / fv.total) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (totalAbonado / fv.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <History size={13} /> Detalle de Abonos ({pagos.length})
                </div>
                {pagos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No hay abonos registrados.</div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">#</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Forma de Pago</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Referencia</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Saldo tras abono</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagos.map((p, idx) => {
                          const saldoAcum = Math.max(0, fv.total - pagos.slice(0, idx + 1).reduce((a, x) => a + x.monto, 0))
                          return (
                            <tr key={p.pagoId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                              <td className="px-4 py-3 font-medium">{p.fecha}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                                  {p.formaPago}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                                {p.referencia || <span className="text-gray-300">&mdash;</span>}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-green-700">{MXN(p.monto)}</td>
                              <td className={`px-4 py-3 text-right font-medium ${saldoAcum > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {MXN(saldoAcum)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-gray-700">Total abonado</td>
                          <td className="px-4 py-2 text-right font-bold text-green-700">{MXN(totalAbonado)}</td>
                          <td className="px-4 py-2 text-right font-bold text-red-600">{MXN(fv.saldoPendiente)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {fv.saldoPendiente === 0 && (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-semibold">
                  <CheckCircle size={16} /> FACTURA LIQUIDADA COMPLETAMENTE
                </div>
              )}
            </div>
          </Modal>
        )
      })()}

      {/* MODAL: Pago Proveedor */}
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
                    {f.folio} - {suppliers.find(s => s.supplierId === f.supplierId)?.razonSocial} ({MXN(f.saldoPendiente)})
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

      {/* MODAL: Nueva Factura Proveedor */}
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
                  Subtotal: {MXN(fpForm.monto / 1.16)} &middot; IVA 16%: {MXN(fpForm.monto - fpForm.monto / 1.16)}
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Banco Nueva / Editar */}
      {(modal === 'new_banco' || modal === 'edit_banco') && (
        <Modal
          title={modal === 'new_banco' ? 'Nueva Cuenta Bancaria' : `Editar - ${selBanco?.banco}`}
          onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveBanco}>Guardar</button></>}
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Banco / Institucion *</label>
              <input className="input" value={bancoForm.banco} onChange={(e) => setBancoForm(f => ({ ...f, banco: e.target.value }))} placeholder="BBVA, Santander, Banorte..." />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Numero de Cuenta *</label>
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

      {/* MODAL: Banco Eliminar */}
      {modal === 'del_banco' && selBanco && (
        <Modal title="Eliminar cuenta bancaria" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-danger" onClick={handleDeleteBanco}><Trash2 size={14} /> Eliminar</button></>}
        >
          <p className="text-sm text-gray-700">
            Eliminar la cuenta <strong>{selBanco.banco}</strong> - {selBanco.cuenta}? Esta accion no se puede deshacer.
          </p>
        </Modal>
      )}

      {/* MODAL: Ver Recibo */}
      {modal === 'recibo' && selRecibo && (() => {
        const order = getOrder(selRecibo.pedidoId)
        const client = clients.find(c => c.clientId === selRecibo.clienteId)
        const pagos = getPagos(selRecibo.facturaId)
        return (
          <Modal title={`Recibo - ${selRecibo.folio}`} onClose={() => setModal(null)} size="lg"
            footer={
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setModal(null)}>Cerrar</button>
                {pagos.length > 0 && (
                  <button className="btn-secondary" onClick={() => openHistorial(selRecibo)}>
                    <History size={14} /> Ver Historial
                  </button>
                )}
                {selRecibo.saldoPendiente > 0 && (
                  <button className="btn btn-warning" onClick={() => { setModal(null); openAbono(selRecibo) }}>
                    <PlusCircle size={14} /> Abonar
                  </button>
                )}
                {selRecibo.saldoPendiente > 0 && (
                  <button className="btn-primary" onClick={() => { setModal(null); openCobro(selRecibo) }}>
                    <CheckCircle size={14} /> Cobrar
                  </button>
                )}
              </div>
            }
          >
            <div className="space-y-5">
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

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm">
                <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Cliente</div>
                <div className="font-semibold text-gray-900">{client?.razonSocial ?? '-'}</div>
                {client?.rfc && <div className="text-gray-500">RFC: {client.rfc}</div>}
                {client?.correo && <div className="text-gray-500">{client.correo}</div>}
              </div>

              {order && order.items.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <FileText size={12} /> Partidas del Pedido {order.folio}
                  </div>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr><th>SKU</th><th>Descripcion</th><th>Cant</th><th>Precio</th><th>Importe</th></tr>
                      </thead>
                      <tbody>
                        {order.items.map(it => {
                          const prod = products.find(p => p.productId === it.productId)
                          return (
                            <tr key={it.detalleId}>
                              <td className="font-mono text-xs text-blue-700">{prod?.sku ?? '-'}</td>
                              <td>{prod?.descripcion ?? '-'}</td>
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

              <div className="flex justify-end">
                <div className="min-w-[240px] space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{MXN(selRecibo.subtotal)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>IVA (16%)</span><span>{MXN(selRecibo.impuestos)}</span></div>
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

              {pagos.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                    <History size={12} /> Abonos Registrados ({pagos.length})
                  </div>
                  <div className="space-y-2">
                    {pagos.map((p, idx) => (
                      <div key={p.pagoId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 font-medium">{idx + 1}</span>
                          <div>
                            <span className="font-semibold text-green-800">{MXN(p.monto)}</span>
                            <span className="text-green-600 ml-2 text-xs">&middot; {p.formaPago}</span>
                            {p.referencia && <span className="text-green-600 ml-2 text-xs font-mono">&middot; {p.referencia}</span>}
                          </div>
                        </div>
                        <div className="text-green-600 text-xs font-medium">{p.fecha}</div>
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
