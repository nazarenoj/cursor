# Guía de verificación post-deploy (producción)

Usá esta lista después de subir un nuevo build del frontend/backend para confirmar que **no hay pestañeo de colores**, el **logo** y la **versión** se ven bien, y la **configuración del club** se aplica de forma estable.

---

## 1. Antes de subir

1. **Frontend:** en tu PC, desde la raíz del proyecto:
   ```bash
   npm run build
   ```
   Debe terminar sin errores (`tsc` + `vite build`).

2. **Variables de entorno del frontend (Vite):** si el API no está en el mismo dominio que la web, definí `VITE_API_URL` en el build (ej. `https://tudominio.com/api` sin barra final duplicada). Si frontend y API comparten origen (`https://glconsultora.com.ar` + `/api`), no hace falta.

3. **Subí el contenido de `dist/`** al hosting estático (o el flujo que uses en Hostinger/IIS).

4. **Reiniciá el proceso Node** del backend si cambiaste `server/` (PM2, panel Hostinger, etc.).

---

## 2. Comprobaciones rápidas (API)

Abrir en el navegador o con `curl`:

| Qué | URL típica | Qué esperar |
|-----|------------|-------------|
| Salud | `https://TU_DOMINIO/api/health` | `{"status":"ok",...}` (el `timestamp` en `Z` es UTC, es normal) |
| Config pública | `https://TU_DOMINIO/api/club-config/public` | JSON con `nombreClub`, `logoUrl`, `colorPrimario`, `timezone` |

Si `club-config/public` falla o tarda mucho, el login mostrará error o “Cargando…”; corregí primero CORS/red/API.

---

## 3. Limpieza de caché (importante)

El navegador y el CDN pueden servir **JS/CSS viejos** aunque el servidor ya tenga la versión nueva.

1. **Recarga forzada:** `Ctrl+F5` (Windows) o `Cmd+Shift+R` (Mac).
2. **Ventana privada/incógnito** para probar sin extensiones ni caché largo.
3. Si usás **Cloudflare u otro CDN:** purgar caché del sitio o esperar TTL.
4. **Caché local de la app:** la configuración del club se guarda en `localStorage` bajo la clave `club-config-cache-v1`. Si algo se ve “atascado” con datos viejos:
   - DevTools → **Application** (Chrome) → **Local Storage** → borrar la entrada `club-config-cache-v1` o limpiar todo el sitio.
   - Volvé a cargar el login; se volverá a pedir `/api/club-config/public` y se regenerará el caché.

---

## 4. Pantalla de login

Verificá en orden:

1. **Carga:** primero puede verse “Cargando datos del club…” (breve); no debería mostrarse nombre/color por defecto del club antes de eso.
2. **Datos del club:** nombre y color de fondo acordes a lo guardado en **Configuración del club**.
3. **Logo:** debe verse la imagen del club (no solo el placeholder `/logo.svg`). Si no carga:
   - Revisá en Network la petición al archivo del logo (URL que devuelve `logoUrl`).
   - Confirmá `VITE_API_URL` si el API está en otro host.
4. **Versión:** texto del estilo `Versión vX.Y.Z` debajo del subtítulo; debe coincidir con `src/version.ts` del build desplegado.

---

## 5. Después del login (sin pestañeo)

1. Iniciá sesión con un usuario válido.
2. **No debería haber un “flash”** de barra lateral / topbar con color por defecto y luego el color del club: el layout espera a tener la config lista (y usa caché si existe).
3. En la barra superior: **mismo logo y nombre** que en login (salvo que cambies config después).
4. Navegá a **2–3 pantallas** (ej. Socios, Liquidaciones): el color primario debe mantenerse estable.

---

## 6. Cambiar configuración del club

1. Entrá a **Configuración del club** (con permiso `club.configurar`).
2. Cambiá color, logo o zona horaria y guardá.
3. Cerrá sesión y volvé al login: deberías ver los cambios; si no, hacé paso 3 de “Limpieza de caché” y recargá.

---

## 7. Problemas frecuentes

| Síntoma | Posible causa |
|---------|----------------|
| Sigo viendo versión vieja | Caché del navegador/CDN; recarga forzada o incógnito |
| Logo roto en login pero OK adentro | `VITE_API_URL` mal en el build del frontend |
| Parpadeo de colores tras login | Build anterior sin `PrivateRoute` + caché de club; desplegar último `dist` y limpiar caché |
| Login en blanco / error de config | `/api/club-config/public` no responde o CORS incorrecto |

---

## 8. Referencia de archivos relevantes

- Caché y contexto del club: `src/contexts/ClubConfigContext.tsx`
- Espera de config al entrar: `src/components/PrivateRoute.tsx`
- Login y logo: `src/components/Login.tsx`
- Versión visible: `src/version.ts` + texto en `Login.tsx` y `Layout.tsx`

---

**Última actualización:** alineada con la versión **3.0.3** y correcciones de pestañeo/logo/login.
