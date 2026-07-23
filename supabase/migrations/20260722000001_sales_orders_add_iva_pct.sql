-- Agrega iva_pct a erp_sales_orders para soportar tasas 0%, 8% y 16%
-- Los registros existentes quedan con 16 (valor por defecto histórico).
ALTER TABLE erp_sales_orders
  ADD COLUMN IF NOT EXISTS iva_pct numeric NOT NULL DEFAULT 16;
