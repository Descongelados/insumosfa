import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { canAccess } from './rbac'
import { Layout } from './components/Layout'
import { Toaster } from './components/ui/Toaster'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { ClientsPage } from './pages/clients/ClientsPage'
import { ProspectsPage } from './pages/prospects/ProspectsPage'
import { QuotesPage } from './pages/quotes/QuotesPage'
import { SalesOrdersPage } from './pages/sales/SalesOrdersPage'
import { ProductsPage } from './pages/products/ProductsPage'
import { InventoryPage } from './pages/inventory/InventoryPage'
import { SuppliersPage } from './pages/suppliers/SuppliersPage'
import { PurchasesPage } from './pages/purchases/PurchasesPage'
import { LogisticsPage } from './pages/logistics/LogisticsPage'
import { FinancePage } from './pages/finance/FinancePage'
import { ConfigPage } from './pages/users/ConfigPage'

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
  // Si no hay sesión activa, redirigir al login directamente
  if (!user) return <Navigate to="/login" replace />
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-4xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
        <p className="text-gray-500 max-w-sm">
          Tu perfil no tiene permisos para ver este módulo.
          {' '}Tus roles: <strong>{user.roles.join(', ')}</strong>.
        </p>
        <a href="/" className="btn-primary">← Ir al Dashboard</a>
      </div>
    </Layout>
  )
}

export function App() {
  return (
    <>
    <Toaster />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sin-acceso" element={<AccesoDenegado />} />

      <Route path="/" element={<RequireAuth path="/"><DashboardPage /></RequireAuth>} />
      <Route path="/clientes" element={<RequireAuth path="/clientes"><ClientsPage /></RequireAuth>} />
      <Route path="/prospectos" element={<RequireAuth path="/prospectos"><ProspectsPage /></RequireAuth>} />
      <Route path="/cotizaciones" element={<RequireAuth path="/cotizaciones"><QuotesPage /></RequireAuth>} />
      <Route path="/pedidos" element={<RequireAuth path="/pedidos"><SalesOrdersPage /></RequireAuth>} />
      <Route path="/productos" element={<RequireAuth path="/productos"><ProductsPage /></RequireAuth>} />
      <Route path="/inventario" element={<RequireAuth path="/inventario"><InventoryPage /></RequireAuth>} />
      <Route path="/proveedores" element={<RequireAuth path="/proveedores"><SuppliersPage /></RequireAuth>} />
      <Route path="/compras" element={<RequireAuth path="/compras"><PurchasesPage /></RequireAuth>} />
      <Route path="/logistica" element={<RequireAuth path="/logistica"><LogisticsPage /></RequireAuth>} />
      <Route path="/finanzas" element={<RequireAuth path="/finanzas"><FinancePage /></RequireAuth>} />
      <Route path="/configuracion" element={<RequireAuth path="/configuracion"><ConfigPage /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
