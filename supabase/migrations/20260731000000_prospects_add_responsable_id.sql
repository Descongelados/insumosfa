-- Columna para vincular el responsable de contacto de un prospecto a un usuario del sistema.
ALTER TABLE public.erp_prospects
  ADD COLUMN IF NOT EXISTS responsable_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
