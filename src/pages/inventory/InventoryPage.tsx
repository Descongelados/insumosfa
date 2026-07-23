import { useState, useEffect } from 'react'
import { useInventoryStore } from '../../store/inventoryStore'
import { useProductsStore } from '../../store/productsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { Modal } from '../../components/ui/Modal'
import { toast } from '../../store/toastStore'
import type { MovimientoTipo } from '../../types'
import { Warehouse, CirclePlus as PlusCircle, History, Pencil, Check, X } from 'lucide-react'

const TIPOS: MovimientoTipo[] = ['EntradaCompra', 'SalidaVenta', 'Transferencia', 'Ajuste', 'Merma', 'Devolucion']
const TIPO_LABELS: Record<MovimientoTipo, string> = {
  EntradaCompra: 'Entrada Compra', SalidaVenta: 'Salida Venta',
  Transferencia: 'Transferencia', Ajuste: 'Ajuste', Merma: 'Merma', Devolucion: 'Devolución'
}

export function InventoryPage() {
  const { inventario, kardex, loadInventory, loadKardexByProduct, setActiveProductId, subscribeRealtime: subInventory, applyMovimiento, updateCantidadDisponible } = useInventoryStore()
  const { products, loadProducts, subscribeRealtime: subProducts } = useProductsStore()
  const { user } = useAuthStore()

  const isAdmin = user ? hasRole(user, 'director', 'administracion') : false

  useEffect(() => {
    void loadInventory()
    void loadProducts()
    const u1 = subInventory()
    const u2 = subProducts()
    return () => {
      u1()
      u2()
      setActiveProductId(null)
    }
  }, [])

  const [q, setQ] = useState('')
  const [view, setView] = useState<'stock' | 'kardex'>('stock')

  // kardex: producto activo en el selector
  const [kardexProdId, setKardexProdId] = useState('')

  useEffect(() => {
    if (view !== 'kardex') {
      setActiveProductId(null)
      return
    }
    if (!kardexProdId) return
    setActiveProductId(kardexProdId)
    void loadKardexByProduct(kardexProdId)
  }, [view, kardexProdId])
  const [modal, setModal] = useState(false)
  const [selProd, setSelProd] = useState('')
  const [form, setForm] = useState({ tipo: TIPOS[0], cantidad: 1, doc: '', notas: '' })

  // edición inline de cantidad disponible
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState<number>(0)

  function startEdit(inventarioId: string, actual: number) {
    setEditingId(inventarioId)
    setEditQty(actual)
  }
  function cancelEdit() { setEditingId(null) }
  async function confirmEdit(productId: string) {
    if (editQty < 0) { toast.error('La cantidad no puede ser negativa.'); return }
    await updateCantidadDisponible(productId, editQty, user?.email ?? 'admin')
    toast.success(`Cantidad actualizada a ${editQty}.`)
    setEditingId(null)
  }

  const enriched = inventario.map((inv) => {
    const prod = products.find((p) => p.productId === inv.productId)
    return { ...inv, prod }
  }).filter((i) => {
    if (!q) return true
    return [i.prod?.sku ?? '', i.prod?.descripcion ?? '', i.prod?.categoria ?? '']
      .join(' ').toLowerCase().includes(q.toLowerCase())
  })

  const kdx = kardex.map((k) => ({
    ...k,
    prod: products.find((p) => p.productId === k.productId),
  })).filter((k) => {
    if (!q) return true
    return [k.prod?.sku ?? '', k.prod?.descripcion ?? ''].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  // producto seleccionado en el selector de kardex
  const kardexProd = products.find((p) => p.productId === kardexProdId)

  function handleMovimiento() {
    if (!selProd) { toast.error('Selecciona un producto.'); return }
    if (form.cantidad <= 0) { toast.error('La cantidad debe ser mayor a cero.'); return }
    applyMovimiento({
      productId: selProd,
      tipo: form.tipo,
      cantidad: form.cantidad,
      documentoOrigen: form.doc || 'Manual',
      usuario: user?.email ?? 'sistema',
      notas: form.notas,
    })
    const prod = products.find(p => p.productId === selProd)
    toast.success(`Movimiento registrado: ${form.tipo} x${form.cantidad} — ${prod?.sku ?? selProd}`)
    setModal(false)
    setForm({ tipo: TIPOS[0], cantidad: 1, doc: '', notas: '' })
    setSelProd('')
  }

  const alertas = inventario.filter((i) => i.cantidadDisponible < 50)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Warehouse size={24} /> Inventario</h1>
          <p className="page-subtitle">{inventario.length} productos en almacén</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}><PlusCircle size={16} /> Registrar Movimiento</button>
      </div>

      {alertas.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          ⚠️ {alertas.length} producto(s) con stock bajo (menos de 50 unidades):
          <span className="font-semibold"> {alertas.map((a) => products.find(p => p.productId === a.productId)?.sku).join(', ')}</span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        <button className={`btn ${view === 'stock' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('stock')}>
          <Warehouse size={15} /> Stock Actual
        </button>
        <button className={`btn ${view === 'kardex' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('kardex')}>
          <History size={15} /> Kardex
        </button>
        {view === 'kardex' && (
          <select
            className="select text-sm py-1 min-w-[220px]"
            value={kardexProdId}
            onChange={(e) => setKardexProdId(e.target.value)}
          >
            <option value="">— Seleccionar producto —</option>
            {products.filter(p => p.activo).map((p) => (
              <option key={p.productId} value={p.productId}>{p.sku} — {p.descripcion}</option>
            ))}
          </select>
        )}
      </div>

      <div className="card">
        <div className="mb-4">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar SKU o descripción..." />
        </div>

        {view === 'stock' ? (
          <DataTable
            data={enriched}
            rowKey={(i) => i.inventarioId}
            columns={[
              { key: 'sku', header: 'SKU', render: (i) => <span className="font-mono text-xs font-semibold text-blue-700">{i.prod?.sku}</span> },
              { key: 'desc', header: 'Descripción', render: (i) => i.prod?.descripcion ?? '-' },
              { key: 'cat', header: 'Categoría', render: (i) => i.prod?.categoria ?? '-' },
              { key: 'um', header: 'UM', render: (i) => i.prod?.unidadMedida ?? '-' },
              { key: 'disp', header: 'Disponible', render: (i) => (
                editingId === i.inventarioId ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      className="input w-24 py-0.5 text-sm"
                      value={editQty}
                      min={0}
                      autoFocus
                      onChange={e => setEditQty(Number(e.target.value))}
                      onKeyDown={e => { if (e.key === 'Enter') void confirmEdit(i.productId); if (e.key === 'Escape') cancelEdit() }}
                    />
                    <button className="btn btn-success btn-sm p-1" onClick={() => void confirmEdit(i.productId)} title="Guardar"><Check size={13} /></button>
                    <button className="btn btn-secondary btn-sm p-1" onClick={cancelEdit} title="Cancelar"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${i.cantidadDisponible < 50 ? 'text-red-600' : 'text-green-700'}`}>
                      {i.cantidadDisponible.toLocaleString('es-MX')}
                    </span>
                    {isAdmin && (
                      <button
                        className="btn btn-secondary btn-sm p-0.5 opacity-50 hover:opacity-100"
                        title="Editar cantidad"
                        onClick={() => startEdit(i.inventarioId, i.cantidadDisponible)}
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                  </div>
                )
              )},
              { key: 'comp', header: 'Comprometido', render: (i) => <span className="text-yellow-700">{i.cantidadComprometida}</span> },
              { key: 'tran', header: 'Tránsito', render: (i) => <span className="text-blue-700">{i.cantidadTransito}</span> },
              { key: 'valor', header: 'Valor', render: (i) => {
                const val = i.cantidadDisponible * (i.prod?.costoPromedio ?? 0)
                return val.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
              }},
            ]}
          />
        ) : (
          <>
            {!kardexProdId ? (
              <p className="text-sm text-gray-500 py-6 text-center">Selecciona un producto para ver su kardex.</p>
            ) : (
              <>
                {kardexProd && (
                  <p className="mb-3 text-sm text-gray-600">
                    Mostrando kardex de <span className="font-semibold text-blue-700">{kardexProd.sku}</span> — {kardexProd.descripcion}
                  </p>
                )}
                <DataTable
                  data={kdx}
                  rowKey={(k) => k.movimientoId}
                  columns={[
                    { key: 'fecha', header: 'Fecha' },
                    { key: 'tipo', header: 'Tipo', render: (k) => <span className="badge badge-blue">{TIPO_LABELS[k.tipo]}</span> },
                    { key: 'doc', header: 'Documento', render: (k) => k.documentoOrigen },
                    { key: 'cant', header: 'Cantidad', render: (k) => k.cantidad },
                    { key: 'ante', header: 'Exist. Anterior', render: (k) => k.existenciaAnterior },
                    { key: 'nueva', header: 'Exist. Nueva', render: (k) => <span className="font-semibold">{k.existenciaNueva}</span> },
                    { key: 'usr', header: 'Usuario', render: (k) => <span className="text-xs text-gray-500">{k.usuario}</span> },
                  ]}
                />
              </>
            )}
          </>
        )}
      </div>

      {modal && (
        <Modal title="Registrar Movimiento de Inventario" onClose={() => setModal(false)}
          footer={<><button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn-primary" onClick={handleMovimiento}>Registrar</button></>}
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Producto *</label>
              <select className="select" value={selProd} onChange={(e) => setSelProd(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {products.filter(p => p.activo).map((p) => (
                  <option key={p.productId} value={p.productId}>{p.sku} — {p.descripcion}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Tipo de Movimiento *</label>
              <select className="select" value={form.tipo} onChange={(e) => setForm(f => ({ ...f, tipo: e.target.value as MovimientoTipo }))}>
                {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Cantidad *</label>
                <input type="number" className="input" value={form.cantidad} min={1} onChange={(e) => setForm(f => ({ ...f, cantidad: Number(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label className="label">Documento Origen</label>
                <input className="input" value={form.doc} onChange={(e) => setForm(f => ({ ...f, doc: e.target.value }))} placeholder="OC-001, PV-001..." />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Notas</label>
              <textarea className="textarea" rows={2} value={form.notas} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
