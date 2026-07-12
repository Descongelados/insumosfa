-- Agrega referencia al embarque en facturas de proveedor
-- Permite crear una factura de flete independiente vinculada al embarque

ALTER TABLE erp_invoices_supplier
  ADD COLUMN IF NOT EXISTS embarque_id text;
