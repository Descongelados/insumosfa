import { useState } from 'react'
import { useProductsStore } from '../../store/productsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import type { Product } from '../../types'
import { Plus, Edit2, Trash2, Package, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'

// Roles que pueden eliminar productos
const DELETE_ROLES = ['director', 'administracion', 'compras'] as const

const CATEGORIAS = ['PVC', 'Tornillería', 'Eléctrico', 'Válvulas', 'Perfiles', 'Cementantes', 'Hidráulica', 'Herramientas', 'Otro']
const UNIDADES = ['PZA', 'MT', 'KG', 'LT', 'SAC', 'CJA', 'ROL', 'TON']

const BLANK: Omit<Product, 'productId'> = {
  sku: '', descripcion: '', categoria: CATEGORIAS[0], marca: '',
  unidadMedida: UNIDADES[0], costoPromedio: 0, precioVenta: 0, activo: true,
}

export function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, toggleProduct } = useProductsStore()
  const { user: me } = useAuthStore()

  const canDelete = me ? hasRole(me, ...DELETE_ROLES) : false

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Todos')
  const [modal, setModal] = useState<'new' | 'edit' | 'confirm_delete' | null>(null)
  const [form, setForm] = useState(BLANK)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const cats = ['Todos', ...Array.from(new Set(products.map((p) => p.categoria)))]

  const filtered = products.filter((p) => {
    const matchQ = [p.sku, p.descripcion, p.marca].join(' ').toLowerCase().includes(q.toLowerCase())
    const matchCat = cat === 'Todos' || p.categoria === cat
    return matchQ && matchCat
  })

  function openNew() { setForm(BLANK); setEditId(null); setModal('new') }
  function openEdit(p: Product) {
    const { productId, ...rest } = p
    setForm(rest); setEditId(p.productId); setModal('edit')
  }
  function openDelete(p: Product) { setDeleteTarget(p); setModal('confirm_delete') }

  function handleSave() {
    if (editId) updateProduct(editId, form)
    else addProduct(form)
    setModal(null)
  }

  function handleDelete() {
    if (deleteTarget) deleteProduct(deleteTarget.productId)
    setModal(null)
    setDeleteTarget(null)
  }

  const N = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: Number(e.target.value) }))
  const S = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const margen = (p: Product) => p.costoPromedio > 0 ? ((p.precioVenta - p.costoPromedio) / p.costoPromedio * 100).toFixed(1) + '%' : '-'

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Package size={24} /> Productos</h1>
          <p className="page-subtitle">{products.filter(p => p.activo).length} activos / {products.length} total</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Producto</button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <SearchBar value={q} onChange={setQ} placeholder="SKU, descripción, marca..." />
          <select className="select w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <DataTable
          data={filtered}
          rowKey={(p) => p.productId}
          columns={[
            { key: 'sku', header: 'SKU', render: (p) => <span className="font-mono text-xs font-semibold text-blue-700">{p.sku}</span> },
            { key: 'descripcion', header: 'Descripción' },
            { key: 'categoria', header: 'Categoría' },
            { key: 'marca', header: 'Marca' },
            { key: 'unidadMedida', header: 'UM' },
            { key: 'costoPromedio', header: 'Costo', render: (p) => <Currency value={p.costoPromedio} /> },
            { key: 'precioVenta', header: 'Precio Venta', render: (p) => <Currency value={p.precioVenta} /> },
            { key: 'margen', header: 'Margen', render: margen },
            { key: 'activo', header: 'Estatus', render: (p) => <StatusBadge status={p.activo ? 'activo' : 'inactivo'} /> },
            {
              key: 'acciones', header: '', render: (p) => (
                <div className="flex gap-1">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)} title="Editar"><Edit2 size={13} /></button>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleProduct(p.productId)} title={p.activo ? 'Desactivar' : 'Activar'}>
                    {p.activo ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} className="text-gray-400" />}
                  </button>
                  {canDelete && (
                    <button className="btn btn-danger btn-sm" onClick={() => openDelete(p)} title="Eliminar producto">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )
            },
          ]}
        />
      </div>

      {(modal === 'new' || modal === 'edit') && (
        <Modal
          title={modal === 'new' ? 'Nuevo Producto' : 'Editar Producto'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>Guardar</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="label">SKU *</label>
              <input className="input font-mono" value={form.sku} onChange={S('sku')} required />
            </div>
            <div className="form-group">
              <label className="label">Marca</label>
              <input className="input" value={form.marca} onChange={S('marca')} />
            </div>
            <div className="form-group sm:col-span-2">
              <label className="label">Descripción *</label>
              <input className="input" value={form.descripcion} onChange={S('descripcion')} required />
            </div>
            <div className="form-group">
              <label className="label">Categoría</label>
              <select className="select" value={form.categoria} onChange={S('categoria')}>
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Unidad de Medida</label>
              <select className="select" value={form.unidadMedida} onChange={S('unidadMedida')}>
                {UNIDADES.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Costo Promedio (MXN)</label>
              <input type="number" className="input" value={form.costoPromedio} onChange={N('costoPromedio')} min={0} step="0.01" />
            </div>
            <div className="form-group">
              <label className="label">Precio de Venta (MXN)</label>
              <input type="number" className="input" value={form.precioVenta} onChange={N('precioVenta')} min={0} step="0.01" />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Confirmar eliminación ──────────────────────────────── */}
      {modal === 'confirm_delete' && deleteTarget && (
        <Modal
          title="Eliminar producto"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-danger" onClick={handleDelete}>
                <Trash2 size={14} /> Eliminar definitivamente
              </button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>¿Estás seguro de que deseas eliminar el producto:</p>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
              <div className="font-mono font-semibold text-blue-700">{deleteTarget.sku}</div>
              <div className="font-medium text-gray-900">{deleteTarget.descripcion}</div>
              <div className="text-gray-500">{deleteTarget.categoria} · {deleteTarget.marca}</div>
              <div className="mt-1"><StatusBadge status={deleteTarget.activo ? 'activo' : 'inactivo'} /></div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>Se eliminarán también los movimientos de inventario asociados a este SKU. Esta acción no se puede deshacer.</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
