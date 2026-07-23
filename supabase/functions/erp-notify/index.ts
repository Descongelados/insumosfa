import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: erp-notify
 *
 * Envía notificaciones por correo en dos escenarios:
 *   - nuevo_pedido : un nuevo pedido de venta fue creado
 *   - factura_vencida : recordatorio diario de facturas con saldo pendiente vencidas
 *
 * Variables de entorno requeridas (configurar en Supabase Dashboard → Edge Functions):
 *   SUPABASE_URL          - URL del proyecto (auto-inyectada)
 *   SUPABASE_SERVICE_KEY  - Service role key (auto-inyectada como SUPABASE_SERVICE_ROLE_KEY)
 *   RESEND_API_KEY        - API key de Resend (https://resend.com)
 *   NOTIFY_FROM_EMAIL     - Dirección remitente, ej: noreply@insumosfa.com
 *   NOTIFY_TO_EMAIL       - Destinatario de alertas internas, ej: admin@insumosfa.com
 */

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const RESEND_KEY   = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL   = Deno.env.get('NOTIFY_FROM_EMAIL') ?? 'noreply@insumosfa.com'
const TO_EMAIL     = Deno.env.get('NOTIFY_TO_EMAIL') ?? ''

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY || !to) {
    console.warn('erp-notify: RESEND_API_KEY or TO_EMAIL not configured. Skipping email.')
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
  }
}

serve(async (req) => {
  try {
    const body = await req.json() as { type: string; record?: Record<string, unknown> }
    const { type, record } = body

    // ── 1. Nuevo pedido ────────────────────────────────────────────────────────
    if (type === 'nuevo_pedido' && record) {
      const folio     = record.folio as string
      const clienteId = record.cliente_id as string
      const total     = record.total as number

      // Obtener nombre del cliente
      const { data: client } = await supabase
        .from('erp_clients')
        .select('razon_social, correo')
        .eq('id', clienteId)
        .maybeSingle()

      const clienteNombre = (client as { razon_social: string; correo: string } | null)?.razon_social ?? clienteId
      const clienteCorreo = (client as { razon_social: string; correo: string } | null)?.correo ?? ''

      const mxn = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

      // Notificación interna al equipo
      await sendEmail(
        TO_EMAIL,
        `📦 Nuevo pedido ${folio} — ${clienteNombre}`,
        `<h2>Nuevo Pedido de Venta</h2>
         <p><strong>Folio:</strong> ${folio}</p>
         <p><strong>Cliente:</strong> ${clienteNombre}</p>
         <p><strong>Total:</strong> ${mxn(total)}</p>
         <p>Ingresa al sistema para ver los detalles.</p>`
      )

      // Confirmación al cliente (si tiene correo)
      if (clienteCorreo) {
        await sendEmail(
          clienteCorreo,
          `Confirmación de pedido ${folio} — InsumosFA`,
          `<h2>Hemos recibido su pedido</h2>
           <p>Estimado(a) <strong>${clienteNombre}</strong>,</p>
           <p>Confirmamos la recepción de su pedido <strong>${folio}</strong> por un total de <strong>${mxn(total)}</strong>.</p>
           <p>Nuestro equipo se pondrá en contacto con usted a la brevedad para confirmar los detalles de entrega.</p>
           <br><p>Gracias por su preferencia,</p>
           <p><strong>InsumosFA</strong></p>`
        )
      }

      return new Response(JSON.stringify({ ok: true, folio }), { headers: { 'Content-Type': 'application/json' } })
    }

    // ── 2. Recordatorio facturas vencidas ──────────────────────────────────────
    if (type === 'facturas_vencidas') {
      const { data: vencidas } = await supabase
        .from('erp_invoices_sale')
        .select('folio, saldo_pendiente, fecha_vencimiento, cliente_id')
        .eq('estatus', 'vencida')
        .gt('saldo_pendiente', 0)

      if (!vencidas || vencidas.length === 0) {
        return new Response(JSON.stringify({ ok: true, count: 0 }), { headers: { 'Content-Type': 'application/json' } })
      }

      type VencidaRow = { folio: string; saldo_pendiente: number; fecha_vencimiento: string; cliente_id: string }
      const rows = vencidas as VencidaRow[]
      const mxn = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
      const totalVencido = rows.reduce((a, f) => a + f.saldo_pendiente, 0)

      // Obtener nombres de clientes
      const clienteIds = [...new Set(rows.map(r => r.cliente_id))]
      const { data: clientesData } = await supabase
        .from('erp_clients')
        .select('id, razon_social')
        .in('id', clienteIds)
      const clienteMap = new Map((clientesData as { id: string; razon_social: string }[] | null ?? []).map(c => [c.id, c.razon_social]))

      const tabla = rows
        .map(f => `<tr><td style="padding:4px 8px;border:1px solid #eee">${f.folio}</td>
                       <td style="padding:4px 8px;border:1px solid #eee">${clienteMap.get(f.cliente_id) ?? f.cliente_id}</td>
                       <td style="padding:4px 8px;border:1px solid #eee">${f.fecha_vencimiento}</td>
                       <td style="padding:4px 8px;border:1px solid #eee;color:#dc2626;font-weight:bold">${mxn(f.saldo_pendiente)}</td></tr>`)
        .join('')

      await sendEmail(
        TO_EMAIL,
        `⚠️ ${rows.length} factura(s) vencida(s) — ${mxn(totalVencido)} pendiente`,
        `<h2>Facturas Vencidas — InsumosFA</h2>
         <p>Las siguientes ${rows.length} factura(s) tienen saldo pendiente y están vencidas:</p>
         <table style="border-collapse:collapse;width:100%;margin-top:12px">
           <thead><tr>
             <th style="padding:6px 8px;border:1px solid #eee;background:#f7f8fa">Folio</th>
             <th style="padding:6px 8px;border:1px solid #eee;background:#f7f8fa">Cliente</th>
             <th style="padding:6px 8px;border:1px solid #eee;background:#f7f8fa">Vencimiento</th>
             <th style="padding:6px 8px;border:1px solid #eee;background:#f7f8fa">Saldo</th>
           </tr></thead>
           <tbody>${tabla}</tbody>
         </table>
         <p style="margin-top:16px;font-weight:bold">Total vencido: ${mxn(totalVencido)}</p>`
      )

      return new Response(JSON.stringify({ ok: true, count: rows.length, totalVencido }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: false, error: 'Unknown type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('erp-notify error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
