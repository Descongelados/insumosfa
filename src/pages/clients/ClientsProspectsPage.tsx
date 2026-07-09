import { useState, useEffect, useRef } from 'react'
import { useClientsStore } from '../../store/clientsStore'
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
import type { Client, Prospect, ProspectoEstatus } from '../../types'
import { Users, UserSearch, Plus, CreditCard as Edit2, Trash2, UserCheck, ArrowRight, Info, CircleAlert as AlertCircle, MessageSquare, Send } from 'lucide-react'

// ── Shared constants ─────────────────────────────────────────────────────────
const REGIMENES = [
  '601 - General de Ley Personas Morales',
  '603 - Personas Morales con Fines no Lucrativos',
  '606 - Arrendamiento',
  '612 - Personas Físicas con Actividades Empresariales',
  '616 - Sin Obligaciones Fiscales',
  '621 - Incorporación Fiscal',
  '626 - Régimen Simplificado de Confianza',
]

// ── Prospects constants ───────────────────────────────────────────────────────
const ESTADOS_EDITABLES: ProspectoEstatus[] = ['nuevo', 'contactado', 'calificado', 'cotizado', 'perdido']
const ESTADOS_PIPELINE:  ProspectoEstatus[] = ['nuevo', 'contactado', 'calificado', 'cotizado', 'ganado', 'perdido']
const ORIGENES = ['Referido', 'LinkedIn', 'Expo', 'Web', 'Llamada', 'Visita', 'Otro']

const BLANK_PROSPECT: Omit<Prospect, 'prospectoId' | 'fechaAlta'> = {
  empresa: '', contacto: '', correo: '', telefono: '',
  origen: ORIGENES[0], estatus: 'nuevo', valorPotencial: 0,
}
const BLANK_FISCAL: DatosFiscales = {
  rfc: '', regimenFiscal: REGIMENES[0], direccionFiscal: '', limiteCredito: 0,
}

// ── Clients constants ─────────────────────────────────────────────────────────
const BLANK_CLIENT: Omit<Client, 'clientId' | 'fechaAlta'> = {
  razonSocial: '', rfc: '', regimenFiscal: REGIMENES[0],
  direccionFiscal: '', correo: '', telefono: '', limiteCredito: 0, estatus: 'activo',
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtNoteDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

export function ClientsProspectsPage() {
  const { clients, loadClients, subscribeRealtime: subClients, updateClient, deleteClient, clientNotes, addClientNote, removeClientNote } = useClientsStore()
  const { prospects, loadProspects, subscribeRealtime: subProspects, addProspect, updateProspect, deleteProspect, convertirACliente, prospectNotes, addProspectNote, removeProspectNote } = useProspectsStore()
  const { user: me } = useAuthStore()

  useEffect(() => {
    void loadClients()
    void loadProspects()
    const u1 = subClients()
    const u2 = subProspects()
    return () => { u1(); u2() }
  }, [])

  const [tab, setTab] = useState<'prospectos' | 'clientes'>('prospectos')

  // ── permissions ────────────────────────────────────────────────────────────
  const canDeleteClient    = me ? hasRole(me, 'director', 'administracion', 'ventas') : false
  const canDeleteProspect  = me ? hasRole(me, 'director', 'ventas', 'administracion') : false
  const canConvert         = me ? hasRole(me, 'director', 'ventas', 'administracion') : false

  // ── search ─────────────────────────────────────────────────────────────────
  const [qP, setQP] = useState('')
  const [qC, setQC] = useState('')

  // ── prospect state ─────────────────────────────────────────────────────────
  type PModal = 'new' | 'edit' | 'del' | 'convert' | 'marcar_ganado' | null
  const [pModal, setPModal] = useState<PModal>(null)
  const [pForm, setPForm] = useState(BLANK_PROSPECT)
  const [pEditId, setPEditId] = useState<string | null>(null)
  const [pDelTarget, setPDelTarget] = useState<Prospect | null>(null)
  const [pConvTarget, setPConvTarget] = useState<Prospect | null>(null)
  const [fiscal, setFiscal] = useState<DatosFiscales>(BLANK_FISCAL)

  // ── client state ───────────────────────────────────────────────────────────
  type CModal = 'edit' | 'confirm_delete' | null
  const [cModal, setCModal] = useState<CModal>(null)
  const [cForm, setCForm] = useState(BLANK_CLIENT)
  const [cEditId, setCEditId] = useState<string | null>(null)
  const [cDelTarget, setCDelTarget] = useState<Client | null>(null)

  // ── notes state ────────────────────────────────────────────────────────────
  type NotesTarget = { type: 'cliente'; id: string; nombre: string } | { type: 'prospecto'; id: string; nombre: string } | null
  const [notesTarget, setNotesTarget] = useState<NotesTarget>(null)
  const [noteInput, setNoteInput] = useState('')
  const notesEndRef = useRef<HTMLDivElement>(null)

  function openNotes(type: 'cliente' | 'prospecto', id: string, nombre: string) {
    setNotesTarget({ type, id, nombre })
    setNoteInput('')
  }

  async function handleAddNote() {
    if (!noteInput.trim() || !notesTarget) return
    if (notesTarget.type === 'cliente') await addClientNote(notesTarget.id, noteInput.trim())
    else await addProspectNote(notesTarget.id, noteInput.trim())
    setNoteInput('')
    setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function handleRemoveNote(noteId: string) {
    if (!notesTarget) return
    if (notesTarget.type === 'cliente') removeClientNote(noteId)
    else removeProspectNote(noteId)
  }

  const activeNotes = notesTarget
    ? (notesTarget.type === 'cliente' ? clientNotes : prospectNotes).filter(n => n.entidadId === notesTarget.id)
    : []

  // ── filtered lists ─────────────────────────────────────────────────────────
  const filteredProspects = prospects.filter((p) =>
    [p.empresa, p.contacto, p.correo].join(' ').toLowerCase().includes(qP.toLowerCase())
  )
  const filteredClients = clients.filter((c) =>
    [c.razonSocial, c.rfc, c.correo].join(' ').toLowerCase().includes(qC.toLowerCase())
  )

  // ══ PROSPECT HANDLERS ══════════════════════════════════════════════════════

  const FP = (k: keyof typeof pForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setPForm((p) => ({ ...p, [k]: k === 'valorPotencial' ? Number(e.target.value) : e.target.value }))

  const FF = (k: keyof DatosFiscales) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFiscal((p) => ({ ...p, [k]: k === 'limiteCredito' ? Number(e.target.value) : e.target.value }))

  function openNewProspect() { setPForm(BLANK_PROSPECT); setPEditId(null); setPModal('new') }
  function openEditProspect(p: Prospect) {
    const { prospectoId: _id, fechaAlta: _fa, ...rest } = p
    setPForm(rest); setPEditId(p.prospectoId); setPModal('edit')
  }
  function handleSaveProspect() {
    if (!pForm.empresa.trim()) { toast.error('La empresa es obligatoria.'); return }
    if (pEditId) { updateProspect(pEditId, pForm); toast.success('Prospecto actualizado.') }
    else { addProspect(pForm); toast.success('Prospecto creado.') }
    setPModal(null)
  }

  function openMarcarGanado(p: Prospect) { setPConvTarget(p); setPModal('marcar_ganado') }
  function handleMarcarGanado() {
    if (!pConvTarget) return
    updateProspect(pConvTarget.prospectoId, { estatus: 'ganado' })
    toast.success(`"${pConvTarget.empresa}" marcado como Ganado.`)
    setPModal(null); setPConvTarget(null)
  }

  function openConvert(p: Prospect) {
    setPConvTarget(p); setFiscal({ ...BLANK_FISCAL }); setPModal('convert')
  }
  function handleConvert() {
    if (!pConvTarget) return
    if (!fiscal.rfc.trim()) { toast.error('El RFC es obligatorio.'); return }
    if (!fiscal.direccionFiscal.trim()) { toast.error('La dirección fiscal es obligatoria.'); return }
    convertirACliente(pConvTarget.prospectoId, fiscal)
    toast.success(`"${pConvTarget.empresa}" convertido a cliente.`)
    setPModal(null); setPConvTarget(null); setFiscal(BLANK_FISCAL)
    // Switch to clients tab to show the new client
    setTab('clientes')
  }

  function openDelProspect(p: Prospect) { setPDelTarget(p); setPModal('del') }
  function handleDeleteProspect() {
    if (pDelTarget) { deleteProspect(pDelTarget.prospectoId); toast.success(`Prospecto "${pDelTarget.empresa}" eliminado.`) }
    setPModal(null); setPDelTarget(null)
  }

  // ══ CLIENT HANDLERS ════════════════════════════════════════════════════════

  const FC = (k: keyof typeof cForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setCForm((p) => ({ ...p, [k]: k === 'limiteCredito' ? Number(e.target.value) : e.target.value }))

  function openEditClient(c: Client) {
    const { clientId: _id, fechaAlta: _fa, ...rest } = c
    setCForm(rest); setCEditId(c.clientId); setCModal('edit')
  }
  function handleSaveClient() {
    if (!cForm.razonSocial?.trim()) { toast.error('La razón social es obligatoria.'); return }
    updateClient(cEditId!, cForm); toast.success('Cliente actualizado.')
    setCModal(null)
  }

  function openDelClient(c: Client) { setCDelTarget(c); setCModal('confirm_delete') }
  function handleDeleteClient() {
    if (cDelTarget) { deleteClient(cDelTarget.clientId); toast.success(`Cliente "${cDelTarget.razonSocial}" eliminado.`) }
    setCModal(null); setCDelTarget(null)
  }

  // ── Pipeline counters ───────────────────────────────────────────────────────
  const byStatus = ESTADOS_PIPELINE.map((e) => ({
    e, count: prospects.filter((p) => p.estatus === e).length,
  }))

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users size={24} /> Clientes &amp; Prospectos
          </h1>
          <p className="page-subtitle">
            {clients.filter(c => c.estatus === 'activo').length} clientes activos
            &nbsp;·&nbsp;
            {prospects.length} prospectos en pipeline
          </p>
        </div>
        {tab === 'prospectos' && (
          <button className="btn-primary" onClick={openNewProspect}>
            <Plus size={16} /> Nuevo Prospecto
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        <button
          onClick={() => setTab('prospectos')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'prospectos'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserSearch size={15} /> Prospectos
          <span className={`ml-1 text-xs font-semibold rounded-full px-1.5 py-0.5 ${
            tab === 'prospectos' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {prospects.length}
          </span>
        </button>
        <button
          onClick={() => setTab('clientes')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'clientes'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={15} /> Clientes
          <span className={`ml-1 text-xs font-semibold rounded-full px-1.5 py-0.5 ${
            tab === 'clientes' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {clients.length}
          </span>
        </button>
      </div>

      {/* ══ TAB: PROSPECTOS ════════════════════════════════════════════════════ */}
      {tab === 'prospectos' && (
        <>
          {/* Pipeline counters */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {byStatus.map(({ e, count }) => (
              <div key={e} className={`card-sm flex-shrink-0 min-w-[100px] text-center ${e === 'ganado' ? 'border-green-300 bg-green-50' : ''}`}>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <StatusBadge status={e} />
              </div>
            ))}
          </div>

          <div className="card">
            <div className="mb-4">
              <SearchBar value={qP} onChange={setQP} placeholder="Buscar empresa o contacto..." />
            </div>
            <DataTable
              data={filteredProspects}
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
                  key: 'acc', header: '', render: (p) => (
                    <div className="flex gap-1 flex-wrap">
                      {p.estatus !== 'ganado' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditProspect(p)}>
                          <Edit2 size={13} /> Editar
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => openNotes('prospecto', p.prospectoId, p.empresa)} title="Notas de contacto">
                        <MessageSquare size={13} />
                        {prospectNotes.filter(n => n.entidadId === p.prospectoId).length > 0 && (
                          <span className="ml-1 text-xs font-bold text-blue-600">
                            {prospectNotes.filter(n => n.entidadId === p.prospectoId).length}
                          </span>
                        )}
                      </button>
                      {p.estatus === 'cotizado' && canConvert && (
                        <button className="btn btn-success btn-sm" onClick={() => openMarcarGanado(p)}>
                          <UserCheck size={13} /> Ganado
                        </button>
                      )}
                      {p.estatus === 'ganado' && canConvert && (
                        <button className="btn btn-primary btn-sm" onClick={() => openConvert(p)}>
                          <ArrowRight size={13} /> Convertir a Cliente
                        </button>
                      )}
                      {canDeleteProspect && p.estatus !== 'ganado' && (
                        <button className="btn btn-danger btn-sm" onClick={() => openDelProspect(p)} title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )
                },
              ]}
            />
          </div>
        </>
      )}

      {/* ══ TAB: CLIENTES ══════════════════════════════════════════════════════ */}
      {tab === 'clientes' && (
        <>
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              Los clientes se crean automáticamente desde la pestaña de <strong>Prospectos</strong> cuando un prospecto llega al estatus <strong>Ganado</strong> y se convierte.
            </span>
          </div>

          <div className="card">
            <div className="flex justify-between mb-4">
              <SearchBar value={qC} onChange={setQC} placeholder="Buscar por nombre, RFC..." />
              <div className="text-sm text-gray-500 self-center">{filteredClients.length} resultados</div>
            </div>
            <DataTable
              data={filteredClients}
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
                  key: 'acc', header: '', render: (c) => (
                    <div className="flex gap-1">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditClient(c)}>
                        <Edit2 size={13} /> Editar
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openNotes('cliente', c.clientId, c.razonSocial)} title="Notas de contacto">
                        <MessageSquare size={13} />
                        {clientNotes.filter(n => n.entidadId === c.clientId).length > 0 && (
                          <span className="ml-1 text-xs font-bold text-blue-600">
                            {clientNotes.filter(n => n.entidadId === c.clientId).length}
                          </span>
                        )}
                      </button>
                      {canDeleteClient && (
                        <button className="btn btn-danger btn-sm" onClick={() => openDelClient(c)} title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )
                },
              ]}
            />
          </div>
        </>
      )}

      {/* ══ MODALES PROSPECTOS ═════════════════════════════════════════════════ */}

      {/* Nuevo / Editar prospecto */}
      {(pModal === 'new' || pModal === 'edit') && (
        <Modal
          title={pModal === 'new' ? 'Nuevo Prospecto' : 'Editar Prospecto'}
          onClose={() => setPModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setPModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveProspect}>Guardar</button></>}
        >
          <div className="form-grid">
            <div className="form-group sm:col-span-2">
              <label className="label">Empresa *</label>
              <input className="input" value={pForm.empresa} onChange={FP('empresa')} />
            </div>
            <div className="form-group">
              <label className="label">Contacto</label>
              <input className="input" value={pForm.contacto} onChange={FP('contacto')} />
            </div>
            <div className="form-group">
              <label className="label">Correo</label>
              <input type="email" className="input" value={pForm.correo} onChange={FP('correo')} />
            </div>
            <div className="form-group">
              <label className="label">Teléfono</label>
              <input className="input" value={pForm.telefono} onChange={FP('telefono')} />
            </div>
            <div className="form-group">
              <label className="label">Origen</label>
              <select className="select" value={pForm.origen} onChange={FP('origen')}>
                {ORIGENES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Valor Potencial (MXN)</label>
              <input type="number" className="input" value={pForm.valorPotencial} onChange={FP('valorPotencial')} min={0} />
            </div>
            <div className="form-group">
              <label className="label">Estatus</label>
              <select className="select" value={pForm.estatus} onChange={FP('estatus')}>
                {ESTADOS_EDITABLES.map((e) => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmar: Marcar como Ganado */}
      {pModal === 'marcar_ganado' && pConvTarget && (
        <Modal
          title="Marcar como Ganado"
          onClose={() => setPModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setPModal(null)}>Cancelar</button><button className="btn-success" onClick={handleMarcarGanado}><UserCheck size={14} /> Confirmar — Ganado</button></>}
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>¿Confirmas que el prospecto <strong>{pConvTarget.empresa}</strong> fue ganado?</p>
            <p className="text-gray-500">Una vez marcado como <strong>Ganado</strong> aparecerá el botón <em>"Convertir a Cliente"</em>.</p>
          </div>
        </Modal>
      )}

      {/* Convertir a Cliente */}
      {pModal === 'convert' && pConvTarget && (
        <Modal
          title={`Convertir a Cliente — ${pConvTarget.empresa}`}
          onClose={() => setPModal(null)}
          size="lg"
          footer={<><button className="btn-secondary" onClick={() => setPModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleConvert}><ArrowRight size={14} /> Crear Cliente</button></>}
        >
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm space-y-1">
              <div className="font-semibold text-green-800">{pConvTarget.empresa} — Prospecto Ganado ✓</div>
              <div className="text-green-700">{pConvTarget.contacto} · {pConvTarget.correo} · {pConvTarget.telefono}</div>
            </div>
            <p className="text-sm text-gray-500">Completa los datos fiscales para finalizar el alta:</p>
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

      {/* Eliminar prospecto */}
      {pModal === 'del' && pDelTarget && (
        <Modal
          title="Eliminar prospecto"
          onClose={() => setPModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setPModal(null)}>Cancelar</button><button className="btn-danger" onClick={handleDeleteProspect}><Trash2 size={14} /> Eliminar definitivamente</button></>}
        >
          <p className="text-sm text-gray-700">
            ¿Eliminar el prospecto <strong>{pDelTarget.empresa}</strong>? Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}

      {/* ══ MODALES CLIENTES ═══════════════════════════════════════════════════ */}

      {/* Editar cliente */}
      {cModal === 'edit' && (
        <Modal
          title="Editar Cliente"
          onClose={() => setCModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setCModal(null)}>Cancelar</button><button className="btn-primary" onClick={handleSaveClient}>Guardar</button></>}
        >
          <div className="form-grid">
            <div className="form-group sm:col-span-2">
              <label className="label">Razón Social *</label>
              <input className="input" value={cForm.razonSocial} onChange={FC('razonSocial')} />
            </div>
            <div className="form-group">
              <label className="label">RFC *</label>
              <input className="input" value={cForm.rfc} onChange={FC('rfc')} maxLength={13} />
            </div>
            <div className="form-group">
              <label className="label">Régimen Fiscal</label>
              <select className="select" value={cForm.regimenFiscal} onChange={FC('regimenFiscal')}>
                {REGIMENES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group sm:col-span-2">
              <label className="label">Dirección Fiscal</label>
              <input className="input" value={cForm.direccionFiscal} onChange={FC('direccionFiscal')} />
            </div>
            <div className="form-group">
              <label className="label">Correo</label>
              <input type="email" className="input" value={cForm.correo} onChange={FC('correo')} />
            </div>
            <div className="form-group">
              <label className="label">Teléfono</label>
              <input className="input" value={cForm.telefono} onChange={FC('telefono')} />
            </div>
            <div className="form-group">
              <label className="label">Límite de Crédito (MXN)</label>
              <input type="number" className="input" value={cForm.limiteCredito} onChange={FC('limiteCredito')} min={0} />
            </div>
            <div className="form-group">
              <label className="label">Estatus</label>
              <select className="select" value={cForm.estatus} onChange={FC('estatus')}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmar eliminar cliente */}
      {cModal === 'confirm_delete' && cDelTarget && (
        <Modal
          title="Eliminar cliente"
          onClose={() => setCModal(null)}
          footer={<><button className="btn-secondary" onClick={() => setCModal(null)}>Cancelar</button><button className="btn-danger" onClick={handleDeleteClient}><Trash2 size={14} /> Eliminar definitivamente</button></>}
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>¿Eliminar al cliente:</p>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
              <div className="font-semibold text-gray-900">{cDelTarget.razonSocial}</div>
              <div className="text-gray-500">RFC: {cDelTarget.rfc}</div>
              <div className="text-gray-500">{cDelTarget.correo}</div>
              <div className="mt-1"><StatusBadge status={cDelTarget.estatus} /></div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>Se eliminarán también sus contactos asociados. Esta acción no se puede deshacer.</span>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: NOTAS DE CONTACTO ═══════════════════════════════════════════ */}
      {notesTarget && (
        <Modal
          title={`Notas — ${notesTarget.nombre}`}
          onClose={() => setNotesTarget(null)}
          size="lg"
          footer={
            <button className="btn-secondary" onClick={() => setNotesTarget(null)}>Cerrar</button>
          }
        >
          <div className="flex flex-col gap-3">
            {/* Lista de notas */}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {activeNotes.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-300 rounded-lg">
                  Sin notas registradas aún.
                </div>
              )}
              {activeNotes.map(note => (
                <div key={note.noteId} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg group">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                      <MessageSquare size={11} />
                      {fmtNoteDate(note.fecha)}
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.texto}</p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-danger btn-sm flex-shrink-0"
                    onClick={() => handleRemoveNote(note.noteId)}
                    title="Eliminar nota"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div ref={notesEndRef} />
            </div>

            {/* Input nueva nota */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <textarea
                className="textarea flex-1 resize-none"
                rows={2}
                placeholder="Escribe una nota sobre el contacto..."
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAddNote() } }}
              />
              <button
                className="btn-primary self-end flex items-center gap-1"
                onClick={() => void handleAddNote()}
                disabled={!noteInput.trim()}
              >
                <Send size={14} /> Agregar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
