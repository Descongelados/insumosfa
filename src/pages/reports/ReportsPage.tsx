import { useMemo, useEffect, useState } from 'react'
import { useFinanceStore } from '../../store/financeStore'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { usePurchasesStore } from '../../store/purchasesStore'
import { useProductsStore } from '../../store/productsStore'
import { useClientsStore } from '../../store/clientsStore'
import { useSuppliersStore } from '../../store/suppliersStore'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Currency } from '../../components/ui/Currency'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Receipt,
  Users, Package, CalendarRange, ChartBar as BarChart2,
} from 'lucide-react'

// ---- helpers ---------------------------------------------------------------

const MXN = (v: number) =>
  v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const MONTH_SHORT: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
}
function fmtMonth(ym: string) {
  const [y, m] = ym.split('-')
  return `${MONTH_SHORT[m] ?? m} ${y}`
}

/** Genera array de 'YYYY-MM' entre dos fechas inclusivo */
function monthsBetween(from: string, to: string): string[] {
  const months: string[] = []
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  let y = fy; let m = fm
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++; if (m > 12) { m = 1; y++ }
  }
  return months
}

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to
}

// ---- KPI Card ---------------------------------------------------------------
function KpiCard({
  icon, color, label, value, sub,
}: {
  icon: React.ReactNode; color: string; label: string
  value: React.ReactNode; sub?: string
}) {
  return (
    <div className="card-sm flex items-start gap-3">
      <div className={`p-2 md:p-3 rounded-xl ${color} flex-shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-500 font-medium leading-tight">{label}</div>
        <div className="text-base md:text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5 leading-tight">{sub}</div>}
      </div>
    </div>
  )
}

// ---- Section heading --------------------------------------------------------
function Section({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-2 mb-4">
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16']

// ============================================================================
export function ReportsPage() {
  // --- stores ----------------------------------------------------------------
  const { facturasVenta, pagosClientes, facturasProveedor, pagosProveedores, gastos, loadFinance } = useFinanceStore()
  const { orders, loadOrders } = useSalesOrdersStore()
  const { ordenesCompra, loadPurchases } = usePurchasesStore()
  const { products, loadProducts } = useProductsStore()
  const { clients, loadClients } = useClientsStore()
  const { suppliers, loadSuppliers } = useSuppliersStore()

  useEffect(() => {
    void loadFinance()
    void loadOrders()
    void loadPurchases()
    void loadProducts()
    void loadClients()
    void loadSuppliers()
  }, [])

  // --- date range state ------------------------------------------------------
  const today = new Date().toISOString().split('T')[0]
  const firstOfYear = `${new Date().getFullYear()}-01-01`

  const [from, setFrom] = useState(firstOfYear)
  const [to, setTo]     = useState(today)

  // Presets
  function applyPreset(months: number) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (months - 1))
    setFrom(d.toISOString().split('T')[0])
    setTo(today)
  }

  // --- active tab ------------------------------------------------------------
  const [tab, setTab] = useState<'resumen' | 'ventas' | 'compras' | 'gastos' | 'finanzas'>('resumen')

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  // -- Ventas en rango
  const ventasRango = useMemo(
    () => orders.filter(o => inRange(o.fechaPedido, from, to)),
    [orders, from, to]
  )
  const totalVentasRango = ventasRango.reduce((a, o) => a + o.total, 0)

  // -- Compras en rango
  const comprasRango = useMemo(
    () => ordenesCompra.filter(o => inRange(o.fecha, from, to)),
    [ordenesCompra, from, to]
  )
  const totalComprasRango = comprasRango.reduce((a, o) => a + o.monto, 0)

  // -- Gastos en rango
  const gastosRango = useMemo(
    () => gastos.filter(g => inRange(g.fecha, from, to)),
    [gastos, from, to]
  )
  const totalGastosRango = gastosRango.reduce((a, g) => a + g.monto, 0)

  // -- Cobrado (pagos de clientes) en rango
  const cobradoRango = useMemo(
    () => pagosClientes.filter(p => inRange(p.fecha, from, to)),
    [pagosClientes, from, to]
  )
  const totalCobradoRango = cobradoRango.reduce((a, p) => a + p.monto, 0)

  // -- Pagado a proveedores en rango
  const pagadoRango = useMemo(
    () => pagosProveedores.filter(p => inRange(p.fecha, from, to)),
    [pagosProveedores, from, to]
  )
  const totalPagadoRango = pagadoRango.reduce((a, p) => a + p.monto, 0)

  // -- Margen bruto estimado (ventas - compras del rango)
  const margenBruto = totalVentasRango - totalComprasRango
  const margenPct   = totalVentasRango > 0 ? (margenBruto / totalVentasRango) * 100 : 0

  // -- Monthly chart data
  const monthlyChart = useMemo(() => {
    const months = monthsBetween(from.slice(0, 7), to.slice(0, 7))
    const ventaMap:  Record<string, number> = {}
    const compraMap: Record<string, number> = {}
    const gastoMap:  Record<string, number> = {}
    months.forEach(k => { ventaMap[k] = 0; compraMap[k] = 0; gastoMap[k] = 0 })

    orders.forEach(o => {
      const k = o.fechaPedido.slice(0, 7)
      if (k in ventaMap) ventaMap[k] += o.total
    })
    ordenesCompra.forEach(oc => {
      const k = oc.fecha.slice(0, 7)
      if (k in compraMap) compraMap[k] += oc.monto
    })
    gastos.forEach(g => {
      const k = g.fecha.slice(0, 7)
      if (k in gastoMap) gastoMap[k] += g.monto
    })

    return months.map(k => ({
      mes: fmtMonth(k),
      ventas:  Math.round(ventaMap[k]),
      compras: Math.round(compraMap[k]),
      gastos:  Math.round(gastoMap[k]),
    }))
  }, [orders, ordenesCompra, gastos, from, to])

  // -- Top productos vendidos
  const topProductos = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {}
    ventasRango.forEach(o => {
      o.items.forEach(it => {
        const prod = products.find(p => p.productId === it.productId)
        const key  = it.productId
        if (!map[key]) map[key] = { name: prod ? `${prod.sku} - ${prod.descripcion}` : key, qty: 0, revenue: 0 }
        map[key].qty     += it.cantidad
        map[key].revenue += it.cantidad * it.precio * (1 - it.descuento / 100)
      })
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  }, [ventasRango, products])

  // -- Gastos por categoria
  const gastosPorCat = useMemo(() => {
    const map: Record<string, number> = {}
    gastosRango.forEach(g => { map[g.categoria] = (map[g.categoria] ?? 0) + g.monto })
    return Object.entries(map).map(([cat, total]) => ({ cat, total })).sort((a, b) => b.total - a.total)
  }, [gastosRango])

  // -- CxC en rango (facturas emitidas en el rango)
  const cxcRango = useMemo(
    () => facturasVenta.filter(f => inRange(f.fecha, from, to)),
    [facturasVenta, from, to]
  )
  const cxcPendienteRango = cxcRango.filter(f => f.saldoPendiente > 0).reduce((a, f) => a + f.saldoPendiente, 0)

  // -- CxP en rango
  const cxpRango = useMemo(
    () => facturasProveedor.filter(f => inRange(f.fecha, from, to)),
    [facturasProveedor, from, to]
  )
  const cxpPendienteRango = cxpRango.filter(f => f.saldoPendiente > 0).reduce((a, f) => a + f.saldoPendiente, 0)

  // -- Top clientes por ventas
  const topClientes = useMemo(() => {
    const map: Record<string, { name: string; total: number; pedidos: number }> = {}
    ventasRango.forEach(o => {
      const cl  = clients.find(c => c.clientId === o.clienteId)
      const key = o.clienteId
      if (!map[key]) map[key] = { name: cl?.razonSocial ?? key, total: 0, pedidos: 0 }
      map[key].total   += o.total
      map[key].pedidos += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8)
  }, [ventasRango, clients])

  // -- Top proveedores por compras
  const topProveedores = useMemo(() => {
    const map: Record<string, { name: string; total: number; ocs: number }> = {}
    comprasRango.forEach(oc => {
      const prov = suppliers.find(s => s.supplierId === oc.supplierId)
      const key  = oc.supplierId
      if (!map[key]) map[key] = { name: prov?.razonSocial ?? key, total: 0, ocs: 0 }
      map[key].total += oc.monto
      map[key].ocs   += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8)
  }, [comprasRango, suppliers])

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <BarChart2 size={24} /> Reportes del Negocio
        </h1>
        <p className="page-subtitle">
          Vista integrada de ventas, compras, finanzas y gastos — filtrable por rango de fechas
        </p>
      </div>

      {/* Date range picker */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <CalendarRange size={16} className="text-blue-500" />
            Rango de fechas
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Desde</label>
              <input
                type="date"
                className="input text-sm"
                value={from}
                max={to}
                onChange={e => setFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Hasta</label>
              <input
                type="date"
                className="input text-sm"
                value={to}
                min={from}
                max={today}
                onChange={e => setTo(e.target.value)}
              />
            </div>
          </div>
          {/* Presets */}
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-secondary btn-sm" onClick={() => applyPreset(1)}>Este mes</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyPreset(3)}>3 meses</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyPreset(6)}>6 meses</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyPreset(12)}>12 meses</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setFrom(firstOfYear); setTo(today) }}>
              Este año
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Mostrando datos del <strong>{from}</strong> al <strong>{to}</strong> —{' '}
          <strong>{ventasRango.length}</strong> pedidos · <strong>{comprasRango.length}</strong> OC ·{' '}
          <strong>{gastosRango.length}</strong> gastos
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 flex-wrap border-b border-gray-200">
        {(
          [
            { id: 'resumen',  label: 'Resumen Ejecutivo' },
            { id: 'ventas',   label: 'Ventas' },
            { id: 'compras',  label: 'Compras' },
            { id: 'gastos',   label: 'Gastos' },
            { id: 'finanzas', label: 'Finanzas CxC / CxP' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* TAB: RESUMEN EJECUTIVO                                           */}
      {/* ================================================================ */}
      {tab === 'resumen' && (
        <div className="space-y-6">

          {/* KPI row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<TrendingUp size={22} />}
              color="bg-blue-100 text-blue-600"
              label="Ventas (pedidos)"
              value={<Currency value={totalVentasRango} />}
              sub={`${ventasRango.length} pedidos`}
            />
            <KpiCard
              icon={<ShoppingCart size={22} />}
              color="bg-green-100 text-green-600"
              label="Compras (OC)"
              value={<Currency value={totalComprasRango} />}
              sub={`${comprasRango.length} órdenes`}
            />
            <KpiCard
              icon={<Receipt size={22} />}
              color="bg-rose-100 text-rose-600"
              label="Gastos Negocio"
              value={<Currency value={totalGastosRango} />}
              sub={`${gastosRango.length} registros`}
            />
            <KpiCard
              icon={<DollarSign size={22} />}
              color={margenBruto >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}
              label="Margen Bruto"
              value={<Currency value={margenBruto} />}
              sub={`${margenPct.toFixed(1)}% sobre ventas`}
            />
          </div>

          {/* KPI row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<DollarSign size={22} />}
              color="bg-teal-100 text-teal-600"
              label="Cobrado a Clientes"
              value={<Currency value={totalCobradoRango} />}
              sub={`${cobradoRango.length} pagos recibidos`}
            />
            <KpiCard
              icon={<DollarSign size={22} />}
              color="bg-orange-100 text-orange-600"
              label="Pagado a Proveedores"
              value={<Currency value={totalPagadoRango} />}
              sub={`${pagadoRango.length} pagos emitidos`}
            />
            <KpiCard
              icon={<Users size={22} />}
              color="bg-purple-100 text-purple-600"
              label="Clientes en Rango"
              value={String(new Set(ventasRango.map(o => o.clienteId)).size)}
              sub="clientes con pedidos"
            />
            <KpiCard
              icon={<Package size={22} />}
              color="bg-yellow-100 text-yellow-600"
              label="SKUs Vendidos"
              value={String(new Set(ventasRango.flatMap(o => o.items.map(i => i.productId))).size)}
              sub="productos únicos"
            />
          </div>

          {/* Main chart */}
          <div className="card">
            <Section
              title="Ventas · Compras · Gastos por Mes"
              subtitle="Distribución mensual de flujos dentro del rango seleccionado"
            />
            {monthlyChart.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
                Sin datos en el rango seleccionado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => MXN(v)} />
                  <Legend />
                  <Bar dataKey="ventas"  name="Ventas"  fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="compras" name="Compras" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="gastos"  name="Gastos"  fill="#f43f5e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Two column: top clientes + gastos por cat */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="card">
              <Section title="Top Clientes" subtitle="Por monto de pedidos en el rango" />
              {topClientes.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Sin pedidos en el rango.</p>
              ) : (
                <div className="space-y-2">
                  {topClientes.map((c, i) => {
                    const pct = totalVentasRango > 0 ? (c.total / totalVentasRango) * 100 : 0
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="text-gray-700 truncate max-w-[60%]">{c.name}</span>
                          <span className="font-semibold text-gray-900">{MXN(c.total)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{c.pedidos} pedido(s) · {pct.toFixed(1)}%</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card">
              <Section title="Gastos por Categoría" subtitle="Total acumulado en el rango" />
              {gastosPorCat.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Sin gastos en el rango.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={gastosPorCat}
                      dataKey="total"
                      nameKey="cat"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                    >
                      {gastosPorCat.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => MXN(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: VENTAS                                                      */}
      {/* ================================================================ */}
      {tab === 'ventas' && (
        <div className="space-y-6">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={<TrendingUp size={22} />} color="bg-blue-100 text-blue-600"
              label="Total Ventas" value={<Currency value={totalVentasRango} />}
              sub={`${ventasRango.length} pedidos`} />
            <KpiCard icon={<DollarSign size={22} />} color="bg-teal-100 text-teal-600"
              label="Cobrado" value={<Currency value={totalCobradoRango} />}
              sub={`${cobradoRango.length} pagos`} />
            <KpiCard icon={<DollarSign size={22} />} color="bg-amber-100 text-amber-600"
              label="CxC Pendiente" value={<Currency value={cxcPendienteRango} />}
              sub="facturas sin cobrar" />
            <KpiCard icon={<Users size={22} />} color="bg-purple-100 text-purple-600"
              label="Clientes" value={String(new Set(ventasRango.map(o => o.clienteId)).size)}
              sub="clientes únicos" />
          </div>

          {/* Pedidos table */}
          <div className="card space-y-4">
            <Section title="Pedidos en el Rango" subtitle="Todos los pedidos de venta registrados en el período" />
            {ventasRango.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No hay pedidos en el rango seleccionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Folio','Cliente','Fecha','Estatus','Partidas','Total'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ventasRango.map(o => {
                      const cl = clients.find(c => c.clientId === o.clienteId)
                      return (
                        <tr key={o.pedidoId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono font-semibold text-blue-700">{o.folio}</td>
                          <td className="px-3 py-2 text-gray-700">{cl?.razonSocial ?? '-'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{o.fechaPedido}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {o.estatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-500">{o.items.length}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900"><Currency value={o.total} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Total</td>
                      <td className="px-3 py-2 font-bold text-blue-700"><Currency value={totalVentasRango} /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Top productos */}
          <div className="card space-y-4">
            <Section title="Top 10 Productos Vendidos" subtitle="Por ingresos netos en el rango" />
            {topProductos.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Sin ventas en el rango.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['#','Producto','Unidades','Ingresos'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topProductos.map((p, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400 font-semibold">#{i + 1}</td>
                        <td className="px-3 py-2 text-gray-700">{p.name}</td>
                        <td className="px-3 py-2 text-gray-500">{p.qty.toLocaleString()}</td>
                        <td className="px-3 py-2 font-semibold text-gray-900"><Currency value={p.revenue} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top clientes */}
          <div className="card space-y-4">
            <Section title="Top Clientes" subtitle="Por monto total de pedidos en el rango" />
            {topClientes.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Sin pedidos en el rango.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['#','Cliente','Pedidos','Total','% del Total'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topClientes.map((c, i) => {
                      const pct = totalVentasRango > 0 ? (c.total / totalVentasRango) * 100 : 0
                      return (
                        <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400 font-semibold">#{i + 1}</td>
                          <td className="px-3 py-2 text-gray-700">{c.name}</td>
                          <td className="px-3 py-2 text-gray-500">{c.pedidos}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900"><Currency value={c.total} /></td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: COMPRAS                                                     */}
      {/* ================================================================ */}
      {tab === 'compras' && (
        <div className="space-y-6">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={<ShoppingCart size={22} />} color="bg-green-100 text-green-600"
              label="Total Compras" value={<Currency value={totalComprasRango} />}
              sub={`${comprasRango.length} órdenes`} />
            <KpiCard icon={<DollarSign size={22} />} color="bg-orange-100 text-orange-600"
              label="Pagado" value={<Currency value={totalPagadoRango} />}
              sub={`${pagadoRango.length} pagos`} />
            <KpiCard icon={<DollarSign size={22} />} color="bg-amber-100 text-amber-600"
              label="CxP Pendiente" value={<Currency value={cxpPendienteRango} />}
              sub="facturas sin pagar" />
            <KpiCard icon={<Package size={22} />} color="bg-teal-100 text-teal-600"
              label="Proveedores" value={String(new Set(comprasRango.map(oc => oc.supplierId)).size)}
              sub="proveedores únicos" />
          </div>

          <div className="card space-y-4">
            <Section title="Órdenes de Compra en el Rango" subtitle="Todas las OC del período" />
            {comprasRango.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No hay órdenes de compra en el rango seleccionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Folio','Proveedor','Fecha','Entrega','Estatus','Monto'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comprasRango.map(oc => {
                      const prov = suppliers.find(s => s.supplierId === oc.supplierId)
                      return (
                        <tr key={oc.ordenCompraId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono font-semibold text-blue-700">{oc.folio}</td>
                          <td className="px-3 py-2 text-gray-700">{prov?.razonSocial ?? '-'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{oc.fecha}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{oc.fechaEntregaEsperada || '-'}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              {oc.estatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-semibold text-gray-900"><Currency value={oc.monto} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Total</td>
                      <td className="px-3 py-2 font-bold text-green-700"><Currency value={totalComprasRango} /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="card space-y-4">
            <Section title="Top Proveedores" subtitle="Por monto de órdenes de compra en el rango" />
            {topProveedores.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Sin compras en el rango.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['#','Proveedor','OCs','Total','% del Total'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topProveedores.map((p, i) => {
                      const pct = totalComprasRango > 0 ? (p.total / totalComprasRango) * 100 : 0
                      return (
                        <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400 font-semibold">#{i + 1}</td>
                          <td className="px-3 py-2 text-gray-700">{p.name}</td>
                          <td className="px-3 py-2 text-gray-500">{p.ocs}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900"><Currency value={p.total} /></td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: GASTOS                                                      */}
      {/* ================================================================ */}
      {tab === 'gastos' && (
        <div className="space-y-6">

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard icon={<Receipt size={22} />} color="bg-rose-100 text-rose-600"
              label="Total Gastos" value={<Currency value={totalGastosRango} />}
              sub={`${gastosRango.length} registros`} />
            <KpiCard icon={<TrendingDown size={22} />} color="bg-amber-100 text-amber-600"
              label="Categorías Activas"
              value={String(gastosPorCat.length)}
              sub="categorías con gastos" />
            <KpiCard icon={<DollarSign size={22} />} color="bg-purple-100 text-purple-600"
              label="Promedio por Registro"
              value={<Currency value={gastosRango.length > 0 ? totalGastosRango / gastosRango.length : 0} />}
              sub="ticket promedio" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <Section title="Gastos por Categoría" subtitle="Distribución del total de gastos" />
              {gastosPorCat.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Sin gastos en el rango.</p>
              ) : (
                <div className="space-y-3">
                  {gastosPorCat.map(({ cat, total }, i) => {
                    const pct = totalGastosRango > 0 ? (total / totalGastosRango) * 100 : 0
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 font-medium">{cat}</span>
                          <span className="font-semibold text-gray-900">{MXN(total)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{pct.toFixed(1)}% del total</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card">
              <Section title="Por Forma de Pago" subtitle="Monto total por método de pago" />
              {gastosRango.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Sin gastos en el rango.</p>
              ) : (() => {
                const formas = ['Transferencia', 'Efectivo', 'Cheque', 'Tarjeta']
                const badge: Record<string, string> = {
                  Transferencia: 'bg-blue-50 border-blue-200 text-blue-700',
                  Efectivo:      'bg-green-50 border-green-200 text-green-700',
                  Cheque:        'bg-purple-50 border-purple-200 text-purple-700',
                  Tarjeta:       'bg-orange-50 border-orange-200 text-orange-700',
                }
                return (
                  <div className="grid grid-cols-2 gap-3">
                    {formas.map(f => {
                      const total = gastosRango.filter(g => g.formaPago === f).reduce((a, g) => a + g.monto, 0)
                      return (
                        <div key={f} className={`p-3 rounded-xl border ${badge[f] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                          <div className="text-xs font-medium mb-1">{f}</div>
                          <div className="text-lg font-bold">{MXN(total)}</div>
                          <div className="text-xs opacity-70 mt-0.5">
                            {gastosRango.filter(g => g.formaPago === f).length} registros
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>

          <div className="card space-y-4">
            <Section title="Detalle de Gastos" subtitle="Todos los gastos registrados en el período" />
            {gastosRango.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No hay gastos en el rango seleccionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Fecha','Categoría','Descripción','Forma','Monto'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gastosRango.map(g => (
                      <tr key={g.gastoId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500 text-xs">{g.fecha}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {g.categoria}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{g.descripcion}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{g.formaPago}</td>
                        <td className="px-3 py-2 font-semibold text-rose-600"><Currency value={g.monto} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Total</td>
                      <td className="px-3 py-2 font-bold text-rose-600"><Currency value={totalGastosRango} /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: FINANZAS CxC / CxP                                         */}
      {/* ================================================================ */}
      {tab === 'finanzas' && (
        <div className="space-y-6">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={<DollarSign size={22} />} color="bg-blue-100 text-blue-600"
              label="Facturas Emitidas" value={<Currency value={cxcRango.reduce((a, f) => a + f.total, 0)} />}
              sub={`${cxcRango.length} facturas venta`} />
            <KpiCard icon={<DollarSign size={22} />} color="bg-red-100 text-red-600"
              label="CxC Pendiente" value={<Currency value={cxcPendienteRango} />}
              sub={`${cxcRango.filter(f => f.saldoPendiente > 0).length} sin cobrar`} />
            <KpiCard icon={<DollarSign size={22} />} color="bg-green-100 text-green-600"
              label="Facturas Proveedor" value={<Currency value={cxpRango.reduce((a, f) => a + f.total, 0)} />}
              sub={`${cxpRango.length} facturas`} />
            <KpiCard icon={<DollarSign size={22} />} color="bg-orange-100 text-orange-600"
              label="CxP Pendiente" value={<Currency value={cxpPendienteRango} />}
              sub={`${cxpRango.filter(f => f.saldoPendiente > 0).length} sin pagar`} />
          </div>

          {/* CxC */}
          <div className="card space-y-4">
            <Section title="Cuentas por Cobrar — Facturas del Período" subtitle="Facturas de venta emitidas dentro del rango" />
            {cxcRango.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No hay facturas en el rango seleccionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Folio','Cliente','Fecha','Vencimiento','Total','Saldo','Estatus'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cxcRango.map(f => {
                      const cl = clients.find(c => c.clientId === f.clienteId)
                      return (
                        <tr key={f.facturaId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono font-semibold text-blue-700">{f.folio}</td>
                          <td className="px-3 py-2 text-gray-700">{cl?.razonSocial ?? '-'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{f.fecha}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{f.fechaVencimiento}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900"><Currency value={f.total} /></td>
                          <td className="px-3 py-2">
                            <span className={f.saldoPendiente > 0 ? 'font-bold text-red-600' : 'font-bold text-green-600'}>
                              <Currency value={f.saldoPendiente} />
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {f.estatus}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Totales</td>
                      <td className="px-3 py-2 font-bold text-blue-700"><Currency value={cxcRango.reduce((a, f) => a + f.total, 0)} /></td>
                      <td className="px-3 py-2 font-bold text-red-600"><Currency value={cxcPendienteRango} /></td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* CxP */}
          <div className="card space-y-4">
            <Section title="Cuentas por Pagar — Facturas del Período" subtitle="Facturas de proveedor registradas dentro del rango" />
            {cxpRango.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No hay facturas de proveedor en el rango seleccionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Folio','Proveedor','Fecha','Vencimiento','Total','Saldo','Estatus'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cxpRango.map(f => {
                      const prov = suppliers.find(s => s.supplierId === f.supplierId)
                      return (
                        <tr key={f.facturaProvId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono font-semibold text-blue-700">{f.folio}</td>
                          <td className="px-3 py-2 text-gray-700">{prov?.razonSocial ?? '-'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{f.fecha}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{f.fechaVencimiento}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900"><Currency value={f.total} /></td>
                          <td className="px-3 py-2">
                            <span className={f.saldoPendiente > 0 ? 'font-bold text-orange-600' : 'font-bold text-green-600'}>
                              <Currency value={f.saldoPendiente} />
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {f.estatus}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Totales</td>
                      <td className="px-3 py-2 font-bold text-green-700"><Currency value={cxpRango.reduce((a, f) => a + f.total, 0)} /></td>
                      <td className="px-3 py-2 font-bold text-orange-600"><Currency value={cxpPendienteRango} /></td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  )
}
