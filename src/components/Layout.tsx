import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { NAV_ITEMS } from '../rbac'
import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const ROLE_LABELS: Record<string, string> = {
  director: 'Director General',
  administracion: 'Administración',
  compras: 'Compras',
  ventas: 'Ventas',
  operaciones: 'Operaciones',
  almacen: 'Almacén',
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  const userRoles = user?.roles ?? []

  // Solo mostrar en el menú las rutas a las que el usuario tiene acceso
  const visibleNav = NAV_ITEMS.filter(item =>
    item.roles.some(r => userRoles.includes(r))
  )

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col bg-gray-900 text-white transition-all duration-300 flex-shrink-0',
        open ? 'w-64' : 'w-16'
      )}>
        {/* Logo / toggle */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          {open && (
            <div>
              <div className="text-white font-bold text-base leading-tight">InsumosFa</div>
              <div className="text-gray-400 text-xs">ERP Sistema</div>
            </div>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white ml-auto"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Nav items — filtrado por rol */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {visibleNav.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {open && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-gray-700 p-3">
          <div className={clsx('flex items-center gap-3', !open && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.name.charAt(0) ?? 'U'}
            </div>
            {open && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{user?.name}</div>
                <div className="text-xs text-gray-400 truncate">
                  {userRoles.map(r => ROLE_LABELS[r] ?? r).join(' · ')}
                </div>
              </div>
            )}
            {open && (
              <button onClick={handleLogout} className="p-1 text-gray-400 hover:text-white" title="Cerrar sesión">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-500">
            InsumosFa ERP &mdash; Plataforma de Gestión Empresarial
          </div>
          <div className="text-sm text-gray-700 font-medium">{user?.email}</div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
