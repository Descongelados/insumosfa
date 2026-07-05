import type {
  User, Client, ContactoCliente, Prospect, Product, Inventario,
  KardexMovimiento, Supplier, Quote, SalesOrder, SolicitudCompra,
  OrdenCompra, Transportista, Embarque, FacturaVenta, PagoCliente,
  FacturaProveedor, PagoProveedor, Banco
} from '../types'

// ─── Users ─────────────────────────────────────────────────────────────────
export const SEED_USERS: User[] = [
  { userId: 'u1', name: 'Admin Sistema',  email: 'admin@insumosfa.com',  roles: ['director'],                     active: true, createdAt: '2024-01-01' },
  { userId: 'u2', name: 'Carlos Ventas',  email: 'carlos@insumosfa.com', roles: ['ventas'],                       active: true, createdAt: '2024-01-05' },
  { userId: 'u3', name: 'María Compras',  email: 'maria@insumosfa.com',  roles: ['compras', 'operaciones'],       active: true, createdAt: '2024-01-05' },
  { userId: 'u4', name: 'Pedro Almacén',  email: 'pedro@insumosfa.com',  roles: ['almacen', 'operaciones'],       active: true, createdAt: '2024-01-10' },
  { userId: 'u5', name: 'Laura Admin',    email: 'laura@insumosfa.com',  roles: ['administracion', 'ventas'],     active: true, createdAt: '2024-01-10' },
]

// ─── Clients ───────────────────────────────────────────────────────────────
export const SEED_CLIENTS: Client[] = [
  { clientId: 'c1', razonSocial: 'Distribuidora Norte S.A. de C.V.', rfc: 'DNO920415AB1', regimenFiscal: '601 - General de Ley', direccionFiscal: 'Av. Industrial 500, Monterrey, NL', correo: 'contacto@disnorte.mx', telefono: '81-2345-6789', limiteCredito: 150000, estatus: 'activo', fechaAlta: '2024-01-15' },
  { clientId: 'c2', razonSocial: 'Ferretería El Clavito S.R.L.', rfc: 'FEC010810XY2', regimenFiscal: '612 - Personas Físicas', direccionFiscal: 'Calle Hidalgo 23, CDMX', correo: 'compras@elclavito.com', telefono: '55-1234-5678', limiteCredito: 50000, estatus: 'activo', fechaAlta: '2024-02-01' },
  { clientId: 'c3', razonSocial: 'Constructora Vega Hermanos', rfc: 'CVH150320ZZ3', regimenFiscal: '601 - General de Ley', direccionFiscal: 'Blvd. Morelos 88, Guadalajara, JAL', correo: 'admin@vegahermanos.mx', telefono: '33-9876-5432', limiteCredito: 200000, estatus: 'activo', fechaAlta: '2024-02-15' },
  { clientId: 'c4', razonSocial: 'Industrias Ramírez', rfc: 'IRA881231WW4', regimenFiscal: '601 - General de Ley', direccionFiscal: 'Parque Industrial km 4, Querétaro', correo: 'compras@indramirez.mx', telefono: '44-5678-9012', limiteCredito: 100000, estatus: 'inactivo', fechaAlta: '2023-11-01' },
]

export const SEED_CONTACTOS: ContactoCliente[] = [
  { contactoId: 'cc1', clienteId: 'c1', nombre: 'Jorge Pérez', puesto: 'Gerente de Compras', correo: 'jperez@disnorte.mx', telefono: '81-2345-6700' },
  { contactoId: 'cc2', clienteId: 'c1', nombre: 'Ana López', puesto: 'Directora General', correo: 'alopez@disnorte.mx', telefono: '81-2345-6701' },
  { contactoId: 'cc3', clienteId: 'c2', nombre: 'Tomás García', puesto: 'Dueño', correo: 'tgarcia@elclavito.com', telefono: '55-1234-5600' },
  { contactoId: 'cc4', clienteId: 'c3', nombre: 'Isabel Vega', puesto: 'Directora', correo: 'ivega@vegahermanos.mx', telefono: '33-9876-5400' },
]

// ─── Prospects ─────────────────────────────────────────────────────────────
export const SEED_PROSPECTS: Prospect[] = [
  { prospectoId: 'p1', empresa: 'Materiales XYZ', contacto: 'Roberto Sánchez', correo: 'roberto@matxyz.mx', telefono: '55-0000-1111', origen: 'Referido', estatus: 'calificado', valorPotencial: 80000, fechaAlta: '2024-06-01' },
  { prospectoId: 'p2', empresa: 'Herramientas Plus', contacto: 'Diana Torres', correo: 'diana@herraplus.mx', telefono: '33-1111-2222', origen: 'LinkedIn', estatus: 'cotizado', valorPotencial: 120000, fechaAlta: '2024-06-15' },
  { prospectoId: 'p3', empresa: 'Agro Industrial del Norte', contacto: 'Ernesto Ruiz', correo: 'eruiz@agroind.mx', telefono: '81-2222-3333', origen: 'Expo', estatus: 'nuevo', valorPotencial: 250000, fechaAlta: '2024-07-01' },
  { prospectoId: 'p4', empresa: 'Pinturas y Acabados SR', contacto: 'Silvia Martínez', correo: 'smtz@pintyacab.mx', telefono: '44-3333-4444', origen: 'Web', estatus: 'contactado', valorPotencial: 60000, fechaAlta: '2024-07-10' },
]

// ─── Products ──────────────────────────────────────────────────────────────
export const SEED_PRODUCTS: Product[] = [
  { productId: 'pr1', sku: 'INFA-001', descripcion: 'Tubo PVC 4" x 6m', categoria: 'PVC', marca: 'AMANCO', unidadMedida: 'PZA', costoPromedio: 85.50, precioVenta: 130.00, activo: true },
  { productId: 'pr2', sku: 'INFA-002', descripcion: 'Tornillo hex 1/2 x 2" Zinc', categoria: 'Tornillería', marca: 'HILTI', unidadMedida: 'KG', costoPromedio: 42.00, precioVenta: 68.00, activo: true },
  { productId: 'pr3', sku: 'INFA-003', descripcion: 'Cable eléctrico THW 10 AWG', categoria: 'Eléctrico', marca: 'CONDUMEX', unidadMedida: 'MT', costoPromedio: 18.00, precioVenta: 28.50, activo: true },
  { productId: 'pr4', sku: 'INFA-004', descripcion: 'Válvula de bola 1" acero', categoria: 'Válvulas', marca: 'CRANE', unidadMedida: 'PZA', costoPromedio: 125.00, precioVenta: 195.00, activo: true },
  { productId: 'pr5', sku: 'INFA-005', descripcion: 'Perfil IPR 6" x 12m', categoria: 'Perfiles', marca: 'HYLSA', unidadMedida: 'PZA', costoPromedio: 1250.00, precioVenta: 1800.00, activo: true },
  { productId: 'pr6', sku: 'INFA-006', descripcion: 'Cemento gris saco 50kg', categoria: 'Cementantes', marca: 'CEMEX', unidadMedida: 'SAC', costoPromedio: 180.00, precioVenta: 235.00, activo: true },
  { productId: 'pr7', sku: 'INFA-007', descripcion: 'Manguera hidráulica 3/8"', categoria: 'Hidráulica', marca: 'GATES', unidadMedida: 'MT', costoPromedio: 95.00, precioVenta: 145.00, activo: false },
]

// ─── Inventory ─────────────────────────────────────────────────────────────
export const SEED_INVENTARIO: Inventario[] = [
  { inventarioId: 'i1', productId: 'pr1', cantidadDisponible: 450, cantidadComprometida: 50, cantidadTransito: 100 },
  { inventarioId: 'i2', productId: 'pr2', cantidadDisponible: 320, cantidadComprometida: 80, cantidadTransito: 0 },
  { inventarioId: 'i3', productId: 'pr3', cantidadDisponible: 1200, cantidadComprometida: 200, cantidadTransito: 500 },
  { inventarioId: 'i4', productId: 'pr4', cantidadDisponible: 85, cantidadComprometida: 15, cantidadTransito: 30 },
  { inventarioId: 'i5', productId: 'pr5', cantidadDisponible: 40, cantidadComprometida: 10, cantidadTransito: 0 },
  { inventarioId: 'i6', productId: 'pr6', cantidadDisponible: 600, cantidadComprometida: 100, cantidadTransito: 200 },
  { inventarioId: 'i7', productId: 'pr7', cantidadDisponible: 0, cantidadComprometida: 0, cantidadTransito: 0 },
]

export const SEED_KARDEX: KardexMovimiento[] = [
  { movimientoId: 'k1', productId: 'pr1', fecha: '2024-07-01', usuario: 'admin@insumosfa.com', documentoOrigen: 'OC-0001', tipo: 'EntradaCompra', cantidad: 200, existenciaAnterior: 250, existenciaNueva: 450, notas: 'Recepción OC-0001' },
  { movimientoId: 'k2', productId: 'pr1', fecha: '2024-07-10', usuario: 'carlos@insumosfa.com', documentoOrigen: 'PV-0001', tipo: 'SalidaVenta', cantidad: 50, existenciaAnterior: 450, existenciaNueva: 400, notas: 'Despacho pedido PV-0001' },
  { movimientoId: 'k3', productId: 'pr3', fecha: '2024-07-05', usuario: 'admin@insumosfa.com', documentoOrigen: 'OC-0002', tipo: 'EntradaCompra', cantidad: 500, existenciaAnterior: 700, existenciaNueva: 1200, notas: 'Recepción OC-0002' },
]

// ─── Suppliers ─────────────────────────────────────────────────────────────
export const SEED_SUPPLIERS: Supplier[] = [
  { supplierId: 's1', razonSocial: 'Distribuidora Industrial Monterrey', rfc: 'DIM850601AA1', contacto: 'Luis Gómez', correo: 'ventas@dimty.mx', telefono: '81-5555-1234', condicionesPago: 'Net 30', calidad: 9, precio: 8, tiempoEntrega: 7, cumplimiento: 9, activo: true },
  { supplierId: 's2', razonSocial: 'PEMSA Materiales Eléctricos', rfc: 'PME920710BB2', contacto: 'Fernanda Ríos', correo: 'frios@pemsa.com.mx', telefono: '55-6666-7890', condicionesPago: 'Net 15', calidad: 8, precio: 9, tiempoEntrega: 5, cumplimiento: 8, activo: true },
  { supplierId: 's3', razonSocial: 'Aceros del Centro S.A.', rfc: 'ACE011220CC3', contacto: 'Hugo Vargas', correo: 'hvargas@aceroscentro.mx', telefono: '44-7777-8901', condicionesPago: 'Net 45', calidad: 9, precio: 7, tiempoEntrega: 10, cumplimiento: 9, activo: true },
]

// ─── Quotes ────────────────────────────────────────────────────────────────
export const SEED_QUOTES: Quote[] = [
  {
    cotizacionId: 'q1', folio: 'COT-0001', clienteId: 'c1', fecha: '2024-07-01', vigencia: '2024-07-15',
    subtotal: 20350, impuestos: 3256, total: 23606, estatus: 'aceptada', notas: 'Entrega en sitio',
    items: [
      { detalleId: 'qd1', productId: 'pr1', cantidad: 100, precio: 130.00, descuento: 5 },
      { detalleId: 'qd2', productId: 'pr3', cantidad: 200, precio: 28.50, descuento: 0 },
    ]
  },
  {
    cotizacionId: 'q2', folio: 'COT-0002', clienteId: 'c2', fecha: '2024-07-10', vigencia: '2024-07-24',
    subtotal: 9750, impuestos: 1560, total: 11310, estatus: 'enviada', notas: '',
    items: [
      { detalleId: 'qd3', productId: 'pr2', cantidad: 50, precio: 68.00, descuento: 0 },
      { detalleId: 'qd4', productId: 'pr4', cantidad: 30, precio: 195.00, descuento: 3 },
    ]
  },
  {
    cotizacionId: 'q3', folio: 'COT-0003', clienteId: 'c3', fecha: '2024-07-15', vigencia: '2024-07-29',
    subtotal: 54000, impuestos: 8640, total: 62640, estatus: 'borrador', notas: 'Proyecto residencial Guadalajara',
    items: [
      { detalleId: 'qd5', productId: 'pr5', cantidad: 30, precio: 1800.00, descuento: 0 },
    ]
  },
]

// ─── Sales Orders ──────────────────────────────────────────────────────────
export const SEED_SALES_ORDERS: SalesOrder[] = [
  {
    pedidoId: 'so1', folio: 'PV-0001', clienteId: 'c1', cotizacionId: 'q1',
    fechaPedido: '2024-07-16', fechaEntrega: '2024-07-22', estatus: 'entregado',
    subtotal: 20350, impuestos: 3256, total: 23606, notas: '',
    items: [
      { detalleId: 'sod1', productId: 'pr1', cantidad: 100, precio: 130.00, descuento: 5 },
      { detalleId: 'sod2', productId: 'pr3', cantidad: 200, precio: 28.50, descuento: 0 },
    ]
  },
  {
    pedidoId: 'so2', folio: 'PV-0002', clienteId: 'c3',
    fechaPedido: '2024-07-20', fechaEntrega: '2024-07-30', estatus: 'surtiendo',
    subtotal: 18000, impuestos: 2880, total: 20880, notas: 'Primera entrega parcial',
    items: [
      { detalleId: 'sod3', productId: 'pr6', cantidad: 100, precio: 235.00, descuento: 0 },
    ]
  },
]

// ─── Purchase Orders ───────────────────────────────────────────────────────
export const SEED_SOLICITUDES: SolicitudCompra[] = [
  { solicitudId: 'sc1', solicitante: 'pedro@insumosfa.com', fecha: '2024-07-01', prioridad: 'alta', motivo: 'Reposición inventario bajo', productId: 'pr1', cantidad: 200, estatus: 'aprobada' },
  { solicitudId: 'sc2', solicitante: 'pedro@insumosfa.com', fecha: '2024-07-08', prioridad: 'media', motivo: 'Pedido especial cliente', productId: 'pr5', cantidad: 20, estatus: 'enRevision' },
]

export const SEED_ORDENES_COMPRA: OrdenCompra[] = [
  {
    ordenCompraId: 'oc1', folio: 'OC-0001', supplierId: 's1', fecha: '2024-07-02',
    fechaEntregaEsperada: '2024-07-10', monto: 19040, estatus: 'cerrada', notas: '',
    items: [{ detalleId: 'ocd1', productId: 'pr1', cantidad: 200, precioUnitario: 85.50 }]
  },
  {
    ordenCompraId: 'oc2', folio: 'OC-0002', supplierId: 's2', fecha: '2024-07-03',
    fechaEntregaEsperada: '2024-07-12', monto: 9000, estatus: 'recibida', notas: 'Urgente',
    items: [{ detalleId: 'ocd2', productId: 'pr3', cantidad: 500, precioUnitario: 18.00 }]
  },
  {
    ordenCompraId: 'oc3', folio: 'OC-0003', supplierId: 's3', fecha: '2024-07-20',
    fechaEntregaEsperada: '2024-08-05', monto: 37500, estatus: 'emitida', notas: '',
    items: [{ detalleId: 'ocd3', productId: 'pr5', cantidad: 30, precioUnitario: 1250.00 }]
  },
]

// ─── Logistics ─────────────────────────────────────────────────────────────
export const SEED_TRANSPORTISTAS: Transportista[] = [
  { transportistaId: 't1', nombre: 'Fletes Rápidos del Norte', contacto: 'Juan Flores', telefono: '81-8888-9999', tarifaBase: 2500, activo: true },
  { transportistaId: 't2', nombre: 'Transportes Seguros SA', contacto: 'Alicia Mendoza', telefono: '55-9999-0000', tarifaBase: 3200, activo: true },
]

export const SEED_EMBARQUES: Embarque[] = [
  { embarqueId: 'em1', folio: 'EMB-0001', pedidoId: 'so1', origen: 'Almacén Central, MTY', destino: 'Av. Industrial 500, Monterrey, NL', transportistaId: 't1', fechaProgramada: '2024-07-22', fechaEntrega: '2024-07-22', costoFlete: 2500, estatus: 'entregado', notas: '' },
  { embarqueId: 'em2', folio: 'EMB-0002', pedidoId: 'so2', origen: 'Almacén Central, MTY', destino: 'Blvd. Morelos 88, Guadalajara, JAL', transportistaId: 't2', fechaProgramada: '2024-07-28', costoFlete: 3200, estatus: 'programado', notas: '' },
]

// ─── Finance ───────────────────────────────────────────────────────────────
export const SEED_FACTURAS_VENTA: FacturaVenta[] = [
  { facturaId: 'fv1', folio: 'FAC-0001', clienteId: 'c1', pedidoId: 'so1', fecha: '2024-07-22', fechaVencimiento: '2024-08-21', subtotal: 20350, impuestos: 3256, total: 23606, saldoPendiente: 0, estatus: 'pagada' },
  { facturaId: 'fv2', folio: 'FAC-0002', clienteId: 'c3', pedidoId: 'so2', fecha: '2024-07-25', fechaVencimiento: '2024-08-24', subtotal: 18000, impuestos: 2880, total: 20880, saldoPendiente: 20880, estatus: 'emitida' },
]

export const SEED_PAGOS_CLIENTES: PagoCliente[] = [
  { pagoId: 'pc1', facturaId: 'fv1', clienteId: 'c1', fecha: '2024-08-10', monto: 23606, formaPago: 'Transferencia', referencia: 'TRF-20240810-001' },
]

export const SEED_FACTURAS_PROVEEDOR: FacturaProveedor[] = [
  { facturaProvId: 'fp1', folio: 'FPROV-0001', supplierId: 's1', ordenCompraId: 'oc1', fecha: '2024-07-10', fechaVencimiento: '2024-08-09', subtotal: 19040, impuestos: 3046.40, total: 22086.40, saldoPendiente: 0, estatus: 'pagada' },
  { facturaProvId: 'fp2', folio: 'FPROV-0002', supplierId: 's2', ordenCompraId: 'oc2', fecha: '2024-07-12', fechaVencimiento: '2024-07-27', subtotal: 9000, impuestos: 1440, total: 10440, saldoPendiente: 10440, estatus: 'vencida' },
]

export const SEED_PAGOS_PROVEEDORES: PagoProveedor[] = [
  { pagoId: 'pp1', facturaProvId: 'fp1', supplierId: 's1', fecha: '2024-08-08', monto: 22086.40, formaPago: 'Transferencia', referencia: 'TRF-20240808-001' },
]

export const SEED_BANCOS: Banco[] = [
  { bancoId: 'b1', banco: 'BBVA Bancomer', cuenta: '0123456789', saldo: 485000, moneda: 'MXN', activo: true },
  { bancoId: 'b2', banco: 'Santander', cuenta: '9876543210', saldo: 120000, moneda: 'MXN', activo: true },
  { bancoId: 'b3', banco: 'HSBC USD', cuenta: '1122334455', saldo: 15000, moneda: 'USD', activo: true },
]
