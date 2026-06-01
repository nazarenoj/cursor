# Tu PC como servidor en la red: backend + frontend, acceso desde toda la red

Objetivo: correr **solo en tu PC** el backend y el frontend, y poder entrar a la app **desde cualquier dispositivo en la misma red** (otra PC, celular, tablet) usando la IP de tu PC.

---

## Resumen de la configuración (ya está lista en el proyecto)

| Componente | Escucha en | Función |
|------------|------------|--------|
| **Backend** (Express) | `0.0.0.0:3000` | Acepta conexiones desde cualquier interfaz (localhost + IP de red). |
| **Frontend** (Vite) | `0.0.0.0:5173` | Con `vite --host` acepta conexiones desde la red. |
| **API en el navegador** | Según la URL con la que entrás | Si entrás por `http://192.168.2.3:5173`, el frontend llama a `http://192.168.2.3:3000/api`. |
| **CORS** | Cualquier origen si `NODE_ENV !== 'production'` | Al usar `npm start` o `npm run dev`, no se pone `NODE_ENV=production`, así que el backend acepta peticiones desde cualquier origen (incluida la IP de tu PC). |

No hace falta cambiar `.env` para uso en red: la URL de la API se arma sola según el host con el que se abrió la app.

---

## Cómo arrancar todo (un solo comando)

En la **raíz del proyecto** (tu PC):

```bash
npm run dev:red
```

Ese comando:

1. Muestra en consola la **URL para esta PC** (`http://localhost:5173`) y las **URL para la red** (`http://<tu-IP>:5173`).
2. Arranca backend y frontend (igual que `npm run dev`).

Dejá esa terminal abierta. En **otra PC o celular** de la misma red, abrí en el navegador la URL que te mostró (ej. `http://192.168.2.3:5173`).

---

## Arrancar en dos terminales (alternativa)

**Terminal 1 – Backend**
```bash
cd server
npm start
```
(No cierres; debe quedar "Servidor ESCUCHANDO en puerto 3000".)

**Terminal 2 – Frontend**
```bash
cd C:\Users\jnazareno\Desktop\Cursor
npm run dev:frontend
```
(Vite en puerto 5173 con `--host`.)

Para ver la IP de tu PC y la URL de red:
```bash
node scripts/mostrar-url-red.js
```

---

## Cómo funciona la URL de la API

- **Si entrás desde tu PC** con `http://localhost:5173` → el frontend usa `http://localhost:3000/api`.
- **Si entrás desde la red** con `http://192.168.2.3:5173` → el frontend usa `http://192.168.2.3:3000/api`.

El host se toma de `window.location.hostname` en el navegador; no hace falta configurar nada en `.env` para la red.

---

## Si desde otra PC no carga o da error de conexión

### 1. Firewall de Windows (en la PC donde corre el proyecto)

Hay que permitir **entrada** en los puertos **5173** (frontend) y **3000** (backend).

**Opción A – Interfaz**
1. **Windows Defender Firewall** → **Configuración avanzada** → **Reglas de entrada**.
2. **Nueva regla** → **Puerto** → **TCP** → Puertos: `5173, 3000` → **Permitir la conexión** → Nombre: "App club socios (red)".

**Opción B – PowerShell (como administrador)**
```powershell
New-NetFirewallRule -DisplayName "App club socios (red)" -Direction Inbound -Protocol TCP -LocalPort 5173,3000 -Action Allow
```

### 2. Comprobar que tu PC tiene IP de red

En la PC donde corre el proyecto:
```bash
ipconfig
```
Buscá **Adaptador de Ethernet** o **Wi-Fi** → **Dirección IPv4** (ej. `192.168.2.3`). Esa es la IP que deben usar los otros dispositivos: `http://esa-IP:5173`.

### 3. Misma red

Los otros dispositivos tienen que estar en la **misma red** (mismo Wi‑Fi o mismo segmento de red). No uses `localhost` desde la otra PC; usá la IP de la PC servidor.

### 4. Reiniciar después de cambiar firewall

Después de agregar la regla de firewall, probá de nuevo desde la otra PC. No hace falta reiniciar la app si ya estaba corriendo.

---

## Opcional: fijar la URL del backend

Si en algún caso la detección automática falla, en la **raíz del proyecto** podés crear o editar **`.env.development`**:

```
VITE_API_URL=http://TU_IP:3000/api
```

Reemplazá `TU_IP` por la IP de tu PC (ej. `192.168.2.3`). Reiniciá el frontend después de cambiar el archivo.  
Cuando abras desde **localhost**, la app sigue usando `http://localhost:3000/api` (localhost tiene prioridad en el código).

---

## Resumen rápido

1. En tu PC: `npm run dev:red` (o las dos terminales: backend + `npm run dev:frontend`).
2. Anotá la URL de red que muestra el script (ej. `http://192.168.2.3:5173`).
3. Si no llega desde otra PC: permitir puertos 5173 y 3000 en el firewall de Windows.
4. En el otro dispositivo: abrir esa URL en el navegador. No hace falta tocar el `.env` para la red.
