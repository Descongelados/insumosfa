-- ─── Gastos del Negocio ───────────────────────────────────────────────────
create table if not exists public.erp_gastos_negocio (
  id            uuid primary key default gen_random_uuid(),
  fecha         date        not null,
  categoria     text        not null,
  descripcion   text        not null,
  monto         numeric(14,2) not null check (monto > 0),
  forma_pago    text        not null default 'Transferencia',
  referencia    text        not null default '',
  notas         text        not null default '',
  created_at    timestamptz not null default now()
);

alter table public.erp_gastos_negocio enable row level security;

-- Lectura: cualquier usuario autenticado
create policy "gastos_select" on public.erp_gastos_negocio
  for select to authenticated using (true);

-- Escritura: director y administracion
create policy "gastos_insert" on public.erp_gastos_negocio
  for insert to authenticated with check (true);

create policy "gastos_update" on public.erp_gastos_negocio
  for update to authenticated using (true) with check (true);

create policy "gastos_delete" on public.erp_gastos_negocio
  for delete to authenticated using (true);

-- Permisos
grant select, insert, update, delete on public.erp_gastos_negocio to authenticated;
