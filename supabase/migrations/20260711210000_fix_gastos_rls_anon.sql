-- Fix: erp_gastos_negocio fue creada con TO authenticated solamente,
-- pero el resto del ERP usa anon key directamente (single-tenant).
-- Corregir las políticas para incluir anon igual que las demás tablas.

DROP POLICY IF EXISTS "gastos_select" ON public.erp_gastos_negocio;
DROP POLICY IF EXISTS "gastos_insert" ON public.erp_gastos_negocio;
DROP POLICY IF EXISTS "gastos_update" ON public.erp_gastos_negocio;
DROP POLICY IF EXISTS "gastos_delete" ON public.erp_gastos_negocio;

CREATE POLICY "gastos_select" ON public.erp_gastos_negocio
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "gastos_insert" ON public.erp_gastos_negocio
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "gastos_update" ON public.erp_gastos_negocio
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "gastos_delete" ON public.erp_gastos_negocio
  FOR DELETE TO anon, authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_gastos_negocio TO anon;
