// ─── Auth & Security ───────────────────────────────────────────────────────
export type Role = 'director' | 'administracion' | 'compras' | 'ventas' | 'operaciones' | 'almacen'

export interface User {
  userId: string
  name: string
  email: string
  roles: Role[]          // uno o más roles por usuario
  active: boolean
  createdAt: string
}

export interface AuthUser extends User {
  token: string
}

// ─── Clients ───────────────────────────────────────────────────────────────
export interface Client {
  clientId: string
  razonSocial: string
  rfc: string
  regimenFiscal: string
  direccionFiscal: string
  correo: string
  telefono: string
  limiteCredito: number
  estatus: 'activo' | 'inactivo'
  fechaAlta: string
}

export interface ContactoCliente {
  contactoId: string
  clienteId: string
  nombre: string
  puesto: string
  correo: string
  telefono: string
}

// ─── Prospects ─────────────────────────────────────────────────────────────
export type ProspectoEstatus = 'nuevo' | 'contactado' | 'calificado' | 'cotizado' | 'ganado' | 'perdido'

export interface Prospect {
  prospectoId: string
  empresa: string
  contacto: string
  correo: string
  telefono: string
  origen: string
  estatus: ProspectoEstatus
  valorPotencial: number
  fechaAlta: string
}

// ─── Products ──────────────────────────────────────────────────────────────
export interface Product {
  productId: string
  sku: string
  descripcion: string
  categoria: string
  marca: string
  unidadMedida: string
  costoPromedio: number
  precioVenta: number
  activo: boolean
}

// ─── Inventory ─────────────────────────────────────────────────────────────
export type MovimientoTipo = 'EntradaCompra' | 'SalidaVenta' | 'Transferencia' | 'Ajuste' | 'Merma' | 'Devolucion'

export interface Inventario {
  inventarioId: string
  productId: string
  cantidadDisponible: number
  cantidadComprometida: number
  cantidadTransito: number
}

export interface KardexMovimiento {
  movimientoId: string
  productId: string
  fecha: string
  usuario: string
  documentoOrigen: string
  tipo: MovimientoTipo
  cantidad: number
  existenciaAnterior: number
  existenciaNueva: number
  notas: string
}

// ─── Suppliers ─────────────────────────────────────────────────────────────
export interface Supplier {
  supplierId: string
  razonSocial: string
  rfc: string
  contacto: string
  correo: string
  telefono: string
  condicionesPago: string
  calidad: number
  precio: number
  tiempoEntrega: number
  cumplimiento: number
  activo: boolean
}

// ─── Quotes ────────────────────────────────────────────────────────────────
export type CotizacionEstatus = 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida'

export interface QuoteItem {
  detalleId: string
  productId: string
  cantidad: number
  precio: number
  descuento: number
}

export interface Quote {
  cotizacionId: string
  folio: string
  clienteId: string
  /** Datos del cliente eventual (cuando clienteId es vacío) */
  clienteNombre?: string
  clienteRfc?: string
  clienteCorreo?: string
  clienteTelefono?: string
  fecha: string
  vigencia: string
  subtotal: number
  impuestos: number
  total: number
  estatus: CotizacionEstatus
  items: QuoteItem[]
  notas: string
}

// ─── Sales Orders ──────────────────────────────────────────────────────────
export type PedidoEstatus = 'nuevo' | 'confirmado' | 'surtiendo' | 'embarcado' | 'entregado' | 'facturado' | 'cerrado'

export interface SalesOrderItem {
  detalleId: string
  productId: string
  cantidad: number
  precio: number
  descuento: number
}

export interface SalesOrder {
  pedidoId: string
  folio: string
  clienteId: string
  cotizacionId?: string
  fechaPedido: string
  fechaEntrega: string
  estatus: PedidoEstatus
  items: SalesOrderItem[]
  subtotal: number
  impuestos: number
  total: number
  notas: string
}

// ─── Purchases ─────────────────────────────────────────────────────────────
export type SolicitudEstatus = 'creada' | 'enRevision' | 'aprobada' | 'rechazada'
export type OrdenCompraEstatus = 'borrador' | 'emitida' | 'confirmada' | 'recibida' | 'cerrada'

export interface SolicitudCompra {
  solicitudId: string
  solicitante: string
  fecha: string
  prioridad: 'baja' | 'media' | 'alta'
  motivo: string
  productId: string
  cantidad: number
  estatus: SolicitudEstatus
}

export interface OrdenCompraItem {
  detalleId: string
  productId: string
  cantidad: number
  precioUnitario: number
}

export interface OrdenCompra {
  ordenCompraId: string
  folio: string
  supplierId: string
  fecha: string
  fechaEntregaEsperada: string
  monto: number
  estatus: OrdenCompraEstatus
  items: OrdenCompraItem[]
  notas: string
}

// ─── Logistics ─────────────────────────────────────────────────────────────
export type EmbarqueEstatus = 'solicitado' | 'programado' | 'recolectado' | 'enTransito' | 'entregado' | 'cerrado'

export interface Transportista {
  transportistaId: string
  nombre: string
  contacto: string
  telefono: string
  tarifaBase: number
  activo: boolean
}

export interface Embarque {
  embarqueId: string
  folio: string
  pedidoId?: string
  origen: string
  destino: string
  transportistaId: string
  fechaProgramada: string
  fechaEntrega?: string
  costoFlete: number
  estatus: EmbarqueEstatus
  notas: string
}

// ─── Finance ───────────────────────────────────────────────────────────────
export type FacturaVentaEstatus = 'emitida' | 'parcial' | 'pagada' | 'vencida' | 'cancelada'
export type FacturaProveedorEstatus = 'recibida' | 'parcial' | 'pagada' | 'vencida'

export interface FacturaVenta {
  facturaId: string
  folio: string
  clienteId: string
  pedidoId?: string
  fecha: string
  fechaVencimiento: string
  subtotal: number
  impuestos: number
  total: number
  saldoPendiente: number
  estatus: FacturaVentaEstatus
}

export interface PagoCliente {
  pagoId: string
  facturaId: string
  clienteId: string
  fecha: string
  monto: number
  formaPago: string
  referencia: string
}

export interface FacturaProveedor {
  facturaProvId: string
  folio: string
  supplierId: string
  ordenCompraId?: string
  fecha: string
  fechaVencimiento: string
  subtotal: number
  impuestos: number
  total: number
  saldoPendiente: number
  estatus: FacturaProveedorEstatus
}

export interface PagoProveedor {
  pagoId: string
  facturaProvId: string
  supplierId: string
  fecha: string
  monto: number
  formaPago: string
  referencia: string
}

export interface Banco {
  bancoId: string
  banco: string
  cuenta: string
  saldo: number
  moneda: string
  activo: boolean
}

// ─── Audit ─────────────────────────────────────────────────────────────────
export interface AuditLog {
  auditId: string
  fecha: string
  usuario: string
  modulo: string
  accion: string
  entidadId: string
  valorAnterior?: string
  valorNuevo?: string
}
