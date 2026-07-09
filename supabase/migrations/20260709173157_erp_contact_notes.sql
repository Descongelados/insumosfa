-- NOTAS DE CLIENTES
CREATE TABLE IF NOT EXISTS erp_client_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  text NOT NULL,
  fecha       timestamptz NOT NULL DEFAULT now(),
  texto       text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE erp_client_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_notes_select" ON erp_client_notes;
CREATE POLICY "client_notes_select" ON erp_client_notes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "client_notes_insert" ON erp_client_notes;
CREATE POLICY "client_notes_insert" ON erp_client_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "client_notes_delete" ON erp_client_notes;
CREATE POLICY "client_notes_delete" ON erp_client_notes FOR DELETE TO anon, authenticated USING (true);

-- NOTAS DE PROSPECTOS
CREATE TABLE IF NOT EXISTS erp_prospect_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id text NOT NULL,
  fecha        timestamptz NOT NULL DEFAULT now(),
  texto        text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE erp_prospect_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prospect_notes_select" ON erp_prospect_notes;
CREATE POLICY "prospect_notes_select" ON erp_prospect_notes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "prospect_notes_insert" ON erp_prospect_notes;
CREATE POLICY "prospect_notes_insert" ON erp_prospect_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "prospect_notes_delete" ON erp_prospect_notes;
CREATE POLICY "prospect_notes_delete" ON erp_prospect_notes FOR DELETE TO anon, authenticated USING (true);