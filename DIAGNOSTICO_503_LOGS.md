# Diagnóstico 503 con logs de arranque

Se añadieron logs `[ENTRYPOINT]`, `[STARTUP]` y `[STARTUP][DB]` que **se guardan en un archivo** para poder verlos aunque la consola no se capture (por ejemplo en Hostinger).

## Si el log no existe: el entrypoint no se está ejecutando

La **primera línea** que se escribe es `[ENTRYPOINT]` (antes de cargar dotenv o cualquier dependencia).  
**Ruta del archivo en Hostinger:** dentro de la carpeta de la aplicación (p. ej. `public_html`), el archivo queda en **`server/logs/startup.log`**.  
En el File Manager: entrá a la carpeta donde está tu app Node → `server` → `logs` → `startup.log`.

- **Si `server/logs/startup.log` no existe** después de un redeploy o reinicio:
  - Hostinger **no está ejecutando** el entrypoint (no llega a `server/src/index.js`).
  - Revisá: **ZIP** (debe incluir `server/`, `server/src/index.js`, `server/package.json`), **raíz de la aplicación** en el panel (carpeta donde está `server/`), **comando de inicio** (ej. `node server/src/index.js` o `npm start` con el directorio de trabajo en la carpeta que contiene `server/`).
- **Si el archivo existe y solo tiene `[ENTRYPOINT]`:** el proceso arrancó pero falló enseguida (dotenv, `require`, etc.). Revisá el resto del archivo o errores en el panel de Hostinger.

## Dónde está el archivo de log

- **Ruta:** `server/logs/startup.log` (respecto al directorio raíz de la app; en Hostinger suele ser `public_html/server/logs/startup.log`).
- **En Hostinger:** File Manager → carpeta de tu app → `server/logs/startup.log`. Por SSH: `cat server/logs/startup.log` o `tail -100 server/logs/startup.log`.
- Cada arranque **añade** líneas al archivo (no se borra).

## Dónde ver los logs en Hostinger

- **Archivo:** `server/logs/startup.log` — abrirlo o descargarlo desde el File Manager (o por SSH con `cat` / `tail`).  
- **Consola:** Si el panel muestra logs de la aplicación Node, también verás las mismas líneas ahí (se escribe en archivo y en consola).

## Orden esperado de logs (arranque correcto)

```
[ENTRYPOINT] ... index.js ejecutado (Hostinger)
[STARTUP] 01 Script iniciado, dotenv cargado
[STARTUP] 02 Express/cors/morgan requeridos
[STARTUP] 03 db (initDb) requerido
[STARTUP] 04 Todos los routers requeridos
[STARTUP] 05 PORT=4000 NODE_ENV=production
[STARTUP] 06 Iniciando startServer()
[STARTUP] 07 startServer() retornó (listen en curso)
[STARTUP] 08 Servidor ESCUCHANDO en puerto 4000 (0.0.0.0). Iniciando initDb en segundo plano...
[STARTUP][DB] initDb inicio
[STARTUP][DB] createDatabaseIfNeeded inicio
[STARTUP][DB] createDatabaseIfNeeded conectando a <host>:<puerto> ...
[STARTUP][DB] createDatabaseIfNeeded fin OK
[STARTUP][DB] initDb createDatabaseIfNeeded OK
[STARTUP][DB] initDb getPool() OK
[STARTUP][DB] initDb creando tabla categorias
...
[STARTUP][DB] initDb initPermisosYAdmin
[STARTUP][DB] initDb listo
[STARTUP] 09 Base de datos inicializada correctamente.
[STARTUP] 10 Backup scheduler iniciado.
```

## Cómo interpretar

| Último log que ves | Qué significa |
|--------------------|----------------|
| No aparece ningún `[STARTUP]` | El proceso no arranca o los logs no se están capturando. Revisar cómo se inicia la app y dónde se guardan stdout/stderr. |
| Se queda en 01, 02, 03 o 04 | Error al cargar algún `require` (módulo faltante o error de sintaxis). Debería haber un error justo después. |
| Se queda en 05 o 06, no llega a 07 | Algo bloquea antes de `app.listen()` (poco probable con el código actual). |
| Llega a 07 pero **nunca** a 08 | El servidor no llega a escuchar: puerto en uso, permiso denegado o el callback de `listen` no se ejecuta. Revisar puerto y firewall. |
| Llega a 08 pero no aparece `[STARTUP][DB] initDb inicio` | El callback de `listen` se ejecutó pero `initDb()` aún no ha empezado (poco habitual). |
| `createDatabaseIfNeeded inicio` pero no `conectando a...` | Error en `getConnectionConfig()` (variables de entorno de BD faltantes o incorrectas). |
| `conectando a...` y luego error o nada | No se puede conectar a MySQL: host/puerto incorrectos, firewall, MySQL no escucha en esa IP, o credenciales erróneas. Revisar DB_HOST, DB_PORT, usuario y contraseña en Hostinger. |
| `createDatabaseIfNeeded fin OK` y luego error en `getPool()` o `creando tabla categorias` | Conexión inicial OK pero fallo al crear pool o al crear tablas (permisos, sintaxis SQL, etc.). El stack trace indicará el error exacto. |
| `initDb listo` y luego `[STARTUP] 09` | BD lista. Si aún recibes 503 en `/api/health`, puede ser caché o que el proxy apunte a otra URL; probar `/api/health/ping`. |

## Endpoints útiles

- **GET /api/health/ping**  
  Responde siempre **200** con `{ "status": "pong" }` sin tocar la BD.  
  Si este endpoint responde 200 pero `/api/health` da 503, el servidor está escuchando y el 503 es por “BD no lista” o por cómo esté configurado el proxy.

- **GET /api/health**  
  Responde 503 hasta que la BD esté lista; luego 200.  
  Cada petición a `/api/health` deja un log: `[STARTUP] /api/health solicitado -> dbReady=... dbError=...`

## Próximos pasos según lo que veas

1. **Copia los logs desde el primer `[STARTUP]` hasta el primer error o hasta donde se corten.**
2. Si hay un **stack trace** `[STARTUP][DB] initDb ERROR:` o `[STARTUP] ERROR en initDb`, copia el mensaje y el stack completo.
3. Prueba en el navegador o con curl:
   - `https://tu-dominio.com/api/health/ping` → debe dar 200 si el proceso escucha.
   - `https://tu-dominio.com/api/health` → 503 hasta que initDb termine, luego 200.

Con eso se puede acotar si el 503 viene del proxy (nunca llega a 08), de la BD (fallos en initDb) o de la configuración (variables de entorno, MySQL inaccesible).
