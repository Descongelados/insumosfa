import type {
  User, Client, ContactoCliente, Prospect, Product, Inventario,
  KardexMovimiento, Supplier, Quote, SalesOrder, SolicitudCompra,
  OrdenCompra, Transportista, Embarque, FacturaVenta, PagoCliente,
  FacturaProveedor, PagoProveedor, Banco
} from '../types'

// ─── Users — se mantienen los usuarios del sistema ─────────────────────────
export const SEED_USERS: User[] = [
  { userId: 'u1', name: 'Admin Sistema',  email: 'admin@insumosfa.com',  roles: ['director'],                 active: true, createdAt: '2024-01-01' },
  { userId: 'u2', name: 'Carlos Ventas',  email: 'carlos@insumosfa.com', roles: ['ventas'],                   active: true, createdAt: '2024-01-05' },
  { userId: 'u3', name: 'María Compras',  email: 'maria@insumosfa.com',  roles: ['compras', 'operaciones'],   active: true, createdAt: '2024-01-05' },
  { userId: 'u4', name: 'Pedro Almacén',  email: 'pedro@insumosfa.com',  roles: ['almacen', 'operaciones'],   active: true, createdAt: '2024-01-10' },
  { userId: 'u5', name: 'Laura Admin',    email: 'laura@insumosfa.com',  roles: ['administracion', 'ventas'], active: true, createdAt: '2024-01-10' },
]

// ─── Todo lo demás vacío — el sistema arranca limpio ───────────────────────
export const SEED_CLIENTS:             Client[]            = []
export const SEED_CONTACTOS:           ContactoCliente[]   = []
export const SEED_PROSPECTS:           Prospect[]          = []
export const SEED_PRODUCTS:            Product[]           = []
export const SEED_INVENTARIO:          Inventario[]        = []
export const SEED_KARDEX:              KardexMovimiento[]  = []
export const SEED_SUPPLIERS:           Supplier[]          = []
export const SEED_QUOTES:              Quote[]             = []
export const SEED_SALES_ORDERS:        SalesOrder[]        = []
export const SEED_SOLICITUDES:         SolicitudCompra[]   = []
export const SEED_ORDENES_COMPRA:      OrdenCompra[]       = []
export const SEED_TRANSPORTISTAS:      Transportista[]     = []
export const SEED_EMBARQUES:           Embarque[]          = []
export const SEED_FACTURAS_VENTA:      FacturaVenta[]      = []
export const SEED_PAGOS_CLIENTES:      PagoCliente[]       = []
export const SEED_FACTURAS_PROVEEDOR:  FacturaProveedor[]  = []
export const SEED_PAGOS_PROVEEDORES:   PagoProveedor[]     = []
export const SEED_BANCOS:              Banco[]             = []
