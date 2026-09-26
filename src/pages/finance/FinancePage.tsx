import { useState, useEffect, useMemo, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { useFinanceStore } from '../../store/financeStore'
import { useClientsStore } from '../../store/clientsStore'
import { useSuppliersStore } from '../../store/suppliersStore'
import { useSalesOrdersStore } from '../../store/salesOrdersStore'
import { useProductsStore } from '../../store/productsStore'
import { usePurchasesStore } from '../../store/purchasesStore'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useInventoryStore } from '../../store/inventoryStore'
import { useAuthStore } from '../../store/authStore'
import { hasRole } from '../../store/usersStore'
import { useConfigStore } from '../../store/configStore'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Modal } from '../../components/ui/Modal'
import { Currency } from '../../components/ui/Currency'
import { RemisionPDF } from '../../components/RemisionPDF'
import { toast } from '../../store/toastStore'
import type { FacturaVenta, SalesOrder, Banco, GastoNegocio, Embarque } from '../../types'
import { DollarSign, CreditCard, Building, Eye, CircleCheck as CheckCircle, Clock, FileText, Plus, CreditCard as Edit2, Trash2, History, CirclePlus as PlusCircle, Receipt, ShoppingCart, XCircle, Truck, Download, FileDown, Share2 } from 'lucide-react'
import { exportToCsv } from '../../utils/exportCsv'

const MXN = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
const FORMAS_PAGO = ['Transferencia', 'Cheque', 'Efectivo', 'Tarjeta']
const CATEGORIAS_GASTO: GastoNegocio['categoria'][] = [
  'Renta', 'Nomina', 'Servicios', 'Mantenimiento', 'Publicidad', 'Transporte', 'Impuestos', 'Prestamos', 'Maquinaria', 'Suministros', 'Otros',
]

const today = () => new Date().toISOString().split('T')[0]

const BLANK_GASTO: Omit<GastoNegocio, 'gastoId'> = {
  fecha: today(),
  categoria: 'Otros',
  descripcion: '',
  monto: 0,
  formaPago: 'Transferencia',
  referencia: '',
  notas: '',
  bancoId: '',
}

export function FinancePage() {
  // --- placeholder to be replaced by actual file content ---
  return <div>Loading...</div>
}
