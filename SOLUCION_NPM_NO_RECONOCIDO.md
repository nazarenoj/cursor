# Solución: npm no reconocido en PowerShell

## Problema
PowerShell no reconoce el comando `npm`, lo que significa que Node.js no está instalado o no está en el PATH del sistema.

## Soluciones

### Opción 1: Verificar si Node.js está instalado

Ejecuta estos comandos en PowerShell (como Administrador):

```powershell
# Verificar si Node.js está instalado
where.exe node

# Verificar si npm está instalado
where.exe npm
```

Si aparecen rutas como `C:\Program Files\nodejs\node.exe`, Node.js está instalado pero no está en el PATH.

### Opción 2: Agregar Node.js al PATH (si está instalado)

1. **Abrir las Variables de Entorno:**
   - Presiona `Win + R`
   - Escribe `sysdm.cpl` y presiona Enter
   - Ve a la pestaña "Opciones avanzadas"
   - Clic en "Variables de entorno"

2. **Editar la variable PATH:**
   - En "Variables del sistema", busca `Path`
   - Selecciónala y haz clic en "Editar"
   - Clic en "Nuevo"
   - Agrega: `C:\Program Files\nodejs`
   - Acepta todos los diálogos

3. **Reiniciar PowerShell:**
   - Cierra y vuelve a abrir PowerShell
   - O ejecuta: `refreshenv` (si tienes Chocolatey)

4. **Verificar:**
   ```powershell
   node --version
   npm --version
   ```

### Opción 3: Usar la ruta completa (solución rápida)

Si Node.js está instalado pero no está en el PATH, puedes usar la ruta completa:

```powershell
# En lugar de:
npm install --production

# Usa:
& "C:\Program Files\nodejs\npm.cmd" install --production
```

O si está en otra ubicación:

```powershell
# Buscar dónde está instalado
Get-ChildItem -Path "C:\Program Files" -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue
Get-ChildItem -Path "C:\Program Files (x86)" -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue
```

### Opción 4: Instalar Node.js (si no está instalado)

1. **Descargar Node.js:**
   - Ve a: https://nodejs.org/
   - Descarga la versión LTS (Long Term Support)
   - Ejecuta el instalador

2. **Durante la instalación:**
   - Asegúrate de marcar la opción "Add to PATH"
   - Completa la instalación

3. **Verificar la instalación:**
   ```powershell
   node --version
   npm --version
   ```

### Opción 5: Usar Chocolatey (recomendado para servidores)

Si tienes Chocolatey instalado:

```powershell
# Instalar Node.js con Chocolatey
choco install nodejs -y

# Verificar
node --version
npm --version
```

## Comandos para verificar después de la solución

```powershell
# Verificar Node.js
node --version

# Verificar npm
npm --version

# Verificar ubicación
where.exe node
where.exe npm

# Si todo está bien, instalar dependencias
cd C:\Clubsocial\server
npm install --production
```

## Solución temporal rápida

Si necesitas instalar las dependencias AHORA y Node.js está instalado pero no en el PATH:

```powershell
# Cambiar al directorio del servidor
cd C:\Clubsocial\server

# Usar la ruta completa de npm
& "C:\Program Files\nodejs\npm.cmd" install --production

# O si está en otra ubicación, busca primero:
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($nodePath) {
    $npmPath = Join-Path (Split-Path $nodePath) "npm.cmd"
    & $npmPath install --production
}
```

## Nota importante

Después de agregar Node.js al PATH, **cierra y vuelve a abrir PowerShell** para que los cambios surtan efecto.

