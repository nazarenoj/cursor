# 💾 Guía de Backup de Desarrollo

## 🎯 Propósito

Este backup es para **guardar el estado actual del código de desarrollo** antes de continuar con nuevas funcionalidades. Te permite:
- ✅ Tener un punto de restauración estable
- ✅ Volver atrás si algo sale mal
- ✅ Documentar el estado actual del proyecto

## 🚀 Uso Rápido

### Backup Básico
```powershell
.\backup-desarrollo.ps1
```

Crea un backup con nombre automático: `checkpoint-YYYY-MM-DD-HHMMSS`

### Backup con Versión Personalizada
```powershell
.\backup-desarrollo.ps1 -Version "v2.1.0" -Descripcion "Antes de implementar nueva funcionalidad X"
```

## 📦 Qué se Incluye

### ✅ Incluido:
- **Código fuente completo:**
  - `src/` (frontend React)
  - `server/src/` (backend Node.js)
  - `public/` (archivos públicos)
  
- **Configuración:**
  - `package.json` (dependencias)
  - `tsconfig.json` (configuración TypeScript)
  - `vite.config.ts` (configuración Vite)
  - `web.config` (configuración IIS)
  
- **Documentación:**
  - Todos los archivos `.md`
  - Scripts `.ps1`, `.sql`, `.bat`
  
- **Archivos de información:**
  - `INFO-BACKUP.txt` (descripción del backup)
  - `LISTA-ARCHIVOS.txt` (lista completa de archivos)

### ❌ NO Incluido (intencionalmente):
- `node_modules/` (se reinstala con `npm install`)
- `dist/` (se regenera con `npm run build`)
- `.env` (configuración local, no versionar)
- `server/uploads/` (archivos de producción)

## 📍 Ubicación

Los backups se guardan en:
```
C:\Users\jnazareno\Desktop\Backups-Desarrollo\
```

Estructura:
```
Backups-Desarrollo/
├── checkpoint-2025-01-20-143022/
│   ├── src/
│   ├── server/
│   │   └── src/
│   ├── package.json
│   ├── *.md
│   ├── *.ps1
│   ├── *.sql
│   ├── INFO-BACKUP.txt
│   └── LISTA-ARCHIVOS.txt
└── v2.1.0-150530/
    └── ...
```

## 🔄 Restaurar un Backup

### Paso 1: Elegir el backup
```powershell
# Ver backups disponibles
Get-ChildItem C:\Users\jnazareno\Desktop\Backups-Desarrollo\ | Sort-Object LastWriteTime -Descending
```

### Paso 2: Restaurar archivos
```powershell
# Copiar archivos de vuelta al proyecto
$backup = "C:\Users\jnazareno\Desktop\Backups-Desarrollo\checkpoint-2025-01-20-143022"
$proyecto = "C:\Users\jnazareno\Desktop\Cursor"

# Copiar todo el contenido
Copy-Item "$backup\*" -Destination $proyecto -Recurse -Force
```

### Paso 3: Reinstalar dependencias
```powershell
# Frontend
cd C:\Users\jnazareno\Desktop\Cursor
npm install

# Backend
cd server
npm install
```

### Paso 4: Configurar entorno
```powershell
# Crear .env en server/ si no existe
cd C:\Users\jnazareno\Desktop\Cursor\server
# Editar .env con tu configuración
```

### Paso 5: Verificar
```powershell
# Probar que funciona
npm run dev
```

## 💡 Cuándo Hacer Backup

### ✅ Hacer backup ANTES de:
- Implementar funcionalidades grandes
- Hacer refactorizaciones importantes
- Cambiar arquitectura del código
- Actualizar dependencias principales

### ✅ Hacer backup DESPUÉS de:
- Completar una funcionalidad importante
- Corregir bugs críticos
- Mejorar rendimiento significativamente
- Documentar cambios importantes

## 📋 Ejemplos de Uso

### Backup antes de nueva funcionalidad
```powershell
.\backup-desarrollo.ps1 -Version "pre-nueva-funcionalidad" -Descripcion "Backup antes de implementar sistema de reportes"
```

### Backup después de completar feature
```powershell
.\backup-desarrollo.ps1 -Version "v2.1.0" -Descripcion "Sistema de múltiples cajas completado y funcionando"
```

### Backup diario automático
```powershell
# Puedes programar esto en el Programador de Tareas de Windows
.\backup-desarrollo.ps1
```

## 🔍 Verificar Backups

```powershell
# Ver todos los backups
Get-ChildItem C:\Users\jnazareno\Desktop\Backups-Desarrollo\ | 
    Sort-Object LastWriteTime -Descending | 
    Format-Table Name, LastWriteTime, @{Label="Tamaño (MB)"; Expression={[math]::Round((Get-ChildItem $_.FullName -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)}}

# Ver información de un backup específico
Get-Content "C:\Users\jnazareno\Desktop\Backups-Desarrollo\checkpoint-2025-01-20-143022\INFO-BACKUP.txt"
```

## 🗑️ Limpiar Backups Antiguos

```powershell
# Eliminar backups más antiguos que 30 días
$backups = Get-ChildItem C:\Users\jnazareno\Desktop\Backups-Desarrollo\
$fechaLimite = (Get-Date).AddDays(-30)

$backups | Where-Object { $_.LastWriteTime -lt $fechaLimite } | ForEach-Object {
    Write-Host "Eliminando: $($_.Name)"
    Remove-Item $_.FullName -Recurse -Force
}
```

## 📝 Mejores Prácticas

1. **Nombra los backups descriptivamente:**
   - `v2.1.0` para versiones
   - `pre-funcionalidad-X` antes de cambios grandes
   - `post-correccion-Y` después de fixes importantes

2. **Incluye descripción:**
   - Usa `-Descripcion` para documentar qué incluye el backup

3. **Mantén backups recientes:**
   - Al menos los últimos 5-10 backups
   - Elimina backups muy antiguos (más de 3 meses)

4. **Verifica el backup:**
   - Revisa que se copiaron todos los archivos importantes
   - Verifica el tamaño (no debería ser muy pequeño)

5. **Prueba la restauración:**
   - De vez en cuando, prueba restaurar un backup en una carpeta temporal
   - Asegúrate de que el proceso funciona

---

**¡Haz backup ahora y continúa desarrollando con confianza!** 💾✅


