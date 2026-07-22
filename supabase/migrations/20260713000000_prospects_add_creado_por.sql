-- Agregar columna creado_por a erp_prospects
-- Guarda el nombre del usuario del sistema que creó el prospecto
ALTER TABLE erp_prospects
  ADD COLUMN IF NOT EXISTS creado_por text NOT NULL DEFAULT '';