/*
# ERP Full Schema - Tablas Compartidas

Migra todo el ERP de localStorage a Supabase para que todos los usuarios
vean la misma información en tiempo real.

1. Nuevas tablas:
   - erp_clients: clientes con datos fiscales
   - erp_client_contacts: contactos de clientes (FK a erp_clients)
   - erp_prospects: prospectos del pipeline de ventas
   - erp_products: catálogo de productos
   - erp_suppliers: proveedores con calificaciones
   - erp_quotes: cotizaciones (items como JSONB)
   - erp_sales_orders: pedidos de venta (items como JSONB)
   - erp_purchase_requests: solicitudes de compra interna
   - erp_purchase_orders: órdenes de compra a proveedores (items como JSONB)
   - erp_inventory: stock por producto
   - erp_kardex: movimientos de inventario
   - erp_shipments: embarques logísticos
   - erp_carriers: transportistas
   - erp_invoices_sale: facturas de venta
   - erp_payments_client: pagos recibidos de clientes
   - erp_invoices_supplier: facturas de proveedores
   - erp_payments_supplier: pagos realizados a proveedores
   - erp_banks: cuentas bancarias

2. Seguridad:
   - RLS habilitado en todas las tablas
   - Políticas TO anon, authenticated con USING(true) — ERP single-tenant,
     datos compartidos entre todos los usuarios autenticados del sistema

3. Notas:
   - Items de cotizaciones, pedidos y OC se guardan como JSONB por ser
     siempre leídos junto con el registro padre
   - FK entre tablas son soft (text) para evitar bloqueos por orden de inserción
*/

-- ─── CLIENTS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social  text NOT NULL,
  rfc           text NOT NULL DEFAULT '',
  regimen_fiscal text NOT NULL DEFAULT '',
  direccion_fiscal text NOT NULL DEFAULT '',
  correo        text NOT NULL DEFAULT '',
  telefono      text NOT NULL DEFAULT '',
  limite_credito numeric NOT NULL DEFAULT 0,
  estatus       text NOT NULL DEFAULT 'activo',
  fecha_alta    date NOT NULL DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE erp_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clients_select" ON erp_clients;
CREATE POLICY "clients_select" ON erp_clients FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "clients_insert" ON erp_clients;
CREATE POLICY "clients_insert" ON erp_clients FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "clients_update" ON erp_clients;
CREATE POLICY "clients_update" ON erp_clients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "clients_delete" ON erp_clients;
CREATE POLICY "clients_delete" ON erp_clients FOR DELETE TO anon, authenticated USING (true);

-- ─── CLIENT CONTACTS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_client_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES erp_clients(id) ON DELETE CASCADE,
  nombre      text NOT NULL DEFAULT '',
  puesto      text NOT NULL DEFAULT '',
  correo      text NOT NULL DEFAULT '',
  telefono    text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE erp_client_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contacts_select" ON erp_client_contacts;
CREATE POLICY "contacts_select" ON erp_client_contacts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "contacts_insert" ON erp_client_contacts;
CREATE POLICY "contacts_insert" ON erp_client_contacts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "contacts_update" ON erp_client_contacts;
CREATE POLICY "contacts_update" ON erp_client_contacts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "contacts_delete" ON erp_client_contacts;
CREATE POLICY "contacts_delete" ON erp_client_contacts FOR DELETE TO anon, authenticated USING (true);

-- ─── PROSPECTS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_prospects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa         text NOT NULL,
  contacto        text NOT NULL DEFAULT '',
  correo          text NOT NULL DEFAULT '',
  telefono        text NOT NULL DEFAULT '',
  origen          text NOT NULL DEFAULT '',
  estatus         text NOT NULL DEFAULT 'nuevo',
  valor_potencial numeric NOT NULL DEFAULT 0,
  fecha_alta      date NOT NULL DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE erp_prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prospects_select" ON erp_prospects;
CREATE POLICY "prospects_select" ON erp_prospects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "prospects_insert" ON erp_prospects;
CREATE POLICY "prospects_insert" ON erp_prospects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "prospects_update" ON erp_prospects;
CREATE POLICY "prospects_update" ON erp_prospects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "prospects_delete" ON erp_prospects;
CREATE POLICY "prospects_delete" ON erp_prospects FOR DELETE TO anon, authenticated USING (true);

-- ─── PRODUCTS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             text NOT NULL DEFAULT '',
  descripcion     text NOT NULL,
  categoria       text NOT NULL DEFAULT '',
  marca           text NOT NULL DEFAULT '',
  unidad_medida   text NOT NULL DEFAULT 'pza',
  costo_promedio  numeric NOT NULL DEFAULT 0,
  precio_venta    numeric NOT NULL DEFAULT 0,
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE erp_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select" ON erp_products;
CREATE POLICY "products_select" ON erp_products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "products_insert" ON erp_products;
CREATE POLICY "products_insert" ON erp_products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "products_update" ON erp_products;
CREATE POLICY "products_update" ON erp_products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "products_delete" ON erp_products;
CREATE POLICY "products_delete" ON erp_products FOR DELETE TO anon, authenticated USING (true);

-- ─── SUPPLIERS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_suppliers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social      text NOT NULL,
  rfc               text NOT NULL DEFAULT '',
  contacto          text NOT NULL DEFAULT '',
  correo            text NOT NULL DEFAULT '',
  telefono          text NOT NULL DEFAULT '',
  condiciones_pago  text NOT NULL DEFAULT '',
  calidad           numeric NOT NULL DEFAULT 0,
  precio            numeric NOT NULL DEFAULT 0,
  tiempo_entrega    numeric NOT NULL DEFAULT 0,
  cumplimiento      numeric NOT NULL DEFAULT 0,
  activo            boolean NOT NULL DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE erp_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suppliers_select" ON erp_suppliers;
CREATE POLICY "suppliers_select" ON erp_suppliers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "suppliers_insert" ON erp_suppliers;
CREATE POLICY "suppliers_insert" ON erp_suppliers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "suppliers_update" ON erp_suppliers;
CREATE POLICY "suppliers_update" ON erp_suppliers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "suppliers_delete" ON erp_suppliers;
CREATE POLICY "suppliers_delete" ON erp_suppliers FOR DELETE TO anon, authenticated USING (true);

-- ─── QUOTES ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_quotes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio       text NOT NULL,
  cliente_id  text NOT NULL DEFAULT '',
  fecha       date NOT NULL DEFAULT now(),
  vigencia    date NOT NULL DEFAULT now(),
  subtotal    numeric NOT NULL DEFAULT 0,
  impuestos   numeric NOT NULL DEFAULT 0,
  total       numeric NOT NULL DEFAULT 0,
  estatus     text NOT NULL DEFAULT 'borrador',
  items       jsonb NOT NULL DEFAULT '[]',
  notas       text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE erp_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotes_select" ON erp_quotes;
CREATE POLICY "quotes_select" ON erp_quotes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "quotes_insert" ON erp_quotes;
CREATE POLICY "quotes_insert" ON erp_quotes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "quotes_update" ON erp_quotes;
CREATE POLICY "quotes_update" ON erp_quotes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "quotes_delete" ON erp_quotes;
CREATE POLICY "quotes_delete" ON erp_quotes FOR DELETE TO anon, authenticated USING (true);

-- ─── SALES ORDERS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_sales_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio           text NOT NULL,
  cliente_id      text NOT NULL DEFAULT '',
  cotizacion_id   text,
  fecha_pedido    date NOT NULL DEFAULT now(),
  fecha_entrega   date NOT NULL DEFAULT now(),
  estatus         text NOT NULL DEFAULT 'nuevo',
  items           jsonb NOT NULL DEFAULT '[]',
  subtotal        numeric NOT NULL DEFAULT 0,
  impuestos       numeric NOT NULL DEFAULT 0,
  total           numeric NOT NULL DEFAULT 0,
  notas           text NOT NULL DEFAULT '',
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE erp_sales_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_orders_select" ON erp_sales_orders;
CREATE POLICY "sales_orders_select" ON erp_sales_orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sales_orders_insert" ON erp_sales_orders;
CREATE POLICY "sales_orders_insert" ON erp_sales_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sales_orders_update" ON erp_sales_orders;
CREATE POLICY "sales_orders_update" ON erp_sales_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sales_orders_delete" ON erp_sales_orders;
CREATE POLICY "sales_orders_delete" ON erp_sales_orders FOR DELETE TO anon, authenticated USING (true);

-- ─── PURCHASE REQUESTS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_purchase_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante text NOT NULL DEFAULT '',
  fecha       date NOT NULL DEFAULT now(),
  prioridad   text NOT NULL DEFAULT 'media',
  motivo      text NOT NULL DEFAULT '',
  product_id  text NOT NULL DEFAULT '',
  cantidad    numeric NOT NULL DEFAULT 0,
  estatus     text NOT NULL DEFAULT 'creada',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE erp_purchase_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pur_req_select" ON erp_purchase_requests;
CREATE POLICY "pur_req_select" ON erp_purchase_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pur_req_insert" ON erp_purchase_requests;
CREATE POLICY "pur_req_insert" ON erp_purchase_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pur_req_update" ON erp_purchase_requests;
CREATE POLICY "pur_req_update" ON erp_purchase_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pur_req_delete" ON erp_purchase_requests;
CREATE POLICY "pur_req_delete" ON erp_purchase_requests FOR DELETE TO anon, authenticated USING (true);

-- ─── PURCHASE ORDERS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_purchase_orders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio                 text NOT NULL,
  supplier_id           text NOT NULL DEFAULT '',
  fecha                 date NOT NULL DEFAULT now(),
  fecha_entrega_esperada date NOT NULL DEFAULT now(),
  monto                 numeric NOT NULL DEFAULT 0,
  estatus               text NOT NULL DEFAULT 'borrador',
  items                 jsonb NOT NULL DEFAULT '[]',
  notas                 text NOT NULL DEFAULT '',
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE erp_purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pur_ord_select" ON erp_purchase_orders;
CREATE POLICY "pur_ord_select" ON erp_purchase_orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pur_ord_insert" ON erp_purchase_orders;
CREATE POLICY "pur_ord_insert" ON erp_purchase_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pur_ord_update" ON erp_purchase_orders;
CREATE POLICY "pur_ord_update" ON erp_purchase_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pur_ord_delete" ON erp_purchase_orders;
CREATE POLICY "pur_ord_delete" ON erp_purchase_orders FOR DELETE TO anon, authenticated USING (true);

-- ─── INVENTORY ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_inventory (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id              text NOT NULL UNIQUE,
  cantidad_disponible     numeric NOT NULL DEFAULT 0,
  cantidad_comprometida   numeric NOT NULL DEFAULT 0,
  cantidad_transito       numeric NOT NULL DEFAULT 0,
  updated_at              timestamptz DEFAULT now()
);

ALTER TABLE erp_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_select" ON erp_inventory;
CREATE POLICY "inv_select" ON erp_inventory FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "inv_insert" ON erp_inventory;
CREATE POLICY "inv_insert" ON erp_inventory FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "inv_update" ON erp_inventory;
CREATE POLICY "inv_update" ON erp_inventory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "inv_delete" ON erp_inventory;
CREATE POLICY "inv_delete" ON erp_inventory FOR DELETE TO anon, authenticated USING (true);

-- ─── KARDEX ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_kardex (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          text NOT NULL,
  fecha               date NOT NULL DEFAULT now(),
  usuario             text NOT NULL DEFAULT '',
  documento_origen    text NOT NULL DEFAULT '',
  tipo                text NOT NULL,
  cantidad            numeric NOT NULL DEFAULT 0,
  existencia_anterior numeric NOT NULL DEFAULT 0,
  existencia_nueva    numeric NOT NULL DEFAULT 0,
  notas               text NOT NULL DEFAULT '',
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE erp_kardex ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kardex_select" ON erp_kardex;
CREATE POLICY "kardex_select" ON erp_kardex FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "kardex_insert" ON erp_kardex;
CREATE POLICY "kardex_insert" ON erp_kardex FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "kardex_update" ON erp_kardex;
CREATE POLICY "kardex_update" ON erp_kardex FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "kardex_delete" ON erp_kardex;
CREATE POLICY "kardex_delete" ON erp_kardex FOR DELETE TO anon, authenticated USING (true);

-- ─── CARRIERS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_carriers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        text NOT NULL,
  contacto      text NOT NULL DEFAULT '',
  telefono      text NOT NULL DEFAULT '',
  tarifa_base   numeric NOT NULL DEFAULT 0,
  activo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE erp_carriers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "carriers_select" ON erp_carriers;
CREATE POLICY "carriers_select" ON erp_carriers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "carriers_insert" ON erp_carriers;
CREATE POLICY "carriers_insert" ON erp_carriers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "carriers_update" ON erp_carriers;
CREATE POLICY "carriers_update" ON erp_carriers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "carriers_delete" ON erp_carriers;
CREATE POLICY "carriers_delete" ON erp_carriers FOR DELETE TO anon, authenticated USING (true);

-- ─── SHIPMENTS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_shipments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio             text NOT NULL,
  pedido_id         text,
  origen            text NOT NULL DEFAULT '',
  destino           text NOT NULL DEFAULT '',
  transportista_id  text NOT NULL DEFAULT '',
  fecha_programada  date NOT NULL DEFAULT now(),
  fecha_entrega     date,
  costo_flete       numeric NOT NULL DEFAULT 0,
  estatus           text NOT NULL DEFAULT 'solicitado',
  notas             text NOT NULL DEFAULT '',
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE erp_shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shipments_select" ON erp_shipments;
CREATE POLICY "shipments_select" ON erp_shipments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shipments_insert" ON erp_shipments;
CREATE POLICY "shipments_insert" ON erp_shipments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shipments_update" ON erp_shipments;
CREATE POLICY "shipments_update" ON erp_shipments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shipments_delete" ON erp_shipments;
CREATE POLICY "shipments_delete" ON erp_shipments FOR DELETE TO anon, authenticated USING (true);

-- ─── INVOICES SALE ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_invoices_sale (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio             text NOT NULL,
  cliente_id        text NOT NULL DEFAULT '',
  pedido_id         text,
  fecha             date NOT NULL DEFAULT now(),
  fecha_vencimiento date NOT NULL DEFAULT now(),
  subtotal          numeric NOT NULL DEFAULT 0,
  impuestos         numeric NOT NULL DEFAULT 0,
  total             numeric NOT NULL DEFAULT 0,
  saldo_pendiente   numeric NOT NULL DEFAULT 0,
  estatus           text NOT NULL DEFAULT 'emitida',
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE erp_invoices_sale ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_sale_select" ON erp_invoices_sale;
CREATE POLICY "inv_sale_select" ON erp_invoices_sale FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "inv_sale_insert" ON erp_invoices_sale;
CREATE POLICY "inv_sale_insert" ON erp_invoices_sale FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "inv_sale_update" ON erp_invoices_sale;
CREATE POLICY "inv_sale_update" ON erp_invoices_sale FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "inv_sale_delete" ON erp_invoices_sale;
CREATE POLICY "inv_sale_delete" ON erp_invoices_sale FOR DELETE TO anon, authenticated USING (true);

-- ─── PAYMENTS CLIENT ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_payments_client (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id  text NOT NULL DEFAULT '',
  cliente_id  text NOT NULL DEFAULT '',
  fecha       date NOT NULL DEFAULT now(),
  monto       numeric NOT NULL DEFAULT 0,
  forma_pago  text NOT NULL DEFAULT '',
  referencia  text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE erp_payments_client ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pay_cli_select" ON erp_payments_client;
CREATE POLICY "pay_cli_select" ON erp_payments_client FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pay_cli_insert" ON erp_payments_client;
CREATE POLICY "pay_cli_insert" ON erp_payments_client FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pay_cli_update" ON erp_payments_client;
CREATE POLICY "pay_cli_update" ON erp_payments_client FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pay_cli_delete" ON erp_payments_client;
CREATE POLICY "pay_cli_delete" ON erp_payments_client FOR DELETE TO anon, authenticated USING (true);

-- ─── INVOICES SUPPLIER ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_invoices_supplier (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio             text NOT NULL,
  supplier_id       text NOT NULL DEFAULT '',
  orden_compra_id   text,
  fecha             date NOT NULL DEFAULT now(),
  fecha_vencimiento date NOT NULL DEFAULT now(),
  subtotal          numeric NOT NULL DEFAULT 0,
  impuestos         numeric NOT NULL DEFAULT 0,
  total             numeric NOT NULL DEFAULT 0,
  saldo_pendiente   numeric NOT NULL DEFAULT 0,
  estatus           text NOT NULL DEFAULT 'recibida',
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE erp_invoices_supplier ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_sup_select" ON erp_invoices_supplier;
CREATE POLICY "inv_sup_select" ON erp_invoices_supplier FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "inv_sup_insert" ON erp_invoices_supplier;
CREATE POLICY "inv_sup_insert" ON erp_invoices_supplier FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "inv_sup_update" ON erp_invoices_supplier;
CREATE POLICY "inv_sup_update" ON erp_invoices_supplier FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "inv_sup_delete" ON erp_invoices_supplier;
CREATE POLICY "inv_sup_delete" ON erp_invoices_supplier FOR DELETE TO anon, authenticated USING (true);

-- ─── PAYMENTS SUPPLIER ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_payments_supplier (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_prov_id text NOT NULL DEFAULT '',
  supplier_id     text NOT NULL DEFAULT '',
  fecha           date NOT NULL DEFAULT now(),
  monto           numeric NOT NULL DEFAULT 0,
  forma_pago      text NOT NULL DEFAULT '',
  referencia      text NOT NULL DEFAULT '',
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE erp_payments_supplier ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pay_sup_select" ON erp_payments_supplier;
CREATE POLICY "pay_sup_select" ON erp_payments_supplier FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pay_sup_insert" ON erp_payments_supplier;
CREATE POLICY "pay_sup_insert" ON erp_payments_supplier FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pay_sup_update" ON erp_payments_supplier;
CREATE POLICY "pay_sup_update" ON erp_payments_supplier FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pay_sup_delete" ON erp_payments_supplier;
CREATE POLICY "pay_sup_delete" ON erp_payments_supplier FOR DELETE TO anon, authenticated USING (true);

-- ─── BANKS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_banks (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banco     text NOT NULL,
  cuenta    text NOT NULL DEFAULT '',
  saldo     numeric NOT NULL DEFAULT 0,
  moneda    text NOT NULL DEFAULT 'MXN',
  activo    boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "banks_select" ON erp_banks;
CREATE POLICY "banks_select" ON erp_banks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "banks_insert" ON erp_banks;
CREATE POLICY "banks_insert" ON erp_banks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "banks_update" ON erp_banks;
CREATE POLICY "banks_update" ON erp_banks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "banks_delete" ON erp_banks;
CREATE POLICY "banks_delete" ON erp_banks FOR DELETE TO anon, authenticated USING (true);
