import { useState } from 'react'
import { useUsersStore } from '../../store/usersStore'
import { useAuthStore } from '../../store/authStore'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import type { User, Role } from '../../types'
import {
  Users, Plus, Edit2, Trash2,
  ToggleLeft, ToggleRight, KeyRound, AlertCircle,
} from 'lucide-react'

const ROLES: Role[] = ['director', 'administracion', 'compras', 'ventas', 'operaciones', 'almacen']
const ROLE_LABELS: Record<Role, string> = {
  director: 'Director General', administracion: 'Administración', compras: 'Compras',
  ventas: 'Ventas', operaciones: 'Operaciones', almacen: 'Almacén',
}

const BLANK_USER: Omit<User, 'userId' | 'createdAt'> = {
  name: '', email: '', roles: ['ventas'], active: true,
}

// Selector de roles múltiple reutilizable
function RolesSelector({
  selected, onChange, disabled = false,
}: { selected: Role[]; onChange: (r: Role[]) => void; disabled?: boolean }) {
  function toggle(r: Role) {
    if (selected.includes(r)) {
      // no permitir dejar vacío
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
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {ROLE_LABELS[r]}
          </button>
        )
      })}
    </div>
  )
}

// Solo el rol 'director' con email de admin puede gestionar todos los usuarios
const ADMIN_EMAIL = 'admin@insumosfa.com'

export function UsersPage() {
  const { users, addUser, updateUser, deleteUser, toggleUser, changePassword } = useUsersStore()
  const { user: me } = useAuthStore()

  const isAdmin = me?.email === ADMIN_EMAIL

  // ── modales ──────────────────────────────────────────────────────────────
  type ModalType = 'new' | 'edit' | 'pwd' | 'confirm_delete' | null
  const [modal, setModal] = useState<ModalType>(null)
  const [targetUser, setTargetUser] = useState<User | null>(null)

  // formulario edición
  const [form, setForm] = useState(BLANK_USER)

  // formulario contraseña
  const [pwdForm, setPwdForm] = useState({ newPwd: '', confirm: '' })
  const [pwdError, setPwdError] = useState('')

  // formulario nuevo usuario
  const [newForm, setNewForm] = useState({ ...BLANK_USER, password: '', confirm: '' })
  const [newError, setNewError] = useState('')

  // ── helpers ───────────────────────────────────────────────────────────────
  function canEdit(u: User) {
    // Admin puede editar a todos; cualquier usuario solo puede editar el suyo
    return isAdmin || u.userId === me?.userId
  }
  function canDelete(u: User) {
    // Solo admin puede borrar, y no puede borrarse a sí mismo
    return isAdmin && u.userId !== me?.userId
  }
  function canToggle(u: User) {
    // Solo admin puede activar/desactivar, no a sí mismo
    return isAdmin && u.userId !== me?.userId
  }
  function canChangePwd(u: User) {
    // Admin puede cambiar cualquiera; usuario puede cambiar solo el suyo
    return isAdmin || u.userId === me?.userId
  }
  function showAnyAction(u: User) {
    return canEdit(u) || canDelete(u) || canToggle(u) || canChangePwd(u)
  }

  // ── abrir modales ─────────────────────────────────────────────────────────
  function openNew() {
    setNewForm({ ...BLANK_USER, password: '', confirm: '' })
    setNewError('')
    setModal('new')
  }
  function openEdit(u: User) {
    const { userId, createdAt, ...rest } = u
    setForm(rest)
    setTargetUser(u)
    setModal('edit')
  }
  function openPwd(u: User) {
    setPwdForm({ newPwd: '', confirm: '' })
    setPwdError('')
    setTargetUser(u)
    setModal('pwd')
  }
  function openDelete(u: User) {
    setTargetUser(u)
    setModal('confirm_delete')
  }

  // ── guardar ───────────────────────────────────────────────────────────────
  function handleSaveEdit() {
    if (!targetUser) return
    updateUser(targetUser.userId, form)
    setModal(null)
  }

  function handleSaveNew() {
    setNewError('')
    if (!newForm.name || !newForm.email) { setNewError('Nombre y correo son obligatorios.'); return }
    if (newForm.password.length < 6) { setNewError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (newForm.password !== newForm.confirm) { setNewError('Las contraseñas no coinciden.'); return }
    if (users.some(u => u.email === newForm.email)) { setNewError('Ya existe un usuario con ese correo.'); return }
    const { password, confirm, ...userData } = newForm
    addUser(userData, password)
    setModal(null)
  }

  function handleChangePwd() {
    setPwdError('')
    if (pwdForm.newPwd.length < 6) { setPwdError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (pwdForm.newPwd !== pwdForm.confirm) { setPwdError('Las contraseñas no coinciden.'); return }
    if (targetUser) changePassword(targetUser.userId, pwdForm.newPwd)
    setModal(null)
  }

  function handleDelete() {
    if (targetUser) deleteUser(targetUser.userId)
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
            {users.filter(u => u.active).length} activos / {users.length} total
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Nuevo Usuario
          </button>
        )}
      </div>

      {/* Aviso para usuarios sin privilegios de admin */}
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
                    <span key={r} className="badge badge-purple">{ROLE_LABELS[r]}</span>
                  ))}
                </div>
              ),
            },
            { key: 'createdAt', header: 'Fecha Alta' },
            {
              key: 'active', header: 'Estatus',
              render: (u) => <StatusBadge status={u.active ? 'activo' : 'inactivo'} />,
            },
            {
              key: 'acc', header: '',
              render: (u) => !showAnyAction(u) ? null : (
                <div className="flex gap-1 flex-wrap">
                  {canEdit(u) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)} title="Editar usuario">
                      <Edit2 size={13} />
                    </button>
                  )}
                  {canChangePwd(u) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => openPwd(u)} title="Cambiar contraseña">
                      <KeyRound size={13} />
                    </button>
                  )}
                  {canToggle(u) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleUser(u.userId)} title={u.active ? 'Desactivar' : 'Activar'}>
                      {u.active
                        ? <ToggleRight size={16} className="text-green-600" />
                        : <ToggleLeft size={16} className="text-gray-400" />}
                    </button>
                  )}
                  {canDelete(u) && (
                    <button className="btn btn-danger btn-sm" onClick={() => openDelete(u)} title="Eliminar usuario">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ── Modal: Nuevo Usuario (solo admin) ─────────────────────────── */}
      {modal === 'new' && (
        <Modal
          title="Nuevo Usuario"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveNew}>Crear Usuario</button>
            </>
          }
        >
          <div className="space-y-4">
            {newError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle size={15} />{newError}
              </div>
            )}
            <div className="form-group">
              <label className="label">Nombre completo *</label>
              <input className="input" value={newForm.name}
                onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Correo electrónico *</label>
              <input type="email" className="input" value={newForm.email}
                onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Roles * <span className="text-gray-400 font-normal">(selecciona uno o más)</span></label>
              <RolesSelector
                selected={newForm.roles}
                onChange={roles => setNewForm(f => ({ ...f, roles }))}
              />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Contraseña *</label>
                <input type="password" className="input" value={newForm.password} placeholder="Mín. 6 caracteres"
                  onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Confirmar contraseña *</label>
                <input type="password" className="input" value={newForm.confirm}
                  onChange={e => setNewForm(f => ({ ...f, confirm: e.target.value }))} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Editar Usuario ──────────────────────────────────────── */}
      {modal === 'edit' && targetUser && (
        <Modal
          title={`Editar — ${targetUser.name}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveEdit}>Guardar</button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Nombre completo *</label>
              <input className="input" value={form.name} onChange={F('name')} />
            </div>
            <div className="form-group">
              <label className="label">Correo electrónico *</label>
              <input type="email" className="input" value={form.email} onChange={F('email')} />
            </div>
            {/* Solo admin puede cambiar roles */}
            {isAdmin && (
              <div className="form-group">
                <label className="label">Roles <span className="text-gray-400 font-normal">(selecciona uno o más)</span></label>
                <RolesSelector
                  selected={form.roles}
                  onChange={roles => setForm(f => ({ ...f, roles }))}
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal: Cambiar Contraseña ─────────────────────────────────── */}
      {modal === 'pwd' && targetUser && (
        <Modal
          title={`Cambiar contraseña — ${targetUser.name}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleChangePwd}>
                <KeyRound size={14} /> Actualizar
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {pwdError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle size={15} />{pwdError}
              </div>
            )}
            <div className="form-group">
              <label className="label">Nueva contraseña *</label>
              <input type="password" className="input" value={pwdForm.newPwd}
                placeholder="Mín. 6 caracteres"
                onChange={e => setPwdForm(f => ({ ...f, newPwd: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Confirmar nueva contraseña *</label>
              <input type="password" className="input" value={pwdForm.confirm}
                onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Confirmar eliminación ──────────────────────────────── */}
      {modal === 'confirm_delete' && targetUser && (
        <Modal
          title="Eliminar usuario"
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
            <p>¿Estás seguro de que deseas eliminar al usuario:</p>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-semibold">{targetUser.name}</div>
              <div className="text-gray-500">{targetUser.email}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {targetUser.roles.map(r => (
                  <span key={r} className="badge badge-purple">{ROLE_LABELS[r]}</span>
                ))}
              </div>
            </div>
            <p className="text-red-600 font-medium">Esta acción no se puede deshacer.</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
