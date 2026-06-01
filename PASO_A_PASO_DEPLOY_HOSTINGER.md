# Paso a paso: desplegar en Hostinger

Seguí estos pasos en orden. Necesitás plan **Business** o **Cloud** (con Node.js y MySQL).

---

## Paso 1 — Crear la base de datos en Hostinger

1. Entrá a **hPanel** (Hostinger).
2. **Bases de datos** → **Bases de datos MySQL**.
3. Creá una **nueva base de datos** (ej. `u123456789_club`).
4. Creá un **usuario** con contraseña y asignalo a esa base con **todos los privilegios**.
5. Anotá en un lugar seguro:
   - **Host** (ej. `localhost` o el que te muestre Hostinger)
   - **Nombre de la base**
   - **Usuario**
   - **Contraseña**

---

## Paso 2 — Anotar la URL de tu sitio

Antes de compilar, necesitás la URL donde va a quedar la app. Puede ser:

- El subdominio temporal de Hostinger (ej. `https://darkorchid-gnat-339100.hostingersite.com`)
- O tu dominio propio (ej. `https://miclub.com`)

Anotala: **________________________________**

La vas a usar en el Paso 3 y en el Paso 6.

---

## Paso 3 — En tu PC: compilar el frontend

Abrí PowerShell en la carpeta del proyecto y ejecutá (reemplazá la URL por la del Paso 2):

```powershell
cd C:\Users\jnazareno\Desktop\Cursor

$env:VITE_API_URL="https://TU-URL-AQUI/api"
npm run build
```

Ejemplo si tu URL es `https://darkorchid-gnat-339100.hostingersite.com`:

```powershell
$env:VITE_API_URL="https://darkorchid-gnat-339100.hostingersite.com/api"
npm run build
```

---

## Paso 4 — En tu PC: copiar el frontend al server

En la misma carpeta del proyecto:

```powershell
New-Item -ItemType Directory -Force -Path "server\public"
Copy-Item -Path "dist\*" -Destination "server\public\" -Recurse -Force
```

Con esto tenés **server/public** (frontend listo).

**Dependencias del backend:** si en Hostinger la app Node.js tiene paso de instalación (ej. **Install command** `npm install --production`), **no** hace falta generar `node_modules` en tu PC ni meterlo en el ZIP. Si tu panel **no** instala paquetes, entonces en `server` ejecutá `npm install --production` antes de comprimir e **incluí** `node_modules` en el ZIP.

---

## Paso 5 — Comprimir la carpeta server

1. Entrá a la carpeta **server** del proyecto.
2. Seleccioná el contenido necesario:
   - Siempre: `src`, `public`, `uploads`, `start.js`, `package.json`, `package-lock.json`, `ecosystem.config.js`, `env.sample`.
   - Solo si no usás install en Hostinger: también `node_modules`.
3. **No incluyas** el archivo **.env** (es sensible).
4. Clic derecho → **Enviar a** → **Carpeta comprimida** (o usá 7-Zip/WinRAR).
5. Nombrá el ZIP (ej. `club-social-server.zip`).

---

## Paso 6 — Subir e instalar la app en Hostinger

1. En **hPanel** → **Websites** → **Add Website** (o **Agregar sitio**).
2. Elegí **Node.js Apps**.
3. Elegí **Upload your website files** (subir archivos).
4. Subí el **ZIP** que creaste en el Paso 5.
5. En la configuración de la app:
   - **Root directory** (o carpeta raíz): `server`  
     *(Si Hostinger descomprime y ya te deja elegir la carpeta donde está start.js, elegí esa; a veces es la raíz del ZIP si el ZIP solo contenía el contenido de server.)*
   - **Archivo de entrada**: `start.js`
   - Si subiste el ZIP **sin** `node_modules`, configurá el paso de instalación del panel (ej. **Install command**: `npm install --production`) para que Hostinger instale dependencias antes de arrancar.
6. Clic en **Deploy** (o **Implementar**).

---

## Paso 7 — Configurar variables de entorno en Hostinger

En la misma pantalla de la app Node.js (o en **Settings** / **Variables de entorno**), agregá estas variables. Usá los datos del Paso 1 y la URL del Paso 2:

| Variable      | Valor |
|---------------|--------|
| `NODE_ENV`    | `production` |
| `PORT`        | El que te indique Hostinger (ej. `4000`). Si no te lo piden, dejalo en `4000`. |
| `DB_HOST`     | Host de MySQL (Paso 1) |
| `DB_PORT`     | `3306` |
| `DB_USER`     | Usuario MySQL (Paso 1) |
| `DB_PASSWORD` | Contraseña MySQL (Paso 1) |
| `DB_NAME`     | Nombre de la base (Paso 1) |
| `JWT_SECRET`  | Una clave larga y aleatoria (ej. 32 caracteres; guardala). |
| `CORS_ORIGIN` | La URL de tu sitio (Paso 2), ej. `https://darkorchid-gnat-339100.hostingersite.com` |

Guardá los cambios. Si hace falta, hacé **Redeploy** o reiniciá la app para que tome las variables.

---

## Paso 8 — Probar que funcione

1. Abrí en el navegador la **URL de tu sitio** (la del Paso 2).
2. Deberías ver la **pantalla de login**.
3. Iniciá sesión con **usuario: admin**, **contraseña: admin** (y cambiá la contraseña después).
4. Revisá que carguen socios, liquidaciones, etc. Sin errores en consola (F12).

Si ves **502** o **Error de base de datos**, revisá el Paso 7 (variables) y el Paso 1 (datos de MySQL).

---

## Resumen en orden

| # | Dónde   | Qué hacer |
|---|--------|-----------|
| 1 | Hostinger | Crear BD MySQL y usuario; anotar host, base, usuario, contraseña. |
| 2 | Anotar | URL del sitio (subdominio temporal o dominio). |
| 3 | Tu PC  | `$env:VITE_API_URL="https://TU-URL/api"` y `npm run build`. |
| 4 | Tu PC  | Copiar `dist/*` a `server/public`. Opcional: `npm install --production` en `server` solo si el ZIP debe llevar `node_modules`. |
| 5 | Tu PC  | Comprimir carpeta **server** (siempre `public`; `node_modules` solo si Hostinger no hace install). Sin `.env`. |
| 6 | Hostinger | Add Website → Node.js Apps → subir ZIP; archivo de entrada: `start.js`. |
| 7 | Hostinger | Variables de entorno: NODE_ENV, PORT, DB_*, JWT_SECRET, CORS_ORIGIN. |
| 8 | Navegador | Abrir la URL del sitio; probar login (admin / admin). |

## Automatizado (recomendado)

Para evitar hacer estos pasos manualmente, podés generar el ZIP listo para Hostinger con un solo comando:

```powershell
cd C:\Users\jnazareno\Desktop\Cursor
npm run deploy:hostinger
```

Si querés indicar el nombre del proyecto y la URL final (para que te la sugiera en `CORS_ORIGIN`):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-hostinger.ps1 -ProjectName "club-social" -SiteUrl "https://tu-dominio.com"
```

Si Hostinger **no** ejecuta `npm install` y necesitás subir dependencias en el ZIP:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-hostinger.ps1 -ProjectName "club-social" -BundleNodeModules
```

El script hace automáticamente:
- Build del frontend.
- Copia de `dist` a `server/public`.
- Por defecto **no** ejecuta `npm install` local ni incluye `node_modules` (Hostinger instala en el deploy). Con `-BundleNodeModules` sí.
- Generación del ZIP final en `deploy-output\`.
- Nombre del ZIP con formato: `proyecto-vVERSION-hostinger.zip` (ej. `club-social-v3.10.0-hostinger.zip`).
- Generación de checklist `.md` junto al ZIP con variables de entorno y validaciones post deploy.
- Generación de template `.env.hostinger.template` junto al ZIP para completar y copiar variables al panel de Hostinger.
- Checklist final de variables obligatorias/opcionales de Hostinger.

El ZIP se arma con una lista mínima (allowlist) y **no** incluye carpetas innecesarias como `tests`, `scripts`, `backups`, `logs` ni `.env`. Por defecto **no** incluye `node_modules` (Hostinger ejecuta el install); usá `-BundleNodeModules` si necesitás subir dependencias en el ZIP.

Importante:
- No requiere variables globales del sistema operativo (Windows).
- Las variables se configuran en el panel de Hostinger (Node.js App).

Para más detalle: [DEPLOY_HOSTINGER.md](DEPLOY_HOSTINGER.md) y [LISTADO_COMPRIMIR_HOSTINGER.md](LISTADO_COMPRIMIR_HOSTINGER.md).
