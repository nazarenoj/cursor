# Checklist de Pase a Entorno Objetivo (Backup 1.1.0 -> versión actual)

## 1) Resumen de validación en prueba

- Base de prueba usada: `club_social_restore_test_20260401`.
- Archivo restaurado: `server/backups/database_backup.sql`.
- Migración de versión actual ejecutada con `initDb`: OK (`INITDB_OK`).

### Conteos verificados en prueba

- `socios`: 79
- `categorias`: 9
- `liquidaciones_cuotas`: 972
- `cajas`: 4
- `medios_pago`: 5
- `club_config`: 1
- `usuarios`: 5

### Integridad verificada en prueba

- `socios_sin_categoria = 0`
- `liq_sin_socio = 0`
- `mov_sin_caja = 0`

### Esquema actual confirmado

- `club_config.timezone`
- `club_config.whatsapp_usar_servicio`
- `medios_pago.tipo_movimiento`
- tabla `usuario_preferencias`

## 2) Preparación pre-cambio (obligatoria)

1. Definir ventana de mantenimiento.
2. Desconectar usuarios / frenar app.
3. Generar backup pre-cambio (rollback point).
4. Confirmar credenciales MySQL y nombre de base destino.
5. Verificar que el archivo de carga esté disponible:
   - `server/backups/database_backup.sql`

### Variables actuales conocidas (tu entorno local)

- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_USER=root`
- `DB_NAME=club_social` (base objetivo habitual)
- Archivo a restaurar: `C:/Users/jnazareno/Desktop/Cursor/server/backups/database_backup.sql`

## 3) Ejecución en entorno objetivo

### 3.1 Backup pre-cambio

Ejemplo (ajustar host, user, db, rutas):

`mysqldump -h <HOST> -u <USER> -p <DB_DESTINO> > pre_cambio.sql`

Comando listo para tu entorno local:

`mysqldump -h localhost -u root -p club_social > C:/Users/jnazareno/Desktop/Cursor/server/backups/pre_cambio_club_social.sql`

### 3.2 Restaurar backup 1.1.0

Ejemplo (Windows/MySQL CLI):

`mysql -h <HOST> -u <USER> -p <DB_DESTINO> --execute="source C:/ruta/server/backups/database_backup.sql"`

Comando listo para tu entorno local:

`mysql -h localhost -u root -p club_social --execute="source C:/Users/jnazareno/Desktop/Cursor/server/backups/database_backup.sql"`

### 3.3 Migrar al esquema actual

1. Levantar backend versión actual.
2. Verificar en logs:
   - `initDb inicio`
   - `initDb listo`
   - sin `ER_NO_SUCH_TABLE`
   - sin `Unknown column`

Comando rápido local para validar migración `initDb` sobre `club_social`:

`powershell -Command "$env:DB_HOST='localhost'; $env:DB_PORT='3306'; $env:DB_USER='root'; $env:DB_PASSWORD='GL2025'; $env:DB_NAME='club_social'; node -e \"const db=require('./server/src/db'); db.initDb().then(()=>{console.log('INITDB_OK'); process.exit(0);}).catch((e)=>{console.error('INITDB_FAIL',e.message); process.exit(1);});\""`

## 4) Verificación post-carga (rápida)

### 4.1 SQL de conteos

```sql
SELECT 'socios' t, COUNT(*) c FROM socios
UNION ALL SELECT 'categorias', COUNT(*) FROM categorias
UNION ALL SELECT 'liquidaciones_cuotas', COUNT(*) FROM liquidaciones_cuotas
UNION ALL SELECT 'cajas', COUNT(*) FROM cajas
UNION ALL SELECT 'medios_pago', COUNT(*) FROM medios_pago
UNION ALL SELECT 'club_config', COUNT(*) FROM club_config
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios;
```

### 4.2 SQL de integridad

```sql
SELECT 'socios_sin_categoria' check_name, COUNT(*) issues
FROM socios s LEFT JOIN categorias c ON s.categoria_id=c.id
WHERE c.id IS NULL
UNION ALL
SELECT 'liq_sin_socio', COUNT(*)
FROM liquidaciones_cuotas l LEFT JOIN socios s ON l.socio_id=s.id
WHERE s.id IS NULL
UNION ALL
SELECT 'mov_sin_caja', COUNT(*)
FROM movimientos_cajas m LEFT JOIN cajas c ON m.caja_id=c.id
WHERE c.id IS NULL;
```

Esperado: `issues = 0` en todos.

### 4.3 Verificación funcional mínima

- Login.
- Socios/Categorías.
- Liquidaciones/Pagos.
- Tesorería/Cajas/Medios de pago.
- Configuración del club.

## 5) Rollback (si algo falla)

1. Frenar app.
2. Restaurar backup pre-cambio:
   - `mysql -h <HOST> -u <USER> -p <DB_DESTINO> --execute="source C:/ruta/pre_cambio.sql"`
3. Levantar app.
4. Verificar módulos críticos.

Comando rollback listo para local:

`mysql -h localhost -u root -p club_social --execute="source C:/Users/jnazareno/Desktop/Cursor/server/backups/pre_cambio_club_social.sql"`

## 6) Criterio de aceptación final

- Backend arranca sin errores de esquema.
- Módulos críticos operativos.
- Conteos e integridad dentro de lo esperado.
- Backup pre-cambio conservado.
