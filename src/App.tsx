import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { Layout } from './components/Layout'
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
import { UsersPage } from './pages/users/UsersPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/clientes" element={<RequireAuth><ClientsPage /></RequireAuth>} />
      <Route path="/prospectos" element={<RequireAuth><ProspectsPage /></RequireAuth>} />
      <Route path="/cotizaciones" element={<RequireAuth><QuotesPage /></RequireAuth>} />
      <Route path="/pedidos" element={<RequireAuth><SalesOrdersPage /></RequireAuth>} />
      <Route path="/productos" element={<RequireAuth><ProductsPage /></RequireAuth>} />
      <Route path="/inventario" element={<RequireAuth><InventoryPage /></RequireAuth>} />
      <Route path="/proveedores" element={<RequireAuth><SuppliersPage /></RequireAuth>} />
      <Route path="/compras" element={<RequireAuth><PurchasesPage /></RequireAuth>} />
      <Route path="/logistica" element={<RequireAuth><LogisticsPage /></RequireAuth>} />
      <Route path="/finanzas" element={<RequireAuth><FinancePage /></RequireAuth>} />
      <Route path="/usuarios" element={<RequireAuth><UsersPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
