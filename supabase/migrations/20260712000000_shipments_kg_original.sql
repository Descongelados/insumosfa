-- Agrega kg_original a erp_shipments
-- Guarda los kg totales solicitados cuando se creó el embarque,
-- de modo que el split siempre compara contra esa cantidad original
-- y no contra lo que el usuario guardó en kgEmbarcados.
ALTER TABLE erp_shipments
  ADD COLUMN IF NOT EXISTS kg_original numeric NOT NULL DEFAULT 0;

-- Backfill: para embarques existentes, calcular kg_original
-- sumando los kgEmbarcados de las OC refs almacenadas en ordenes_ids.
UPDATE erp_shipments
SET kg_original = (
  SELECT COALESCE(SUM((ref->>'kgEmbarcados')::numeric), 0)
  FROM jsonb_array_elements(ordenes_ids) AS ref
)
WHERE kg_original = 0
  AND ordenes_ids IS NOT NULL
  AND jsonb_array_length(ordenes_ids) > 0;