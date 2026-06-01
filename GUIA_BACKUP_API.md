# Guía de Backup Automático vía API

Este sistema permite realizar backups automáticos del sistema completo (base de datos MySQL) comprimidos en **.rar** (WinRAR en Windows) o **.zip** (Node.js con `archiver` / `unzipper` cuando no hay WinRAR: Linux, Hostinger, etc.), accesible desde la API REST.

**Nota:** Los backups **.rar** antiguos solo se pueden restaurar en un servidor con WinRAR (típicamente Windows). En Linux/Hostinger usá backups **.zip** o convertí el .rar a .zip en tu PC.

**Intercambio Linux / Windows / Hostinger:** en configuración de backup elegí **ZIP portable** (`formatoBackup: zip_portable` vía `PUT /api/backup/config`) para que los archivos sean siempre `.zip` y se restauren en cualquier servidor con esta app. Para mover una copia entre equipos, descargala con `GET /api/backup/descargar/{nombre}` (permiso `backup.ver`) y colocá el archivo en la carpeta de backups del destino antes de restaurar.

## 📋 Requisitos Previos

1. **Compresión**
   - **Windows (opcional):** WinRAR instalado si querés archivos `.rar` (https://www.winrar.es/).
   - **Sin WinRAR:** dependencias `archiver` y `unzipper` en `server` (por defecto en el proyecto); genera y restaura `.zip` sin `unzip` del sistema.

2. **MySQL con mysqldump disponible**
   - mysqldump debe estar en el PATH o en una ubicación conocida
   - El sistema intentará encontrarlo automáticamente

3. **Permiso de backup**
   - El usuario debe tener el permiso `backup` asignado
   - Por defecto, el usuario `admin` tiene todos los permisos

## 🔐 Permisos

Para usar las funciones de backup, el usuario debe tener el permiso `backup`. Este permiso se crea automáticamente al inicializar la base de datos.

## 📡 Endpoints de la API

### 1. Obtener Configuración

```http
GET /api/backup/config
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "servidorWindows": true,
  "config": {
    "rutaBackup": "C:\\backups",
    "frecuencia": "diaria",
    "formatoBackup": "auto",
    "rutaWinRAR": "C:\\Program Files\\WinRAR\\WinRAR.exe",
    "mantenerBackups": {
      "horarios": 24,
      "diarios": 30,
      "semanales": 12,
      "mensuales": 12
    }
  },
  "herramientas": {
    "winrar": {
      "disponible": true,
      "ruta": "C:\\Program Files\\WinRAR\\WinRAR.exe"
    },
    "mysqldump": {
      "disponible": true,
      "comando": "mysqldump"
    }
  }
}
```

### 2. Actualizar Configuración

```http
PUT /api/backup/config
Authorization: Bearer {token}
Content-Type: application/json

{
  "rutaBackup": "C:\\Backups\\SistemaGestionSocios",
  "frecuencia": "diaria",
  "formatoBackup": "zip_portable",
  "rutaWinRAR": "C:\\Program Files\\WinRAR\\WinRAR.exe",
  "mantenerBackups": {
    "horarios": 24,
    "diarios": 30,
    "semanales": 12,
    "mensuales": 12
  }
}
```

**Parámetros:**
- `rutaBackup` (opcional): Ruta donde se guardarán los backups
- `frecuencia` (opcional): `"horaria"`, `"diaria"`, `"semanal"` o `"mensual"`
- `formatoBackup` (opcional): `"auto"` (WinRAR → `.rar` si existe) o `"zip_portable"` (siempre `.zip`, recomendado para compartir entre sistemas)
- `rutaWinRAR` (opcional): Ruta completa al ejecutable de WinRAR
- `mantenerBackups` (opcional): Objeto con cantidad de backups a mantener

**Respuesta:**
```json
{
  "message": "Configuración de backup actualizada exitosamente",
  "config": { ... }
}
```

### 3. Ejecutar Backup Manualmente

```http
POST /api/backup/ejecutar
Authorization: Bearer {token}
```

**Respuesta exitosa:**
```json
{
  "message": "Backup realizado exitosamente",
  "resultado": {
    "fecha": "2025-12-20T14:30:00.000Z",
    "nombre": "Backup-2025-12-20",
    "ruta": "C:\\backups\\Backup-2025-12-20.rar",
    "exito": true,
    "pasos": [
      "Iniciando backup de base de datos...",
      "Backup de BD completado: 2.45 MB",
      "Archivo de información creado",
      "Iniciando compresión con WinRAR...",
      "Compresión completada: 0.85 MB",
      "Limpieza de backups antiguos completada"
    ],
    "baseDatos": {
      "exito": true,
      "archivo": "C:\\backups\\Backup-2025-12-20\\database_backup.sql",
      "tamaño": 2568192
    },
    "archivo": {
      "exito": true,
      "archivo": "C:\\backups\\Backup-2025-12-20.rar",
      "tamaño": 891392
    }
  }
}
```

### 4. Listar Backups Disponibles

```http
GET /api/backup/listar
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "backups": [
    {
      "nombre": "Backup-2025-12-20.rar",
      "ruta": "C:\\backups\\Backup-2025-12-20.rar",
      "tamaño": 891392,
      "fechaCreacion": "2025-12-20T14:30:00.000Z",
      "fechaModificacion": "2025-12-20T14:30:00.000Z"
    },
    {
      "nombre": "Backup-2025-12-19.rar",
      "ruta": "C:\\backups\\Backup-2025-12-19.rar",
      "tamaño": 892145,
      "fechaCreacion": "2025-12-19T02:00:00.000Z",
      "fechaModificacion": "2025-12-19T02:00:00.000Z"
    }
  ]
}
```

### 5. Descargar archivo de backup

Descarga el `.zip` o `.rar` para copiarlo a otro equipo o servidor (mismo nombre que devuelve el listado).

```http
GET /api/backup/descargar/Backup-2025-12-20.zip
Authorization: Bearer {token}
```

Requiere permiso `backup.ver`. El cuerpo de la respuesta es el archivo binario (disposición `attachment`).

### 6. Verificar Herramientas

```http
GET /api/backup/verificar
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "herramientas": {
    "winrar": {
      "disponible": true,
      "ruta": "C:\\Program Files\\WinRAR\\WinRAR.exe"
    },
    "mysqldump": {
      "disponible": true,
      "comando": "mysqldump"
    }
  },
  "listo": true
}
```

## ⏰ Frecuencias Disponibles

### Horaria
- Se ejecuta cada hora
- Mantiene los últimos 24 backups (24 horas)
- Útil para sistemas críticos

### Diaria (Recomendado)
- Se ejecuta todos los días a las 02:00 AM
- Mantiene los últimos 30 backups (30 días)
- Balance entre frecuencia y espacio

### Semanal
- Se ejecuta los domingos a las 02:00 AM
- Mantiene los últimos 12 backups (3 meses)
- Para sistemas con cambios menos frecuentes

### Mensual
- Se ejecuta el día 1 de cada mes a las 02:00 AM
- Mantiene los últimos 12 backups (1 año)
- Para archivo histórico

## 📦 Contenido del Backup

Cada backup incluye:

1. **Base de datos MySQL**
   - Archivo SQL con dump completo de la base de datos
   - Incluye estructura y datos
   - Incluye rutinas y triggers

2. **Archivo de información**
   - `BACKUP-INFO.json` con detalles del backup

Todo se comprime en un archivo `.rar` con el nombre según la frecuencia:
- **Horaria**: `Backup-2025-12-20-1430.rar`
- **Diaria**: `Backup-2025-12-20.rar`
- **Semanal**: `Backup-2025-Semana51.rar`
- **Mensual**: `Backup-2025-12.rar`

## 🔄 Tareas Programadas

El sistema inicia automáticamente una tarea programada cuando el servidor se inicia, basándose en la frecuencia configurada. La tarea se reinicia automáticamente cuando se actualiza la configuración de frecuencia.

## 📥 Restaurar un Backup

### Restaurar la base de datos:

```powershell
# Extraer el archivo .rar primero
# Luego ejecutar:
mysql -u root -p club_social < database_backup.sql
```

O usando la ruta completa de MySQL:
```powershell
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p club_social < database_backup.sql
```

## 🔧 Solución de Problemas

### Error: WinRAR no encontrado

1. Verifica que WinRAR esté instalado
2. Actualiza la configuración vía API con la ruta correcta:
   ```json
   {
     "rutaWinRAR": "C:\\Program Files\\WinRAR\\WinRAR.exe"
   }
   ```

### Error: mysqldump no encontrado

1. Agrega MySQL al PATH del sistema, o
2. El sistema intentará encontrarlo automáticamente en ubicaciones comunes

Ubicaciones comunes de mysqldump:
- `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe`
- `C:\xampp\mysql\bin\mysqldump.exe`
- `C:\wamp64\bin\mysql\mysql8.0.xx\bin\mysqldump.exe`

### Error: Permisos insuficientes

Asegúrate de que el usuario tenga el permiso `backup` asignado. Puedes verificar y asignar permisos desde la sección de Usuarios en la aplicación.

## 📝 Notas Adicionales

- Los backups se comprimen con máxima compresión (método 5 de WinRAR)
- Los archivos originales se eliminan después de comprimir
- Los backups antiguos se eliminan automáticamente según la configuración
- La configuración se guarda tanto en archivo JSON como en la base de datos
- La tarea programada se reinicia automáticamente al cambiar la frecuencia

## 🆘 Soporte

Si encuentras problemas:
1. Verifica las herramientas con `GET /api/backup/verificar`
2. Revisa la configuración con `GET /api/backup/config`
3. Ejecuta un backup manual para ver errores en tiempo real
4. Verifica que WinRAR y MySQL estén correctamente instalados

