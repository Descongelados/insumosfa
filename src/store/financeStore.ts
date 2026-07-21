import { create } from 'zustand'
import type { FacturaVenta, PagoCliente, FacturaProveedor, PagoProveedor, Banco, GastoNegocio } from '../types'
import { supabase } from '../lib/supabase'

// ── DB type mappers ──────────────────────────────────────────────────────────

type DbFV = {
  id: string; folio: string; cliente_id: string; pedido_id: string | null
  fecha: string; fecha_vencimiento: string; subtotal: number; impuestos: number
  total: number; saldo_pendiente: number; estatus: string
}
type DbPC = {
  id: string; factura_id: string; cliente_id: string; fecha: string
  monto: number; forma_pago: string; referencia: string
}
type DbFP = {
  id: string; folio: string; supplier_id: string; orden_compra_id: string | null
  embarque_id: string | null; transportista_id: string | null
  fecha: string; fecha_vencimiento: string; subtotal: number; impuestos: number
  total: number; saldo_pendiente: number; estatus: string
}
type DbPP = {
  id: string; factura_prov_id: string; supplier_id: string; fecha: string
  monto: number; forma_pago: string; referencia: string
}
type DbBanco = {
  id: string; banco: string; cuenta: string; saldo: number; moneda: string; activo: boolean
}
type DbGasto = {
  id: string; fecha: string; categoria: string; descripcion: string
  monto: number; forma_pago: string; referencia: string; notas: string
}

function toFV(r: DbFV): FacturaVenta {
  return {
    facturaId: r.id, folio: r.folio, clienteId: r.cliente_id,
    pedidoId: r.pedido_id ?? undefined, fecha: r.fecha,
    fechaVencimiento: r.fecha_vencimiento, subtotal: r.subtotal,
    impuestos: r.impuestos, total: r.total, saldoPendiente: r.saldo_pendiente,
    estatus: r.estatus as FacturaVenta['estatus'],
  }
}
function toPC(r: DbPC): PagoCliente {
  return {
    pagoId: r.id, facturaId: r.factura_id, clienteId: r.cliente_id,
    fecha: r.fecha, monto: r.monto, formaPago: r.forma_pago, referencia: r.referencia,
  }
}
function toFP(r: DbFP): FacturaProveedor {
  return {
    facturaProvId: r.id, folio: r.folio, supplierId: r.supplier_id,
    ordenCompraId: r.orden_compra_id ?? undefined,
    embarqueId: r.embarque_id ?? undefined,
    transportistaId: r.transportista_id ?? undefined,
    fecha: r.fecha, fechaVencimiento: r.fecha_vencimiento, subtotal: r.subtotal,
    impuestos: r.impuestos, total: r.total, saldoPendiente: r.saldo_pendiente,
    estatus: r.estatus as FacturaProveedor['estatus'],
  }
}
function toPP(r: DbPP): PagoProveedor {
  return {
    pagoId: r.id, facturaProvId: r.factura_prov_id, supplierId: r.supplier_id,
    fecha: r.fecha, monto: r.monto, formaPago: r.forma_pago, referencia: r.referencia,
  }
}
function toBanco(r: DbBanco): Banco {
  return { bancoId: r.id, banco: r.banco, cuenta: r.cuenta, saldo: r.saldo, moneda: r.moneda, activo: r.activo }
}
function toGasto(r: DbGasto): GastoNegocio {
  return {
    gastoId: r.id, fecha: r.fecha,
    categoria: r.categoria as GastoNegocio['categoria'],
    descripcion: r.descripcion, monto: r.monto,
    formaPago: r.forma_pago, referencia: r.referencia, notas: r.notas,
  }
}

// ── Helpers de recarga individual ────────────────────────────────────────────

async function fetchFacturasVenta() {
  const { data } = await supabase.from('erp_invoices_sale').select('*').order('created_at', { ascending: false })
  return data ? (data as DbFV[]).map(toFV) : null
}
async function fetchPagosClientes() {
  const { data } = await supabase.from('erp_payments_client').select('*').order('created_at', { ascending: false })
  return data ? (data as DbPC[]).map(toPC) : null
}
async function fetchFacturasProveedor() {
  const { data } = await supabase.from('erp_invoices_supplier').select('*').order('created_at', { ascending: false })
  return data ? (data as DbFP[]).map(toFP) : null
}
async function fetchPagosProveedores() {
  const { data } = await supabase.from('erp_payments_supplier').select('*').order('created_at', { ascending: false })
  return data ? (data as DbPP[]).map(toPP) : null
}
async function fetchBancos() {
  const { data } = await supabase.from('erp_banks').select('*').order('banco')
  return data ? (data as DbBanco[]).map(toBanco) : null
}
async function fetchGastos() {
  const { data } = await supabase.from('erp_gastos_negocio').select('*').order('fecha', { ascending: false })
  return data ? (data as DbGasto[]).map(toGasto) : null
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface FinanceState {
  facturasVenta: FacturaVenta[]
  pagosClientes: PagoCliente[]
  facturasProveedor: FacturaProveedor[]
  pagosProveedores: PagoProveedor[]
  bancos: Banco[]
  gastos: GastoNegocio[]
  loading: boolean
  initialized: boolean
  loadFinance: () => Promise<void>
  subscribeRealtime: () => () => void
  addFacturaVenta: (f: Omit<FacturaVenta, 'facturaId' | 'folio'>) => Promise<void>
  updateFacturaVenta: (id: string, data: Partial<FacturaVenta>) => Promise<void>
  addPagoCliente: (p: Omit<PagoCliente, 'pagoId'>) => Promise<void>
  addFacturaProveedor: (f: Omit<FacturaProveedor, 'facturaProvId' | 'folio'>) => Promise<FacturaProveedor>
  addPagoProveedor: (p: Omit<PagoProveedor, 'pagoId'>) => Promise<void>
  deleteFacturaProveedor: (id: string) => Promise<void>
  updateBanco: (id: string, data: Partial<Banco>) => Promise<void>
  addBanco: (b: Omit<Banco, 'bancoId'>) => Promise<void>
  deleteBanco: (id: string) => Promise<void>
  addGasto: (g: Omit<GastoNegocio, 'gastoId'>) => Promise<void>
  updateGasto: (id: string, data: Partial<Omit<GastoNegocio, 'gastoId'>>) => Promise<void>
  deleteGasto: (id: string) => Promise<void>
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  facturasVenta: [], pagosClientes: [],
  facturasProveedor: [], pagosProveedores: [],
  bancos: [], gastos: [], loading: false, initialized: false,

  // ── Realtime granular: cada tabla recarga solo su entidad ─────────────────
  subscribeRealtime() {
    const ch = supabase
      .channel('erp_finance_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_invoices_sale' }, async () => {
        const d = await fetchFacturasVenta(); if (d) set({ facturasVenta: d })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_payments_client' }, async () => {
        const d = await fetchPagosClientes(); if (d) set({ pagosClientes: d })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_invoices_supplier' }, async () => {
        const d = await fetchFacturasProveedor(); if (d) set({ facturasProveedor: d })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_payments_supplier' }, async () => {
        const d = await fetchPagosProveedores(); if (d) set({ pagosProveedores: d })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_banks' }, async () => {
        const d = await fetchBancos(); if (d) set({ bancos: d })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_gastos_negocio' }, async () => {
        const d = await fetchGastos(); if (d) set({ gastos: d })
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  async loadFinance() {
    if (get().initialized) return
    set({ loading: true })
    try {
      const [fv, pc, fp, pp, bk, gn] = await Promise.all([
        fetchFacturasVenta(),
        fetchPagosClientes(),
        fetchFacturasProveedor(),
        fetchPagosProveedores(),
        fetchBancos(),
        fetchGastos(),
      ])
      if (fv) set({ facturasVenta: fv })
      if (pc) set({ pagosClientes: pc })
      if (fp) set({ facturasProveedor: fp })
      if (pp) set({ pagosProveedores: pp })
      if (bk) set({ bancos: bk })
      if (gn) set({ gastos: gn })
      set({ initialized: true })
    } finally {
      set({ loading: false })
    }
  },

  async addFacturaVenta(data) {
    // Folio atómico en servidor
    const { data: folioRow } = await supabase
      .rpc('erp_next_folio', { p_prefix: 'FAC', p_seq: 'erp_seq_folio_inv_sale' })
    const folio = (folioRow as string | null) ?? `FAC-${Date.now()}`

    await supabase.from('erp_invoices_sale').insert({
      folio, cliente_id: data.clienteId, pedido_id: data.pedidoId ?? null,
      fecha: data.fecha, fecha_vencimiento: data.fechaVencimiento,
      subtotal: data.subtotal, impuestos: data.impuestos, total: data.total,
      saldo_pendiente: data.saldoPendiente, estatus: data.estatus,
    })
    const d = await fetchFacturasVenta()
    if (d) set({ facturasVenta: d })
  },

  async updateFacturaVenta(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.estatus !== undefined) patch.estatus = data.estatus
    if (data.saldoPendiente !== undefined) patch.saldo_pendiente = data.saldoPendiente
    if (data.fechaVencimiento !== undefined) patch.fecha_vencimiento = data.fechaVencimiento

    // Optimistic update
    set(s => ({ facturasVenta: s.facturasVenta.map(f => f.facturaId === id ? { ...f, ...data } : f) }))

    const { error } = await supabase.from('erp_invoices_sale').update(patch).eq('id', id)
    if (error) {
      const d = await fetchFacturasVenta()
      if (d) set({ facturasVenta: d })
    }
  },

  // ── Pago de cliente: RPC atómica (inserta pago + actualiza saldo en 1 TX) ─
  async addPagoCliente(data) {
    await supabase.rpc('erp_aplicar_pago_cliente', {
      p_factura_id:  data.facturaId,
      p_cliente_id:  data.clienteId,
      p_fecha:       data.fecha,
      p_monto:       data.monto,
      p_forma_pago:  data.formaPago,
      p_referencia:  data.referencia,
    })
    // Recargar solo las dos entidades afectadas
    const [fv, pc] = await Promise.all([fetchFacturasVenta(), fetchPagosClientes()])
    if (fv) set({ facturasVenta: fv })
    if (pc) set({ pagosClientes: pc })
  },

  async addFacturaProveedor(data) {
    // Folio atómico en servidor
    const { data: folioRow } = await supabase
      .rpc('erp_next_folio', { p_prefix: 'FPROV', p_seq: 'erp_seq_folio_inv_sup' })
    const folio = (folioRow as string | null) ?? `FPROV-${Date.now()}`

    const { data: row } = await supabase
      .from('erp_invoices_supplier')
      .insert({
        folio, supplier_id: data.supplierId,
        orden_compra_id: data.ordenCompraId ?? null,
        embarque_id: data.embarqueId ?? null,
        transportista_id: data.transportistaId ?? null,
        fecha: data.fecha, fecha_vencimiento: data.fechaVencimiento,
        subtotal: data.subtotal, impuestos: data.impuestos, total: data.total,
        saldo_pendiente: data.saldoPendiente, estatus: data.estatus,
      })
      .select('*')
      .maybeSingle()
    const d = await fetchFacturasProveedor()
    if (d) set({ facturasProveedor: d })
    return row ? toFP(row as DbFP) : { ...data, facturaProvId: '', folio }
  },

  // ── Pago de proveedor: RPC atómica ────────────────────────────────────────
  async addPagoProveedor(data) {
    await supabase.rpc('erp_aplicar_pago_proveedor', {
      p_factura_prov_id: data.facturaProvId,
      p_supplier_id:     data.supplierId,
      p_fecha:           data.fecha,
      p_monto:           data.monto,
      p_forma_pago:      data.formaPago,
      p_referencia:      data.referencia,
    })
    const [fp, pp] = await Promise.all([fetchFacturasProveedor(), fetchPagosProveedores()])
    if (fp) set({ facturasProveedor: fp })
    if (pp) set({ pagosProveedores: pp })
  },

  async deleteFacturaProveedor(id) {
    set(s => ({ facturasProveedor: s.facturasProveedor.filter(f => f.facturaProvId !== id) }))
    await supabase.from('erp_invoices_supplier').delete().eq('id', id)
  },

  async updateBanco(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.banco !== undefined) patch.banco = data.banco
    if (data.cuenta !== undefined) patch.cuenta = data.cuenta
    if (data.saldo !== undefined) patch.saldo = data.saldo
    if (data.moneda !== undefined) patch.moneda = data.moneda
    if (data.activo !== undefined) patch.activo = data.activo

    // Optimistic update
    set(s => ({ bancos: s.bancos.map(b => b.bancoId === id ? { ...b, ...data } : b) }))

    const { error } = await supabase.from('erp_banks').update(patch).eq('id', id)
    if (error) {
      const d = await fetchBancos()
      if (d) set({ bancos: d })
    }
  },

  async addBanco(data) {
    await supabase.from('erp_banks').insert({
      banco: data.banco, cuenta: data.cuenta,
      saldo: data.saldo, moneda: data.moneda, activo: data.activo,
    })
    const d = await fetchBancos()
    if (d) set({ bancos: d })
  },

  async deleteBanco(id) {
    set(s => ({ bancos: s.bancos.filter(b => b.bancoId !== id) }))
    await supabase.from('erp_banks').delete().eq('id', id)
  },

  async addGasto(data) {
    await supabase.from('erp_gastos_negocio').insert({
      fecha: data.fecha, categoria: data.categoria,
      descripcion: data.descripcion, monto: data.monto,
      forma_pago: data.formaPago, referencia: data.referencia, notas: data.notas,
    })
    const d = await fetchGastos()
    if (d) set({ gastos: d })
  },

  async updateGasto(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.fecha !== undefined) patch.fecha = data.fecha
    if (data.categoria !== undefined) patch.categoria = data.categoria
    if (data.descripcion !== undefined) patch.descripcion = data.descripcion
    if (data.monto !== undefined) patch.monto = data.monto
    if (data.formaPago !== undefined) patch.forma_pago = data.formaPago
    if (data.referencia !== undefined) patch.referencia = data.referencia
    if (data.notas !== undefined) patch.notas = data.notas

    // Optimistic update
    set(s => ({ gastos: s.gastos.map(g => g.gastoId === id ? { ...g, ...data } : g) }))

    const { error } = await supabase.from('erp_gastos_negocio').update(patch).eq('id', id)
    if (error) {
      const d = await fetchGastos()
      if (d) set({ gastos: d })
    }
  },

  async deleteGasto(id) {
    set(s => ({ gastos: s.gastos.filter(g => g.gastoId !== id) }))
    await supabase.from('erp_gastos_negocio').delete().eq('id', id)
  },
}))
