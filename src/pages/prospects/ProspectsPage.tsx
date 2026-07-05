import { useState } from 'react'
import { useProspectsStore } from '../../store/prospectsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import { toast } from '../../store/toastStore'
import type { Prospect, ProspectoEstatus } from '../../types'
import { Plus, Edit2, UserSearch, Trash2 } from 'lucide-react'

const ESTADOS: ProspectoEstatus[] = ['nuevo', 'contactado', 'calificado', 'cotizado', 'ganado', 'perdido']
const ORIGENES = ['Referido', 'LinkedIn', 'Expo', 'Web', 'Llamada', 'Visita', 'Otro']

const BLANK: Omit<Prospect, 'prospectoId' | 'fechaAlta'> = {
  empresa: '', contacto: '', correo: '', telefono: '',
  origen: ORIGENES[0], estatus: 'nuevo', valorPotencial: 0,
}

export function ProspectsPage() {
  const { prospects, addProspect, updateProspect, deleteProspect } = useProspectsStore()
  const { user: me } = useAuthStore()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<'new' | 'edit' | 'del' | null>(null)
  const [form, setForm] = useState(BLANK)
  const [editId, setEditId] = useState<string | null>(null)
  const [delTarget, setDelTarget] = useState<Prospect | null>(null)

  const canDelete = me ? hasRole(me, 'director', 'ventas', 'administracion') : false

  const filtered = prospects.filter((p) =>
    [p.empresa, p.contacto, p.correo].join(' ').toLowerCase().includes(q.toLowerCase())
  )

  function openNew() { setForm(BLANK); setEditId(null); setModal('new') }
  function openEdit(p: Prospect) {
    const { prospectoId, fechaAlta, ...rest } = p
    setForm(rest); setEditId(p.prospectoId); setModal('edit')
  }
  function openDel(p: Prospect) { setDelTarget(p); setModal('del') }

  function handleSave() {
    if (!form.empresa.trim()) { toast.error('La empresa es obligatoria.'); return }
    if (editId) { updateProspect(editId, form); toast.success('Prospecto actualizado.') }
    else { addProspect(form); toast.success('Prospecto creado.') }
    setModal(null)
  }

  function handleDelete() {
    if (delTarget) { deleteProspect(delTarget.prospectoId); toast.success(`Prospecto "${delTarget.empresa}" eliminado.`) }
    setModal(null); setDelTarget(null)
  }

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: k === 'valorPotencial' ? Number(e.target.value) : e.target.value }))

  const byStatus = ESTADOS.map((e) => ({ e, count: prospects.filter((p) => p.estatus === e).length }))

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><UserSearch size={24} /> Prospectos</h1>
          <p className="page-subtitle">CRM — Pipeline de ventas</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Prospecto</button>
      </div>

      {/* Kanban-style status count */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {byStatus.map(({ e, count }) => (
          <div key={e} className="card-sm flex-shrink-0 min-w-[100px] text-center">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <StatusBadge status={e} />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex justify-between mb-4">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar empresa o contacto..." />
        </div>
        <DataTable
          data={filtered}
          rowKey={(p) => p.prospectoId}
          columns={[
            { key: 'empresa', header: 'Empresa' },
            { key: 'contacto', header: 'Contacto' },
            { key: 'correo', header: 'Correo' },
            { key: 'origen', header: 'Origen' },
            { key: 'valorPotencial', header: 'Valor Potencial', render: (p) => <Currency value={p.valorPotencial} /> },
            { key: 'estatus', header: 'Estatus', render: (p) => <StatusBadge status={p.estatus} /> },
            { key: 'fechaAlta', header: 'Fecha Alta' },
            {
              key: 'acciones', header: '', render: (p) => (
                <div className="flex gap-1">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                    <Edit2 size={13} /> Editar
                  </button>
                  {canDelete && (
                    <button className="btn btn-danger btn-sm" onClick={() => openDel(p)} title="Eliminar">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )
            },
          ]}
        />
      </div>

      {/* New / Edit modal */}
      {(modal === 'new' || modal === 'edit') && (
        <Modal
          title={modal === 'new' ? 'Nuevo Prospecto' : 'Editar Prospecto'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>Guardar</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group sm:col-span-2">
              <label className="label">Empresa *</label>
              <input className="input" value={form.empresa} onChange={F('empresa')} required />
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
              <label className="label">Origen</label>
              <select className="select" value={form.origen} onChange={F('origen')}>
                {ORIGENES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Valor Potencial (MXN)</label>
              <input type="number" className="input" value={form.valorPotencial} onChange={F('valorPotencial')} min={0} />
            </div>
            <div className="form-group">
              <label className="label">Estatus</label>
              <select className="select" value={form.estatus} onChange={F('estatus')}>
                {ESTADOS.map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {modal === 'del' && delTarget && (
        <Modal
          title="Eliminar prospecto"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar definitivamente</button>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            ¿Estás seguro de que deseas eliminar el prospecto{' '}
            <strong>{delTarget.empresa}</strong>? Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  )
}
