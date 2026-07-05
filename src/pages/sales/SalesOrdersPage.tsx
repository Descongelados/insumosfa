import { useState } from 'react'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { useClientsStore } from '../../store/clientsStore'
import { useProductsStore } from '../../store/productsStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import type { SalesOrder, SalesOrderItem, PedidoEstatus } from '../../types'
import { ShoppingCart, Edit2 } from 'lucide-react'

const ESTADOS: PedidoEstatus[] = ['nuevo', 'confirmado', 'surtiendo', 'embarcado', 'entregado', 'facturado', 'cerrado']

export function SalesOrdersPage() {
  const { orders, updateOrder } = useSalesOrdersStore()
  const { clients } = useClientsStore()
  const { products } = useProductsStore()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [sel, setSel] = useState<SalesOrder | null>(null)

  const filtered = orders.filter((o) => {
    const client = clients.find((c) => c.clientId === o.clienteId)
    return [o.folio, client?.razonSocial ?? ''].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  function openEdit(o: SalesOrder) { setSel(o); setModal(true) }

  function handleStatusChange(status: PedidoEstatus) {
    if (sel) updateOrder(sel.pedidoId, { estatus: status })
    setModal(false)
    setSel(null)
  }

  const byStatus = ESTADOS.map((e) => ({ e, count: orders.filter((o) => o.estatus === e).length }))

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><ShoppingCart size={24} /> Pedidos de Venta</h1>
          <p className="page-subtitle">{orders.length} pedidos en total</p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {byStatus.map(({ e, count }) => (
          <div key={e} className="card-sm flex-shrink-0 min-w-[110px] text-center">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <StatusBadge status={e} />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex justify-between mb-4">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar folio o cliente..." />
        </div>
        <DataTable
          data={filtered}
          rowKey={(o) => o.pedidoId}
          columns={[
            { key: 'folio', header: 'Folio', render: (o) => <span className="font-mono font-semibold text-blue-700">{o.folio}</span> },
            { key: 'cliente', header: 'Cliente', render: (o) => clients.find(c => c.clientId === o.clienteId)?.razonSocial ?? '-' },
            { key: 'fechaPedido', header: 'Fecha Pedido' },
            { key: 'fechaEntrega', header: 'Fecha Entrega', render: (o) => o.fechaEntrega || '-' },
            { key: 'items', header: 'Partidas', render: (o) => o.items.length },
            { key: 'total', header: 'Total', render: (o) => <Currency value={o.total} /> },
            { key: 'estatus', header: 'Estatus', render: (o) => <StatusBadge status={o.estatus} /> },
            {
              key: 'acc', header: '', render: (o) => (
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(o)}>
                  <Edit2 size={13} /> Estatus
                </button>
              )
            },
          ]}
        />
      </div>

      {modal && sel && (
        <Modal title={`Pedido ${sel.folio}`} onClose={() => setModal(false)} size="lg"
          footer={<button className="btn-secondary" onClick={() => setModal(false)}>Cerrar</button>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Cliente:</span> <strong>{clients.find(c => c.clientId === sel.clienteId)?.razonSocial}</strong></div>
              <div><span className="text-gray-500">Total:</span> <Currency value={sel.total} /></div>
              <div><span className="text-gray-500">Estatus actual:</span> <StatusBadge status={sel.estatus} /></div>
              <div><span className="text-gray-500">F. Pedido:</span> {sel.fechaPedido}</div>
            </div>
            <div>
              <p className="label mb-2">Detalle de partidas</p>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>SKU</th><th>Descripción</th><th>Cant</th><th>Precio</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {sel.items.map((it: SalesOrderItem) => {
                      const prod = products.find(p => p.productId === it.productId)
                      return (
                        <tr key={it.detalleId}>
                          <td className="font-mono text-xs">{prod?.sku}</td>
                          <td>{prod?.descripcion}</td>
                          <td>{it.cantidad}</td>
                          <td><Currency value={it.precio} /></td>
                          <td className="font-semibold"><Currency value={it.cantidad * it.precio * (1 - it.descuento / 100)} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <p className="label mb-2">Cambiar estatus</p>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.map((e) => (
                  <button key={e} className={`btn btn-sm ${sel.estatus === e ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleStatusChange(e)}>
                    <StatusBadge status={e} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
