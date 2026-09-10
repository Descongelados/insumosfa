import { useState } from 'react'
import { useProspectsStore } from '../../store/prospectsStore'
import type { DatosFiscales } from '../../store/prospectsStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { DataTable } from '../../components/ui/DataTable'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import { toast } from '../../store/toastStore'
import type { Prospect, ProspectoEstatus } from '../../types'
import { Plus, Edit2, UserSearch, Trash2, UserCheck, ArrowRight } from 'lucide-react'

// 'ganado' NO aparece en el selector de estatus — se alcanza solo mediante el flujo
const ESTADOS_EDITABLES: ProspectoEstatus[] = ['nuevo', 'contactado', 'calificado', 'cotizado', 'perdido']
const ESTADOS_PIPELINE: ProspectoEstatus[] = ['nuevo', 'contactado', 'calificado', 'cotizado', 'ganado', 'perdido']
const ORIGENES = ['Referido', 'LinkedIn', 'Expo', 'Web', 'Llamada', 'Visita', 'Otro']

const REGIMENES = [
  '601 - General de Ley Personas Morales',
  '603 - Personas Morales con Fines no Lucrativos',
  '606 - Arrendamiento',
  '612 - Personas Físicas con Actividades Empresariales',
  '616 - Sin Obligaciones Fiscales',
  '621 - Incorporación Fiscal',
  '626 - Régimen Simplificado de Confianza',
]

const BLANK: Omit<Prospect, 'prospectoId' | 'fechaAlta'> = {
  empresa: '', contacto: '', correo: '', telefono: '',
  origen: ORIGENES[0], estatus: 'nuevo', valorPotencial: 0,
  creadoPor: '', ciudad: '', productosActividad: '',
}

const BLANK_FISCAL: DatosFiscales = {
  rfc: '', regimenFiscal: REGIMENES[0], direccionFiscal: '', limiteCredito: 0,
}

export function ProspectsPage() {
  const { prospects, addProspect, updateProspect, deleteProspect, convertirACliente } = useProspectsStore()
  const { user: me } = useAuthStore()

  const [q, setQ] = useState('')
  const [modal, setModal] = useState<'new' | 'edit' | 'del' | 'convert' | 'marcar_ganado' | null>(null)
  const [form, setForm] = useState(BLANK)
  const [editId, setEditId] = useState<string | null>(null)
  const [delTarget, setDelTarget] = useState<Prospect | null>(null)
  const [convertTarget, setConvertTarget] = useState<Prospect | null>(null)
  const [fiscal, setFiscal] = useState<DatosFiscales>(BLANK_FISCAL)

  const canDelete = me ? hasRole(me, 'director', 'ventas', 'administracion') : false
  const canConvert = me ? hasRole(me, 'director', 'ventas', 'administracion') : false

  // Prospectos activos en pipeline (excluye los ya ganados que aún no se han convertido)
  const filtered = prospects.filter((p) =>
    [p.empresa, p.contacto, p.correo].join(' ').toLowerCase().includes(q.toLowerCase())
  )

  // ── Editar ─────────────────────────────────────────────────────────────────
  function openNew() { setForm(BLANK); setEditId(null); setModal('new') }
  function openEdit(p: Prospect) {
    const { prospectoId, fechaAlta, ...rest } = p
    setForm(rest); setEditId(p.prospectoId); setModal('edit')
  }

  function handleSave() {
    if (!form.empresa.trim()) { toast.error('La empresa es obligatoria.'); return }
    if (editId) { updateProspect(editId, form); toast.success('Prospecto actualizado.') }
    else { addProspect(form); toast.success('Prospecto creado.') }
    setModal(null)
  }

  // ── Marcar como Ganado (paso previo a convertir) ───────────────────────────
  function openMarcarGanado(p: Prospect) {
    setConvertTarget(p)
    setModal('marcar_ganado')
  }
  function handleMarcarGanado() {
    if (!convertTarget) return
    updateProspect(convertTarget.prospectoId, { estatus: 'ganado' })
    toast.success(`"${convertTarget.empresa}" marcado como Ganado. Ahora puedes convertirlo a cliente.`)
    setModal(null)
    setConvertTarget(null)
  }

  // ── Convertir a Cliente ────────────────────────────────────────────────────
  function openConvert(p: Prospect) {
    setConvertTarget(p)
    setFiscal({ ...BLANK_FISCAL, rfc: '' })
    setModal('convert')
  }

  function handleConvert() {
    if (!convertTarget) return
    if (!fiscal.rfc.trim()) { toast.error('El RFC es obligatorio para crear el cliente.'); return }
    if (!fiscal.direccionFiscal.trim()) { toast.error('La dirección fiscal es obligatoria.'); return }
    convertirACliente(convertTarget.prospectoId, fiscal)
    toast.success(`¡"${convertTarget.empresa}" convertido a cliente exitosamente!`)
    setModal(null)
    setConvertTarget(null)
    setFiscal(BLANK_FISCAL)
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────
  function openDel(p: Prospect) { setDelTarget(p); setModal('del') }
  function handleDelete() {
    if (delTarget) { deleteProspect(delTarget.prospectoId); toast.success(`Prospecto "${delTarget.empresa}" eliminado.`) }
    setModal(null); setDelTarget(null)
  }

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: k === 'valorPotencial' ? Number(e.target.value) : e.target.value }))
  const FF = (k: keyof DatosFiscales) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFiscal((prev) => ({ ...prev, [k]: k === 'limiteCredito' ? Number(e.target.value) : e.target.value }))

  const byStatus = ESTADOS_PIPELINE.map((e) => ({ e, count: prospects.filter((p) => p.estatus === e).length }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><UserSearch size={24} /> Prospectos</h1>
          <p className="page-subtitle">CRM — Pipeline de ventas. Los clientes nacen aquí.</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Prospecto</button>
      </div>

      {/* Pipeline counters */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {byStatus.map(({ e, count }) => (
          <div key={e} className={`card-sm flex-shrink-0 min-w-[100px] text-center ${e === 'ganado' ? 'border-green-300 bg-green-50' : ''}`}>
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <StatusBadge status={e} />
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="flex justify-between mb-4">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar empresa o contacto..." />
        </div>
        <DataTable
          data={filtered}
          rowKey={(p) => p.prospectoId}
          columns={[
            { key: 'empresa', header: 'Empresa' },
            { key: 'contacto', header: 'Contacto' },
            { key: 'correo', header: 'Correo' },
            { key: 'origen', header: 'Origen' },
            { key: 'valorPotencial', header: 'Valor Potencial', render: (p) => <Currency value={p.valorPotencial} /> },
            { key: 'estatus', header: 'Estatus', render: (p) => <StatusBadge status={p.estatus} /> },
            { key: 'fechaAlta', header: 'Fecha Alta' },
            {
              key: 'acciones', header: '', render: (p) => (
                <div className="flex gap-1 flex-wrap">
                  {/* Prospecto aún no ganado: editar + marcar ganado si está cotizado */}
                  {p.estatus !== 'ganado' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                      <Edit2 size={13} /> Editar
                    </button>
                  )}
                  {/* Solo se puede marcar como ganado cuando está en cotizado */}
                  {p.estatus === 'cotizado' && canConvert && (
                    <button className="btn btn-success btn-sm" onClick={() => openMarcarGanado(p)}>
                      <UserCheck size={13} /> Ganado
                    </button>
                  )}
                  {/* Convertir a cliente — solo disponible en estatus ganado */}
                  {p.estatus === 'ganado' && canConvert && (
                    <button className="btn btn-primary btn-sm" onClick={() => openConvert(p)}>
                      <ArrowRight size={13} /> Convertir a Cliente
                    </button>
                  )}
                  {canDelete && p.estatus !== 'ganado' && (
                    <button className="btn btn-danger btn-sm" onClick={() => openDel(p)} title="Eliminar">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )
            },
          ]}
        />
      </div>

      {/* ── Modal: Nuevo / Editar ──────────────────────────────────────────── */}
      {(modal === 'new' || modal === 'edit') && (
        <Modal
          title={modal === 'new' ? 'Nuevo Prospecto' : 'Editar Prospecto'}
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
              <label className="label">Empresa *</label>
              <input className="input" value={form.empresa} onChange={F('empresa')} />
            </div>
            <div className="form-group">
              <label className="label">Contacto</label>
              <input className="input" value={form.contacto} onChange={F('contacto')} />
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
              <label className="label">Origen</label>
              <select className="select" value={form.origen} onChange={F('origen')}>
                {ORIGENES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Valor Potencial (MXN)</label>
              <input type="number" className="input" value={form.valorPotencial} onChange={F('valorPotencial')} min={0} />
            </div>
            <div className="form-group">
              <label className="label">Estatus</label>
              <select className="select" value={form.estatus} onChange={F('estatus')}>
                {/* 'ganado' no aparece aquí — se alcanza con el botón dedicado */}
                {ESTADOS_EDITABLES.map((e) => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Confirmar Marcar como Ganado ───────────────────────────── */}
      {modal === 'marcar_ganado' && convertTarget && (
        <Modal
          title="Marcar como Ganado"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-success" onClick={handleMarcarGanado}>
                <UserCheck size={14} /> Confirmar — Ganado
              </button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>¿Confirmas que el prospecto <strong>{convertTarget.empresa}</strong> fue ganado?</p>
            <p className="text-gray-500">Una vez marcado como <strong>Ganado</strong> aparecerá el botón <em>"Convertir a Cliente"</em> para completar el alta.</p>
          </div>
        </Modal>
      )}

      {/* ── Modal: Convertir a Cliente ────────────────────────────────────── */}
      {modal === 'convert' && convertTarget && (
        <Modal
          title={`Convertir a Cliente — ${convertTarget.empresa}`}
          onClose={() => setModal(null)}
          size="lg"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleConvert}>
                <ArrowRight size={14} /> Crear Cliente
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Resumen del prospecto */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm space-y-1">
              <div className="font-semibold text-green-800">{convertTarget.empresa} — Prospecto Ganado ✓</div>
              <div className="text-green-700">{convertTarget.contacto} · {convertTarget.correo} · {convertTarget.telefono}</div>
            </div>
            <p className="text-sm text-gray-500">Completa los datos fiscales para finalizar el alta del cliente:</p>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">RFC *</label>
                <input className="input" value={fiscal.rfc} onChange={FF('rfc')} maxLength={13} placeholder="Ej. AAA010101AAA" />
              </div>
              <div className="form-group">
                <label className="label">Régimen Fiscal</label>
                <select className="select" value={fiscal.regimenFiscal} onChange={FF('regimenFiscal')}>
                  {REGIMENES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group sm:col-span-2">
                <label className="label">Dirección Fiscal *</label>
                <input className="input" value={fiscal.direccionFiscal} onChange={FF('direccionFiscal')} placeholder="Calle, número, ciudad, estado" />
              </div>
              <div className="form-group">
                <label className="label">Límite de Crédito (MXN)</label>
                <input type="number" className="input" value={fiscal.limiteCredito} onChange={FF('limiteCredito')} min={0} step={1000} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Eliminar ───────────────────────────────────────────────── */}
      {modal === 'del' && delTarget && (
        <Modal
          title="Eliminar prospecto"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar definitivamente</button>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            ¿Estás seguro de que deseas eliminar el prospecto <strong>{delTarget.empresa}</strong>? Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  )
}
