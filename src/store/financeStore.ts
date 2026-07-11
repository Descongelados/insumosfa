import { create } from 'zustand'
import type { FacturaVenta, PagoCliente, FacturaProveedor, PagoProveedor, Banco, GastoNegocio } from '../types'
import { supabase } from '../lib/supabase'

// ΓöÇΓöÇ DB type mappers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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
    ordenCompraId: r.orden_compra_id ?? undefined, fecha: r.fecha,
    fechaVencimiento: r.fecha_vencimiento, subtotal: r.subtotal,
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

// ΓöÇΓöÇ Store ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface FinanceState {
  facturasVenta: FacturaVenta[]
  pagosClientes: PagoCliente[]
  facturasProveedor: FacturaProveedor[]
  pagosProveedores: PagoProveedor[]
  bancos: Banco[]
  gastos: GastoNegocio[]
  loading: boolean
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
  bancos: [], gastos: [], loading: false,

  subscribeRealtime() {
    const ch = supabase
      .channel('erp_finance_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_invoices_sale' }, () => { void get().loadFinance() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_payments_client' }, () => { void get().loadFinance() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_invoices_supplier' }, () => { void get().loadFinance() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_payments_supplier' }, () => { void get().loadFinance() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_banks' }, () => { void get().loadFinance() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_gastos_negocio' }, () => { void get().loadFinance() })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  },

  async loadFinance() {
    set({ loading: true })
    try {
      const [{ data: fv }, { data: pc }, { data: fp }, { data: pp }, { data: bk }, { data: gn }] = await Promise.all([
        supabase.from('erp_invoices_sale').select('*').order('created_at', { ascending: false }),
        supabase.from('erp_payments_client').select('*').order('created_at', { ascending: false }),
        supabase.from('erp_invoices_supplier').select('*').order('created_at', { ascending: false }),
        supabase.from('erp_payments_supplier').select('*').order('created_at', { ascending: false }),
        supabase.from('erp_banks').select('*').order('banco'),
        supabase.from('erp_gastos_negocio').select('*').order('fecha', { ascending: false }),
      ])
      if (fv) set({ facturasVenta: (fv as DbFV[]).map(toFV) })
      if (pc) set({ pagosClientes: (pc as DbPC[]).map(toPC) })
      if (fp) set({ facturasProveedor: (fp as DbFP[]).map(toFP) })
      if (pp) set({ pagosProveedores: (pp as DbPP[]).map(toPP) })
      if (bk) set({ bancos: (bk as DbBanco[]).map(toBanco) })
      if (gn) set({ gastos: (gn as DbGasto[]).map(toGasto) })
    } finally {
      set({ loading: false })
    }
  },

  async addFacturaVenta(data) {
    const { count } = await supabase.from('erp_invoices_sale').select('*', { count: 'exact', head: true })
    const folio = `FAC-${String((count ?? 0) + 1).padStart(4, '0')}`
    await supabase.from('erp_invoices_sale').insert({
      folio, cliente_id: data.clienteId, pedido_id: data.pedidoId ?? null,
      fecha: data.fecha, fecha_vencimiento: data.fechaVencimiento,
      subtotal: data.subtotal, impuestos: data.impuestos, total: data.total,
      saldo_pendiente: data.saldoPendiente, estatus: data.estatus,
    })
    await get().loadFinance()
  },

  async updateFacturaVenta(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.estatus !== undefined) patch.estatus = data.estatus
    if (data.saldoPendiente !== undefined) patch.saldo_pendiente = data.saldoPendiente
    if (data.fechaVencimiento !== undefined) patch.fecha_vencimiento = data.fechaVencimiento
    await supabase.from('erp_invoices_sale').update(patch).eq('id', id)
    await get().loadFinance()
  },

  async addPagoCliente(data) {
    await supabase.from('erp_payments_client').insert({
      factura_id: data.facturaId, cliente_id: data.clienteId,
      fecha: data.fecha, monto: data.monto,
      forma_pago: data.formaPago, referencia: data.referencia,
    })
    const fv = get().facturasVenta.find(f => f.facturaId === data.facturaId)
    if (fv) {
      const nuevo = Math.max(0, fv.saldoPendiente - data.monto)
      const estatus: FacturaVenta['estatus'] = nuevo === 0 ? 'pagada' : 'parcial'
      await supabase.from('erp_invoices_sale')
        .update({ saldo_pendiente: nuevo, estatus })
        .eq('id', data.facturaId)
    }
    await get().loadFinance()
  },

  async addFacturaProveedor(data) {
    const { count } = await supabase.from('erp_invoices_supplier').select('*', { count: 'exact', head: true })
    const folio = `FPROV-${String((count ?? 0) + 1).padStart(4, '0')}`
    const { data: row } = await supabase
      .from('erp_invoices_supplier')
      .insert({
        folio, supplier_id: data.supplierId, orden_compra_id: data.ordenCompraId ?? null,
        fecha: data.fecha, fecha_vencimiento: data.fechaVencimiento,
        subtotal: data.subtotal, impuestos: data.impuestos, total: data.total,
        saldo_pendiente: data.saldoPendiente, estatus: data.estatus,
      })
      .select('*')
      .maybeSingle()
    await get().loadFinance()
    return row ? toFP(row as DbFP) : { ...data, facturaProvId: '', folio }
  },

  async deleteFacturaProveedor(id) {
    await supabase.from('erp_invoices_supplier').delete().eq('id', id)
    set(s => ({ facturasProveedor: s.facturasProveedor.filter(f => f.facturaProvId !== id) }))
  },

  async addPagoProveedor(data) {
    await supabase.from('erp_payments_supplier').insert({
      factura_prov_id: data.facturaProvId, supplier_id: data.supplierId,
      fecha: data.fecha, monto: data.monto,
      forma_pago: data.formaPago, referencia: data.referencia,
    })
    const fp = get().facturasProveedor.find(f => f.facturaProvId === data.facturaProvId)
    if (fp) {
      const nuevo = Math.max(0, fp.saldoPendiente - data.monto)
      const estatus: FacturaProveedor['estatus'] = nuevo === 0 ? 'pagada' : 'parcial'
      await supabase.from('erp_invoices_supplier')
        .update({ saldo_pendiente: nuevo, estatus })
        .eq('id', data.facturaProvId)
    }
    await get().loadFinance()
  },

  async updateBanco(id, data) {
    const patch: Record<string, unknown> = {}
    if (data.banco !== undefined) patch.banco = data.banco
    if (data.cuenta !== undefined) patch.cuenta = data.cuenta
    if (data.saldo !== undefined) patch.saldo = data.saldo
    if (data.moneda !== undefined) patch.moneda = data.moneda
    if (data.activo !== undefined) patch.activo = data.activo
    await supabase.from('erp_banks').update(patch).eq('id', id)
    await get().loadFinance()
  },

  async addBanco(data) {
    await supabase.from('erp_banks').insert({
      banco: data.banco, cuenta: data.cuenta,
      saldo: data.saldo, moneda: data.moneda, activo: data.activo,
    })
    await get().loadFinance()
  },

  async deleteBanco(id) {
    await supabase.from('erp_banks').delete().eq('id', id)
    set(s => ({ bancos: s.bancos.filter(b => b.bancoId !== id) }))
  },

  async addGasto(data) {
    await supabase.from('erp_gastos_negocio').insert({
      fecha: data.fecha, categoria: data.categoria,
      descripcion: data.descripcion, monto: data.monto,
      forma_pago: data.formaPago, referencia: data.referencia, notas: data.notas,
    })
    await get().loadFinance()
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
    await supabase.from('erp_gastos_negocio').update(patch).eq('id', id)
    await get().loadFinance()
  },

  async deleteGasto(id) {
    await supabase.from('erp_gastos_negocio').delete().eq('id', id)
    set(s => ({ gastos: s.gastos.filter(g => g.gastoId !== id) }))
  },
}))
