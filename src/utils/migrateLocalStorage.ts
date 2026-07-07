import { supabase } from '../lib/supabase'
import type {
  Client, ContactoCliente, Prospect, Product, Supplier,
  Quote, SalesOrder, SolicitudCompra, OrdenCompra,
  Inventario, KardexMovimiento, Embarque, Transportista,
  FacturaVenta, PagoCliente, FacturaProveedor, PagoProveedor, Banco,
} from '../types'

const DONE_KEY = 'erp_ls_migrated_v1'
const OLD_KEYS = [
  'erp_clients', 'erp_prospects', 'erp_products', 'erp_suppliers',
  'erp_quotes', 'erp_sales_orders', 'erp_purchases', 'erp_inventory',
  'erp_logistics', 'erp_finance',
]

function readLS<T>(key: string, field: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> }
    return (parsed?.state?.[field] as T[]) ?? []
  } catch {
    return []
  }
}

export function hasLocalStorageData(): boolean {
  if (localStorage.getItem(DONE_KEY)) return false
  return OLD_KEYS.some(k => localStorage.getItem(k) !== null)
}

export async function migrateLocalStorageToSupabase(): Promise<void> {
  if (localStorage.getItem(DONE_KEY)) return

  const clients     = readLS<Client>('erp_clients', 'clients')
  const contactos   = readLS<ContactoCliente>('erp_clients', 'contactos')
  const prospects   = readLS<Prospect>('erp_prospects', 'prospects')
  const products    = readLS<Product>('erp_products', 'products')
  const suppliers   = readLS<Supplier>('erp_suppliers', 'suppliers')
  const quotes      = readLS<Quote>('erp_quotes', 'quotes')
  const orders      = readLS<SalesOrder>('erp_sales_orders', 'orders')
  const solicitudes = readLS<SolicitudCompra>('erp_purchases', 'solicitudes')
  const ordenesCompra = readLS<OrdenCompra>('erp_purchases', 'ordenesCompra')
  const inventario  = readLS<Inventario>('erp_inventory', 'inventario')
  const kardex      = readLS<KardexMovimiento>('erp_inventory', 'kardex')
  const embarques   = readLS<Embarque>('erp_logistics', 'embarques')
  const transportistas = readLS<Transportista>('erp_logistics', 'transportistas')
  const facturasVenta  = readLS<FacturaVenta>('erp_finance', 'facturasVenta')
  const pagosClientes  = readLS<PagoCliente>('erp_finance', 'pagosClientes')
  const facturasProveedor = readLS<FacturaProveedor>('erp_finance', 'facturasProveedor')
  const pagosProveedores  = readLS<PagoProveedor>('erp_finance', 'pagosProveedores')
  const bancos      = readLS<Banco>('erp_finance', 'bancos')

  const hasAny = clients.length > 0 || products.length > 0 || suppliers.length > 0 ||
    prospects.length > 0 || quotes.length > 0 || orders.length > 0

  if (!hasAny) {
    localStorage.setItem(DONE_KEY, '1')
    return
  }

  // ID maps: old local ID → new Supabase UUID
  const clientMap   = new Map<string, string>()
  const productMap  = new Map<string, string>()
  const supplierMap = new Map<string, string>()
  const carrierMap  = new Map<string, string>()
  const orderMap    = new Map<string, string>()
  const ocMap       = new Map<string, string>()
  const invSaleMap  = new Map<string, string>()
  const invSupMap   = new Map<string, string>()

  // ── Clients ──────────────────────────────────────────────────────────────
  for (const c of clients) {
    const { data } = await supabase.from('erp_clients').insert({
      razon_social: c.razonSocial, rfc: c.rfc, regimen_fiscal: c.regimenFiscal,
      direccion_fiscal: c.direccionFiscal, correo: c.correo, telefono: c.telefono,
      limite_credito: c.limiteCredito, estatus: c.estatus, fecha_alta: c.fechaAlta,
    }).select('id').maybeSingle()
    if (data) clientMap.set(c.clientId, (data as { id: string }).id)
  }

  for (const ct of contactos) {
    const newId = clientMap.get(ct.clienteId)
    if (!newId) continue
    await supabase.from('erp_client_contacts').insert({
      cliente_id: newId, nombre: ct.nombre, puesto: ct.puesto,
      correo: ct.correo, telefono: ct.telefono,
    })
  }

  // ── Prospects ────────────────────────────────────────────────────────────
  for (const p of prospects) {
    await supabase.from('erp_prospects').insert({
      empresa: p.empresa, contacto: p.contacto, correo: p.correo,
      telefono: p.telefono, origen: p.origen, estatus: p.estatus,
      valor_potencial: p.valorPotencial, fecha_alta: p.fechaAlta,
    })
  }

  // ── Products ─────────────────────────────────────────────────────────────
  for (const p of products) {
    const { data } = await supabase.from('erp_products').insert({
      sku: p.sku, descripcion: p.descripcion, categoria: p.categoria,
      marca: p.marca, unidad_medida: p.unidadMedida,
      costo_promedio: p.costoPromedio, precio_venta: p.precioVenta, activo: p.activo,
    }).select('id').maybeSingle()
    if (data) productMap.set(p.productId, (data as { id: string }).id)
  }

  // ── Suppliers ────────────────────────────────────────────────────────────
  for (const s of suppliers) {
    const { data } = await supabase.from('erp_suppliers').insert({
      razon_social: s.razonSocial, rfc: s.rfc, contacto: s.contacto,
      correo: s.correo, telefono: s.telefono, condiciones_pago: s.condicionesPago,
      calidad: s.calidad, precio: s.precio, tiempo_entrega: s.tiempoEntrega,
      cumplimiento: s.cumplimiento, activo: s.activo,
    }).select('id').maybeSingle()
    if (data) supplierMap.set(s.supplierId, (data as { id: string }).id)
  }

  // ── Quotes ───────────────────────────────────────────────────────────────
  for (const q of quotes) {
    const cId = clientMap.get(q.clienteId) ?? q.clienteId
    const items = q.items.map(i => ({ ...i, productId: productMap.get(i.productId) ?? i.productId }))
    await supabase.from('erp_quotes').insert({
      folio: q.folio, cliente_id: cId, fecha: q.fecha, vigencia: q.vigencia,
      subtotal: q.subtotal, impuestos: q.impuestos, total: q.total,
      estatus: q.estatus, items, notas: q.notas,
    })
  }

  // ── Sales Orders ─────────────────────────────────────────────────────────
  for (const o of orders) {
    const cId = clientMap.get(o.clienteId) ?? o.clienteId
    const items = o.items.map(i => ({ ...i, productId: productMap.get(i.productId) ?? i.productId }))
    const { data } = await supabase.from('erp_sales_orders').insert({
      folio: o.folio, cliente_id: cId, cotizacion_id: o.cotizacionId ?? null,
      fecha_pedido: o.fechaPedido, fecha_entrega: o.fechaEntrega,
      estatus: o.estatus, items, subtotal: o.subtotal,
      impuestos: o.impuestos, total: o.total, notas: o.notas,
    }).select('id').maybeSingle()
    if (data) orderMap.set(o.pedidoId, (data as { id: string }).id)
  }

  // ── Purchase Requests ────────────────────────────────────────────────────
  for (const s of solicitudes) {
    await supabase.from('erp_purchase_requests').insert({
      solicitante: s.solicitante, fecha: s.fecha, prioridad: s.prioridad,
      motivo: s.motivo, product_id: productMap.get(s.productId) ?? s.productId,
      cantidad: s.cantidad, estatus: s.estatus,
    })
  }

  // ── Purchase Orders ──────────────────────────────────────────────────────
  for (const oc of ordenesCompra) {
    const sId = supplierMap.get(oc.supplierId) ?? oc.supplierId
    const items = oc.items.map(i => ({ ...i, productId: productMap.get(i.productId) ?? i.productId }))
    const { data } = await supabase.from('erp_purchase_orders').insert({
      folio: oc.folio, supplier_id: sId, fecha: oc.fecha,
      fecha_entrega_esperada: oc.fechaEntregaEsperada, monto: oc.monto,
      estatus: oc.estatus, items, notas: oc.notas,
    }).select('id').maybeSingle()
    if (data) ocMap.set(oc.ordenCompraId, (data as { id: string }).id)
  }

  // ── Inventory ────────────────────────────────────────────────────────────
  for (const inv of inventario) {
    await supabase.from('erp_inventory').insert({
      product_id: productMap.get(inv.productId) ?? inv.productId,
      cantidad_disponible: inv.cantidadDisponible,
      cantidad_comprometida: inv.cantidadComprometida,
      cantidad_transito: inv.cantidadTransito,
    })
  }

  for (const k of kardex) {
    await supabase.from('erp_kardex').insert({
      product_id: productMap.get(k.productId) ?? k.productId,
      fecha: k.fecha, usuario: k.usuario, documento_origen: k.documentoOrigen,
      tipo: k.tipo, cantidad: k.cantidad,
      existencia_anterior: k.existenciaAnterior, existencia_nueva: k.existenciaNueva, notas: k.notas,
    })
  }

  // ── Carriers & Shipments ─────────────────────────────────────────────────
  for (const t of transportistas) {
    const { data } = await supabase.from('erp_carriers').insert({
      nombre: t.nombre, contacto: t.contacto, telefono: t.telefono,
      tarifa_base: t.tarifaBase, activo: t.activo,
    }).select('id').maybeSingle()
    if (data) carrierMap.set(t.transportistaId, (data as { id: string }).id)
  }

  for (const e of embarques) {
    await supabase.from('erp_shipments').insert({
      folio: e.folio,
      pedido_id: e.pedidoId ? (orderMap.get(e.pedidoId) ?? e.pedidoId) : null,
      origen: e.origen, destino: e.destino,
      transportista_id: carrierMap.get(e.transportistaId) ?? e.transportistaId,
      fecha_programada: e.fechaProgramada, fecha_entrega: e.fechaEntrega ?? null,
      costo_flete: e.costoFlete, estatus: e.estatus, notas: e.notas,
    })
  }

  // ── Finance ──────────────────────────────────────────────────────────────
  for (const f of facturasVenta) {
    const { data } = await supabase.from('erp_invoices_sale').insert({
      folio: f.folio,
      cliente_id: clientMap.get(f.clienteId) ?? f.clienteId,
      pedido_id: f.pedidoId ? (orderMap.get(f.pedidoId) ?? f.pedidoId) : null,
      fecha: f.fecha, fecha_vencimiento: f.fechaVencimiento,
      subtotal: f.subtotal, impuestos: f.impuestos, total: f.total,
      saldo_pendiente: f.saldoPendiente, estatus: f.estatus,
    }).select('id').maybeSingle()
    if (data) invSaleMap.set(f.facturaId, (data as { id: string }).id)
  }

  for (const p of pagosClientes) {
    await supabase.from('erp_payments_client').insert({
      factura_id: invSaleMap.get(p.facturaId) ?? p.facturaId,
      cliente_id: clientMap.get(p.clienteId) ?? p.clienteId,
      fecha: p.fecha, monto: p.monto, forma_pago: p.formaPago, referencia: p.referencia,
    })
  }

  for (const f of facturasProveedor) {
    const { data } = await supabase.from('erp_invoices_supplier').insert({
      folio: f.folio,
      supplier_id: supplierMap.get(f.supplierId) ?? f.supplierId,
      orden_compra_id: f.ordenCompraId ? (ocMap.get(f.ordenCompraId) ?? f.ordenCompraId) : null,
      fecha: f.fecha, fecha_vencimiento: f.fechaVencimiento,
      subtotal: f.subtotal, impuestos: f.impuestos, total: f.total,
      saldo_pendiente: f.saldoPendiente, estatus: f.estatus,
    }).select('id').maybeSingle()
    if (data) invSupMap.set(f.facturaProvId, (data as { id: string }).id)
  }

  for (const p of pagosProveedores) {
    await supabase.from('erp_payments_supplier').insert({
      factura_prov_id: invSupMap.get(p.facturaProvId) ?? p.facturaProvId,
      supplier_id: supplierMap.get(p.supplierId) ?? p.supplierId,
      fecha: p.fecha, monto: p.monto, forma_pago: p.formaPago, referencia: p.referencia,
    })
  }

  for (const b of bancos) {
    await supabase.from('erp_banks').insert({
      banco: b.banco, cuenta: b.cuenta, saldo: b.saldo, moneda: b.moneda, activo: b.activo,
    })
  }

  // Mark done and clean up
  localStorage.setItem(DONE_KEY, '1')
  OLD_KEYS.forEach(k => localStorage.removeItem(k))
}
