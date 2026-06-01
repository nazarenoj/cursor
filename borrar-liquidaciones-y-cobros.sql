-- =============================================================================
-- BORRAR LIQUIDACIONES, COBROS Y MOVIMIENTOS DE CAJA - Base de datos
-- =============================================================================
-- Este script elimina:
--   1. TODOS los movimientos de caja (movimientos_cajas).
--   2. Todas las líneas de liquidación por socio (liquidaciones_cuotas).
--   3. Todas las liquidaciones mensuales (liquidaciones_mensuales).
--   4. Pone el saldo inicial de todas las cajas en 0 (UPDATE cajas SET saldo_inicial = 0).
--
-- NO borra: socios, categorías, usuarios, definición de cajas ni medios de pago.
--
-- IMPORTANTE: Hacer backup de la base de datos antes de ejecutar.
--
-- Cómo ejecutar en PowerShell:
--
--   Opción 1 - Usar cmd para la redirección:
--     cmd /c ".\mysql.exe -u root -p club_social < `"C:\ruta\completa\borrar-liquidaciones-y-cobros.sql`""
--
--   Opción 2 - Usar source (barras normales / en la ruta):
--     .\mysql.exe -u root -p club_social -e "source C:/ruta/completa/borrar-liquidaciones-y-cobros.sql"
--
--   Opción 3 - Tubería (desde la carpeta del .sql):
--     Get-Content ".\borrar-liquidaciones-y-cobros.sql" -Raw | .\mysql.exe -u root -p club_social
--
-- =============================================================================

USE club_social;

-- Orden: primero movimientos (tienen FK a liquidaciones_cuotas), luego cuotas, luego liquidaciones mensuales

-- 1) Borrar TODOS los movimientos de caja
DELETE FROM movimientos_cajas;

-- 2) Borrar todas las cuotas de liquidación (por socio por mes)
DELETE FROM liquidaciones_cuotas;

-- 3) Borrar todas las liquidaciones mensuales
DELETE FROM liquidaciones_mensuales;

-- 4) Poner saldo inicial de todas las cajas en 0
UPDATE cajas SET saldo_inicial = 0;

SELECT 'Liquidaciones, cobros, movimientos de caja borrados; cajas a 0.' AS resultado;
