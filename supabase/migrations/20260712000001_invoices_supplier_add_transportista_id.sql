-- Vincula facturas de flete al transportista (erp_carriers) en lugar
-- de al proveedor de la OC

ALTER TABLE erp_invoices_supplier
  ADD COLUMN IF NOT EXISTS transportista_id text;
