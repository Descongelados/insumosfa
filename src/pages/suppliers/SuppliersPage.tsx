import { useState, useEffect } from 'react'
import { useSuppliersStore } from '../../store/suppliersStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { toast } from '../../store/toastStore'
import type { Supplier } from '../../types'
import { Plus, CreditCard as Edit2, Trash2, Building2, Star, CircleAlert as AlertCircle } from 'lucide-react'

// Roles que pueden eliminar proveedores
const DELETE_ROLES = ['director', 'administracion', 'compras'] as const

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
  const { suppliers, loadSuppliers, addSupplier, updateSupplier, deleteSupplier } = useSuppliersStore()
  const { user: me } = useAuthStore()

  useEffect(() => { void loadSuppliers() }, [])

  const canDelete = me ? hasRole(me, ...DELETE_ROLES) : false

  const [q, setQ] = useState('')
  const [modal, setModal] = useState<'new' | 'edit' | 'confirm_delete' | null>(null)
  const [form, setForm] = useState(BLANK)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)

  const filtered = suppliers.filter((s) =>
    [s.razonSocial, s.rfc, s.contacto].join(' ').toLowerCase().includes(q.toLowerCase())
  )

  function openNew() { setForm(BLANK); setEditId(null); setModal('new') }
  function openEdit(s: Supplier) {
    const { supplierId, ...rest } = s; setForm(rest); setEditId(s.supplierId); setModal('edit')
  }
  function openDelete(s: Supplier) { setDeleteTarget(s); setModal('confirm_delete') }

  function handleSave() {
    if (!form.razonSocial?.trim()) { toast.error('La razón social es obligatoria.'); return }
    if (editId) { updateSupplier(editId, form); toast.success('Proveedor actualizado.') }
    else { addSupplier(form); toast.success('Proveedor creado.') }
    setModal(null)
  }

  function handleDelete() {
    if (deleteTarget) { deleteSupplier(deleteTarget.supplierId); toast.success(`Proveedor "${deleteTarget.razonSocial}" eliminado.`) }
    setModal(null)
    setDeleteTarget(null)
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
              <div className="flex gap-1">
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)} title="Editar"><Edit2 size={13} /></button>
                {canDelete && (
                  <button className="btn btn-danger btn-sm" onClick={() => openDelete(s)} title="Eliminar proveedor">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )},
          ]}
        />
      </div>

      {(modal === 'new' || modal === 'edit') && (
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

      {/* ── Modal: Confirmar eliminación ──────────────────────────────── */}
      {modal === 'confirm_delete' && deleteTarget && (
        <Modal
          title="Eliminar proveedor"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-danger" onClick={handleDelete}>
                <Trash2 size={14} /> Eliminar definitivamente
              </button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>¿Estás seguro de que deseas eliminar al proveedor:</p>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
              <div className="font-semibold text-gray-900">{deleteTarget.razonSocial}</div>
              <div className="text-gray-500">RFC: {deleteTarget.rfc}</div>
              <div className="text-gray-500">{deleteTarget.contacto} · {deleteTarget.correo}</div>
              <div className="text-gray-500">Cond. pago: {deleteTarget.condicionesPago}</div>
              <div className="mt-1"><StatusBadge status={deleteTarget.activo ? 'activo' : 'inactivo'} /></div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>Se eliminarán también las órdenes de compra asociadas a este proveedor. Esta acción no se puede deshacer.</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
