-- Agrega las columnas que faltaban en producción:
--   creado_por        (migración 20260713000000 no aplicada)
--   ciudad            (migración 20260713000001 no aplicada)
--   productos_actividad (migración 20260713000001 no aplicada)
--
-- Usar ADD COLUMN IF NOT EXISTS para que sea idempotente.

ALTER TABLE erp_prospects
  ADD COLUMN IF NOT EXISTS creado_por          text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ciudad              text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS productos_actividad text NOT NULL DEFAULT '';
