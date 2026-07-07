import { useRef, useState } from 'react'
import { useUsersStore } from '../../store/usersStore'
import { useAuthStore } from '../../store/authStore'
import { useConfigStore } from '../../store/configStore'
import { hasRole } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { toast } from '../../store/toastStore'
import type { User, Role } from '../../types'
import {
  Settings, Users, Building2, Plus, Edit2, Trash2,
  ToggleLeft, ToggleRight, KeyRound, AlertCircle,
  Upload, X, Save,
} from 'lucide-react'

// ── Roles ────────────────────────────────────────────────────────────────────
const ROLES: Role[] = ['director', 'administracion', 'compras', 'ventas', 'operaciones', 'almacen']
const ROLE_LABELS: Record<Role, string> = {
  director: 'Director General', administracion: 'Administración', compras: 'Compras',
  ventas: 'Ventas', operaciones: 'Operaciones', almacen: 'Almacén',
}

const BLANK_USER: Omit<User, 'userId' | 'createdAt'> = {
  name: '', email: '', roles: ['ventas'], active: true,
}

// ── Selector de roles múltiple ────────────────────────────────────────────────
function RolesSelector({ selected, onChange, disabled = false }: {
  selected: Role[]; onChange: (r: Role[]) => void; disabled?: boolean
}) {
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
            key={r} type="button" disabled={disabled}
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

const ADMIN_EMAIL = 'admin@insumosfa.com'

export function ConfigPage() {
  const { users, addUser, updateUser, deleteUser, toggleUser, changePassword } = useUsersStore()
  const { user: me } = useAuthStore()
  const { company, updateCompany } = useConfigStore()

  const isAdmin = me?.email === ADMIN_EMAIL
  const canEditCompany = me ? hasRole(me, 'director', 'administracion') : false

  // ── tabs ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'empresa' | 'usuarios'>('empresa')

  // ── company form ──────────────────────────────────────────────────────────
  const [companyForm, setCompanyForm] = useState({ ...company })
  const [companyDirty, setCompanyDirty] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  function handleCompanyField(k: keyof typeof companyForm, val: string) {
    setCompanyForm(f => ({ ...f, [k]: val }))
    setCompanyDirty(true)
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Selecciona un archivo de imagen.'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('La imagen no debe superar 2 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setCompanyForm(f => ({ ...f, logoUrl: dataUrl }))
      setCompanyDirty(true)
    }
    reader.readAsDataURL(file)
    e.target.value = '' // reset input
  }

  function handleSaveCompany() {
    updateCompany(companyForm)
    setCompanyDirty(false)
    toast.success('Información de la empresa actualizada.')
  }

  function handleRemoveLogo() {
    setCompanyForm(f => ({ ...f, logoUrl: '' }))
    setCompanyDirty(true)
  }

  // ── user modals ───────────────────────────────────────────────────────────
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
  function openEdit(u: User) { const { userId: _id, createdAt: _ca, ...rest } = u; setForm(rest); setTargetUser(u); setModal('edit') }
  function openPwd(u: User) { setPwdForm({ newPwd: '', confirm: '' }); setPwdError(''); setTargetUser(u); setModal('pwd') }
  function openDelete(u: User) { setTargetUser(u); setModal('confirm_delete') }

  function handleSaveEdit() {
    if (!targetUser) return
    updateUser(targetUser.userId, form)
    toast.success('Usuario actualizado.')
    setModal(null)
  }

  function handleSaveNew() {
    setNewError('')
    if (!newForm.name || !newForm.email) { setNewError('Nombre y correo son obligatorios.'); return }
    if (newForm.password.length < 6) { setNewError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (newForm.password !== newForm.confirm) { setNewError('Las contraseñas no coinciden.'); return }
    if (users.some(u => u.email === newForm.email)) { setNewError('Ya existe un usuario con ese correo.'); return }
    const { password: _pw, confirm: _c, ...userData } = newForm
    addUser(userData, newForm.password)
    toast.success(`Usuario ${newForm.email} creado.`)
    setModal(null)
  }

  function handleChangePwd() {
    setPwdError('')
    if (pwdForm.newPwd.length < 6) { setPwdError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (pwdForm.newPwd !== pwdForm.confirm) { setPwdError('Las contraseñas no coinciden.'); return }
    if (targetUser) { changePassword(targetUser.userId, pwdForm.newPwd); toast.success('Contraseña actualizada.') }
    setModal(null)
  }

  function handleDeleteUser() {
    if (targetUser) { deleteUser(targetUser.userId); toast.success(`Usuario ${targetUser.email} eliminado.`) }
    setModal(null)
  }

  const F = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings size={24} /> Configuración
          </h1>
          <p className="page-subtitle">Empresa y usuarios del sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('empresa')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'empresa'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 size={15} /> Empresa
        </button>
        <button
          onClick={() => setTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'usuarios'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={15} /> Usuarios
          <span className="ml-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full px-1.5 py-0.5">
            {users.length}
          </span>
        </button>
      </div>

      {/* ── TAB: EMPRESA ──────────────────────────────────────────────────── */}
      {tab === 'empresa' && (
        <div className="max-w-2xl space-y-6">
          {!canEditCompany && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" />
              Solo Director y Administración pueden editar la información de la empresa.
            </div>
          )}

          <div className="card space-y-6">
            {/* Logo */}
            <div>
              <label className="label mb-3">Logo de la empresa</label>
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                  {companyForm.logoUrl ? (
                    <img
                      src={companyForm.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Building2 size={28} className="mx-auto mb-1 opacity-40" />
                      <span className="text-xs">Sin logo</span>
                    </div>
                  )}
                </div>

                {/* Upload controls */}
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={!canEditCompany}
                  />
                  {canEditCompany && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        <Upload size={14} /> Subir logo
                      </button>
                      {companyForm.logoUrl && (
                        <button className="btn btn-danger btn-sm" onClick={handleRemoveLogo}>
                          <X size={14} /> Quitar logo
                        </button>
                      )}
                    </>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG o SVG · Máx. 2 MB<br />
                    Se usa en cotizaciones y documentos
                  </p>
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div className="form-group">
                <label className="label">Nombre de la empresa *</label>
                <input
                  className="input"
                  value={companyForm.nombre}
                  disabled={!canEditCompany}
                  onChange={e => handleCompanyField('nombre', e.target.value)}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="label">RFC</label>
                  <input
                    className="input uppercase"
                    value={companyForm.rfc}
                    disabled={!canEditCompany}
                    placeholder="XAXX010101000"
                    onChange={e => handleCompanyField('rfc', e.target.value.toUpperCase())}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Teléfono</label>
                  <input
                    className="input"
                    value={companyForm.telefono}
                    disabled={!canEditCompany}
                    placeholder="(81) 8000-0000"
                    onChange={e => handleCompanyField('telefono', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Correo electrónico</label>
                <input
                  type="email"
                  className="input"
                  value={companyForm.correo}
                  disabled={!canEditCompany}
                  placeholder="ventas@empresa.com"
                  onChange={e => handleCompanyField('correo', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Dirección fiscal</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={companyForm.direccion}
                  disabled={!canEditCompany}
                  placeholder="Calle, número, colonia, ciudad, C.P."
                  onChange={e => handleCompanyField('direccion', e.target.value)}
                />
              </div>
            </div>

            {/* Save button */}
            {canEditCompany && (
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  className={`btn-primary ${!companyDirty ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!companyDirty}
                  onClick={handleSaveCompany}
                >
                  <Save size={15} /> Guardar cambios
                </button>
              </div>
            )}
          </div>

          {/* Preview card */}
          <div className="card bg-gray-50 border-gray-200">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Vista previa — aparece en cotizaciones y documentos
            </p>
            <div className="flex items-start gap-4">
              {companyForm.logoUrl && (
                <img
                  src={companyForm.logoUrl}
                  alt="Logo preview"
                  className="w-14 h-14 object-contain rounded-lg border border-gray-200 bg-white p-1 flex-shrink-0"
                />
              )}
              <div>
                <div className="text-lg font-bold text-blue-800">{companyForm.nombre || '—'}</div>
                {companyForm.rfc && <div className="text-xs text-gray-500 mt-0.5">RFC: {companyForm.rfc}</div>}
                {companyForm.correo && <div className="text-xs text-gray-500">{companyForm.correo}</div>}
                {companyForm.telefono && <div className="text-xs text-gray-500">Tel: {companyForm.telefono}</div>}
                {companyForm.direccion && <div className="text-xs text-gray-500 mt-0.5">{companyForm.direccion}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: USUARIOS ─────────────────────────────────────────────────── */}
      {tab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Usuarios del sistema</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {users.filter(u => u.active).length} activos · {users.length} total
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
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)} title="Editar">
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
                        <button className="btn btn-danger btn-sm" onClick={() => openDelete(u)} title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* ══ MODALES USUARIO ══════════════════════════════════════════════════ */}

      {/* Nuevo usuario */}
      {modal === 'new' && (
        <Modal title="Nuevo Usuario" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveNew}>Crear Usuario</button></>}
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
              <RolesSelector selected={newForm.roles} onChange={roles => setNewForm(f => ({ ...f, roles }))} />
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

      {/* Editar usuario */}
      {modal === 'edit' && targetUser && (
        <Modal title={`Editar — ${targetUser.name}`} onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveEdit}>Guardar</button></>}
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
            {isAdmin && (
              <div className="form-group">
                <label className="label">Roles <span className="text-gray-400 font-normal">(selecciona uno o más)</span></label>
                <RolesSelector selected={form.roles} onChange={roles => setForm(f => ({ ...f, roles }))} />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Cambiar contraseña */}
      {modal === 'pwd' && targetUser && (
        <Modal title={`Cambiar contraseña — ${targetUser.name}`} onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleChangePwd}><KeyRound size={14} /> Actualizar</button></>}
        >
          <div className="space-y-4">
            {pwdError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle size={15} />{pwdError}
              </div>
            )}
            <div className="form-group">
              <label className="label">Nueva contraseña *</label>
              <input type="password" className="input" value={pwdForm.newPwd} placeholder="Mín. 6 caracteres"
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

      {/* Confirmar eliminar usuario */}
      {modal === 'confirm_delete' && targetUser && (
        <Modal title="Eliminar usuario" onClose={() => setModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn-danger" onClick={handleDeleteUser}><Trash2 size={14} /> Eliminar definitivamente</button></>}
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>¿Eliminar al usuario:</p>
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
