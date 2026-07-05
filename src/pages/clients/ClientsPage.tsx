import { useState } from 'react'
import { useClientsStore } from '../../store/clientsStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import type { Client } from '../../types'
import { Plus, Edit2, Users } from 'lucide-react'

const REGIMENES = [
  '601 - General de Ley Personas Morales',
  '603 - Personas Morales con Fines no Lucrativos',
  '606 - Arrendamiento',
  '612 - Personas Físicas con Actividades Empresariales',
  '616 - Sin Obligaciones Fiscales',
  '621 - Incorporación Fiscal',
  '626 - Régimen Simplificado de Confianza',
]

const BLANK: Omit<Client, 'clientId' | 'fechaAlta'> = {
  razonSocial: '', rfc: '', regimenFiscal: REGIMENES[0],
  direccionFiscal: '', correo: '', telefono: '', limiteCredito: 0, estatus: 'activo',
}

export function ClientsPage() {
  const { clients, addClient, updateClient } = useClientsStore()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<'new' | 'edit' | null>(null)
  const [form, setForm] = useState(BLANK)
  const [editId, setEditId] = useState<string | null>(null)

  const filtered = clients.filter((c) =>
    [c.razonSocial, c.rfc, c.correo].join(' ').toLowerCase().includes(q.toLowerCase())
  )

  function openNew() { setForm(BLANK); setEditId(null); setModal('new') }
  function openEdit(c: Client) {
    const { clientId, fechaAlta, ...rest } = c
    setForm(rest); setEditId(c.clientId); setModal('edit')
  }

  function handleSave() {
    if (editId) updateClient(editId, form)
    else addClient(form)
    setModal(null)
  }

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: k === 'limiteCredito' ? Number(e.target.value) : e.target.value }))

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users size={24} /> Clientes</h1>
          <p className="page-subtitle">{clients.length} clientes registrados</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Cliente</button>
      </div>

      <div className="card">
        <div className="flex justify-between mb-4">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar por nombre, RFC..." />
          <div className="text-sm text-gray-500 self-center">{filtered.length} resultados</div>
        </div>

        <DataTable
          data={filtered}
          rowKey={(c) => c.clientId}
          columns={[
            { key: 'razonSocial', header: 'Razón Social' },
            { key: 'rfc', header: 'RFC' },
            { key: 'correo', header: 'Correo' },
            { key: 'telefono', header: 'Teléfono' },
            { key: 'limiteCredito', header: 'Límite Crédito', render: (c) => <Currency value={c.limiteCredito} /> },
            { key: 'estatus', header: 'Estatus', render: (c) => <StatusBadge status={c.estatus} /> },
            { key: 'fechaAlta', header: 'Alta' },
            {
              key: 'acciones', header: '', render: (c) => (
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>
                  <Edit2 size={13} /> Editar
                </button>
              )
            },
          ]}
        />
      </div>

      {modal && (
        <Modal
          title={modal === 'new' ? 'Nuevo Cliente' : 'Editar Cliente'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>Guardar</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group sm:col-span-2">
              <label className="label">Razón Social *</label>
              <input className="input" value={form.razonSocial} onChange={F('razonSocial')} required />
            </div>
            <div className="form-group">
              <label className="label">RFC *</label>
              <input className="input" value={form.rfc} onChange={F('rfc')} maxLength={13} />
            </div>
            <div className="form-group">
              <label className="label">Régimen Fiscal</label>
              <select className="select" value={form.regimenFiscal} onChange={F('regimenFiscal')}>
                {REGIMENES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group sm:col-span-2">
              <label className="label">Dirección Fiscal</label>
              <input className="input" value={form.direccionFiscal} onChange={F('direccionFiscal')} />
            </div>
            <div className="form-group">
              <label className="label">Correo</label>
              <input type="email" className="input" value={form.correo} onChange={F('correo')} />
            </div>
            <div className="form-group">
              <label className="label">Teléfono</label>
              <input className="input" value={form.telefono} onChange={F('telefono')} />
            </div>
            <div className="form-group">
              <label className="label">Límite de Crédito (MXN)</label>
              <input type="number" className="input" value={form.limiteCredito} onChange={F('limiteCredito')} min={0} />
            </div>
            <div className="form-group">
              <label className="label">Estatus</label>
              <select className="select" value={form.estatus} onChange={F('estatus')}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
