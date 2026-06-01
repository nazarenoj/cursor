# Actualizar Producción (IIS + MySQL) — Manteniendo los Datos

Guía paso a paso para actualizar la aplicación en un servidor **IIS** con **MySQL**, **sin perder datos**.

---

## Rutas de referencia

Ajustá estas rutas según tu entorno. Si usás **IIS2** u otra configuración, cambiá las rutas de producción.

| Qué | Desarrollo (tu PC) | Producción (servidor IIS) |
|-----|--------------------|---------------------------|
| Proyecto completo | `C:\Users\jnazareno\Desktop\Cursor` | — |
| Frontend compilado | `C:\Users\jnazareno\Desktop\Cursor\dist` | `C:\inetpub\wwwroot\club-social` (o tu sitio IIS) |
| Backend API | `C:\Users\jnazareno\Desktop\Cursor\server` | `C:\club-social-api` (o `C:\ClubSocial\server`) |
| Base de datos | — | MySQL: `club_social` |

---

## PASO 0: Preparar en desarrollo

**En tu máquina (antes de copiar):**

```powershell
cd C:\Users\jnazareno\Desktop\Cursor

# 1. Compilar frontend
npm run build

# 2. Verificar que se generó dist/
dir dist
# Debe haber: index.html, assets\, (y posiblemente logo.svg)
```

---

## PASO 1: Backup de base de datos (obligatorio)

**En el servidor de producción:**

```powershell
# Crear carpeta de backups si no existe
New-Item -ItemType Directory -Force -Path "C:\Backups\ClubSocial"

# Ir a MySQL (ajustar ruta si tu MySQL está en otro lugar)
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"

# Crear backup (te pedirá la contraseña de root)
.\mysqldump.exe -u root -p club_social > C:\Backups\ClubSocial\backup-antes-actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm').sql
```

**Guardar el archivo generado.** Si algo falla, restaurar con:

```powershell
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
.\mysql.exe -u root -p club_social < C:\Backups\ClubSocial\backup-antes-actualizacion-YYYY-MM-DD-HHmm.sql
```

---

## PASO 2: Backup de archivos (recomendado)

**En el servidor de producción:**

```powershell
$fecha = Get-Date -Format 'yyyy-MM-dd-HHmm'
$carpetaBackup = "C:\Backups\ClubSocial\actualizacion-$fecha"
New-Item -ItemType Directory -Force -Path $carpetaBackup

# Backup del backend
Copy-Item -Path "C:\club-social-api\src" -Destination "$carpetaBackup\src" -Recurse -Force
Copy-Item -Path "C:\club-social-api\package.json" -Destination "$carpetaBackup\package.json" -Force
Copy-Item -Path "C:\club-social-api\ecosystem.config.js" -Destination "$carpetaBackup\ecosystem.config.js" -Force

# Backup del frontend
Copy-Item -Path "C:\inetpub\wwwroot\club-social" -Destination "$carpetaBackup\frontend" -Recurse -Force

# Backup del .env (NO lo reemplaces en producción)
Copy-Item -Path "C:\club-social-api\.env" -Destination "$carpetaBackup\.env.backup" -Force
```

---

## PASO 3: Copiar archivos — Desde / Hacia

### 3.1 Backend

| DESDE (desarrollo) | HACIA (producción) |
|--------------------|--------------------|
| `C:\Users\jnazareno\Desktop\Cursor\server\src\` | `C:\club-social-api\src\` |
| `C:\Users\jnazareno\Desktop\Cursor\server\package.json` | `C:\club-social-api\package.json` |
| `C:\Users\jnazareno\Desktop\Cursor\server\ecosystem.config.js` | `C:\club-social-api\ecosystem.config.js` |
| `C:\Users\jnazareno\Desktop\Cursor\server\backup-config.json` | `C:\club-social-api\backup-config.json` (si existe) |

**NO copiar:**
- `.env` — mantener el de producción
- `node_modules` — se reinstala con `npm install`
- `uploads` — mantener los archivos de producción

**Comandos (ejecutar en el servidor, si tenés acceso a la carpeta de desarrollo por red):**

```powershell
# Reemplazar src completo
Remove-Item -Path "C:\club-social-api\src" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "\\ruta-red\Cursor\server\src" -Destination "C:\club-social-api\src" -Recurse -Force

# Copiar package.json y ecosystem
Copy-Item -Path "\\ruta-red\Cursor\server\package.json" -Destination "C:\club-social-api\package.json" -Force
Copy-Item -Path "\\ruta-red\Cursor\server\ecosystem.config.js" -Destination "C:\club-social-api\ecosystem.config.js" -Force
```

Si copiás manualmente (USB, RDP, etc.), reemplazá la carpeta `src` completa y los archivos indicados.

### 3.2 Frontend

| DESDE (desarrollo) | HACIA (producción) |
|--------------------|--------------------|
| `C:\Users\jnazareno\Desktop\Cursor\dist\index.html` | `C:\inetpub\wwwroot\club-social\index.html` |
| `C:\Users\jnazareno\Desktop\Cursor\dist\assets\*` | `C:\inetpub\wwwroot\club-social\assets\` |
| `C:\Users\jnazareno\Desktop\Cursor\dist\logo.svg` | `C:\inetpub\wwwroot\club-social\logo.svg` (si existe) |
| `C:\Users\jnazareno\Desktop\Cursor\web.config` | `C:\inetpub\wwwroot\club-social\web.config` (solo si cambió) |

**Comandos (en el servidor):**

```powershell
# Copiar index.html
Copy-Item -Path "C:\ruta-origen\dist\index.html" -Destination "C:\inetpub\wwwroot\club-social\index.html" -Force

# Reemplazar assets (borrar antiguos primero)
Remove-Item -Path "C:\inetpub\wwwroot\club-social\assets\*" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "C:\ruta-origen\dist\assets\*" -Destination "C:\inetpub\wwwroot\club-social\assets\" -Recurse -Force

# web.config (solo si cambió)
Copy-Item -Path "C:\ruta-origen\web.config" -Destination "C:\inetpub\wwwroot\club-social\web.config" -Force
```

---

## PASO 4: Ejecutar en el servidor

**En el servidor de producción:**

### 4.1 Instalar dependencias del backend (si cambió package.json)

```powershell
cd C:\club-social-api
npm install --production
```

### 4.2 Reiniciar el backend (PM2)

```powershell
cd C:\club-social-api
pm2 restart club-social-api
# o, si usás ecosystem:
pm2 restart ecosystem.config.js
pm2 save
```

### 4.3 Reiniciar IIS

```powershell
iisreset
```

---

## PASO 5: Verificación

```powershell
# Backend
curl http://localhost:4000/api/health

# En el navegador
# - Abrir la aplicación
# - Ctrl+F5 para forzar recarga
# - Probar login, socios, liquidaciones
# - Verificar que los datos siguen
```

---

## Resumen rápido (checklist)

| Paso | Acción | Dónde |
|------|--------|-------|
| 0 | `npm run build` | Desarrollo |
| 1 | Backup MySQL con `mysqldump` | Servidor |
| 2 | Backup de `src`, frontend, `.env` | Servidor |
| 3 | Copiar `server/src` → `C:\club-social-api\src` | Servidor |
| 3 | Copiar `package.json`, `ecosystem.config.js` | Servidor |
| 3 | Copiar `dist/*` → `C:\inetpub\wwwroot\club-social\` | Servidor |
| 4 | `npm install --production` en backend | Servidor |
| 4 | `pm2 restart club-social-api` | Servidor |
| 4 | `iisreset` | Servidor |
| 5 | Probar aplicación y datos | Navegador |

---

## Si usás IIS2 u otras rutas

Ajustá estas variables según tu entorno:

| Variable | Valor por defecto | Ejemplo IIS2 |
|----------|-------------------|--------------|
| Ruta frontend | `C:\inetpub\wwwroot\club-social` | `C:\inetpub\wwwroot\ClubSocial2` o la ruta de tu sitio |
| Ruta backend | `C:\club-social-api` | `C:\ClubSocial\server` |
| Nombre BD | `club_social` | Igual |
| Puerto API | `4000` | Igual |

---

## Opción: Script automático

Podés usar el script `actualizar-produccion-seguro.ps1` que hace backup y copia automáticamente:

```powershell
# Ejecutar como Administrador
cd C:\Users\jnazareno\Desktop\Cursor

# Primero compilar
npm run build

# Ejecutar script (te pedirá la ruta de dist y de server)
.\actualizar-produccion-seguro.ps1 -FrontendPath "C:\Users\jnazareno\Desktop\Cursor\dist" -BackendPath "C:\Users\jnazareno\Desktop\Cursor\server"
```

**Nota:** El script usa por defecto `C:\inetpub\wwwroot\ClubSocial` y `C:\ClubSocial\server`. Si tu producción está en otras rutas, editá las variables `$SitePath` y `$ServerPath` al inicio del script.

---

## Importante

- **No reemplaces `.env`** en producción.
- **No borres** la carpeta `uploads` del backend.
- El backend aplica migraciones automáticas al iniciar (tablas nuevas, columnas nuevas) **sin borrar datos**.
- Siempre hacer backup de la base de datos antes de actualizar.
