import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { NAV_ITEMS } from '../rbac'
import { LogOut, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
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
  const location = useLocation()
  // On desktop: sidebar collapsed/expanded. On mobile: drawer open/closed.
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const userRoles = user?.roles ?? []
  const visibleNav = NAV_ITEMS.filter(item => item.roles.some(r => userRoles.includes(r)))

  function handleLogout() { logout(); navigate('/login') }

  // ── Shared sidebar content ─────────────────────────────────────────────────
  function SidebarContent({ collapsed }: { collapsed: boolean }) {
    return (
      <>
        {/* Logo / close */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700 flex-shrink-0">
          {!collapsed && (
            <div>
              <div className="text-white font-bold text-base leading-tight">InsumosFa</div>
              <div className="text-gray-400 text-xs">ERP Sistema</div>
            </div>
          )}
          {/* Desktop collapse button */}
          <button
            onClick={() => setDesktopOpen(!desktopOpen)}
            className="hidden md:flex p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white ml-auto"
          >
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white ml-auto"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
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
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-700 p-3 flex-shrink-0">
          <div className={clsx('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.name.charAt(0) ?? 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{user?.name}</div>
                <div className="text-xs text-gray-400 truncate">
                  {userRoles.map(r => ROLE_LABELS[r] ?? r).join(' · ')}
                </div>
              </div>
            )}
            {!collapsed && (
              <button onClick={handleLogout} className="p-1 text-gray-400 hover:text-white" title="Cerrar sesión">
                <LogOut size={16} />
              </button>
            )}
            {collapsed && (
              <button onClick={handleLogout} className="text-gray-400 hover:text-white" title="Cerrar sesión">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── MOBILE DRAWER OVERLAY ─────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 text-white w-64 transition-transform duration-300 md:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent collapsed={false} />
      </aside>

      {/* ── DESKTOP SIDEBAR ───────────────────────────────────────────── */}
      <aside className={clsx(
        'hidden md:flex flex-col bg-gray-900 text-white transition-all duration-300 flex-shrink-0',
        desktopOpen ? 'w-64' : 'w-16'
      )}>
        <SidebarContent collapsed={!desktopOpen} />
      </aside>

      {/* ── MAIN AREA ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 flex-shrink-0"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <div className="text-sm text-gray-500 truncate hidden sm:block">
            InsumosFa ERP &mdash; Plataforma de Gestión Empresarial
          </div>
          {/* App name on mobile (topbar center) */}
          <div className="text-sm font-semibold text-gray-800 md:hidden flex-1 text-center">
            InsumosFa
          </div>
          <div className="text-sm text-gray-700 font-medium truncate flex-shrink-0">{user?.email}</div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
