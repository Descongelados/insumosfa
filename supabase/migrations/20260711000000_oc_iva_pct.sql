-- Agrega columna iva_pct a erp_purchase_orders (0, 8 o 16%)
ALTER TABLE erp_purchase_orders
  ADD COLUMN IF NOT EXISTS iva_pct integer NOT NULL DEFAULT 16;
