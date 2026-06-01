# Pasos detallados para actualizar el servidor de producción

Guía paso a paso para actualizar la aplicación **Club Social Realico** en el servidor de producción sin perder datos.

**Rutas que se usan en esta guía:**
- **Desarrollo (tu PC):** `C:\Users\jnazareno\Desktop\Cursor\`
- **Backend en producción:** `C:\club-social-api\`
- **Frontend en producción:** `C:\inetpub\wwwroot\club-social\`

---

## Fase 1: En el servidor de producción — Backups

### Paso 1.1 — Backup de la base de datos (obligatorio)

1. Abrir **PowerShell** en el servidor de producción (como administrador si hace falta).
2. Crear la carpeta de backups si no existe:
   ```powershell
   New-Item -ItemType Directory -Force -Path "C:\backups"
   ```
3. Ejecutar **una** de estas opciones:

   **Opción A — Desde la aplicación (recomendado)**  
   - Entrar a la aplicación en el navegador.  
   - Ir a **Gestión de Backups** (o menú Backups).  
   - Hacer clic en **Ejecutar backup manual**.  
   - Comprobar que el archivo se guardó (por ejemplo en la carpeta que indique la app).

   **Opción B — Desde línea de comandos (MySQL)**  
   - Ajustar la ruta de MySQL si en tu servidor es distinta (por ejemplo 8.0, 5.7, etc.):
   ```powershell
   cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
   .\mysqldump.exe -u root -p club_social > C:\backups\backup-antes-actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm').sql
   ```
   - Cuando pida la contraseña de MySQL, ingresarla.  
   - Verificar que se creó el archivo:
   ```powershell
   Get-ChildItem C:\backups\backup-antes-actualizacion-*.sql | Sort-Object LastWriteTime -Descending | Select-Object -First 1
   ```

### Paso 1.2 — Backup de archivos (backend, frontend y .env)

1. Crear una carpeta con fecha y hora para esta actualización:
   ```powershell
   $carpeta = "C:\backups\actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
   New-Item -ItemType Directory -Force -Path $carpeta
   Write-Host "Carpeta de backup: $carpeta"
   ```
2. Copiar el backend (código y configuración, **sin** .env):
   ```powershell
   Copy-Item -Path "C:\club-social-api\src" -Destination "$carpeta\src" -Recurse
   Copy-Item -Path "C:\club-social-api\package.json" -Destination "$carpeta\package.json" -Force
   Copy-Item -Path "C:\club-social-api\ecosystem.config.js" -Destination "$carpeta\ecosystem.config.js" -Force
   ```
3. Copiar el frontend actual:
   ```powershell
   Copy-Item -Path "C:\inetpub\wwwroot\club-social" -Destination "$carpeta\frontend" -Recurse
   ```
4. Copiar el archivo `.env` (solo como respaldo; **no** lo vas a restaurar salvo rollback):
   ```powershell
   Copy-Item -Path "C:\club-social-api\.env" -Destination "$carpeta\.env.backup" -Force
   ```
5. Si existe `backup-config.json`, copiarlo también:
   ```powershell
   if (Test-Path "C:\club-social-api\backup-config.json") {
       Copy-Item -Path "C:\club-social-api\backup-config.json" -Destination "$carpeta\backup-config.json" -Force
   }
   ```

---

## Fase 2: En tu máquina de desarrollo — Compilar frontend

### Paso 2.1 — Compilar el frontend

1. Abrir **PowerShell** (o terminal) en tu PC.
2. Ir al proyecto:
   ```powershell
   cd C:\Users\jnazareno\Desktop\Cursor
   ```
3. (Opcional) Si cambió `package.json` del frontend:
   ```powershell
   npm install
   ```
4. Compilar para producción:
   ```powershell
   npm run build
   ```
5. Comprobar que se generó la carpeta `dist` y que tiene archivos:
   ```powershell
   Get-ChildItem dist
   Get-ChildItem dist\assets
   ```
   Debe existir `dist\index.html` y archivos dentro de `dist\assets\`.

### Paso 2.2 — Preparar lo que vas a copiar al servidor

Tendrás que copiar al servidor:

- **Backend:** toda la carpeta `server\src` y, si cambiaron, `server\package.json` y `server\ecosystem.config.js`.  
- **Frontend:** todo el contenido de `dist\` (index.html y carpeta assets).

Puedes usar USB, carpeta de red compartida, Escritorio remoto arrastrando archivos, o la herramienta que uses normalmente para pasar archivos al servidor.

---

## Fase 3: En el servidor de producción — Detener backend

### Paso 3.1 — Detener la API (PM2)

1. En el servidor, en PowerShell:
   ```powershell
   cd C:\club-social-api
   pm2 stop club-social-api
   ```
2. Comprobar que está detenido:
   ```powershell
   pm2 status
   ```
   El proceso `club-social-api` debe aparecer como "stopped".  
   (IIS puede seguir encendido; la web se verá pero la API no responderá hasta que reinicies el backend.)

---

## Fase 4: En el servidor de producción — Actualizar backend

### Paso 4.1 — Copiar archivos del backend

1. Copiar **toda** la carpeta `src` del proyecto de desarrollo sobre la del servidor:
   - **Origen (en tu PC):** `C:\Users\jnazareno\Desktop\Cursor\server\src\`  
   - **Destino (servidor):** `C:\club-social-api\src\`  
   Reemplazar todo el contenido de `C:\club-social-api\src\` (incluidas subcarpetas: middleware, routes, utils, etc.).

2. Si en desarrollo cambiaste `package.json` o `ecosystem.config.js` del **server**:
   - Copiar `C:\Users\jnazareno\Desktop\Cursor\server\package.json` → `C:\club-social-api\package.json`
   - Copiar `C:\Users\jnazareno\Desktop\Cursor\server\ecosystem.config.js` → `C:\club-social-api\ecosystem.config.js`

3. **No copiar** el `.env` del desarrollo al servidor. El servidor debe seguir usando su propio `C:\club-social-api\.env`.

### Paso 4.2 — Instalar dependencias (solo si cambió package.json del server)

Si en el paso 4.1 reemplazaste `C:\club-social-api\package.json`:

```powershell
cd C:\club-social-api
npm install --production
npm list --depth=0
```

Si **no** cambiaste `package.json`, puedes saltar este paso.

### Paso 4.3 — Comprobar que .env sigue en su sitio

```powershell
Test-Path C:\club-social-api\.env
type C:\club-social-api\.env
```

Debe existir el archivo y contener las variables correctas (DB_HOST, DB_USER, DB_PASSWORD, etc.). Si no existe, restaurarlo desde el backup de la Fase 1 (`.env.backup`).

---

## Fase 5: En el servidor de producción — Actualizar frontend

### Paso 5.1 — Copiar el frontend compilado (dist)

1. En el servidor, copiar el contenido de la **dist** que generaste en la Fase 2:
   - **Origen:** `C:\Users\jnazareno\Desktop\Cursor\dist\` (desde tu PC, llevado al servidor por USB/red/etc.)
   - **Destino:** `C:\inetpub\wwwroot\club-social\`

2. Acciones concretas:
   - Copiar `dist\index.html` → `C:\inetpub\wwwroot\club-social\index.html` (reemplazar).
   - Borrar todo el contenido de `C:\inetpub\wwwroot\club-social\assets\` y copiar dentro todo lo que hay en `dist\assets\` (reemplazar todo).
   - Si en `dist` hay `logo.svg`, copiarlo a `C:\inetpub\wwwroot\club-social\logo.svg`.

   Ejemplo en PowerShell **en el servidor**, si la dist está en `D:\dist` (por ejemplo tras copiarla desde tu PC):
   ```powershell
   Copy-Item -Path "D:\dist\index.html" -Destination "C:\inetpub\wwwroot\club-social\index.html" -Force
   Remove-Item -Path "C:\inetpub\wwwroot\club-social\assets\*" -Recurse -Force -ErrorAction SilentlyContinue
   Copy-Item -Path "D:\dist\assets\*" -Destination "C:\inetpub\wwwroot\club-social\assets\" -Recurse -Force
   ```
   (Ajusta `D:\dist` por la ruta real donde tengas la carpeta dist en el servidor.)

### Paso 5.2 — web.config (solo si lo cambiaste)

Si en el proyecto de desarrollo modificaste el archivo `web.config` (por ejemplo para IIS o reescritura de URLs):

- Copiar `C:\Users\jnazareno\Desktop\Cursor\web.config` → `C:\inetpub\wwwroot\club-social\web.config`  
Si no tocaste `web.config`, no hace falta hacer nada.

---

## Fase 6: En el servidor de producción — Reiniciar servicios

### Paso 6.1 — Iniciar el backend (PM2)

```powershell
cd C:\club-social-api
pm2 restart club-social-api
pm2 status
pm2 logs club-social-api --lines 30
```

En los logs deberías ver que el servidor arranca (por ejemplo “Server running on port 4000”, “Database connected”).  
Al iniciar, el backend ejecuta `initDb()` y aplica migraciones de base de datos (tablas o columnas nuevas) **sin borrar datos**.

### Paso 6.2 — Reiniciar IIS (recomendado)

```powershell
iisreset
```

Así se sirve el frontend nuevo sin caché antigua.

---

## Fase 7: Verificación

### Paso 7.1 — Comprobar la API

En el servidor:

```powershell
curl http://localhost:4000/api/health
```

La respuesta debe ser algo como: `{"status":"ok","timestamp":"..."}`.

### Paso 7.2 — Comprobar la web y el login

1. En un navegador, abrir la URL del sitio (ej. `http://nombre-del-servidor` o `http://IP-del-servidor`).
2. Comprobar que carga la página de login.
3. Iniciar sesión con un usuario válido.
4. Revisar que se ve el menú y que no hay errores en consola (F12 → pestaña Consola).

### Paso 7.3 — Pruebas rápidas de funcionalidad

- [ ] Listado de socios.
- [ ] Crear o editar un socio.
- [ ] Ver liquidaciones.
- [ ] Registrar un pago (si aplica).
- [ ] Si usas backups desde la app: ver lista de backups y que no aparezca “Failed to fetch” al restaurar.

Si todo esto funciona, la actualización del servidor de producción está completa.

---

## Si algo sale mal — Rollback rápido

1. **Detener el backend:**
   ```powershell
   cd C:\club-social-api
   pm2 stop club-social-api
   ```

2. **Restaurar backend** desde la carpeta de backup (usa la carpeta que creaste en Paso 1.2, por ejemplo `C:\backups\actualizacion-2025-01-28-1430`):
   ```powershell
   $b = "C:\backups\actualizacion-YYYY-MM-DD-HHmm"   # Reemplazar por tu carpeta
   Remove-Item -Path "C:\club-social-api\src" -Recurse -Force
   Copy-Item -Path "$b\src" -Destination "C:\club-social-api\src" -Recurse
   Copy-Item -Path "$b\package.json" -Destination "C:\club-social-api\package.json" -Force
   Copy-Item -Path "$b\ecosystem.config.js" -Destination "C:\club-social-api\ecosystem.config.js" -Force
   ```

3. **Restaurar frontend:**
   ```powershell
   Remove-Item -Path "C:\inetpub\wwwroot\club-social\*" -Recurse -Force
   Copy-Item -Path "$b\frontend\*" -Destination "C:\inetpub\wwwroot\club-social\" -Recurse
   ```

4. **Solo si la base de datos se dañó**, restaurar el backup SQL (usa el archivo del Paso 1.1):
   ```powershell
   cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
   .\mysql.exe -u root -p club_social < C:\backups\backup-antes-actualizacion-YYYY-MM-DD-HHmm.sql
   ```

5. **Reiniciar servicios:**
   ```powershell
   cd C:\club-social-api
   pm2 restart club-social-api
   iisreset
   ```

---

## Resumen de orden de pasos

| # | Dónde        | Acción |
|---|--------------|--------|
| 1 | Servidor     | Backup BD + backup archivos (backend, frontend, .env) |
| 2 | Tu PC        | Compilar frontend (`npm run build`) y preparar copia de `server\src` y `dist` |
| 3 | Servidor     | Detener backend (`pm2 stop club-social-api`) |
| 4 | Servidor     | Copiar backend (src; package.json/ecosystem si cambiaron). No copiar .env. `npm install --production` si cambió package.json. |
| 5 | Servidor     | Copiar frontend (dist → wwwroot\club-social). web.config solo si cambió. |
| 6 | Servidor     | Reiniciar backend (`pm2 restart`) e IIS (`iisreset`) |
| 7 | Servidor/Web | Verificar health, login y pruebas básicas |

Documentos relacionados: [GUIA_ACTUALIZACION_PRODUCCION.md](GUIA_ACTUALIZACION_PRODUCCION.md), [ACTUALIZAR_PRODUCCION_SIN_PERDER_DATOS.md](ACTUALIZAR_PRODUCCION_SIN_PERDER_DATOS.md).
