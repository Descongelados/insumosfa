-- ─────────────────────────────────────────────────────────────────────────────
-- ERP Performance Improvements
--
-- Cambios incluidos:
--   1. Índices de búsqueda en columnas de filtro frecuente
--   2. Secuencias para generación atómica de folios (elimina race condition)
--   3. RPC erp_next_folio — devuelve el siguiente folio usando la secuencia
--   4. Columna iva_pct en erp_purchase_orders (faltaba en schema original)
--   5. Trigger updated_at automático en erp_inventory
--   6. RPC erp_aplicar_pago_cliente — aplica pago + actualiza saldo en una TX
--   7. RPC erp_aplicar_pago_proveedor — ídem para facturas de proveedor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. ÍNDICES ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_kardex_product_id
  ON erp_kardex(product_id);

CREATE INDEX IF NOT EXISTS idx_client_contacts_cliente_id
  ON erp_client_contacts(cliente_id);

CREATE INDEX IF NOT EXISTS idx_client_notes_cliente_id
  ON erp_client_notes(cliente_id);

CREATE INDEX IF NOT EXISTS idx_prospect_notes_prosp_id
  ON erp_prospect_notes(prospecto_id);

CREATE INDEX IF NOT EXISTS idx_payments_cli_factura_id
  ON erp_payments_client(factura_id);

CREATE INDEX IF NOT EXISTS idx_payments_cli_cliente_id
  ON erp_payments_client(cliente_id);

CREATE INDEX IF NOT EXISTS idx_payments_sup_factura_id
  ON erp_payments_supplier(factura_prov_id);

CREATE INDEX IF NOT EXISTS idx_payments_sup_supplier_id
  ON erp_payments_supplier(supplier_id);

CREATE INDEX IF NOT EXISTS idx_invoices_sale_pedido_id
  ON erp_invoices_sale(pedido_id);

CREATE INDEX IF NOT EXISTS idx_invoices_sale_cliente_id
  ON erp_invoices_sale(cliente_id);

CREATE INDEX IF NOT EXISTS idx_invoices_sup_supplier_id
  ON erp_invoices_supplier(supplier_id);

CREATE INDEX IF NOT EXISTS idx_quotes_cliente_id
  ON erp_quotes(cliente_id);

CREATE INDEX IF NOT EXISTS idx_sales_orders_cliente_id
  ON erp_sales_orders(cliente_id);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_product_id
  ON erp_purchase_requests(product_id);

-- ── 2. SECUENCIAS DE FOLIOS ──────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS erp_seq_folio_quotes    START 1;
CREATE SEQUENCE IF NOT EXISTS erp_seq_folio_sales     START 1;
CREATE SEQUENCE IF NOT EXISTS erp_seq_folio_purchases START 1;
CREATE SEQUENCE IF NOT EXISTS erp_seq_folio_shipments START 1;
CREATE SEQUENCE IF NOT EXISTS erp_seq_folio_inv_sale  START 1;
CREATE SEQUENCE IF NOT EXISTS erp_seq_folio_inv_sup   START 1;

-- ── 3. RPC erp_next_folio ────────────────────────────────────────────────────
-- Uso: SELECT erp_next_folio('COT', 'erp_seq_folio_quotes')
--      → 'COT-0001'

CREATE OR REPLACE FUNCTION erp_next_folio(p_prefix text, p_seq text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN p_prefix || '-' || lpad(nextval(p_seq::regclass)::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION erp_next_folio(text, text) TO anon, authenticated;

-- ── 4. COLUMNA iva_pct EN erp_purchase_orders ────────────────────────────────

ALTER TABLE erp_purchase_orders
  ADD COLUMN IF NOT EXISTS iva_pct numeric NOT NULL DEFAULT 16;

-- ── 5. TRIGGER updated_at EN erp_inventory ───────────────────────────────────

CREATE OR REPLACE FUNCTION erp_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON erp_inventory;
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON erp_inventory
  FOR EACH ROW EXECUTE FUNCTION erp_set_updated_at();

-- ── 6. RPC erp_aplicar_pago_cliente ─────────────────────────────────────────
-- Inserta el pago y actualiza saldo/estatus de la factura en una sola TX.
-- Usa FOR UPDATE para evitar double-spend concurrente.

CREATE OR REPLACE FUNCTION erp_aplicar_pago_cliente(
  p_factura_id  text,
  p_cliente_id  text,
  p_fecha       date,
  p_monto       numeric,
  p_forma_pago  text,
  p_referencia  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo numeric;
BEGIN
  INSERT INTO erp_payments_client(factura_id, cliente_id, fecha, monto, forma_pago, referencia)
  VALUES (p_factura_id, p_cliente_id, p_fecha, p_monto, p_forma_pago, p_referencia);

  SELECT saldo_pendiente INTO v_saldo
  FROM erp_invoices_sale
  WHERE id::text = p_factura_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura % no encontrada', p_factura_id;
  END IF;

  v_saldo := GREATEST(0, v_saldo - p_monto);

  UPDATE erp_invoices_sale
  SET saldo_pendiente = v_saldo,
      estatus = CASE WHEN v_saldo = 0 THEN 'pagada' ELSE 'parcial' END
  WHERE id::text = p_factura_id;
END;
$$;

GRANT EXECUTE ON FUNCTION erp_aplicar_pago_cliente(text,text,date,numeric,text,text)
  TO anon, authenticated;

-- ── 7. RPC erp_aplicar_pago_proveedor ───────────────────────────────────────

CREATE OR REPLACE FUNCTION erp_aplicar_pago_proveedor(
  p_factura_prov_id  text,
  p_supplier_id      text,
  p_fecha            date,
  p_monto            numeric,
  p_forma_pago       text,
  p_referencia       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo numeric;
BEGIN
  INSERT INTO erp_payments_supplier(factura_prov_id, supplier_id, fecha, monto, forma_pago, referencia)
  VALUES (p_factura_prov_id, p_supplier_id, p_fecha, p_monto, p_forma_pago, p_referencia);

  SELECT saldo_pendiente INTO v_saldo
  FROM erp_invoices_supplier
  WHERE id::text = p_factura_prov_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura proveedor % no encontrada', p_factura_prov_id;
  END IF;

  v_saldo := GREATEST(0, v_saldo - p_monto);

  UPDATE erp_invoices_supplier
  SET saldo_pendiente = v_saldo,
      estatus = CASE WHEN v_saldo = 0 THEN 'pagada' ELSE 'parcial' END
  WHERE id::text = p_factura_prov_id;
END;
$$;

GRANT EXECUTE ON FUNCTION erp_aplicar_pago_proveedor(text,text,date,numeric,text,text)
  TO anon, authenticated;
