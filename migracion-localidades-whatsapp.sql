-- =============================================================================
-- MIGRACIÓN: Localidades, código postal en socios, plantillas WhatsApp
-- Uso: ejecutar en la base de datos de PRODUCCIÓN solo si quieres aplicar
--      los cambios de schema a mano. Si actualizas el backend y reinicias,
--      el servidor aplica estos cambios automáticamente al iniciar (initDb).
-- NO borra ni modifica datos existentes.
-- =============================================================================

-- Usar la base de datos del club (ajusta el nombre si es distinto)
USE club_social;

-- 1) Columna codigo_postal en socios
--    Si la columna ya existe, MySQL devolverá error "Duplicate column name"; puedes ignorarlo.
ALTER TABLE socios ADD COLUMN codigo_postal VARCHAR(20) DEFAULT NULL;

-- 2) Tabla localidades (solo se crea si no existe)
CREATE TABLE IF NOT EXISTS localidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  provincia VARCHAR(255) NOT NULL,
  codigo_postal VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_localidad_provincia (nombre, provincia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- 3) Tabla plantillas de WhatsApp (solo se crea si no existe)
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  texto TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Los permisos whatsapp_templates.* se insertan al iniciar el backend (initPermisosYAdmin).
-- No es necesario añadirlos aquí.
