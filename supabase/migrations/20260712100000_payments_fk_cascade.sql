-- =============================================================
-- FK con ON DELETE CASCADE para tablas de pagos
-- Evita registros huerfanos cuando se elimina una factura.
--
-- erp_payments_supplier.factura_prov_id -> erp_invoices_supplier.id
-- erp_payments_client.factura_id        -> erp_invoices_sale.id
--
-- Ambas columnas eran TEXT sin FK; las convertimos a UUID con
-- restriccion referencial CASCADE.
-- =============================================================

-- ── 1. Limpiar pagos huerfanos antes de agregar la restriccion ──────────
-- (por si hubiera registros cuyo factura_id ya no existe)
DELETE FROM erp_payments_supplier ps
WHERE NOT EXISTS (
  SELECT 1 FROM erp_invoices_supplier s WHERE s.id::text = ps.factura_prov_id
);

DELETE FROM erp_payments_client pc
WHERE NOT EXISTS (
  SELECT 1 FROM erp_invoices_sale s WHERE s.id::text = pc.factura_id
);

-- ── 2. erp_payments_supplier ────────────────────────────────────────────
-- Cambiar columna de TEXT a UUID y agregar FK con CASCADE
ALTER TABLE erp_payments_supplier
  ALTER COLUMN factura_prov_id TYPE uuid USING factura_prov_id::uuid;

ALTER TABLE erp_payments_supplier
  ALTER COLUMN supplier_id TYPE uuid USING supplier_id::uuid;

ALTER TABLE erp_payments_supplier
  ADD CONSTRAINT fk_pay_sup_factura
    FOREIGN KEY (factura_prov_id)
    REFERENCES erp_invoices_supplier(id)
    ON DELETE CASCADE;

-- ── 3. erp_payments_client ──────────────────────────────────────────────
-- Cambiar columna de TEXT a UUID y agregar FK con CASCADE
ALTER TABLE erp_payments_client
  ALTER COLUMN factura_id TYPE uuid USING factura_id::uuid;

ALTER TABLE erp_payments_client
  ALTER COLUMN cliente_id TYPE uuid USING cliente_id::uuid;

ALTER TABLE erp_payments_client
  ADD CONSTRAINT fk_pay_cli_factura
    FOREIGN KEY (factura_id)
    REFERENCES erp_invoices_sale(id)
    ON DELETE CASCADE;