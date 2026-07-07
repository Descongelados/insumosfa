-- Grant EXECUTE on all ERP functions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION erp_get_users() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_update_user(uuid, text, text, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_delete_user(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_toggle_user(uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_verify_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_create_user(text, text, text[], text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION erp_change_password(uuid, text) TO anon, authenticated;