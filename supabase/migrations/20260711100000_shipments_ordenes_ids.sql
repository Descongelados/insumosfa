-- Agrega columna ordenes_ids a erp_shipments para soportar múltiples OCs por embarque
-- Estructura: [{ "ordenCompraId": "uuid", "folio": "OC-0001", "kgEmbarcados": 500 }, ...]
ALTER TABLE erp_shipments
  ADD COLUMN IF NOT EXISTS ordenes_ids jsonb NOT NULL DEFAULT '[]';
