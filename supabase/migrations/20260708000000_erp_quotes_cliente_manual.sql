-- Agrega soporte para cotizaciones a clientes no registrados
ALTER TABLE erp_quotes
  ADD COLUMN IF NOT EXISTS cliente_nombre  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_rfc     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_correo  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_telefono text NOT NULL DEFAULT '';