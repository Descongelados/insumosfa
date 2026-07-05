import { useState } from 'react'
import { useUsersStore } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import type { User, Role } from '../../types'
import { Users, Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'

const ROLES: Role[] = ['director', 'administracion', 'compras', 'ventas', 'operaciones', 'almacen']
const ROLE_LABELS: Record<Role, string> = {
  director: 'Director General', administracion: 'Administración', compras: 'Compras',
  ventas: 'Ventas', operaciones: 'Operaciones', almacen: 'Almacén',
}

const BLANK: Omit<User, 'userId' | 'createdAt'> = { name: '', email: '', role: 'ventas', active: true }

export function UsersPage() {
  const { users, addUser, updateUser, toggleUser } = useUsersStore()
  const [modal, setModal] = useState<'new' | 'edit' | null>(null)
  const [form, setForm] = useState(BLANK)
  const [editId, setEditId] = useState<string | null>(null)

  function openNew() { setForm(BLANK); setEditId(null); setModal('new') }
  function openEdit(u: User) {
    const { userId, createdAt, ...rest } = u; setForm(rest); setEditId(u.userId); setModal('edit')
  }
  function handleSave() {
    if (editId) updateUser(editId, form); else addUser(form); setModal(null)
  }

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users size={24} /> Usuarios del Sistema</h1>
          <p className="page-subtitle">{users.filter(u => u.active).length} activos / {users.length} total</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Usuario</button>
      </div>

      <div className="card">
        <DataTable
          data={users}
          rowKey={(u) => u.userId}
          columns={[
            { key: 'name', header: 'Nombre' },
            { key: 'email', header: 'Correo' },
            { key: 'role', header: 'Rol', render: (u) => (
              <span className="badge badge-purple">{ROLE_LABELS[u.role]}</span>
            )},
            { key: 'createdAt', header: 'Fecha Alta' },
            { key: 'active', header: 'Estatus', render: (u) => <StatusBadge status={u.active ? 'activo' : 'inactivo'} /> },
            {
              key: 'acc', header: '', render: (u) => (
                <div className="flex gap-1">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}><Edit2 size={13} /></button>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleUser(u.userId)}>
                    {u.active ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} className="text-gray-400" />}
                  </button>
                </div>
              )
            },
          ]}
        />
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'Nuevo Usuario' : 'Editar Usuario'} onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSave}>Guardar</button></>}
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Nombre completo *</label>
              <input className="input" value={form.name} onChange={F('name')} required />
            </div>
            <div className="form-group">
              <label className="label">Correo electrónico *</label>
              <input type="email" className="input" value={form.email} onChange={F('email')} required />
            </div>
            <div className="form-group">
              <label className="label">Rol *</label>
              <select className="select" value={form.role} onChange={F('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
