import { useState } from 'react'
import { useFinanceStore } from '../../store/financeStore'
import { useClientsStore } from '../../store/clientsStore'
import { useSuppliersStore } from '../../store/suppliersStore'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import type { FacturaVenta } from '../../types'
import { DollarSign, CreditCard, Building } from 'lucide-react'

export function FinancePage() {
  const { facturasVenta, pagosClientes, facturasProveedor, pagosProveedores, bancos, addPagoCliente, addPagoProveedor } = useFinanceStore()
  const { clients } = useClientsStore()
  const { suppliers } = useSuppliersStore()
  const [tab, setTab] = useState<'cxc' | 'cxp' | 'bancos'>('cxc')
  const [modal, setModal] = useState<'pago_cli' | 'pago_prov' | null>(null)
  const [selFv, setSelFv] = useState<string>('')
  const [selFp, setSelFp] = useState<string>('')
  const [pagoForm, setPagoForm] = useState({ monto: 0, formaPago: 'Transferencia', referencia: '' })

  const cxcPendiente = facturasVenta.filter(f => f.saldoPendiente > 0).reduce((a, f) => a + f.saldoPendiente, 0)
  const cxcVencida = facturasVenta.filter(f => f.estatus === 'vencida').reduce((a, f) => a + f.saldoPendiente, 0)
  const cxpPendiente = facturasProveedor.filter(f => f.saldoPendiente > 0).reduce((a, f) => a + f.saldoPendiente, 0)
  const saldoTotal = bancos.filter(b => b.moneda === 'MXN').reduce((a, b) => a + b.saldo, 0)

  function handlePagoCliente() {
    const fv = facturasVenta.find(f => f.facturaId === selFv)
    if (!fv) return
    addPagoCliente({ facturaId: selFv, clienteId: fv.clienteId, fecha: new Date().toISOString().split('T')[0], ...pagoForm })
    setModal(null)
    setPagoForm({ monto: 0, formaPago: 'Transferencia', referencia: '' })
  }

  function handlePagoProveedor() {
    const fp = facturasProveedor.find(f => f.facturaProvId === selFp)
    if (!fp) return
    addPagoProveedor({ facturaProvId: selFp, supplierId: fp.supplierId, fecha: new Date().toISOString().split('T')[0], ...pagoForm })
    setModal(null)
    setPagoForm({ monto: 0, formaPago: 'Transferencia', referencia: '' })
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><DollarSign size={24} /> Finanzas</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-sm text-center">
          <div className="text-xl font-bold text-green-700">{cxcPendiente.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</div>
          <div className="text-xs text-gray-500 mt-1">CxC Pendiente</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-xl font-bold text-red-600">{cxcVencida.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</div>
          <div className="text-xs text-gray-500 mt-1">CxC Vencida</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-xl font-bold text-orange-600">{cxpPendiente.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</div>
          <div className="text-xs text-gray-500 mt-1">CxP Pendiente</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-xl font-bold text-blue-700">{saldoTotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</div>
          <div className="text-xs text-gray-500 mt-1">Saldo Bancario MXN</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={`btn ${tab === 'cxc' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('cxc')}>
          <CreditCard size={15} /> CxC
        </button>
        <button className={`btn ${tab === 'cxp' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('cxp')}>
          <CreditCard size={15} /> CxP
        </button>
        <button className={`btn ${tab === 'bancos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('bancos')}>
          <Building size={15} /> Bancos
        </button>
      </div>

      {tab === 'cxc' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Cuentas por Cobrar</h3>
            <button className="btn-primary" onClick={() => { setSelFv(facturasVenta[0]?.facturaId ?? ''); setModal('pago_cli') }}>
              Registrar Cobro
            </button>
          </div>
          <DataTable
            data={facturasVenta}
            rowKey={(f) => f.facturaId}
            columns={[
              { key: 'folio', header: 'Folio', render: (f) => <span className="font-mono font-semibold text-blue-700">{f.folio}</span> },
              { key: 'cliente', header: 'Cliente', render: (f) => clients.find(c => c.clientId === f.clienteId)?.razonSocial ?? '-' },
              { key: 'fecha', header: 'Fecha' },
              { key: 'fechaVenc', header: 'Vencimiento', render: (f) => f.fechaVencimiento },
              { key: 'total', header: 'Total', render: (f) => <Currency value={f.total} /> },
              { key: 'saldo', header: 'Saldo Pendiente', render: (f) => (
                <span className={f.saldoPendiente > 0 ? 'font-bold text-red-600' : 'text-green-600'}>
                  <Currency value={f.saldoPendiente} />
                </span>
              )},
              { key: 'estatus', header: 'Estatus', render: (f) => <StatusBadge status={f.estatus} /> },
              {
                key: 'acc', header: '', render: (f) => f.saldoPendiente > 0 ? (
                  <button className="btn btn-success btn-sm" onClick={() => { setSelFv(f.facturaId); setPagoForm({ monto: f.saldoPendiente, formaPago: 'Transferencia', referencia: '' }); setModal('pago_cli') }}>
                    Cobrar
                  </button>
                ) : null
              },
            ]}
          />
        </div>
      )}

      {tab === 'cxp' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Cuentas por Pagar</h3>
            <button className="btn-primary" onClick={() => { setSelFp(facturasProveedor[0]?.facturaProvId ?? ''); setModal('pago_prov') }}>
              Registrar Pago
            </button>
          </div>
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
              {
                key: 'acc', header: '', render: (f) => f.saldoPendiente > 0 ? (
                  <button className="btn btn-success btn-sm" onClick={() => { setSelFp(f.facturaProvId); setPagoForm({ monto: f.saldoPendiente, formaPago: 'Transferencia', referencia: '' }); setModal('pago_prov') }}>
                    Pagar
                  </button>
                ) : null
              },
            ]}
          />
        </div>
      )}

      {tab === 'bancos' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Cuentas Bancarias</h3>
          <div className="space-y-3">
            {bancos.map((b) => (
              <div key={b.bancoId} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div>
                  <div className="font-semibold text-gray-900">{b.banco}</div>
                  <div className="text-sm text-gray-500">Cuenta: {b.cuenta} &bull; {b.moneda}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {b.saldo.toLocaleString('es-MX', { style: 'currency', currency: b.moneda })}
                  </div>
                  <StatusBadge status={b.activo ? 'activo' : 'inactivo'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pago Cliente Modal */}
      {modal === 'pago_cli' && (
        <Modal title="Registrar Cobro" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handlePagoCliente}>Registrar</button></>}
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Factura</label>
              <select className="select" value={selFv} onChange={(e) => setSelFv(e.target.value)}>
                {facturasVenta.filter(f => f.saldoPendiente > 0).map((f) => (
                  <option key={f.facturaId} value={f.facturaId}>{f.folio} — {clients.find(c => c.clientId === f.clienteId)?.razonSocial}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Monto</label>
              <input type="number" className="input" value={pagoForm.monto} min={0} step="0.01" onChange={(e) => setPagoForm(f => ({ ...f, monto: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="label">Forma de Pago</label>
              <select className="select" value={pagoForm.formaPago} onChange={(e) => setPagoForm(f => ({ ...f, formaPago: e.target.value }))}>
                {['Transferencia', 'Cheque', 'Efectivo', 'Tarjeta'].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Referencia</label>
              <input className="input" value={pagoForm.referencia} onChange={(e) => setPagoForm(f => ({ ...f, referencia: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Pago Proveedor Modal */}
      {modal === 'pago_prov' && (
        <Modal title="Registrar Pago a Proveedor" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handlePagoProveedor}>Registrar</button></>}
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Factura Proveedor</label>
              <select className="select" value={selFp} onChange={(e) => setSelFp(e.target.value)}>
                {facturasProveedor.filter(f => f.saldoPendiente > 0).map((f) => (
                  <option key={f.facturaProvId} value={f.facturaProvId}>{f.folio} — {suppliers.find(s => s.supplierId === f.supplierId)?.razonSocial}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Monto</label>
              <input type="number" className="input" value={pagoForm.monto} min={0} step="0.01" onChange={(e) => setPagoForm(f => ({ ...f, monto: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="label">Forma de Pago</label>
              <select className="select" value={pagoForm.formaPago} onChange={(e) => setPagoForm(f => ({ ...f, formaPago: e.target.value }))}>
                {['Transferencia', 'Cheque', 'Efectivo'].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Referencia</label>
              <input className="input" value={pagoForm.referencia} onChange={(e) => setPagoForm(f => ({ ...f, referencia: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
