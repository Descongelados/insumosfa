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

  const clients       = readLS<Client>('erp_clients', 'clients')
  const contactos     = readLS<ContactoCliente>('erp_clients', 'contactos')
  const prospects     = readLS<Prospect>('erp_prospects', 'prospects')
  const products      = readLS<Product>('erp_products', 'products')
  const suppliers     = readLS<Supplier>('erp_suppliers', 'suppliers')
  const quotes        = readLS<Quote>('erp_quotes', 'quotes')
  const orders        = readLS<SalesOrder>('erp_sales_orders', 'orders')
  const solicitudes   = readLS<SolicitudCompra>('erp_purchases', 'solicitudes')
  const ordenesCompra = readLS<OrdenCompra>('erp_purchases', 'ordenesCompra')
  const inventario    = readLS<Inventario>('erp_inventory', 'inventario')
  const kardex        = readLS<KardexMovimiento>('erp_inventory', 'kardex')
  const embarques     = readLS<Embarque>('erp_logistics', 'embarques')
  const transportistas = readLS<Transportista>('erp_logistics', 'transportistas')
  const facturasVenta     = readLS<FacturaVenta>('erp_finance', 'facturasVenta')
  const pagosClientes     = readLS<PagoCliente>('erp_finance', 'pagosClientes')
  const facturasProveedor = readLS<FacturaProveedor>('erp_finance', 'facturasProveedor')
  const pagosProveedores  = readLS<PagoProveedor>('erp_finance', 'pagosProveedores')
  const bancos        = readLS<Banco>('erp_finance', 'bancos')

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

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Inserta un lote y construye el mapa old-id → new-uuid.
  // Supabase devuelve los registros en el mismo orden que se insertaron.
  async function batchInsert<T extends object>(
    table: string,
    rows: T[],
    oldIds: string[],
    idMap: Map<string, string>,
  ) {
    if (!rows.length) return
    const { data } = await supabase.from(table).insert(rows).select('id')
    ;(data as { id: string }[] | null)?.forEach((r, i) => {
      if (oldIds[i]) idMap.set(oldIds[i], r.id)
    })
  }

  // ── Clients ───────────────────────────────────────────────────────────────
  await batchInsert(
    'erp_clients',
    clients.map(c => ({
      razon_social: c.razonSocial, rfc: c.rfc, regimen_fiscal: c.regimenFiscal,
      direccion_fiscal: c.direccionFiscal, correo: c.correo, telefono: c.telefono,
      limite_credito: c.limiteCredito, estatus: c.estatus, fecha_alta: c.fechaAlta,
    })),
    clients.map(c => c.clientId),
    clientMap,
  )

  // Contactos: dependen de clientMap — batch con los ids ya resueltos
  const contactoRows = contactos
    .map(ct => ({ newId: clientMap.get(ct.clienteId), ct }))
    .filter(x => x.newId)
    .map(({ newId, ct }) => ({
      cliente_id: newId!, nombre: ct.nombre, puesto: ct.puesto,
      correo: ct.correo, telefono: ct.telefono,
    }))
  if (contactoRows.length) {
    await supabase.from('erp_client_contacts').insert(contactoRows)
  }

  // ── Prospects ─────────────────────────────────────────────────────────────
  if (prospects.length) {
    await supabase.from('erp_prospects').insert(
      prospects.map(p => ({
        empresa: p.empresa, contacto: p.contacto, correo: p.correo,
        telefono: p.telefono, origen: p.origen, estatus: p.estatus,
        valor_potencial: p.valorPotencial, fecha_alta: p.fechaAlta,
      })),
    )
  }

  // ── Products ──────────────────────────────────────────────────────────────
  await batchInsert(
    'erp_products',
    products.map(p => ({
      sku: p.sku, descripcion: p.descripcion, categoria: p.categoria,
      marca: p.marca, unidad_medida: p.unidadMedida,
      costo_promedio: p.costoPromedio, precio_venta: p.precioVenta, activo: p.activo,
    })),
    products.map(p => p.productId),
    productMap,
  )

  // ── Suppliers ─────────────────────────────────────────────────────────────
  await batchInsert(
    'erp_suppliers',
    suppliers.map(s => ({
      razon_social: s.razonSocial, rfc: s.rfc, contacto: s.contacto,
      correo: s.correo, telefono: s.telefono, condiciones_pago: s.condicionesPago,
      calidad: s.calidad, precio: s.precio, tiempo_entrega: s.tiempoEntrega,
      cumplimiento: s.cumplimiento, activo: s.activo,
    })),
    suppliers.map(s => s.supplierId),
    supplierMap,
  )

  // ── Quotes ────────────────────────────────────────────────────────────────
  if (quotes.length) {
    await supabase.from('erp_quotes').insert(
      quotes.map(q => ({
        folio: q.folio,
        cliente_id: clientMap.get(q.clienteId) ?? q.clienteId,
        fecha: q.fecha, vigencia: q.vigencia,
        subtotal: q.subtotal, impuestos: q.impuestos, total: q.total,
        estatus: q.estatus,
        items: q.items.map(i => ({ ...i, productId: productMap.get(i.productId) ?? i.productId })),
        notas: q.notas,
      })),
    )
  }

  // ── Sales Orders ──────────────────────────────────────────────────────────
  await batchInsert(
    'erp_sales_orders',
    orders.map(o => ({
      folio: o.folio,
      cliente_id: clientMap.get(o.clienteId) ?? o.clienteId,
      cotizacion_id: o.cotizacionId ?? null,
      fecha_pedido: o.fechaPedido, fecha_entrega: o.fechaEntrega,
      estatus: o.estatus,
      items: o.items.map(i => ({ ...i, productId: productMap.get(i.productId) ?? i.productId })),
      subtotal: o.subtotal, impuestos: o.impuestos, total: o.total, notas: o.notas,
    })),
    orders.map(o => o.pedidoId),
    orderMap,
  )

  // ── Purchase Requests ─────────────────────────────────────────────────────
  if (solicitudes.length) {
    await supabase.from('erp_purchase_requests').insert(
      solicitudes.map(s => ({
        solicitante: s.solicitante, fecha: s.fecha, prioridad: s.prioridad,
        motivo: s.motivo, product_id: productMap.get(s.productId) ?? s.productId,
        cantidad: s.cantidad, estatus: s.estatus,
      })),
    )
  }

  // ── Purchase Orders ───────────────────────────────────────────────────────
  await batchInsert(
    'erp_purchase_orders',
    ordenesCompra.map(oc => ({
      folio: oc.folio,
      supplier_id: supplierMap.get(oc.supplierId) ?? oc.supplierId,
      fecha: oc.fecha, fecha_entrega_esperada: oc.fechaEntregaEsperada,
      monto: oc.monto, estatus: oc.estatus,
      items: oc.items.map(i => ({ ...i, productId: productMap.get(i.productId) ?? i.productId })),
      notas: oc.notas,
    })),
    ordenesCompra.map(oc => oc.ordenCompraId),
    ocMap,
  )

  // ── Inventory ─────────────────────────────────────────────────────────────
  if (inventario.length) {
    await supabase.from('erp_inventory').insert(
      inventario.map(inv => ({
        product_id: productMap.get(inv.productId) ?? inv.productId,
        cantidad_disponible: inv.cantidadDisponible,
        cantidad_comprometida: inv.cantidadComprometida,
        cantidad_transito: inv.cantidadTransito,
      })),
    )
  }

  if (kardex.length) {
    await supabase.from('erp_kardex').insert(
      kardex.map(k => ({
        product_id: productMap.get(k.productId) ?? k.productId,
        fecha: k.fecha, usuario: k.usuario, documento_origen: k.documentoOrigen,
        tipo: k.tipo, cantidad: k.cantidad,
        existencia_anterior: k.existenciaAnterior, existencia_nueva: k.existenciaNueva,
        notas: k.notas,
      })),
    )
  }

  // ── Carriers & Shipments ──────────────────────────────────────────────────
  await batchInsert(
    'erp_carriers',
    transportistas.map(t => ({
      nombre: t.nombre, contacto: t.contacto, telefono: t.telefono,
      tarifa_base: t.tarifaBase, activo: t.activo,
    })),
    transportistas.map(t => t.transportistaId),
    carrierMap,
  )

  if (embarques.length) {
    await supabase.from('erp_shipments').insert(
      embarques.map(e => ({
        folio: e.folio,
        pedido_id: e.pedidoId ? (orderMap.get(e.pedidoId) ?? e.pedidoId) : null,
        origen: e.origen, destino: e.destino,
        transportista_id: carrierMap.get(e.transportistaId) ?? e.transportistaId,
        fecha_programada: e.fechaProgramada, fecha_entrega: e.fechaEntrega ?? null,
        costo_flete: e.costoFlete, estatus: e.estatus, notas: e.notas,
      })),
    )
  }

  // ── Finance ───────────────────────────────────────────────────────────────
  await batchInsert(
    'erp_invoices_sale',
    facturasVenta.map(f => ({
      folio: f.folio,
      cliente_id: clientMap.get(f.clienteId) ?? f.clienteId,
      pedido_id: f.pedidoId ? (orderMap.get(f.pedidoId) ?? f.pedidoId) : null,
      fecha: f.fecha, fecha_vencimiento: f.fechaVencimiento,
      subtotal: f.subtotal, impuestos: f.impuestos, total: f.total,
      saldo_pendiente: f.saldoPendiente, estatus: f.estatus,
    })),
    facturasVenta.map(f => f.facturaId),
    invSaleMap,
  )

  if (pagosClientes.length) {
    await supabase.from('erp_payments_client').insert(
      pagosClientes.map(p => ({
        factura_id: invSaleMap.get(p.facturaId) ?? p.facturaId,
        cliente_id: clientMap.get(p.clienteId) ?? p.clienteId,
        fecha: p.fecha, monto: p.monto, forma_pago: p.formaPago, referencia: p.referencia,
      })),
    )
  }

  await batchInsert(
    'erp_invoices_supplier',
    facturasProveedor.map(f => ({
      folio: f.folio,
      supplier_id: supplierMap.get(f.supplierId) ?? f.supplierId,
      orden_compra_id: f.ordenCompraId ? (ocMap.get(f.ordenCompraId) ?? f.ordenCompraId) : null,
      fecha: f.fecha, fecha_vencimiento: f.fechaVencimiento,
      subtotal: f.subtotal, impuestos: f.impuestos, total: f.total,
      saldo_pendiente: f.saldoPendiente, estatus: f.estatus,
    })),
    facturasProveedor.map(f => f.facturaProvId),
    invSupMap,
  )

  if (pagosProveedores.length) {
    await supabase.from('erp_payments_supplier').insert(
      pagosProveedores.map(p => ({
        factura_prov_id: invSupMap.get(p.facturaProvId) ?? p.facturaProvId,
        supplier_id: supplierMap.get(p.supplierId) ?? p.supplierId,
        fecha: p.fecha, monto: p.monto, forma_pago: p.formaPago, referencia: p.referencia,
      })),
    )
  }

  if (bancos.length) {
    await supabase.from('erp_banks').insert(
      bancos.map(b => ({
        banco: b.banco, cuenta: b.cuenta, saldo: b.saldo, moneda: b.moneda, activo: b.activo,
      })),
    )
  }

  // Mark done and clean up
  localStorage.setItem(DONE_KEY, '1')
  OLD_KEYS.forEach(k => localStorage.removeItem(k))
}
