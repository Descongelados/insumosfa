-- Agrega ciudad y productos_actividad a erp_clients
-- Permite preservar estos datos al convertir un prospecto a cliente.
ALTER TABLE erp_clients
  ADD COLUMN IF NOT EXISTS ciudad              text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS productos_actividad text NOT NULL DEFAULT '';
