-- Tabla de configuración global del ERP (datos de la empresa)
-- Una sola fila con id = 'empresa', compartida por todos los usuarios.
-- Reemplaza el localStorage anterior (erp_config en Zustand persist).

CREATE TABLE IF NOT EXISTS erp_config (
  id         text PRIMARY KEY,
  nombre     text NOT NULL DEFAULT 'InsumosFa',
  rfc        text NOT NULL DEFAULT '',
  telefono   text NOT NULL DEFAULT '',
  direccion  text NOT NULL DEFAULT '',
  correo     text NOT NULL DEFAULT '',
  logo_url   text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE erp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_select" ON erp_config;
CREATE POLICY "config_select" ON erp_config
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "config_insert" ON erp_config;
CREATE POLICY "config_insert" ON erp_config
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "config_update" ON erp_config;
CREATE POLICY "config_update" ON erp_config
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Insertar la fila inicial con los valores de producción
INSERT INTO erp_config (id, nombre, rfc, telefono, direccion, correo, logo_url)
VALUES (
  'empresa',
  'InsumosFa',
  'IFA210301AB3',
  '(81) 8000-1234',
  'Av. Industrial 1200, Parque Norte, Monterrey, N.L. C.P. 64720',
  'ventas@insumosfa.com',
  ''
)
ON CONFLICT (id) DO NOTHING;
