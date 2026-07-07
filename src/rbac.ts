import type { Role } from './types'

/**
 * Matriz de acceso por ruta.
 * Cada entrada lista los roles que PUEDEN acceder.
 * 'director' siempre tiene acceso total — se agrega aquí
 * explícitamente para que sea legible y fácil de auditar.
 */
export const ROUTE_ROLES: Record<string, Role[]> = {
  '/':            ['director', 'administracion', 'compras', 'ventas', 'operaciones', 'almacen'],
  '/clientes':    ['director', 'administracion', 'ventas'],
  '/prospectos':  ['director', 'ventas'],
  '/cotizaciones':['director', 'ventas'],
  '/pedidos':     ['director', 'ventas', 'operaciones'],
  '/productos':   ['director', 'administracion', 'compras', 'ventas', 'almacen', 'operaciones'],
  '/inventario':  ['director', 'almacen', 'operaciones', 'compras'],
  '/proveedores': ['director', 'administracion', 'compras'],
  '/compras':     ['director', 'compras', 'operaciones', 'almacen'],
  '/logistica':   ['director', 'operaciones', 'almacen'],
  '/finanzas':    ['director', 'administracion'],
  '/configuracion': ['director', 'administracion', 'compras', 'ventas', 'operaciones', 'almacen'], // todos ven el módulo, pero con restricciones internas
}

/** Devuelve true si alguno de los roles del usuario da acceso a la ruta */
export function canAccess(userRoles: Role[] | undefined | null, path: string): boolean {
  if (!userRoles?.length) return false // sin roles → sin acceso
  const allowed = ROUTE_ROLES[path]
  if (!allowed) return true            // ruta sin restricción declarada: acceso libre
  return userRoles.some(r => allowed.includes(r))
}

/**
 * Etiquetas y metadatos de los módulos del menú.
 * 'roles' son los que tienen acceso — se filtra en el Layout.
 */
import {
  LayoutDashboard, Users, UserSearch, FileText, ShoppingCart,
  Package, Warehouse, Building2, ClipboardList, Truck, DollarSign, Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  icon: LucideIcon
  to: string
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/',
    roles: ['director', 'administracion', 'compras', 'ventas', 'operaciones', 'almacen'],
  },
  {
    label: 'Clientes',
    icon: Users,
    to: '/clientes',
    roles: ['director', 'administracion', 'ventas'],
  },
  {
    label: 'Prospectos',
    icon: UserSearch,
    to: '/prospectos',
    roles: ['director', 'ventas'],
  },
  {
    label: 'Cotizaciones',
    icon: FileText,
    to: '/cotizaciones',
    roles: ['director', 'ventas'],
  },
  {
    label: 'Pedidos Venta',
    icon: ShoppingCart,
    to: '/pedidos',
    roles: ['director', 'ventas', 'operaciones'],
  },
  {
    label: 'Productos',
    icon: Package,
    to: '/productos',
    roles: ['director', 'administracion', 'compras', 'ventas', 'almacen', 'operaciones'],
  },
  {
    label: 'Inventario',
    icon: Warehouse,
    to: '/inventario',
    roles: ['director', 'almacen', 'operaciones', 'compras'],
  },
  {
    label: 'Proveedores',
    icon: Building2,
    to: '/proveedores',
    roles: ['director', 'administracion', 'compras'],
  },
  {
    label: 'Compras',
    icon: ClipboardList,
    to: '/compras',
    roles: ['director', 'compras', 'operaciones', 'almacen'],
  },
  {
    label: 'Logística',
    icon: Truck,
    to: '/logistica',
    roles: ['director', 'operaciones', 'almacen'],
  },
  {
    label: 'Finanzas',
    icon: DollarSign,
    to: '/finanzas',
    roles: ['director', 'administracion'],
  },
  {
    label: 'Configuración',
    icon: Settings,
    to: '/configuracion',
    roles: ['director', 'administracion', 'compras', 'ventas', 'operaciones', 'almacen'],
  },
]
