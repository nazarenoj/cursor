-- Índices para optimizar consultas usadas en la API (WHERE, ORDER BY, JOIN).
-- Ejecutar una sola vez. Si un índice ya existe, MySQL devolverá error; puede ignorarse o comentar la línea.
-- Prioridad: socios, liquidaciones_cuotas, usuarios, adherentes, cajas, movimientos_cajas.

-- ========== SOCIOS ==========
-- Filtros por fecha_baja (activo/inactivo) y orden por numero_socio
CREATE INDEX idx_socios_fecha_baja ON socios (fecha_baja);
-- Búsquedas por categoría (FK ya suele crear índice en categoria_id; opcional)
-- CREATE INDEX idx_socios_categoria_id ON socios (categoria_id);

-- ========== ADHERENTES ==========
-- Orden por apellido, nombre cuando se listan por socio_id (FK ya indexa socio_id)
CREATE INDEX idx_adherentes_socio_apellido_nombre ON adherentes (socio_id, apellido, nombre);

-- ========== LIQUIDACIONES_MENSUALES ==========
-- mes ya tiene UNIQUE KEY; no hace falta índice adicional.

-- ========== LIQUIDACIONES_CUOTAS ==========
-- Consultas por liquidación y socio
CREATE INDEX idx_liq_cuotas_mensual_socio ON liquidaciones_cuotas (liquidacion_mensual_id, socio_id);
-- Conteo de pagados por liquidación
CREATE INDEX idx_liq_cuotas_mensual_pagado ON liquidaciones_cuotas (liquidacion_mensual_id, pagado);
-- Listado ordenado por liquidacion_mensual_id DESC, id ASC
CREATE INDEX idx_liq_cuotas_mensual_id_id ON liquidaciones_cuotas (liquidacion_mensual_id DESC, id ASC);

-- ========== USUARIOS ==========
-- Listado filtrando por oculto
CREATE INDEX idx_usuarios_oculto ON usuarios (oculto);

-- ========== CAJAS ==========
-- Filtro por activa en transferencias
CREATE INDEX idx_cajas_activa ON cajas (activa);

-- ========== MOVIMIENTOS_CAJAS ==========
-- Listado por caja ordenado por fecha (FK ya indexa caja_id; índice compuesto ayuda al ORDER BY)
CREATE INDEX idx_mov_cajas_caja_fecha ON movimientos_cajas (caja_id, fecha DESC, created_at DESC);

-- ========== USUARIO_PERMISOS ==========
-- usuario_id ya tiene FK; permiso_id también. Opcional si las consultas son solo por usuario_id:
-- CREATE INDEX idx_usuario_permisos_usuario ON usuario_permisos (usuario_id);
