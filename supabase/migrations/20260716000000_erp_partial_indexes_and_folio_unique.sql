-- ─────────────────────────────────────────────────────────────────────────────
-- ERP — Índices parciales por estatus + UNIQUE en folio
--
-- Cambios:
--   1. Índices parciales en columnas estatus de tablas financieras/operativas:
--      cubren los filtros más frecuentes (facturas pendientes, pedidos activos,
--      OC abiertas, prospectos en pipeline) sin indexar filas ya cerradas.
--   2. Constraint UNIQUE en folio de las 6 tablas que lo usan. La RPC
--      erp_next_folio ya garantiza unicidad en código; el UNIQUE lo refuerza
--      a nivel de BD ante inserciones manuales o scripts externos.
--      PRECAUCIÓN: falla si existen folios duplicados. Verificar primero con:
--        SELECT folio, COUNT(*) FROM erp_quotes GROUP BY folio HAVING COUNT(*) > 1;
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. ÍNDICES PARCIALES POR ESTATUS ─────────────────────────────────────────

-- Facturas de venta pendientes de cobro (excluye pagadas y canceladas)
CREATE INDEX IF NOT EXISTS idx_invoices_sale_estatus_pendiente
  ON erp_invoices_sale(estatus)
  WHERE estatus IN ('emitida', 'parcial', 'vencida');

-- Facturas de proveedor pendientes de pago
CREATE INDEX IF NOT EXISTS idx_invoices_sup_estatus_pendiente
  ON erp_invoices_supplier(estatus)
  WHERE estatus IN ('recibida', 'parcial', 'vencida');

-- Pedidos activos (los que el equipo sigue trabajando)
CREATE INDEX IF NOT EXISTS idx_sales_orders_estatus_activo
  ON erp_sales_orders(estatus)
  WHERE estatus NOT IN ('cerrado', 'facturado');

-- Órdenes de compra abiertas
CREATE INDEX IF NOT EXISTS idx_purchase_orders_estatus_activo
  ON erp_purchase_orders(estatus)
  WHERE estatus IN ('emitida', 'confirmada', 'enviarLogistica', 'parcialLogistica', 'enviarPago');

-- Prospectos en pipeline activo (excluye ganado/perdido)
CREATE INDEX IF NOT EXISTS idx_prospects_estatus_activo
  ON erp_prospects(estatus)
  WHERE estatus NOT IN ('ganado', 'perdido');

-- Embarques en curso
CREATE INDEX IF NOT EXISTS idx_shipments_estatus_activo
  ON erp_shipments(estatus)
  WHERE estatus NOT IN ('entregado', 'cerrado');

-- ── 2. UNIQUE EN FOLIO ────────────────────────────────────────────────────────
-- Usar IF NOT EXISTS en el índice subyacente; el constraint falla si hay
-- duplicados previos — en ese caso omitir la línea correspondiente.

ALTER TABLE erp_quotes
  ADD CONSTRAINT uq_quotes_folio UNIQUE (folio);

ALTER TABLE erp_sales_orders
  ADD CONSTRAINT uq_sales_orders_folio UNIQUE (folio);

ALTER TABLE erp_purchase_orders
  ADD CONSTRAINT uq_purchase_orders_folio UNIQUE (folio);

ALTER TABLE erp_shipments
  ADD CONSTRAINT uq_shipments_folio UNIQUE (folio);

ALTER TABLE erp_invoices_sale
  ADD CONSTRAINT uq_invoices_sale_folio UNIQUE (folio);

ALTER TABLE erp_invoices_supplier
  ADD CONSTRAINT uq_invoices_supplier_folio UNIQUE (folio);
