import { useClientsStore } from '../store/clientsStore'
import { useProductsStore } from '../store/productsStore'
import { useSalesOrdersStore } from '../store/salesOrdersStore'
import { usePurchasesStore } from '../store/purchasesStore'
import { useFinanceStore } from '../store/financeStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useProspectsStore } from '../store/prospectsStore'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Currency } from '../components/ui/Currency'
import {
  Users, Package, ShoppingCart, TrendingUp, AlertCircle,
  DollarSign, Truck, BarChart2
} from 'lucide-react'

const MONTH_DATA = [
  { mes: 'Feb', ventas: 142000, compras: 88000 },
  { mes: 'Mar', ventas: 168000, compras: 95000 },
  { mes: 'Abr', ventas: 155000, compras: 102000 },
  { mes: 'May', ventas: 193000, compras: 115000 },
  { mes: 'Jun', ventas: 210000, compras: 128000 },
  { mes: 'Jul', ventas: 237000, compras: 141000 },
]

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function DashboardPage() {
  const { clients } = useClientsStore()
  const { products } = useProductsStore()
  const { orders } = useSalesOrdersStore()
  const { ordenesCompra } = usePurchasesStore()
  const { facturasVenta, facturasProveedor, bancos } = useFinanceStore()
  const { inventario } = useInventoryStore()
  const { prospects } = useProspectsStore()

  const totalVentas = orders.reduce((a, o) => a + o.total, 0)
  const cxcVencidas = facturasVenta.filter((f) => f.estatus === 'vencida').reduce((a, f) => a + f.saldoPendiente, 0)
  const cxpVencidas = facturasProveedor.filter((f) => f.estatus === 'vencida').reduce((a, f) => a + f.saldoPendiente, 0)
  const saldoBancario = bancos.filter(b => b.moneda === 'MXN').reduce((a, b) => a + b.saldo, 0)
  const inventarioValorizado = inventario.reduce((a, inv) => {
    const prod = products.find(p => p.productId === inv.productId)
    return a + (inv.cantidadDisponible * (prod?.costoPromedio ?? 0))
  }, 0)

  const prospectosPorEstatus = ['nuevo','contactado','calificado','cotizado','ganado','perdido'].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: prospects.filter(p => p.estatus === s).length
  })).filter(x => x.value > 0)

  const categorias = products.reduce((acc, p) => {
    acc[p.categoria] = (acc[p.categoria] ?? 0) + 1
    return acc
  }, {} as Record<string,number>)

  const catData = Object.entries(categorias).map(([cat, qty]) => ({ cat, qty }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard Ejecutivo</h1>
        <p className="page-subtitle">Resumen de operaciones — InsumosFa ERP</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<ShoppingCart size={22} />} color="bg-blue-100 text-blue-600"
          label="Ventas Acumuladas" value={<Currency value={totalVentas} />} sub={`${orders.length} pedidos`} />
        <StatCard icon={<Package size={22} />} color="bg-purple-100 text-purple-600"
          label="Inventario Valorizado" value={<Currency value={inventarioValorizado} />} sub={`${products.filter(p=>p.activo).length} SKUs activos`} />
        <StatCard icon={<DollarSign size={22} />} color="bg-green-100 text-green-600"
          label="Saldo Bancario" value={<Currency value={saldoBancario} />} sub={`${bancos.length} cuentas`} />
        <StatCard icon={<AlertCircle size={22} />} color="bg-red-100 text-red-600"
          label="CxC Vencidas" value={<Currency value={cxcVencidas} />} sub={`CxP Vencidas: ${cxpVencidas.toLocaleString('es-MX',{style:'currency',currency:'MXN'})}`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users size={22} />} color="bg-teal-100 text-teal-600"
          label="Clientes Activos" value={String(clients.filter(c=>c.estatus==='activo').length)} sub={`${clients.length} total`} />
        <StatCard icon={<TrendingUp size={22} />} color="bg-yellow-100 text-yellow-600"
          label="Prospectos" value={String(prospects.length)} sub={`${prospects.filter(p=>p.estatus==='ganado').length} ganados`} />
        <StatCard icon={<Truck size={22} />} color="bg-orange-100 text-orange-600"
          label="OC Activas" value={String(ordenesCompra.filter(o=>['emitida','confirmada'].includes(o.estatus)).length)} sub={`${ordenesCompra.length} total`} />
        <StatCard icon={<BarChart2 size={22} />} color="bg-indigo-100 text-indigo-600"
          label="Pedidos en Proceso" value={String(orders.filter(o=>!['cerrado','entregado'].includes(o.estatus)).length)} sub={`${orders.filter(o=>o.estatus==='entregado').length} entregados`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Ventas vs Compras (Mensual)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTH_DATA} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} />
              <Legend />
              <Bar dataKey="ventas" name="Ventas" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="compras" name="Compras" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Pipeline de Prospectos</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={prospectosPorEstatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {prospectosPorEstatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Productos por Categoría</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} layout="vertical" margin={{ left: 40 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="cat" tick={{ fontSize: 12 }} width={90} />
              <Tooltip />
              <Bar dataKey="qty" name="SKUs" fill="#8b5cf6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Cuentas Bancarias</h3>
          <div className="space-y-3">
            {bancos.map((b) => (
              <div key={b.bancoId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div>
                  <div className="font-medium text-sm text-gray-900">{b.banco}</div>
                  <div className="text-xs text-gray-500">Cuenta: {b.cuenta}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    {b.saldo.toLocaleString('es-MX', { style: 'currency', currency: b.moneda })}
                  </div>
                  <div className="text-xs text-gray-500">{b.moneda}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, color, label, value, sub }: {
  icon: React.ReactNode, color: string, label: string, value: React.ReactNode, sub: string
}) {
  return (
    <div className="card-sm flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        <div className="text-xl font-bold text-gray-900 mt-0.5">{value}</div>
        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
      </div>
    </div>
  )
}
