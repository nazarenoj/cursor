-- Script para corregir la tabla de auditoría
-- Elimina la columna usuario_sistema si existe (no se necesita)

-- Verificar si existe la columna usuario_sistema
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'auditoria' 
  AND COLUMN_NAME = 'usuario_sistema'
);

-- Eliminar la columna solo si existe
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE auditoria DROP COLUMN usuario_sistema',
  'SELECT "La columna usuario_sistema no existe" AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar estructura final
DESCRIBE auditoria;


