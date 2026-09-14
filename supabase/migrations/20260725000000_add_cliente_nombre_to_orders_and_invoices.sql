-- Agregar cliente_nombre a erp_sales_orders y erp_invoices_sale
-- para preservar el nombre del cliente eventual al convertir cotización a pedido

ALTER TABLE erp_sales_orders
  ADD COLUMN IF NOT EXISTS cliente_nombre text NOT NULL DEFAULT '';

ALTER TABLE erp_invoices_sale
  ADD COLUMN IF NOT EXISTS cliente_nombre text NOT NULL DEFAULT '';
