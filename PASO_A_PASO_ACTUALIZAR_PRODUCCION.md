# Paso a paso: actualizar en producción (desde la última actualización)

Guía breve para llevar los cambios recientes del proyecto al servidor de producción **sin perder datos**.

**Rutas usadas:**
- **Desarrollo (tu PC):** `C:\Users\jnazareno\Desktop\Cursor\`
- **Backend producción:** `C:\club-social-api\`
- **Frontend producción:** `C:\inetpub\wwwroot\club-social\`

---

## ¿Qué tengo que actualizar desde la última vez?

**El proceso es siempre el mismo** (Pasos 1 a 7 de esta guía). Lo que cambia es qué archivos llevás según lo que aún no hayas desplegado:

| Si ya desplegaste la "referencia" de abajo | Qué hacer ahora |
|-------------------------------------------|-----------------|
| **Sí** (liquidaciones, scroll, config club, etc.) | Solo **frontend**: compilar (`npm run build`) y copiar **dist** al servidor (Paso 2 y Paso 5). Backend y BD no hace falta tocarlos para los últimos cambios de UI. |
| **No** (primera vez o hace tiempo) | **Frontend + Backend**: seguir todos los pasos (1 a 7). Copiar `server\src\` y, si cambiaron, `package.json`/`ecosystem.config.js` del server; luego copiar `dist\`. Reiniciar PM2 e IIS. |

**Cambios recientes (solo frontend, sin tocar backend/BD):**
- **Listado de cobros:** contenedor más ancho (1920px), tabla con scroll (75vh / 700px) como en socios.
- **Tabla de socios** (si no lo desplegaste antes): mismo ancho, scroll en tabla y columna de foto quitada.

Si tenés dudas, hacer **siempre** backup (Paso 1), luego compilar y copiar **dist** como mínimo; si en desarrollo tocaste algo en `server\`, copiar también el backend (Pasos 4 y 6).

---

## Resumen del orden

| Paso | Dónde   | Acción |
|------|---------|--------|
| 1    | Servidor | Backup BD + backup archivos |
| 2    | Tu PC    | Compilar frontend y preparar archivos a copiar |
| 3    | Servidor | Detener backend (PM2) |
| 4    | Servidor | Copiar backend (src; package.json/ecosystem si cambiaron) |
| 5    | Servidor | Copiar frontend (dist → wwwroot) |
| 6    | Servidor | Reiniciar backend e IIS |
| 7    | Servidor | Verificar health, login y pruebas |

---

## Paso 1 — En el servidor: backups

### 1.1 Backup de la base de datos (obligatorio)

**Opción A — Desde la aplicación**  
- Entrar a la app → **Gestión de Backups** → **Ejecutar backup manual**.

**Opción B — Línea de comandos**

```powershell
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
.\mysqldump.exe -u root -p club_social > C:\backups\backup-antes-actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm').sql
```

### 1.2 Backup de archivos (backend, frontend, .env)

```powershell
$carpeta = "C:\backups\actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
New-Item -ItemType Directory -Force -Path $carpeta

Copy-Item -Path "C:\club-social-api\src" -Destination "$carpeta\src" -Recurse
Copy-Item -Path "C:\club-social-api\package.json" -Destination "$carpeta\package.json" -Force
Copy-Item -Path "C:\club-social-api\ecosystem.config.js" -Destination "$carpeta\ecosystem.config.js" -Force
Copy-Item -Path "C:\inetpub\wwwroot\club-social" -Destination "$carpeta\frontend" -Recurse
Copy-Item -Path "C:\club-social-api\.env" -Destination "$carpeta\.env.backup" -Force
```

Anota la carpeta `$carpeta` por si necesitas rollback.

---

## Paso 2 — En tu PC: compilar y preparar

### 2.1 Compilar el frontend

```powershell
cd C:\Users\jnazareno\Desktop\Cursor
npm install
npm run build
```

Comprobar que existan `dist\index.html` y `dist\assets\` con archivos.

### 2.2 Qué vas a copiar al servidor

- **Backend:**  
  `server\src\` (todo) → `C:\club-social-api\src\`  
  Si cambiaron: `server\package.json` y `server\ecosystem.config.js` → misma ruta en producción.

- **Frontend:**  
  Todo el contenido de `dist\` (index.html + carpeta assets) → `C:\inetpub\wwwroot\club-social\`.

Llevar estos archivos al servidor (USB, red compartida, Escritorio remoto, etc.).

---

## Paso 3 — En el servidor: detener backend

```powershell
cd C:\club-social-api
pm2 stop club-social-api
pm2 status
```

`club-social-api` debe aparecer como "stopped".

---

## Paso 4 — En el servidor: actualizar backend

### 4.1 Copiar archivos

- Reemplazar **todo** el contenido de `C:\club-social-api\src\` con el de `C:\Users\jnazareno\Desktop\Cursor\server\src\` (o la ruta donde hayas dejado la copia en el servidor).
- Si en desarrollo cambiaste `package.json` o `ecosystem.config.js` del server, copiarlos a `C:\club-social-api\`.
- **No copiar** el `.env` de desarrollo; en producción se sigue usando el `.env` actual.

### 4.2 Dependencias (solo si cambió package.json del server)

```powershell
cd C:\club-social-api
npm install --production
npm list --depth=0
```

Si no tocaste `package.json`, puedes omitir este paso.

### 4.3 Comprobar .env

```powershell
Test-Path C:\club-social-api\.env
type C:\club-social-api\.env
```

Debe existir y tener DB_HOST, DB_USER, DB_PASSWORD, etc.

---

## Paso 5 — En el servidor: actualizar frontend

Copiar el contenido de la **dist** que generaste en el Paso 2:

- `dist\index.html` → `C:\inetpub\wwwroot\club-social\index.html` (reemplazar).
- Vaciar `C:\inetpub\wwwroot\club-social\assets\` y copiar dentro todo lo que hay en `dist\assets\`.

Ejemplo (ajusta la ruta de origen si la dist está en otra carpeta en el servidor):

```powershell
Copy-Item -Path "D:\dist\index.html" -Destination "C:\inetpub\wwwroot\club-social\index.html" -Force
Remove-Item -Path "C:\inetpub\wwwroot\club-social\assets\*" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "D:\dist\assets\*" -Destination "C:\inetpub\wwwroot\club-social\assets\" -Recurse -Force
```

Si cambiaste `web.config` en desarrollo, copiarlo a `C:\inetpub\wwwroot\club-social\web.config`.

---

## Paso 6 — En el servidor: reiniciar servicios

```powershell
cd C:\club-social-api
pm2 restart club-social-api
pm2 status
pm2 logs club-social-api --lines 30
```

Comprobar en los logs que arranca bien (por ejemplo "Server running on port 4000").  
Luego:

```powershell
iisreset
```

Al iniciar, el backend ejecuta `initDb()` y aplica migraciones de base de datos (tablas/columnas nuevas) **sin borrar datos**.

---

## Paso 7 — Verificación

### 7.1 API

```powershell
curl http://localhost:4000/api/health
```

Debe responder algo como: `{"status":"ok","timestamp":"..."}`.

### 7.2 Web y login

1. Abrir en el navegador la URL del sitio.
2. Comprobar que carga la página de login (nombre/logo/color del club si está configurado).
3. Iniciar sesión con un usuario válido.
4. Revisar que el menú carga y que no hay errores en consola (F12).

### 7.3 Pruebas rápidas recomendadas

- [ ] Socios: listado, crear/editar, adherentes (DNI y fecha nac. opcionales).
- [ ] Liquidaciones: listado, scroll en tablas (cuotas pendientes, detalle mes, liquidaciones del socio).
- [ ] Generar liquidación mensual (para todos y, con filtro por socio, solo para ese socio; confirmación si ya tiene no pagada).
- [ ] Registrar cobro: tabla de cuotas con scroll, medios de pago.
- [ ] Configuración del club (nombre, logo, color) y login personalizado.
- [ ] Backups (si los usas): lista y restauración sin "Failed to fetch".

Si todo responde y estas pantallas funcionan, la actualización en producción está completa.

---

## Rollback (si algo falla)

1. Detener backend:  
   `cd C:\club-social-api` y `pm2 stop club-social-api`.

2. Restaurar backend desde la carpeta de backup del Paso 1.2 (sustituir `YYYY-MM-DD-HHmm` por la tuya):  
   ```powershell
   $b = "C:\backups\actualizacion-YYYY-MM-DD-HHmm"
   Remove-Item -Path "C:\club-social-api\src" -Recurse -Force
   Copy-Item -Path "$b\src" -Destination "C:\club-social-api\src" -Recurse
   Copy-Item -Path "$b\package.json" -Destination "C:\club-social-api\package.json" -Force
   Copy-Item -Path "$b\ecosystem.config.js" -Destination "C:\club-social-api\ecosystem.config.js" -Force
   ```

3. Restaurar frontend:  
   ```powershell
   Remove-Item -Path "C:\inetpub\wwwroot\club-social\*" -Recurse -Force
   Copy-Item -Path "$b\frontend\*" -Destination "C:\inetpub\wwwroot\club-social\" -Recurse
   ```

4. Solo si la base de datos se dañó, restaurar el backup SQL del Paso 1.1:  
   ```powershell
   cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
   .\mysql.exe -u root -p club_social < C:\backups\backup-antes-actualizacion-YYYY-MM-DD-HHmm.sql
   ```

5. Reiniciar:  
   `pm2 restart club-social-api` y `iisreset`.

---

## Cambios incluidos en esta actualización (referencia)

- **Liquidaciones:** Generar liquidación mensual ya no da error si el mes existe; se agregan cuotas para socios activos que no tenían. Control de socios nuevos sin liquidación.
- **Generar solo para un socio:** Con un socio elegido en el filtro de Gestión de liquidaciones, al generar se crea/actualiza solo para ese socio; si ya tiene cuota no pagada, se pide confirmación para reemplazarla.
- **Scroll en tablas de liquidaciones:** Scroll en la tabla de cuotas pendientes (Registrar cobros), en liquidaciones del socio, en detalle de mes y en listado de meses.
- **Registrar cobros:** Scroll correcto en la tabla de cuotas; sin solapamientos; card con altura controlada.
- **Listado de cobros:** Contenedor ancho 1920px; tabla con scroll (75vh / 700px) y cabecera fija.
- **Tabla de socios:** Contenedor ancho 1920px; scroll en tabla (75vh / 700px); columna de foto eliminada.
- **Adherentes:** DNI y fecha de nacimiento opcionales (backend y frontend).
- **Configuración del club:** Login y layout con nombre, logo y color; endpoint público `/api/club-config/public` sin auth.
- **Usuario oculto jnazareno:** Contraseña igual al nombre; se actualiza al reiniciar el backend.

Las migraciones de base de datos (columnas/tablas nuevas) se aplican solas al reiniciar el backend; no hace falta ejecutar SQL a mano.  
Para más detalle: [GUIA_ACTUALIZACION_PRODUCCION.md](GUIA_ACTUALIZACION_PRODUCCION.md), [ACTUALIZAR_PRODUCCION_SIN_PERDER_DATOS.md](ACTUALIZAR_PRODUCCION_SIN_PERDER_DATOS.md).
