import clsx from 'clsx'

const variants = {
  nuevo: 'badge-blue', new: 'badge-blue', borrador: 'badge-gray',
  activo: 'badge-green', confirmado: 'badge-green', aprobada: 'badge-green',
  emitida: 'badge-blue', enviada: 'badge-blue', programado: 'badge-blue',
  aceptada: 'badge-green', pagada: 'badge-green', entregado: 'badge-green',
  ganado: 'badge-green', recibida: 'badge-green', cerrada: 'badge-green',
  surtiendo: 'badge-yellow', enRevision: 'badge-yellow', cotizado: 'badge-yellow',
  embarcado: 'badge-yellow', enTransito: 'badge-yellow', parcial: 'badge-yellow',
  recolectado: 'badge-yellow', contactado: 'badge-yellow',
  rechazada: 'badge-red', inactivo: 'badge-red', perdido: 'badge-red',
  vencida: 'badge-red', cancelada: 'badge-red',
  facturado: 'badge-purple', calificado: 'badge-purple',
  solicitado: 'badge-orange', creada: 'badge-orange',
  enviarPago: 'badge-purple', parcialLogistica: 'badge-yellow',
  enviarLogistica: 'badge-blue',
  alta: 'badge-red', media: 'badge-yellow', baja: 'badge-gray',
} as Record<string, string>

const labels: Record<string, string> = {
  nuevo: 'Nuevo', borrador: 'Borrador', activo: 'Activo', inactivo: 'Inactivo',
  confirmado: 'Confirmado', aprobada: 'Aprobada', rechazada: 'Rechazada',
  emitida: 'Emitida', enviada: 'Enviada', programado: 'Programado',
  aceptada: 'Aceptada', pagada: 'Pagada', entregado: 'Entregado',
  ganado: 'Ganado', recibida: 'Recibida', cerrada: 'Cerrada',
  surtiendo: 'Surtiendo', enRevision: 'En Revisión', cotizado: 'Cotizado',
  embarcado: 'Embarcado', enTransito: 'En Tránsito', parcial: 'Parcial',
  recolectado: 'Recolectado', contactado: 'Contactado',
  perdido: 'Perdido', vencida: 'Vencida', cancelada: 'Cancelada',
  facturado: 'Facturado', calificado: 'Calificado',
  solicitado: 'Solicitado', creada: 'Creada', alta: 'Alta', media: 'Media', baja: 'Baja',
  enviarPago: 'Enviar a Pago', parcialLogistica: 'Parcial Logística',
  enviarLogistica: 'Enviar a Logística',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('badge', variants[status] ?? 'badge-gray')}>
      {labels[status] ?? status}
    </span>
  )
}
