# Solución: Failed to fetch al intentar loguearse

## Problema

Cuando intentas loguearte desde otra PC en la red, obtienes "Failed to fetch". Esto ocurre porque el frontend está intentando conectarse a `http://localhost:4000/api`, pero `localhost` desde otra PC se refiere a esa PC, no a la PC servidor.

## Solución

### Paso 1: Obtener la IP del servidor

En la PC servidor, ejecuta en PowerShell:

```powershell
ipconfig
```

Busca la **IPv4** de tu adaptador de red (ejemplo: `192.168.1.50`)

### Paso 2: Crear archivo `.env` en la raíz del proyecto

Crea un archivo llamado `.env` (sin extensión) en la raíz del proyecto (donde está `package.json`) con el siguiente contenido:

```env
VITE_API_URL=http://TU_IP:4000/api
```

**Reemplaza `TU_IP` con la IP de tu PC servidor.**

Ejemplo:
```env
VITE_API_URL=http://192.168.1.50:4000/api
```

### Paso 3: Reiniciar el servidor de desarrollo

**IMPORTANTE:** Después de crear o modificar el archivo `.env`, debes reiniciar el servidor de desarrollo para que Vite cargue las nuevas variables de entorno.

1. Detén el servidor (Ctrl+C)
2. Inicia nuevamente:
   ```powershell
   npm run dev
   ```

### Paso 4: Verificar que funciona

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Network" (Red)
3. Intenta loguearte
4. Verifica que las peticiones vayan a `http://TU_IP:4000/api` y no a `localhost`

## Verificación Rápida

Para verificar que la configuración está correcta, abre la consola del navegador (F12) y ejecuta:

```javascript
console.log(import.meta.env.VITE_API_URL)
```

Debería mostrar: `http://TU_IP:4000/api`

Si muestra `undefined` o `http://localhost:4000/api`, significa que:
- El archivo `.env` no existe o está mal ubicado
- El servidor no se reinició después de crear el archivo
- Hay un error de sintaxis en el archivo `.env`

## Notas Importantes

1. **El archivo `.env` debe estar en la raíz del proyecto** (mismo nivel que `package.json`)
2. **Las variables de entorno en Vite deben empezar con `VITE_`**
3. **Debes reiniciar el servidor** después de crear o modificar `.env`
4. **Si accedes desde la misma PC servidor**, puedes usar `localhost` o la IP
5. **Si accedes desde otra PC**, DEBES usar la IP del servidor

## Solución Alternativa (Solo para desarrollo)

Si quieres que funcione tanto desde localhost como desde la red, puedes modificar `src/services/api.ts` para detectar automáticamente:

```typescript
// Detectar si estamos en localhost o en la red
const getApiUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000/api';
  }
  // Si accede desde la red, usar la misma IP pero puerto 4000
  return `http://${hostname}:4000/api`;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || getApiUrl();
```

Pero la solución recomendada es usar el archivo `.env` como se explicó arriba.


