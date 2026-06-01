-- Script de migración: Mover datos de caja_id a la tabla intermedia medio_pago_cajas
-- Ejecutar este script después de actualizar el código

-- Paso 1: Migrar los medios de pago que tienen una caja asociada
INSERT INTO medio_pago_cajas (medio_pago_id, caja_id)
SELECT id, caja_id
FROM medios_pago
WHERE caja_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM medio_pago_cajas mpc 
  WHERE mpc.medio_pago_id = medios_pago.id 
  AND mpc.caja_id = medios_pago.caja_id
);

-- Verificar la migración
SELECT 
  mp.id,
  mp.nombre,
  mp.caja_id as caja_id_antigua,
  GROUP_CONCAT(mpc.caja_id ORDER BY mpc.caja_id) as cajas_asociadas
FROM medios_pago mp
LEFT JOIN medio_pago_cajas mpc ON mp.id = mpc.medio_pago_id
GROUP BY mp.id, mp.nombre, mp.caja_id
ORDER BY mp.id;

-- Nota: La columna caja_id se mantiene por compatibilidad hacia atrás
-- pero ahora se usa principalmente la tabla medio_pago_cajas para la relación muchos-a-muchos

