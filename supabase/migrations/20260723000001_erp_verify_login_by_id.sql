-- RPC para refrescar sesión a partir del ID de usuario
-- Usada por authStore.refreshRoles() al montar la app
CREATE OR REPLACE FUNCTION erp_verify_login_by_id(p_id uuid)
RETURNS TABLE(
  id          uuid,
  email       text,
  name        text,
  roles       text[],
  active      boolean,
  created_at  timestamptz
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, email, name, roles, active, created_at
  FROM   erp_users
  WHERE  id = p_id;
$$;

GRANT EXECUTE ON FUNCTION erp_verify_login_by_id(uuid) TO anon, authenticated;
