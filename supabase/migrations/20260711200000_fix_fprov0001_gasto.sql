-- ================================================================
-- Fix: insertar gasto de $195,750 correspondiente a FPROV-0001
-- El pago se registró antes del código de auto-gasto, por lo que
-- no se creó automáticamente. Se inserta manualmente aquí.
-- ================================================================

INSERT INTO public.erp_gastos_negocio
  (fecha, categoria, descripcion, monto, forma_pago, referencia, notas)
VALUES
  ('2026-07-11', 'Suministros', 'Pago OC FPROV-0001', 195750, 'Transferencia', '', 'Generado al liquidar FPROV-0001');
