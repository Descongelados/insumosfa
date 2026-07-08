-- Agrega campos de cliente eventual a erp_quotes
-- Permite cotizar a clientes sin registro ingresando sus datos manualmente.

ALTER TABLE erp_quotes
  ADD COLUMN IF NOT EXISTS cliente_nombre   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_rfc      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_correo   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_telefono text NOT NULL DEFAULT '';
