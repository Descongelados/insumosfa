-- Agregar campos Ciudad y Productos/Actividad a erp_prospects
ALTER TABLE erp_prospects
  ADD COLUMN IF NOT EXISTS ciudad              text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS productos_actividad text NOT NULL DEFAULT '';