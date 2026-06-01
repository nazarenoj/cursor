# Desplegar el sistema en Hostinger

Esta guía indica los pasos para llevar el proyecto (React + Express + MySQL) a Hostinger usando un **solo despliegue Node.js**: el backend sirve la API y también el frontend compilado.

---

## Requisitos en Hostinger

- Plan **Business** o **Cloud** (Cloud Startup, Professional, etc.). Los planes básicos no incluyen Node.js.
- **MySQL**: crear una base de datos en hPanel (Bases de datos MySQL).
- **Node.js** en versión 18.x, 20.x, 22.x o 24.x (se elige en la app).

Si tu plan no tiene Node.js, debes mejorar el plan o usar un VPS.

---

## Resumen del proceso

1. Crear la base de datos MySQL en Hostinger.
2. Preparar el paquete de despliegue (frontend compilado + backend) en tu PC.
3. Subir por GitHub o ZIP a Hostinger y configurar la app Node.js.
4. Configurar variables de entorno (BD, JWT, CORS, etc.).
5. Asignar dominio o subdominio.

---

## Paso 1 — Crear la base de datos MySQL en Hostinger

1. Entrá a **hPanel** → **Bases de datos** → **Bases de datos MySQL**.
2. Creá una base de datos (ej. `u123456789_club`).
3. Creá un usuario con contraseña y asignalo a esa base con **todos los privilegios**.
4. Anotá:
   - **Host** (ej. `localhost` o `mysql.hostinger.com`).
   - **Nombre de la base**.
   - **Usuario**.
   - **Contraseña**.

Hostinger suele mostrar el host tipo `localhost` cuando la BD está en el mismo servidor; si no, usá el host que te indiquen (ej. `srv123.hostinger.com`).

---

## Paso 2 — Preparar el paquete de despliegue en tu PC

En tu máquina (en la carpeta del proyecto):

### 2.1 Compilar el frontend apuntando a la API en producción

La app debe llamar a la API en la misma URL donde Hostinger va a publicar (mismo dominio).
Para el deploy multi-instancia recomendado, en `production` el frontend deriva automáticamente la API desde `window.location`, por lo que **no hace falta** setear `VITE_API_URL` (aunque podés hacerlo si querés pruebas puntuales).

```powershell
cd C:\Users\jnazareno\Desktop\Cursor
npm run build
```

Si todavía no tenés dominio, podés usar el subdominio temporal que te asigne Hostinger (ej. `https://tu-app.tuplan.hostingersite.com`) y luego cambiar.

### 2.2 Copiar el frontend compilado dentro del servidor

```powershell
# Crear carpeta public en el servidor y copiar dist
New-Item -ItemType Directory -Force -Path "server\public"
Copy-Item -Path "dist\*" -Destination "server\public\" -Recurse -Force
```

### 2.3 Crear un package.json en la raíz para Hostinger (opcional)

Hostinger puede ejecutar `npm start` desde la raíz. Si querés que arranque el backend desde la raíz del repo:

Creá (o ajustá) un `package.json` en la **raíz** del proyecto que tenga al menos:

```json
{
  "name": "club-social-app",
  "private": true,
  "scripts": {
    "start": "node server/src/index.js",
    "install:server": "cd server && npm install --production"
  },
  "engines": {
    "node": ">=18"
  }
}
```

En Hostinger, en la configuración de la **Node.js App**, vas a indicar:
- **Start command**: `npm start` (o `node server/src/index.js`).
- **Root directory**: la raíz del proyecto (donde está este package.json y la carpeta `server`).

Si en cambio Hostinger “ve” solo la carpeta `server`, entonces:
- Root directory: `server`
- Start command: `npm start` o `node src/index.js`

Y en ese caso el frontend compilado tiene que estar en `server/public` (como ya hiciste en 2.2).

### 2.4 Incluir `server/public` en el despliegue

- Si subís por **ZIP**: que el ZIP contenga la raíz del proyecto con `server/public` ya llena (los archivos de `dist`).
- Si desplegás por **GitHub**: no conviene versionar `server/public`. Opciones:
  - Hacer un build en tu PC, subir el ZIP con `server/public` incluido, o
  - Usar el “Build command” de Hostinger para compilar el frontend (si Hostinger permite `npm run build` en la raíz y luego copiar `dist` a `server/public` con un script). Si no, el método más simple es **subir ZIP** con `public` ya generado.

---

## Paso 3 — Subir el proyecto a Hostinger

### Opción A — Subir ZIP

1. En tu PC: comprimí la carpeta **server** con **`server/public`** ya generada (frontend compilado). No incluyas `server/.env`. **No incluyas `node_modules` de la raíz del monorepo** (no se usan para el backend).
2. hPanel → **Websites** → **Add Website**.
3. Elegí **Node.js Apps**.
4. **Upload your website files** → subí el ZIP.
5. En la configuración de la app Node.js:
   - **Root directory**: `server` (o la carpeta donde esté `start.js`).
   - **Archivo de entrada**: `start.js`.
   - Si el panel ofrece paso de instalación: **Install command** `npm install --production` (así el ZIP puede ir **sin** `server/node_modules`, más liviano).
   - Si tu flujo **no** ejecuta `npm install` en el servidor, generá `server/node_modules` en tu PC antes de comprimir e **incluí** esa carpeta en el ZIP.
6. **Deploy**.

### Opción B — GitHub

1. hPanel → **Websites** → **Add Website** → **Node.js Apps** → **Import Git Repository**.
2. Conectá GitHub y elegí el repositorio.
3. En Build settings:
   - **Root directory**: `server` (si el backend está en `server`).
   - **Install command**: `npm install --production`.
   - **Build command**: dejadlo vacío si ya subiste `server/public` por otro medio; si no, tendrías que tener un script que haga build del frontend y copie a `server/public` (Hostinger no tiene la raíz del monorepo por defecto).
   - **Start command**: `node src/index.js`.
4. Deploy.

Para evitar problemas, la opción más directa es **ZIP con `server/public` ya generado** como en el paso 2.

---

## Paso 4 — Variables de entorno en Hostinger

En la configuración de la **Node.js App** en hPanel, agregá variables de entorno (o archivo `.env` si Hostinger lo permite):

| Variable       | Ejemplo / descripción |
|----------------|------------------------|
| `NODE_ENV`     | `production` |
| `PORT`         | El que asigne Hostinger (ej. `4000` o el que indiquen). |
| `DB_HOST`      | Host de MySQL que muestra hPanel para **Node.js** (suele ser tipo `srvXXXX.hstgr.io`). Evitá `localhost` salvo que Hostinger lo indique explícitamente: con `localhost` el cliente MySQL puede autenticar distinto que con TCP a `127.0.0.1`. |
| `DB_PORT`      | `3306` |
| `DB_USER`      | Usuario MySQL. |
| `DB_PASSWORD`  | Contraseña MySQL. |
| `DB_NAME`      | Nombre de la base. |
| `JWT_SECRET`   | Una clave larga y aleatoria (guardala en lugar seguro). |
| `CORS_ORIGIN`  | URL del frontend. Si API y web son el mismo dominio, podés usar `*` o `https://tudominio.com`. |
| `WHATSAPP_EMBEDDED` | `true` o `1` para correr Baileys **dentro del mismo proceso** que la API (un solo slot Node en Hostinger). No hace falta segunda app ni `WHATSAPP_SERVICE_URL`. |
| `WHATSAPP_AUTH_FOLDER` | (Opcional) Ruta absoluta en el servidor donde Baileys guarda la sesión. Si no la definís, se usa la carpeta `whatsapp_auth` junto al código del `server`. **Conviene que sea persistente** entre redeploys para no tener que escanear el QR cada vez. |
| `WHATSAPP_SERVICE_URL` | Solo en modo **microservicio separado**: URL del proceso `whatsapp-service` (ej. `http://127.0.0.1:4002`). Si `WHATSAPP_EMBEDDED=true`, ignorá esta variable. |

Si la API y la web se sirven desde el **mismo dominio** (porque Express sirve el frontend desde `public`), en producción no hace falta `VITE_API_URL` y CORS puede ser `*` o el dominio de la instancia.

### WhatsApp: una sola Node App en Hostinger
Si tenés límite de aplicaciones Node, activá **`WHATSAPP_EMBEDDED=true`**. Asegurate de que las dependencias de Baileys queden instaladas en el servidor (vía **Install command** en Hostinger o incluyendo `node_modules` en el ZIP si no hay install). No subas una segunda app solo para WhatsApp.

### Nota multi-instancia (recomendado)
Si vas a correr varias instancias independientes de la misma app en Hostinger:
- Usá un `PORT` distinto para cada Node.js App (backend).
- Usá un `DB_NAME`/`DB_USER` (y `JWT_SECRET`) por instancia para aislar datos y sesiones.
- Con **embebido**: cada instancia puede usar `WHATSAPP_EMBEDDED=true` y un `WHATSAPP_AUTH_FOLDER` distinto (o la carpeta por defecto dentro de cada deploy, sabiendo que al redeploy podés perder la sesión si no es persistente).
- Si en cambio corrés `whatsapp-service` como app separada por instancia, configurá su `PORT` distinto y que `WHATSAPP_SERVICE_URL` en el API apunte a ese puerto (sin `WHATSAPP_EMBEDDED`).

---

## Paso 5 — Migraciones de la base de datos

El backend ejecuta `initDb()` al arrancar y crea/actualiza tablas. No hace falta correr SQL a mano salvo que tengas scripts específicos. Asegurate de que la base esté vacía o que sea la que corresponde al proyecto; si ya tenés datos de otro entorno, valorá hacer backup antes.

---

## Paso 6 — Dominio o subdominio

1. Si desplegaste en un subdominio temporal, en hPanel podés **conectar un dominio** o subdominio a esa app Node.js (según la opción que ofrezca Hostinger).
2. Después de conectar el dominio, la app debería seguir funcionando porque el frontend llama a `/api` del mismo origen.

---

## Paso 7 — Comprobar

1. Entrá a la URL del sitio (dominio o subdominio temporal).
2. Deberías ver el login. Probá iniciar sesión.
3. Revisá que las pantallas carguen y que no haya errores en consola (F12).
4. Opcional: probar `https://tudominio.com/api/health` y ver que responda algo como `{"status":"ok",...}`.

---

## Resumen rápido

| Paso | Acción |
|------|--------|
| 1 | Crear BD MySQL en Hostinger y anotar host, usuario, contraseña y nombre. |
| 2 | En tu PC: `npm run build`; copiar `dist/*` a `server/public`. |
| 3 | Subir ZIP/GitHub como Node.js App; root `server`; entrada `start.js` (o `node src/index.js` según el panel); si aplica, **Install** `npm install --production` y ZIP sin `node_modules`. |
| 4 | Configurar variables de entorno (NODE_ENV, PORT, DB_*, JWT_SECRET, CORS_ORIGIN; si usás WhatsApp en el mismo proceso: `WHATSAPP_EMBEDDED=true` y opcional `WHATSAPP_AUTH_FOLDER`). |
| 5 | Deploy; conectar dominio si corresponde. |
| 6 | Probar login y uso normal. |

---

## Si algo falla

- **502 / no carga**: Revisá que el **Start command** sea correcto y que el **PORT** coincida con el que usa Hostinger para la app.
- **Error de base de datos**: Revisá host, usuario, contraseña y nombre de la BD; que el usuario tenga permisos sobre esa base.
- **CORS**: Si la web está en otro dominio que la API, poné en `CORS_ORIGIN` la URL exacta del frontend (con `https://`).
- **Página en blanco**: Verificá que `server/public` tenga `index.html` y la carpeta `assets` (frontend compilado); que la app esté levantando correctamente.

Referencia de estructura del backend: `server/env.sample` y `server/src/index.js` (en producción sirve `server/public` como frontend).
