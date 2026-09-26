-- Alinea los valores válidos de erp_shipments.estatus con el tipo
-- EmbarqueEstatus del frontend (types/index.ts).
-- El valor 'cancelado' fue agregado al frontend en el commit
-- feat(finanzas/cxp) pero no tenía constraint en BD.
-- La columna era text libre, así que los registros existentes son válidos.

ALTER TABLE erp_shipments
  DROP CONSTRAINT IF EXISTS chk_shipments_estatus;

ALTER TABLE erp_shipments
  ADD CONSTRAINT chk_shipments_estatus
  CHECK (estatus IN (
    'solicitado',
    'confirmado',
    'enTransito',
    'entregado',
    'cerrado',
    'cancelado'
  ));
