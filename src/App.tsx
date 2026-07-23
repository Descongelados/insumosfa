import { lazy, Suspense, useState, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useConfigStore } from './store/configStore'
import { canAccess } from './rbac'
import { Layout } from './components/Layout'
import { Toaster } from './components/ui/Toaster'
import { hasLocalStorageData, migrateLocalStorageToSupabase } from './utils/migrateLocalStorage'

// Cada página se carga solo cuando el usuario navega a esa ruta
const LoginPage             = lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })))
const DashboardPage         = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.DashboardPage })))
const ClientsProspectsPage  = lazy(() => import('./pages/clients/ClientsProspectsPage').then(m => ({ default: m.ClientsProspectsPage })))
const QuotesPage            = lazy(() => import('./pages/quotes/QuotesPage').then(m => ({ default: m.QuotesPage })))
const SalesOrdersPage       = lazy(() => import('./pages/sales/SalesOrdersPage').then(m => ({ default: m.SalesOrdersPage })))
const ProductsPage          = lazy(() => import('./pages/products/ProductsPage').then(m => ({ default: m.ProductsPage })))
const InventoryPage         = lazy(() => import('./pages/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })))
const SuppliersPage         = lazy(() => import('./pages/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })))
const PurchasesPage         = lazy(() => import('./pages/purchases/PurchasesPage').then(m => ({ default: m.PurchasesPage })))
const LogisticsPage         = lazy(() => import('./pages/logistics/LogisticsPage').then(m => ({ default: m.LogisticsPage })))
const FinancePage           = lazy(() => import('./pages/finance/FinancePage').then(m => ({ default: m.FinancePage })))
const ReportsPage           = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })))
const ConfigPage            = lazy(() => import('./pages/users/ConfigPage').then(m => ({ default: m.ConfigPage })))

/** Requiere autenticación Y que el usuario tenga acceso a la ruta */
function RequireAuth({ path, children }: { path: string; children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (!canAccess(user.roles, path)) return <Navigate to="/sin-acceso" replace />
  return <Layout>{children}</Layout>
}

/** Pantalla de acceso denegado */
function AccesoDenegado() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-4xl">🚫</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
        <p className="text-gray-500 max-w-sm">
          Tu perfil no tiene permisos para ver este módulo.
          {' '}Tus roles: <strong>{user.roles.join(', ')}</strong>.
        </p>
        <a href="/" className="btn-primary">Ir al Dashboard</a>
      </div>
    </Layout>
  )
}

/** Pantalla mostrada durante la migración de datos */
function MigrationScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-blue-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Sincronizando datos</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Estamos migrando tu información al sistema compartido.<br/>
          Esto ocurre una sola vez y toma unos segundos.
        </p>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
        </div>
      </div>
    </div>
  )
}

/** Indicador de carga mientras se descarga el chunk de la página */
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function App() {
  const [migrating, setMigrating] = useState(() => hasLocalStorageData())
  const { loadCompany } = useConfigStore()

  useEffect(() => {
    // Cargar datos de empresa desde Supabase al iniciar la app
    void loadCompany()

    if (!migrating) return
    migrateLocalStorageToSupabase().finally(() => setMigrating(false))
  }, [])

  if (migrating) return <MigrationScreen />

  return (
    <>
    <Toaster />
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sin-acceso" element={<AccesoDenegado />} />

        <Route path="/" element={<RequireAuth path="/"><DashboardPage /></RequireAuth>} />
        <Route path="/clientes-prospectos" element={<RequireAuth path="/clientes-prospectos"><ClientsProspectsPage /></RequireAuth>} />
        <Route path="/cotizaciones" element={<RequireAuth path="/cotizaciones"><QuotesPage /></RequireAuth>} />
        <Route path="/pedidos" element={<RequireAuth path="/pedidos"><SalesOrdersPage /></RequireAuth>} />
        <Route path="/productos" element={<RequireAuth path="/productos"><ProductsPage /></RequireAuth>} />
        <Route path="/inventario" element={<RequireAuth path="/inventario"><InventoryPage /></RequireAuth>} />
        <Route path="/proveedores" element={<RequireAuth path="/proveedores"><SuppliersPage /></RequireAuth>} />
        <Route path="/compras" element={<RequireAuth path="/compras"><PurchasesPage /></RequireAuth>} />
        <Route path="/logistica" element={<RequireAuth path="/logistica"><LogisticsPage /></RequireAuth>} />
        <Route path="/finanzas" element={<RequireAuth path="/finanzas"><FinancePage /></RequireAuth>} />
        <Route path="/reportes" element={<RequireAuth path="/reportes"><ReportsPage /></RequireAuth>} />
        <Route path="/configuracion" element={<RequireAuth path="/configuracion"><ConfigPage /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </>
  )
}
