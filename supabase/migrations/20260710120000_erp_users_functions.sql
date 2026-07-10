-- ==============================================================
-- ERP USERS — tabla + 7 RPCs para autenticación y gestión
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- DEBE ejecutarse ANTES de 20260710200000_import_from_testinsumos.sql
-- ==============================================================

-- ─── TABLA erp_users ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  name       text NOT NULL DEFAULT '',
  roles      text[] NOT NULL DEFAULT ARRAY[]::text[],
  password   text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE erp_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON erp_users;
CREATE POLICY "users_select" ON erp_users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "users_insert" ON erp_users;
CREATE POLICY "users_insert" ON erp_users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "users_update" ON erp_users;
CREATE POLICY "users_update" ON erp_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "users_delete" ON erp_users;
CREATE POLICY "users_delete" ON erp_users FOR DELETE TO anon, authenticated USING (true);

-- ─── DROP funciones existentes (por si tienen tipo de retorno distinto) ────
DROP FUNCTION IF EXISTS erp_verify_login(text, text);
DROP FUNCTION IF EXISTS erp_get_users();
DROP FUNCTION IF EXISTS erp_create_user(text, text, text[], text);
DROP FUNCTION IF EXISTS erp_update_user(uuid, text, text, text[]);
DROP FUNCTION IF EXISTS erp_delete_user(uuid);
DROP FUNCTION IF EXISTS erp_toggle_user(uuid, boolean);
DROP FUNCTION IF EXISTS erp_change_password(uuid, text);

-- ─── RPC: erp_verify_login ──────────────────────────────────────
CREATE OR REPLACE FUNCTION erp_verify_login(p_email text, p_password text)
RETURNS TABLE (id uuid, email text, name text, roles text[], active boolean, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.roles, u.active, u.created_at
  FROM erp_users u
  WHERE u.email = lower(trim(p_email))
    AND u.password = p_password;
END;
$$;

-- ─── RPC: erp_get_users ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION erp_get_users()
RETURNS TABLE (id uuid, email text, name text, roles text[], active boolean, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.roles, u.active, u.created_at
  FROM erp_users u
  ORDER BY u.created_at;
END;
$$;

-- ─── RPC: erp_create_user ───────────────────────────────────────
CREATE OR REPLACE FUNCTION erp_create_user(
  p_email    text,
  p_name     text,
  p_roles    text[],
  p_password text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO erp_users (email, name, roles, password)
  VALUES (lower(trim(p_email)), p_name, p_roles, p_password);
END;
$$;

-- ─── RPC: erp_update_user ───────────────────────────────────────
CREATE OR REPLACE FUNCTION erp_update_user(
  p_id    uuid,
  p_email text,
  p_name  text,
  p_roles text[]
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE erp_users
  SET email = lower(trim(p_email)),
      name  = p_name,
      roles = p_roles
  WHERE id = p_id;
END;
$$;

-- ─── RPC: erp_delete_user ───────────────────────────────────────
CREATE OR REPLACE FUNCTION erp_delete_user(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM erp_users WHERE id = p_id;
END;
$$;

-- ─── RPC: erp_toggle_user ───────────────────────────────────────
CREATE OR REPLACE FUNCTION erp_toggle_user(p_id uuid, p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE erp_users SET active = p_active WHERE id = p_id;
END;
$$;

-- ─── RPC: erp_change_password ───────────────────────────────────
CREATE OR REPLACE FUNCTION erp_change_password(p_id uuid, p_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE erp_users SET password = p_password WHERE id = p_id;
END;
$$;

-- ─── GRANTS ─────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION erp_verify_login(text, text)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_get_users()                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_create_user(text, text, text[], text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_update_user(uuid, text, text, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_delete_user(uuid)                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_toggle_user(uuid, boolean)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_change_password(uuid, text)        TO anon, authenticated;
