import { useState } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import type { Embarque, EmbarqueEstatus } from '../../types'
import { Truck, Plus } from 'lucide-react'

const ESTADOS: EmbarqueEstatus[] = ['solicitado', 'programado', 'recolectado', 'enTransito', 'entregado', 'cerrado']

const BLANK = {
  pedidoId: '' as string | undefined,
  origen: 'Almacén Central, MTY',
  destino: '',
  transportistaId: '',
  fechaProgramada: '',
  costoFlete: 0,
  notas: '',
}

export function LogisticsPage() {
  const { embarques, transportistas, addEmbarque, updateEmbarque } = useLogisticsStore()
  const { orders } = useSalesOrdersStore()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<'new' | 'view' | null>(null)
  const [sel, setSel] = useState<Embarque | null>(null)
  const [form, setForm] = useState(BLANK)

  const filteredEmb = embarques.filter((e) => {
    return [e.folio, e.destino].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  function handleSave() {
    if (!form.transportistaId) { alert('Selecciona un transportista.'); return }
    if (!form.destino.trim())  { alert('El destino es obligatorio.'); return }
    addEmbarque({ ...form, estatus: 'solicitado' })
    setModal(null)
    setForm(BLANK)
  }

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: k === 'costoFlete' ? Number(e.target.value) : e.target.value }))

  const onTime = embarques.filter(e => e.estatus === 'entregado').length
  const totalEmb = embarques.filter(e => ['entregado', 'cerrado'].includes(e.estatus)).length
  const pct = totalEmb > 0 ? Math.round(onTime / totalEmb * 100) : 100

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Truck size={24} /> Logística</h1>
          <p className="page-subtitle">Gestión de embarques y transportistas</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(BLANK); setModal('new') }}>
          <Plus size={16} /> Nuevo Embarque
        </button>
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
          <div className="text-2xl font-bold text-gray-900">{transportistas.length}</div>
          <div className="text-xs text-gray-500 mt-1">Transportistas</div>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between mb-4">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar folio o destino..." />
        </div>
        <DataTable
          data={filteredEmb}
          rowKey={(e) => e.embarqueId}
          columns={[
            { key: 'folio', header: 'Folio', render: (e) => <span className="font-mono font-semibold text-blue-700">{e.folio}</span> },
            { key: 'pedido', header: 'Pedido', render: (e) => e.pedidoId ? orders.find(o => o.pedidoId === e.pedidoId)?.folio ?? e.pedidoId : '-' },
            { key: 'origen', header: 'Origen' },
            { key: 'destino', header: 'Destino' },
            { key: 'trans', header: 'Transportista', render: (e) => transportistas.find(t => t.transportistaId === e.transportistaId)?.nombre ?? '-' },
            { key: 'fechaProg', header: 'F. Programada', render: (e) => e.fechaProgramada },
            { key: 'flete', header: 'Flete', render: (e) => <Currency value={e.costoFlete} /> },
            { key: 'estatus', header: 'Estatus', render: (e) => <StatusBadge status={e.estatus} /> },
            {
              key: 'acc', header: '', render: (e) => (
                <button className="btn btn-secondary btn-sm" onClick={() => { setSel(e); setModal('view') }}>Ver</button>
              )
            },
          ]}
        />
      </div>

      {modal === 'new' && (
        <Modal title="Nuevo Embarque" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSave}>Guardar</button></>}
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="label">Pedido (opcional)</label>
              <select className="select" value={form.pedidoId ?? ''} onChange={(e) => setForm(f => ({ ...f, pedidoId: e.target.value || undefined }))}>
                <option value="">— Sin pedido —</option>
                {orders.map((o) => <option key={o.pedidoId} value={o.pedidoId}>{o.folio}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Transportista *</label>
              <select className="select" value={form.transportistaId} onChange={F('transportistaId')}>
                <option value="">— Seleccionar transportista —</option>
                {transportistas.filter(t => t.activo).map((t) => (
                  <option key={t.transportistaId} value={t.transportistaId}>
                    {t.nombre} — ${t.tarifaBase.toLocaleString('es-MX')}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group sm:col-span-2">
              <label className="label">Origen</label>
              <input className="input" value={form.origen} onChange={F('origen')} />
            </div>
            <div className="form-group sm:col-span-2">
              <label className="label">Destino *</label>
              <input className="input" value={form.destino} onChange={F('destino')} />
            </div>
            <div className="form-group">
              <label className="label">Fecha Programada</label>
              <input type="date" className="input" value={form.fechaProgramada} onChange={F('fechaProgramada')} />
            </div>
            <div className="form-group">
              <label className="label">Costo Flete (MXN)</label>
              <input type="number" className="input" value={form.costoFlete} onChange={F('costoFlete')} min={0} />
            </div>
          </div>
        </Modal>
      )}

      {modal === 'view' && sel && (
        <Modal title={`Embarque ${sel.folio}`} onClose={() => setModal(null)}
          footer={<button className="btn-secondary" onClick={() => setModal(null)}>Cerrar</button>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Origen:</span> {sel.origen}</div>
              <div><span className="text-gray-500">Destino:</span> {sel.destino}</div>
              <div><span className="text-gray-500">Transportista:</span> {transportistas.find(t => t.transportistaId === sel.transportistaId)?.nombre}</div>
              <div><span className="text-gray-500">Flete:</span> <Currency value={sel.costoFlete} /></div>
              <div><span className="text-gray-500">F. Programada:</span> {sel.fechaProgramada}</div>
              <div><span className="text-gray-500">Estatus:</span> <StatusBadge status={sel.estatus} /></div>
            </div>
            <div>
              <p className="label mb-2">Cambiar estatus</p>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.map((e) => (
                  <button key={e} className={`btn btn-sm ${sel.estatus === e ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { updateEmbarque(sel.embarqueId, { estatus: e }); setModal(null); setSel(null) }}>
                    <StatusBadge status={e} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
