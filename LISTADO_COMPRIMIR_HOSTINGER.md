# Carpetas y archivos a comprimir para Hostinger

Antes de comprimir: **generar `server/public`** (ver abajo).

En Hostinger se usa **archivo de entrada: `start.js`**. Las dependencias pueden resolverse de dos formas:

1. **Recomendado si el panel lo permite:** Hostinger ejecuta **`npm install`** (o equivalente) en el deploy. El ZIP lleva `package.json` y `package-lock.json` **sin** `node_modules`.
2. **Alternativa:** si tu plan o flujo **no** instala paquetes, generá `node_modules` en tu PC (`npm install --production` dentro de `server`) e **incluí** esa carpeta en el ZIP.

No incluyas **server/.env** (se configuran variables en el panel).

---

## Incluir en el ZIP

### Carpeta `server/` (obligatoria)

| Incluir | Descripción |
|--------|-------------|
| **server/src/** | Todo el código del backend (index.js, routes, middleware, utils, db.js). |
| **server/public/** | Frontend compilado: **generado por vos** copiando `dist/` aquí (ver más abajo). Debe contener `index.html` y la carpeta `assets/`. |
| **server/start.js** | Archivo de entrada para Hostinger (**Archivo de entrada** = `start.js`). Arranca la app; no sustituye al paso `npm install` del panel. |
| **server/package.json** | Dependencias del backend. |
| **server/package-lock.json** | Bloqueo de versiones. |
| **server/ecosystem.config.js** | Config PM2 (opcional en Hostinger). |
| **server/env.sample** | Ejemplo de variables; referencia. |
| **server/uploads/** | Carpeta de subidas (fotos socios, logo). Puede ir vacía o con un `.gitkeep`; si ya tenés fotos/logo, incluilos. |

### Opcional: `server/node_modules/`

- **Incluí** esta carpeta solo si Hostinger **no** ejecuta instalación de dependencias.
- Si el panel tiene **Install command** `npm install --production`, **no** hace falta subir `node_modules` (ZIP más liviano).

### Opcional (si querés subir el proyecto completo)

Podés incluir también la raíz del proyecto (src/, package.json, vite.config.ts, etc.) para tener el código fuente en el servidor. **No es necesario** para que la app funcione; Hostinger solo usa la carpeta **server**.

### No incluir

| No incluir | Motivo |
|------------|--------|
| **server/.env** | Datos sensibles; se configuran como variables de entorno en hPanel. |
| **node_modules/** (raíz del monorepo) | No se usa para el backend en producción. |
| **dist/** | Ya no hace falta si incluiste **server/public** (es la copia de dist). |
| **.env** (raíz) | Sensible; no lo subas. |
| **server/backups/** | Backups locales; no hace falta en el deploy. |
| **server/tests/**, **server/scripts/** | No necesarios en runtime en el servidor. |
| **server/__rar_*** | Archivos temporales; no incluir. |

---

## Antes de comprimir

En tu PC, en la carpeta del proyecto:

```powershell
cd C:\Users\jnazareno\Desktop\Cursor

# 1) Compilar el frontend
npm run build

# 2) Copiar el build a server/public
New-Item -ItemType Directory -Force -Path "server\public"
Copy-Item -Path "dist\*" -Destination "server\public\" -Recurse -Force
```

**Solo si vas a subir `node_modules` en el ZIP** (Hostinger sin paso install):

```powershell
cd server
npm install --production
cd ..
```

Para un ZIP mínimo automatizado: `npm run deploy:hostinger` (sin `node_modules`). Con dependencias embebidas: `powershell -ExecutionPolicy Bypass -File .\scripts\deploy-hostinger.ps1 -BundleNodeModules`.

---

## Ejemplo de estructura del ZIP

Al descomprimir el ZIP, la estructura mínima debería verse así (sin `node_modules` si Hostinger hace el install):

```
server/
├── src/
│   ├── index.js
│   ├── db.js
│   ├── middleware/
│   ├── routes/
│   └── utils/
├── public/          ← generado (index.html + assets/)
│   ├── index.html
│   └── assets/
│       ├── index-xxxxx.js
│       ├── index-xxxxx.css
│       └── ...
├── uploads/
│   ├── fotos/
│   └── logo/
├── package.json
├── package-lock.json
├── ecosystem.config.js
├── env.sample
└── start.js
```

Si incluís dependencias en el ZIP, agregá también `node_modules/`.

---

## Resumen rápido

1. Generar **server/public** (build + copia desde `dist/`).
2. Si Hostinger instala paquetes: comprimir **server** **sin** `node_modules`, **sin** `server/.env`.
3. Si no: `npm install --production` en `server` y comprimir **con** `node_modules`.
4. Subir el ZIP; **Archivo de entrada**: **start.js**; si aplica, **Install command**: `npm install --production`.
