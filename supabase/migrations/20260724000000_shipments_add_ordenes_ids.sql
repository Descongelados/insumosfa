-- Agrega la columna ordenes_ids a erp_shipments si no existe.
-- Esta columna almacena un arreglo JSON de referencias a OCs (EmbarqueOCRef[]).
ALTER TABLE erp_shipments
  ADD COLUMN IF NOT EXISTS ordenes_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
