import { useState } from 'react'
import { useSuppliersStore } from '../../store/suppliersStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import type { Supplier } from '../../types'
import { Plus, Edit2, Building2, Star } from 'lucide-react'

const CONDICIONES = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Contado']

const BLANK: Omit<Supplier, 'supplierId'> = {
  razonSocial: '', rfc: '', contacto: '', correo: '', telefono: '',
  condicionesPago: CONDICIONES[1], calidad: 8, precio: 8, tiempoEntrega: 7, cumplimiento: 8, activo: true,
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${value * 10}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-6">{value}</span>
    </div>
  )
}

export function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier } = useSuppliersStore()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<'new' | 'edit' | null>(null)
  const [form, setForm] = useState(BLANK)
  const [editId, setEditId] = useState<string | null>(null)

  const filtered = suppliers.filter((s) =>
    [s.razonSocial, s.rfc, s.contacto].join(' ').toLowerCase().includes(q.toLowerCase())
  )

  function openNew() { setForm(BLANK); setEditId(null); setModal('new') }
  function openEdit(s: Supplier) {
    const { supplierId, ...rest } = s; setForm(rest); setEditId(s.supplierId); setModal('edit')
  }
  function handleSave() {
    if (editId) updateSupplier(editId, form); else addSupplier(form); setModal(null)
  }

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: ['calidad', 'precio', 'tiempoEntrega', 'cumplimiento'].includes(k) ? Number(e.target.value) : e.target.value }))

  const evalScore = (s: Supplier) => ((s.calidad + s.precio + s.tiempoEntrega + s.cumplimiento) / 4).toFixed(1)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Building2 size={24} /> Proveedores</h1>
          <p className="page-subtitle">{suppliers.filter(s => s.activo).length} proveedores activos</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Proveedor</button>
      </div>

      <div className="card">
        <div className="flex justify-between mb-4">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar proveedor..." />
        </div>
        <DataTable
          data={filtered}
          rowKey={(s) => s.supplierId}
          columns={[
            { key: 'razonSocial', header: 'Razón Social' },
            { key: 'rfc', header: 'RFC' },
            { key: 'contacto', header: 'Contacto' },
            { key: 'telefono', header: 'Teléfono' },
            { key: 'condicionesPago', header: 'Cond. Pago' },
            { key: 'calidad', header: 'Calidad', render: (s) => <ScoreBar value={s.calidad} /> },
            { key: 'precio', header: 'Precio', render: (s) => <ScoreBar value={s.precio} /> },
            { key: 'cumplimiento', header: 'Cumplimiento', render: (s) => <ScoreBar value={s.cumplimiento} /> },
            { key: 'eval', header: 'Score', render: (s) => (
              <div className="flex items-center gap-1 font-semibold text-sm">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                {evalScore(s)}
              </div>
            )},
            { key: 'activo', header: 'Estatus', render: (s) => <StatusBadge status={s.activo ? 'activo' : 'inactivo'} /> },
            { key: 'acc', header: '', render: (s) => (
              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}><Edit2 size={13} /></button>
            )},
          ]}
        />
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'Nuevo Proveedor' : 'Editar Proveedor'} onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSave}>Guardar</button></>}
        >
          <div className="form-grid">
            <div className="form-group sm:col-span-2">
              <label className="label">Razón Social *</label>
              <input className="input" value={form.razonSocial} onChange={F('razonSocial')} />
            </div>
            <div className="form-group">
              <label className="label">RFC</label>
              <input className="input" value={form.rfc} onChange={F('rfc')} />
            </div>
            <div className="form-group">
              <label className="label">Condiciones Pago</label>
              <select className="select" value={form.condicionesPago} onChange={F('condicionesPago')}>
                {CONDICIONES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Contacto</label>
              <input className="input" value={form.contacto} onChange={F('contacto')} />
            </div>
            <div className="form-group">
              <label className="label">Correo</label>
              <input type="email" className="input" value={form.correo} onChange={F('correo')} />
            </div>
            <div className="form-group">
              <label className="label">Teléfono</label>
              <input className="input" value={form.telefono} onChange={F('telefono')} />
            </div>
            <div className="form-group">
              <label className="label">Calidad (1-10)</label>
              <input type="number" className="input" value={form.calidad} onChange={F('calidad')} min={1} max={10} />
            </div>
            <div className="form-group">
              <label className="label">Precio (1-10)</label>
              <input type="number" className="input" value={form.precio} onChange={F('precio')} min={1} max={10} />
            </div>
            <div className="form-group">
              <label className="label">Tiempo Entrega (1-10)</label>
              <input type="number" className="input" value={form.tiempoEntrega} onChange={F('tiempoEntrega')} min={1} max={10} />
            </div>
            <div className="form-group">
              <label className="label">Cumplimiento (1-10)</label>
              <input type="number" className="input" value={form.cumplimiento} onChange={F('cumplimiento')} min={1} max={10} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
