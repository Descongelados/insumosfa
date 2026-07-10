-- ==============================================================
-- IMPORTACION DE DATOS: testinsumos → insumosfa
-- Fuente: bgovphnpqdtfzlmqprjb.supabase.co
-- Destino: yfqzhjqbpqhifcybombx.supabase.co
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- 46 statements — idempotente (ON CONFLICT DO UPDATE/NOTHING)
-- ==============================================================

-- ─── EMPRESA ────────────────────────────────────────────────────
UPDATE erp_config SET
  nombre    = 'InsumosFa',
  rfc       = 'FAPG9503223VA',
  telefono  = '3314129903',
  direccion = 'Agustin Rivera #293, CP 45600, Col. Santa Anita, Tlaquepaque, Jalisco',
  correo    = 'ventas.fa.insumos@gmail.com'
WHERE id = 'empresa';

-- ─── USUARIOS ───────────────────────────────────────────────────
-- Requiere tabla erp_users. Si no existe ejecutar primero:
--   supabase/migrations/20260710120000_erp_users_functions.sql

INSERT INTO erp_users (id, email, name, roles, password, active, created_at) VALUES
  ('bb9b0fd7-fd88-4c38-afba-133d6b3fdb64','admin@insumosfa.com','Admin Sistema',ARRAY['director'],'Admin123!',true,'2024-01-01T00:00:00+00:00')
ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, roles=EXCLUDED.roles, active=EXCLUDED.active;

INSERT INTO erp_users (id, email, name, roles, password, active, created_at) VALUES
  ('c59970a9-7d2d-4cc3-a723-9474af88c994','farias@insumosfa.com','farias',ARRAY['administracion','operaciones','almacen'],'Farias123!',true,'2026-07-06T15:27:45.481705+00:00')
ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, roles=EXCLUDED.roles, active=EXCLUDED.active;

INSERT INTO erp_users (id, email, name, roles, password, active, created_at) VALUES
  ('c5ee41fa-98d8-4ba0-ae18-563411909c19','blanca@insumosfa.com','blanca',ARRAY['administracion','almacen','operaciones'],'Blanca123!',true,'2026-07-06T15:31:09.39057+00:00')
ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, roles=EXCLUDED.roles, active=EXCLUDED.active;

INSERT INTO erp_users (id, email, name, roles, password, active, created_at) VALUES
  ('701529dc-191b-4ed3-aebf-daa8a66795df','auner@insumosfa.com','auner',ARRAY['ventas','compras','almacen'],'Auner123!',true,'2026-07-06T15:31:40.136395+00:00')
ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, roles=EXCLUDED.roles, active=EXCLUDED.active;

INSERT INTO erp_users (id, email, name, roles, password, active, created_at) VALUES
  ('00bf9d8c-5c24-44ea-8c84-5ed4befc4f51','ramon@insumosfa.com','ramon',ARRAY['ventas','almacen'],'Ramon123!',true,'2026-07-06T15:32:00.662087+00:00')
ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, roles=EXCLUDED.roles, active=EXCLUDED.active;

-- ─── PROVEEDORES ────────────────────────────────────────────────
INSERT INTO erp_suppliers (id, razon_social, rfc, contacto, correo, telefono, condiciones_pago, calidad, precio, tiempo_entrega, cumplimiento, activo) VALUES
  ('c965d7d4-6a0e-4d67-9072-70c494d64a5d','AGRO INDUSTRIAS AVICOLAS SA DE CV','AAV040305L29','JOSE ANTONIO RODRIGUEZ','','3781213113','Contado',1,11,7,10,true)
ON CONFLICT (id) DO UPDATE SET razon_social=EXCLUDED.razon_social, rfc=EXCLUDED.rfc, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, condiciones_pago=EXCLUDED.condiciones_pago, calidad=EXCLUDED.calidad, precio=EXCLUDED.precio, tiempo_entrega=EXCLUDED.tiempo_entrega, cumplimiento=EXCLUDED.cumplimiento, activo=EXCLUDED.activo;

INSERT INTO erp_suppliers (id, razon_social, rfc, contacto, correo, telefono, condiciones_pago, calidad, precio, tiempo_entrega, cumplimiento, activo) VALUES
  ('3d2a8100-2bc8-43c8-ac55-f5ea8d98d1c8','SERVICIOS Y COMISIONES SA DE CV','SCO86041672A','JORGE SALEME','','3336672263','Contado',10,2,7,10,true)
ON CONFLICT (id) DO UPDATE SET razon_social=EXCLUDED.razon_social, rfc=EXCLUDED.rfc, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, condiciones_pago=EXCLUDED.condiciones_pago, calidad=EXCLUDED.calidad, precio=EXCLUDED.precio, tiempo_entrega=EXCLUDED.tiempo_entrega, cumplimiento=EXCLUDED.cumplimiento, activo=EXCLUDED.activo;

-- ─── PRODUCTOS ──────────────────────────────────────────────────
INSERT INTO erp_products (id, sku, descripcion, categoria, marca, unidad_medida, costo_promedio, precio_venta, activo) VALUES
  ('31349b7a-bdc0-4ea7-8dcd-dbbab873fcb1','INF-008','Papel separador Platanero Liso 95 x 45 cm','Paquete de 20 kg','Papel Kraft','KG',14.10,18.50,true)
ON CONFLICT (id) DO UPDATE SET sku=EXCLUDED.sku, descripcion=EXCLUDED.descripcion, categoria=EXCLUDED.categoria, marca=EXCLUDED.marca, unidad_medida=EXCLUDED.unidad_medida, costo_promedio=EXCLUDED.costo_promedio, precio_venta=EXCLUDED.precio_venta, activo=EXCLUDED.activo;

-- ─── CLIENTES ───────────────────────────────────────────────────
INSERT INTO erp_clients (id, razon_social, rfc, regimen_fiscal, direccion_fiscal, correo, telefono, limite_credito, estatus, fecha_alta) VALUES
  ('8abbf973-13be-4a4b-be60-6db04c975918','AGRICOLA AGGALL','AAG250819218','601 - General de Ley Personas Morales','KM 3 CARRETERA TECOMAN LA ESTACION S/N C.P 28930 COLONIA TECOMAN ESTACION','rocio.bonilla@coliman.com','3131020068',0,'activo','2026-07-07')
ON CONFLICT (id) DO UPDATE SET razon_social=EXCLUDED.razon_social, rfc=EXCLUDED.rfc, regimen_fiscal=EXCLUDED.regimen_fiscal, direccion_fiscal=EXCLUDED.direccion_fiscal, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, limite_credito=EXCLUDED.limite_credito, estatus=EXCLUDED.estatus;

-- ─── INVENTARIO ─────────────────────────────────────────────────
INSERT INTO erp_inventory (id, product_id, cantidad_disponible, cantidad_comprometida, cantidad_transito) VALUES
  ('3486401f-0697-4b91-bce2-484a69b8945c','31349b7a-bdc0-4ea7-8dcd-dbbab873fcb1',12236,0,0)
ON CONFLICT (product_id) DO UPDATE SET cantidad_disponible=EXCLUDED.cantidad_disponible, cantidad_comprometida=EXCLUDED.cantidad_comprometida, cantidad_transito=EXCLUDED.cantidad_transito;

-- ─── KARDEX ─────────────────────────────────────────────────────
INSERT INTO erp_kardex (id, product_id, fecha, usuario, documento_origen, tipo, cantidad, existencia_anterior, existencia_nueva, notas) VALUES
  ('d6e3e819-eb2a-4ebc-8c91-3a3e60b6f1ab','31349b7a-bdc0-4ea7-8dcd-dbbab873fcb1','2026-07-08','auner@insumosfa.com','FA-2455','EntradaCompra',8370,0,8370,'')
ON CONFLICT (id) DO NOTHING;

INSERT INTO erp_kardex (id, product_id, fecha, usuario, documento_origen, tipo, cantidad, existencia_anterior, existencia_nueva, notas) VALUES
  ('daea3979-5b9f-441c-a4fc-768f3621f419','31349b7a-bdc0-4ea7-8dcd-dbbab873fcb1','2026-07-09','auner@insumosfa.com','Manual','EntradaCompra',3866,8370,12236,'')
ON CONFLICT (id) DO NOTHING;

-- ─── PROSPECTOS ─────────────────────────────────────────────────
INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('512a7e19-957c-4638-b565-91ec1d850b36','Materiales XYZ','Roberto Sanchez','roberto@matxyz.mx','55-0000-1111','Referido','calificado',80000,'2024-06-01')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('2a49d4f3-2741-4a3f-9a0f-402de38a61e0','Herramientas Plus','Diana Torres','diana@herraplus.mx','33-1111-2222','LinkedIn','cotizado',120000,'2024-06-15')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('8c3f3cc7-76a3-4942-8b47-72f543d276f8','Agro Industrial del Norte','Ernesto Ruiz','eruiz@agroind.mx','81-2222-3333','Expo','nuevo',250000,'2024-07-01')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('e1b46538-ca0f-4064-8506-1c06c80ebb36','Pinturas y Acabados SR','Silvia Martinez','smtz@pintyacab.mx','44-3333-4444','Web','contactado',60000,'2024-07-10')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('49d90fba-40e5-4e3b-a3f2-df6b561c80b5','EMPAQUE DE FRUTAS TROPICALES','','','','Referido','contactado',0,'2026-07-06')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('73406504-52ba-4b12-adaa-bd2d6f0e377e','COLIMAN FRESH','','','3131500195','Referido','ganado',0,'2026-07-06')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('b6e11355-574b-4be1-b88d-bf5dad6997c8','COLINAY','','','3279782183','Referido','nuevo',0,'2026-07-06')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('d1ac797e-4a78-4240-b5a3-a87b2b36f4da','PINTO GROWER','','','3131492840','Referido','contactado',0,'2026-07-06')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('70e3e717-c81e-468b-9422-e9b3861c6f5b','AGRYSCALE','','','3123181160','Referido','ganado',0,'2026-07-06')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('c08b8fe8-0736-4bbc-b342-d5c6a19ebc92','LARIFRUT','Sra moreno','','3133245129','Referido','contactado',0,'2026-07-06')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('bb3195e1-763a-48d7-9780-89f15887f046','CHONITA BANANA','','','3133270096','Referido','nuevo',0,'2026-07-06')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('26c25e7f-1efc-4e85-b863-f444225b342b','TROPIPACK','','','','Referido','nuevo',0,'2026-07-06')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('213b96d3-75fa-4928-a957-6132e57da7d3','BANAMARES','','','','Referido','nuevo',0,'2026-07-06')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('7a5437de-b8e9-40ed-abe9-f250e799d086','Larifruit','Sra. Moreno','','3131087974','Web','contactado',0,'2026-07-07')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('72551649-cc1a-4e8d-b7bb-10b5a78b9e08','Frutas los arrallanes','Angie','acorona@arrallanes.com','3131501314','Web','contactado',0,'2026-07-08')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('2fc5c6bf-393e-4bdf-842b-183458cd823f','Hannafrut','','','3326885450','Referido','nuevo',0,'2026-07-08')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('963d98fe-a3f6-4a4d-b946-5e8dc260b65e','Empaques de frutas chula vista','','','3133243950','Referido','nuevo',0,'2026-07-08')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('3c793a89-c59b-4286-8982-14f205dbefb2','Frutas de dav','','','3334962830','Referido','nuevo',0,'2026-07-08')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('8279ef9c-5864-4bde-8795-d950123c805a','Empaque grupo San Jorge','','empresasanjorge1@gmail.com','313 324 4420','Web','nuevo',0,'2026-07-09')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('80465c74-700e-4ea9-b472-0346d16fdbe0','Tropipackco','Betty','','3131137451','Web','cotizado',0,'2026-07-09')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('2cd6b870-3dd4-4c45-9921-f12579eb2f48','Ramamy','Lic. Guillermo','','+52 33 1566 7825','Web','calificado',0,'2026-07-09')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('6dce4dda-e9e7-4e43-b7e5-37b5bb4e0ff8','Deliceos','','compras@deliseos.com','3411330106','Web','nuevo',0,'2026-07-09')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('7954eb29-7808-4c14-81b7-7d41ae63fe56','Callejones produce inc','','','3131086578','Web','contactado',0,'2026-07-09')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('3a4ca59a-63da-4866-ac3a-f3c985d48d9f','Agro gonzamex','','','3411331012','Referido','nuevo',0,'2026-07-09')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

INSERT INTO erp_prospects (id, empresa, contacto, correo, telefono, origen, estatus, valor_potencial, fecha_alta) VALUES
  ('3f0fe5d0-a62b-4cbe-b6e8-49cc347d71b1','Grupo Los Cerritos','','','3411330716','Web','nuevo',0,'2026-07-09')
ON CONFLICT (id) DO UPDATE SET empresa=EXCLUDED.empresa, contacto=EXCLUDED.contacto, correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, estatus=EXCLUDED.estatus, valor_potencial=EXCLUDED.valor_potencial;

-- ─── NOTAS DE PROSPECTOS ────────────────────────────────────────
INSERT INTO erp_prospect_notes (id, prospecto_id, fecha, texto) VALUES
  ('7cd90ef5-e572-40b5-844f-bb2401dd8845','2cd6b870-3dd4-4c45-9921-f12579eb2f48','2026-07-09T18:08:18.027425+00:00','Se contacto por WhatsApp cliente ya solicito cotizacion en la cual ya se envio en espera de respuesta')
ON CONFLICT (id) DO NOTHING;

INSERT INTO erp_prospect_notes (id, prospecto_id, fecha, texto) VALUES
  ('40f03157-c519-4864-903c-a4755c742ec4','80465c74-700e-4ea9-b472-0346d16fdbe0','2026-07-09T18:08:54.945421+00:00','Se contacta por WhatsApp se le ha enviado cotizacion a la espera de respuesta')
ON CONFLICT (id) DO NOTHING;

INSERT INTO erp_prospect_notes (id, prospecto_id, fecha, texto) VALUES
  ('8caaef94-0f11-4c85-8714-afbdfd48613d','8279ef9c-5864-4bde-8795-d950123c805a','2026-07-09T18:10:11.183099+00:00','Se realiza llamada y no han contestado')
ON CONFLICT (id) DO NOTHING;

INSERT INTO erp_prospect_notes (id, prospecto_id, fecha, texto) VALUES
  ('04c09b82-a88d-49fe-87d7-7f19089dd67e','6dce4dda-e9e7-4e43-b7e5-37b5bb4e0ff8','2026-07-09T18:12:04.190574+00:00','Contactado por WhatsApp y por correo electronico en espera de respuesta')
ON CONFLICT (id) DO NOTHING;

INSERT INTO erp_prospect_notes (id, prospecto_id, fecha, texto) VALUES
  ('cbf98d1e-4b24-414a-abfb-7c84295ff639','72551649-cc1a-4e8d-b7bb-10b5a78b9e08','2026-07-09T18:12:46.843916+00:00','Cotizacion enviada por medio de WhatsApp espera de respuesta')
ON CONFLICT (id) DO NOTHING;

INSERT INTO erp_prospect_notes (id, prospecto_id, fecha, texto) VALUES
  ('a8745baa-4a09-440d-aa8e-09b333b5ebe4','c08b8fe8-0736-4bbc-b342-d5c6a19ebc92','2026-07-09T18:13:55.299872+00:00','Contacto por WhatsApp producto que manejan papel separador perforado se envio cotizacion')
ON CONFLICT (id) DO NOTHING;

-- ─── COTIZACIONES ───────────────────────────────────────────────
INSERT INTO erp_quotes (id, folio, cliente_id, cliente_nombre, cliente_rfc, cliente_correo, cliente_telefono, cliente_direccion, fecha, vigencia, subtotal, impuestos, total, estatus, items, notas) VALUES
  ('5fedc6b4-d462-4e4f-82e6-2c041fd5b9e4','COT-0002','','','','','','','2026-07-09','2026-07-23',18300,2928,21228,'borrador',
   '[{"precio":18.3,"cantidad":1000,"descuento":0,"detalleId":"qd1783617438671","productId":"31349b7a-bdc0-4ea7-8dcd-dbbab873fcb1"}]'::jsonb,'')
ON CONFLICT (id) DO UPDATE SET folio=EXCLUDED.folio, estatus=EXCLUDED.estatus, total=EXCLUDED.total, items=EXCLUDED.items;

INSERT INTO erp_quotes (id, folio, cliente_id, cliente_nombre, cliente_rfc, cliente_correo, cliente_telefono, cliente_direccion, fecha, vigencia, subtotal, impuestos, total, estatus, items, notas) VALUES
  ('03b8545a-8c42-4557-b3d8-076c5137e29d','COT-0002','','','','','','','2026-07-09','2026-07-16',9250,1480,10730,'enviada',
   '[{"precio":18.5,"cantidad":500,"descuento":0,"detalleId":"qd1783618404162","productId":"31349b7a-bdc0-4ea7-8dcd-dbbab873fcb1"}]'::jsonb,'')
ON CONFLICT (id) DO UPDATE SET folio=EXCLUDED.folio, estatus=EXCLUDED.estatus, total=EXCLUDED.total, items=EXCLUDED.items;

INSERT INTO erp_quotes (id, folio, cliente_id, cliente_nombre, cliente_rfc, cliente_correo, cliente_telefono, cliente_direccion, fecha, vigencia, subtotal, impuestos, total, estatus, items, notas) VALUES
  ('4ad6b346-2769-42ad-8e45-d690e136d482','COT-0003','','','','','','','2026-07-09','2026-07-16',9250,1480,10730,'borrador',
   '[{"precio":18.5,"cantidad":500,"descuento":0,"detalleId":"qd1783619830434","productId":"31349b7a-bdc0-4ea7-8dcd-dbbab873fcb1"}]'::jsonb,'')
ON CONFLICT (id) DO UPDATE SET folio=EXCLUDED.folio, estatus=EXCLUDED.estatus, total=EXCLUDED.total, items=EXCLUDED.items;

-- ==============================================================
-- FIN — 46 statements
-- ==============================================================
