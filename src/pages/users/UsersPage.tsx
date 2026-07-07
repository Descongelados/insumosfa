import { useState, useEffect } from 'react'
import { useUsersStore, hasRole } from '../../store/usersStore'
import { useAuthStore } from '../../store/authStore'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { toast } from '../../store/toastStore'
import type { User, Role } from '../../types'
import { Users, Plus, CreditCard as Edit2, Trash2, ToggleLeft, ToggleRight, KeyRound, CircleAlert as AlertCircle } from 'lucide-react'

const ROLES: Role[] = ['director', 'administracion', 'compras', 'ventas', 'operaciones', 'almacen']
const ROLE_LABELS: Record<Role, string> = {
  director: 'Director General', administracion: 'Administración', compras: 'Compras',
  ventas: 'Ventas', operaciones: 'Operaciones', almacen: 'Almacén',
}

const BLANK_USER: Omit<User, 'userId' | 'createdAt'> = {
  name: '', email: '', roles: ['ventas'], active: true,
}

function RolesSelector({
  selected, onChange, disabled = false,
}: { selected: Role[]; onChange: (r: Role[]) => void; disabled?: boolean }) {
  function toggle(r: Role) {
    if (selected.includes(r)) {
      if (selected.length === 1) return
      onChange(selected.filter(x => x !== r))
    } else {
      onChange([...selected, r])
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {ROLES.map(r => {
        const active = selected.includes(r)
        return (
          <button
            key={r}
            type="button"
            disabled={disabled}
            onClick={() => toggle(r)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {ROLE_LABELS[r]}
          </button>
        )
      })}
    </div>
  )
}

export function UsersPage() {
  const { users, loading, loadUsers, addUser, updateUser, deleteUser, toggleUser, changePassword } = useUsersStore()
  const { user: me } = useAuthStore()

  const isAdmin = me ? hasRole(me, 'director') : false

  useEffect(() => { void loadUsers() }, [])

  type ModalType = 'new' | 'edit' | 'pwd' | 'confirm_delete' | null
  const [modal, setModal] = useState<ModalType>(null)
  const [targetUser, setTargetUser] = useState<User | null>(null)

  const [form, setForm] = useState(BLANK_USER)
  const [pwdForm, setPwdForm] = useState({ newPwd: '', confirm: '' })
  const [pwdError, setPwdError] = useState('')
  const [newForm, setNewForm] = useState({ ...BLANK_USER, password: '', confirm: '' })
  const [newError, setNewError] = useState('')

  function canEdit(u: User) { return isAdmin || u.userId === me?.userId }
  function canDelete(u: User) { return isAdmin && u.userId !== me?.userId }
  function canToggle(u: User) { return isAdmin && u.userId !== me?.userId }
  function canChangePwd(u: User) { return isAdmin || u.userId === me?.userId }
  function showAnyAction(u: User) { return canEdit(u) || canDelete(u) || canToggle(u) || canChangePwd(u) }

  function openNew() { setNewForm({ ...BLANK_USER, password: '', confirm: '' }); setNewError(''); setModal('new') }
  function openEdit(u: User) {
    const { userId: _id, createdAt: _ca, ...rest } = u
    setForm(rest); setTargetUser(u); setModal('edit')
  }
  function openPwd(u: User) { setPwdForm({ newPwd: '', confirm: '' }); setPwdError(''); setTargetUser(u); setModal('pwd') }
  function openDelete(u: User) { setTargetUser(u); setModal('confirm_delete') }

  async function handleSaveEdit() {
    if (!targetUser) return
    await updateUser(targetUser.userId, form)
    toast.success('Usuario actualizado.')
    setModal(null)
  }

  async function handleSaveNew() {
    setNewError('')
    if (!newForm.name || !newForm.email) { setNewError('Nombre y correo son obligatorios.'); return }
    if (newForm.password.length < 6) { setNewError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (newForm.password !== newForm.confirm) { setNewError('Las contraseñas no coinciden.'); return }
    if (users.some(u => u.email === newForm.email)) { setNewError('Ya existe un usuario con ese correo.'); return }
    const { password, confirm, ...userData } = newForm
    await addUser(userData, password)
    toast.success(`Usuario ${newForm.email} creado.`)
    setModal(null)
  }

  async function handleChangePwd() {
    setPwdError('')
    if (pwdForm.newPwd.length < 6) { setPwdError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (pwdForm.newPwd !== pwdForm.confirm) { setPwdError('Las contraseñas no coinciden.'); return }
    if (targetUser) { await changePassword(targetUser.userId, pwdForm.newPwd); toast.success('Contraseña actualizada.') }
    setModal(null)
  }

  async function handleDelete() {
    if (targetUser) { await deleteUser(targetUser.userId); toast.success(`Usuario ${targetUser.email} eliminado.`) }
    setModal(null)
  }

  const F = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users size={24} /> Usuarios del Sistema
          </h1>
          <p className="page-subtitle">
            {loading ? 'Cargando…' : `${users.filter(u => u.active).length} activos / ${users.length} total`}
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Nuevo Usuario
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          Solo puedes editar tu propio usuario o cambiar tu contraseña.
        </div>
      )}

      <div className="card">
        <DataTable
          data={users}
          rowKey={(u) => u.userId}
          columns={[
            { key: 'name', header: 'Nombre' },
            { key: 'email', header: 'Correo' },
            {
              key: 'roles', header: 'Roles',
              render: (u) => (
                <div className="flex flex-wrap gap-1">
                  {u.roles.map(r => (
                    <span key={r} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                      {ROLE_LABELS[r] ?? r}
                    </span>
                  ))}
                </div>
              ),
            },
            {
              key: 'active', header: 'Estatus',
              render: (u) => <StatusBadge status={u.active ? 'activo' : 'inactivo'} />,
            },
            { key: 'createdAt', header: 'Fecha Alta' },
            {
              key: 'userId', header: 'Acciones',
              render: (u) => !showAnyAction(u) ? null : (
                <div className="flex items-center gap-1">
                  {canEdit(u) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)} title="Editar">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {canChangePwd(u) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => openPwd(u)} title="Cambiar contraseña">
                      <KeyRound size={14} />
                    </button>
                  )}
                  {canToggle(u) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => void toggleUser(u.userId)} title={u.active ? 'Desactivar' : 'Activar'}>
                      {u.active ? <ToggleRight size={14} className="text-green-600" /> : <ToggleLeft size={14} className="text-gray-400" />}
                    </button>
                  )}
                  {canDelete(u) && (
                    <button className="btn btn-danger btn-sm" onClick={() => openDelete(u)} title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Modal: Editar usuario */}
      {modal === 'edit' && (
      <Modal onClose={() => setModal(null)} title="Editar Usuario">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" value={form.name} onChange={F('name')} />
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input className="input" type="email" value={form.email} onChange={F('email')} />
          </div>
          <div>
            <label className="label">Roles</label>
            <RolesSelector
              selected={form.roles}
              onChange={(r) => setForm(p => ({ ...p, roles: r }))}
              disabled={!isAdmin}
            />
          </div>
          <div className="flex gap-2 pt-2 justify-end">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={() => void handleSaveEdit()}>Guardar</button>
          </div>
        </div>
      </Modal>
      )}

      {/* Modal: Nuevo usuario */}
      {modal === 'new' && (
      <Modal onClose={() => setModal(null)} title="Nuevo Usuario">
        <div className="space-y-4">
          {newError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />{newError}
            </div>
          )}
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input className="input" type="email" value={newForm.email} onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Roles</label>
            <RolesSelector selected={newForm.roles} onChange={r => setNewForm(p => ({ ...p, roles: r }))} />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input className="input" type="password" value={newForm.password} onChange={e => setNewForm(p => ({ ...p, password: e.target.value }))} />
          </div>
          <div>
            <label className="label">Confirmar contraseña</label>
            <input className="input" type="password" value={newForm.confirm} onChange={e => setNewForm(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2 justify-end">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={() => void handleSaveNew()}>Crear Usuario</button>
          </div>
        </div>
      </Modal>
      )}

      {/* Modal: Cambiar contraseña */}
      {modal === 'pwd' && (
      <Modal onClose={() => setModal(null)} title="Cambiar Contraseña">
        <div className="space-y-4">
          {pwdError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />{pwdError}
            </div>
          )}
          <p className="text-sm text-gray-600">Usuario: <span className="font-medium">{targetUser?.email}</span></p>
          <div>
            <label className="label">Nueva contraseña</label>
            <input className="input" type="password" value={pwdForm.newPwd} onChange={e => setPwdForm(p => ({ ...p, newPwd: e.target.value }))} />
          </div>
          <div>
            <label className="label">Confirmar contraseña</label>
            <input className="input" type="password" value={pwdForm.confirm} onChange={e => setPwdForm(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2 justify-end">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={() => void handleChangePwd()}>Cambiar</button>
          </div>
        </div>
      </Modal>
      )}

      {/* Modal: Confirmar eliminación */}
      {modal === 'confirm_delete' && (
      <Modal onClose={() => setModal(null)} title="Eliminar Usuario">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            ¿Eliminar al usuario <span className="font-semibold">{targetUser?.name}</span> ({targetUser?.email})?
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2 pt-2 justify-end">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={() => void handleDelete()}>Eliminar</button>
          </div>
        </div>
      </Modal>
      )}
    </div>
  )
}
