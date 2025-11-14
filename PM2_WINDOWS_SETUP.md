# Configurar PM2 en Windows para Inicio Automático

## Problema
El comando `pm2 startup` no funciona en Windows porque está diseñado para sistemas Linux/Unix. En Windows necesitamos usar un enfoque diferente.

## Soluciones

### Opción 1: Usar pm2-windows-startup (Recomendado)

Este paquete permite que PM2 inicie automáticamente en Windows.

```powershell
# 1. Instalar pm2-windows-startup globalmente
npm install -g pm2-windows-startup

# 2. Ejecutar el instalador
pm2-windows-startup install

# 3. Guardar la configuración actual de PM2
pm2 save

# 4. Reiniciar el servidor para verificar
# Los procesos deberían iniciarse automáticamente
```

**Desinstalar (si es necesario):**
```powershell
pm2-windows-startup uninstall
```

### Opción 2: Usar pm2-windows-service

Alternativa que crea un servicio de Windows.

```powershell
# 1. Instalar pm2-windows-service
npm install -g pm2-windows-service

# 2. Instalar el servicio
pm2-service-install -n PM2

# 3. Guardar la configuración
pm2 save

# 4. El servicio se iniciará automáticamente al arrancar Windows
```

**Desinstalar:**
```powershell
pm2-service-uninstall
```

### Opción 3: Tarea Programada de Windows (Manual)

Si prefieres control manual, puedes crear una tarea programada.

#### Paso 1: Crear un script de inicio

Crea un archivo `start-pm2.bat` en `C:\Clubsocial\server\`:

```batch
@echo off
cd /d C:\Clubsocial\server
pm2 resurrect
```

#### Paso 2: Crear la tarea programada

1. Abre "Programador de tareas" (Task Scheduler)
2. Clic en "Crear tarea básica" (Create Basic Task)
3. Nombre: `PM2 Auto Start`
4. Trigger: "Al iniciar sesión" (When I log on) o "Al iniciar el equipo" (When the computer starts)
5. Acción: "Iniciar un programa" (Start a program)
6. Programa: `C:\Clubsocial\server\start-pm2.bat`
7. Marca "Ejecutar con los privilegios más altos" (Run with highest privileges)

### Opción 4: Servicio de Windows con NSSM (Más Avanzado)

NSSM (Non-Sucking Service Manager) permite crear servicios de Windows fácilmente.

```powershell
# 1. Descargar NSSM desde: https://nssm.cc/download
# 2. Extraer y copiar nssm.exe a una carpeta (ej: C:\Tools\nssm)

# 3. Crear el servicio
C:\Tools\nssm\win64\nssm.exe install PM2 "C:\Program Files\nodejs\node.exe" "C:\Users\jnazareno\AppData\Roaming\npm\node_modules\pm2\bin\pm2" resurrect

# 4. Configurar el directorio de trabajo
C:\Tools\nssm\win64\nssm.exe set PM2 AppDirectory "C:\Clubsocial\server"

# 5. Iniciar el servicio
C:\Tools\nssm\win64\nssm.exe start PM2
```

## Pasos Comunes (Independiente de la Opción)

### 1. Iniciar la aplicación con PM2

```powershell
cd C:\Clubsocial\server
pm2 start ecosystem.config.js
```

### 2. Guardar la configuración actual

```powershell
pm2 save
```

Esto guarda la lista de procesos que PM2 debe restaurar al iniciar.

### 3. Verificar que está funcionando

```powershell
# Ver estado de los procesos
pm2 list

# Ver logs
pm2 logs

# Ver información detallada
pm2 show ecosystem
```

### 4. Comandos útiles de PM2

```powershell
# Reiniciar todos los procesos
pm2 restart all

# Detener todos los procesos
pm2 stop all

# Eliminar todos los procesos
pm2 delete all

# Ver monitoreo en tiempo real
pm2 monit

# Recargar sin tiempo de inactividad (zero-downtime)
pm2 reload all
```

## Verificación

Después de configurar el inicio automático:

1. **Reinicia el servidor Windows**
2. **Verifica que PM2 inició los procesos:**
   ```powershell
   pm2 list
   ```
3. **Verifica los logs:**
   ```powershell
   pm2 logs
   ```

## Solución de Problemas

### PM2 no inicia automáticamente

1. Verifica que ejecutaste `pm2 save` después de iniciar los procesos
2. Verifica que el servicio/tarea programada está habilitado
3. Revisa los logs de Windows Event Viewer

### Los procesos no se restauran

```powershell
# Verificar qué procesos están guardados
pm2 list

# Si no hay procesos, inicia y guarda nuevamente
pm2 start ecosystem.config.js
pm2 save
```

### Error de permisos

Ejecuta PowerShell como Administrador:
- Clic derecho en PowerShell
- "Ejecutar como administrador"

## Recomendación

Para la mayoría de casos, **Opción 1 (pm2-windows-startup)** es la más simple y confiable.

