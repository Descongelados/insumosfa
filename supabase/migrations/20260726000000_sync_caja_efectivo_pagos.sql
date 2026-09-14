-- ── Sincronizar e inicializar saldo de Caja de Efectivo con pagos históricos en Efectivo ──

DO $$
DECLARE
  v_caja_id uuid;
  v_total_efectivo numeric;
BEGIN
  -- Calcular el total cobrado en Efectivo en erp_payments_client
  SELECT COALESCE(SUM(monto), 0)
  INTO v_total_efectivo
  FROM erp_payments_client
  WHERE forma_pago = 'Efectivo';

  -- Buscar si ya existe la cuenta Caja
  SELECT id INTO v_caja_id
  FROM erp_banks
  WHERE moneda = 'CAJA'
  LIMIT 1;

  IF v_caja_id IS NULL THEN
    INSERT INTO erp_banks (banco, cuenta, saldo, moneda, activo)
    VALUES ('Caja Efectivo', '', v_total_efectivo, 'CAJA', true);
  ELSE
    -- Si existe pero tiene 0 o saldo desfasado, ajustar con los cobros en efectivo existentes
    UPDATE erp_banks
    SET saldo = GREATEST(saldo, v_total_efectivo)
    WHERE id = v_caja_id;
  END IF;
END $$;
