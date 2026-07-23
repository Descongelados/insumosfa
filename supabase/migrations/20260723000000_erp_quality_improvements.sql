-- ════════════════════════════════════════════════════════════════════════════
-- ERP Quality Improvements
-- 1. Tabla erp_audit_log + trigger en todas las tablas de negocio
-- 2. Triggers updated_at en tablas que no lo tenían
-- 3. CHECK jsonb_typeof(items) = 'array' en tablas con JSONB items
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. AUDIT LOG ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla         text        NOT NULL,
  operacion     text        NOT NULL CHECK (operacion IN ('INSERT','UPDATE','DELETE')),
  registro_id   text        NOT NULL,
  usuario_email text,
  datos_antes   jsonb,
  datos_despues jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_audit_log_tabla        ON erp_audit_log(tabla);
CREATE INDEX IF NOT EXISTS idx_audit_log_registro     ON erp_audit_log(registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at   ON erp_audit_log(created_at DESC);

-- RLS para erp_audit_log
ALTER TABLE erp_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_read" ON erp_audit_log FOR SELECT USING (true);
CREATE POLICY "audit_log_insert" ON erp_audit_log FOR INSERT WITH CHECK (true);

-- Función genérica de trigger de auditoría
CREATE OR REPLACE FUNCTION erp_audit_trigger_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id text;
BEGIN
  -- Obtener el ID del registro (siempre columna "id")
  IF TG_OP = 'DELETE' THEN
    v_id := OLD.id::text;
  ELSE
    v_id := NEW.id::text;
  END IF;

  INSERT INTO erp_audit_log (tabla, operacion, registro_id, datos_antes, datos_despues)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    v_id,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN NULL;
END;
$$;

-- Macro para registrar el trigger en una tabla
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'erp_clients', 'erp_prospects', 'erp_products', 'erp_suppliers',
    'erp_quotes', 'erp_sales_orders', 'erp_purchase_orders', 'erp_purchase_requests',
    'erp_invoices_sale', 'erp_invoices_supplier',
    'erp_payments_client', 'erp_payments_supplier',
    'erp_banks', 'erp_gastos_negocio',
    'erp_shipments', 'erp_carriers', 'erp_inventory'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_audit_%1$s ON %1$s;
       CREATE TRIGGER trg_audit_%1$s
         AFTER INSERT OR UPDATE OR DELETE ON %1$s
         FOR EACH ROW EXECUTE FUNCTION erp_audit_trigger_fn();',
      t
    );
  END LOOP;
END;
$$;

-- ── 2. TRIGGERS updated_at EN TABLAS FALTANTES ───────────────────────────────
-- La función erp_set_updated_at ya existe (creada en migración de performance).
-- Aplicarla a las tablas que aún no la tienen.

DO $$
DECLARE
  t text;
  tables_upd text[] := ARRAY[
    'erp_clients', 'erp_prospects', 'erp_products', 'erp_suppliers',
    'erp_quotes', 'erp_sales_orders', 'erp_purchase_orders', 'erp_purchase_requests',
    'erp_invoices_sale', 'erp_invoices_supplier',
    'erp_payments_client', 'erp_payments_supplier',
    'erp_banks', 'erp_gastos_negocio',
    'erp_shipments', 'erp_carriers'
  ];
BEGIN
  FOREACH t IN ARRAY tables_upd LOOP
    -- Solo agrega columna updated_at si no existe
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = t AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at timestamptz DEFAULT now()', t);
    END IF;

    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_upd_%1$s ON %1$s;
       CREATE TRIGGER trg_upd_%1$s
         BEFORE UPDATE ON %1$s
         FOR EACH ROW EXECUTE FUNCTION erp_set_updated_at();',
      t
    );
  END LOOP;
END;
$$;

-- ── 3. CHECK JSONB items = array ─────────────────────────────────────────────

-- erp_quotes
ALTER TABLE erp_quotes
  DROP CONSTRAINT IF EXISTS chk_quotes_items_array;
ALTER TABLE erp_quotes
  ADD CONSTRAINT chk_quotes_items_array
  CHECK (items IS NULL OR jsonb_typeof(items) = 'array');

-- erp_sales_orders
ALTER TABLE erp_sales_orders
  DROP CONSTRAINT IF EXISTS chk_sales_orders_items_array;
ALTER TABLE erp_sales_orders
  ADD CONSTRAINT chk_sales_orders_items_array
  CHECK (items IS NULL OR jsonb_typeof(items) = 'array');

-- erp_purchase_orders
ALTER TABLE erp_purchase_orders
  DROP CONSTRAINT IF EXISTS chk_purchase_orders_items_array;
ALTER TABLE erp_purchase_orders
  ADD CONSTRAINT chk_purchase_orders_items_array
  CHECK (items IS NULL OR jsonb_typeof(items) = 'array');
