-- Script para agregar la columna tipo_movimiento a la tabla medios_pago
-- Ejecutar este script en la base de datos de producción

-- Verificar si la columna existe antes de agregarla
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'medios_pago' 
  AND COLUMN_NAME = 'tipo_movimiento'
);

-- Agregar la columna solo si no existe
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE medios_pago ADD COLUMN tipo_movimiento ENUM(\'ingreso\', \'egreso\', \'ambos\') NOT NULL DEFAULT \'ambos\'',
  'SELECT "La columna tipo_movimiento ya existe" AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Actualizar registros existentes que puedan tener NULL (por si acaso)
UPDATE medios_pago SET tipo_movimiento = 'ambos' WHERE tipo_movimiento IS NULL;

-- Verificar que se agregó correctamente
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'medios_pago' 
AND COLUMN_NAME = 'tipo_movimiento';

