# Script de Backup para Código de Desarrollo
# Crea un checkpoint del estado actual del proyecto para continuar con nuevas funcionalidades

param(
    [string]$Version = "",
    [string]$Descripcion = ""
)

$fecha = Get-Date -Format "yyyy-MM-dd"
$hora = Get-Date -Format "HHmmss"

# Si no se especifica versión, usar fecha
if ($Version -eq "") {
    $Version = "checkpoint-$fecha"
}

$rutaProyecto = "C:\Users\jnazareno\Desktop\Cursor"
$rutaBackup = "C:\Users\jnazareno\Desktop\Backups-Desarrollo\$Version-$hora"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKUP DE CÓDIGO DE DESARROLLO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe la carpeta del proyecto
if (-not (Test-Path $rutaProyecto)) {
    Write-Host "ERROR: No se encuentra la carpeta del proyecto: $rutaProyecto" -ForegroundColor Red
    exit 1
}

Write-Host "Proyecto: $rutaProyecto" -ForegroundColor Green
Write-Host "Versión: $Version" -ForegroundColor Green
Write-Host "Backup en: $rutaBackup" -ForegroundColor Yellow
Write-Host ""

# Crear carpeta de backup
New-Item -ItemType Directory -Path $rutaBackup -Force | Out-Null

# ============================================
# COPIAR CÓDIGO FUENTE
# ============================================
Write-Host "Copiando código fuente..." -ForegroundColor Yellow

# Archivos y carpetas a copiar
$itemsACopiar = @(
    "src",                    # Frontend completo
    "server\src",            # Backend completo
    "public",                # Archivos públicos
    "package.json",          # Dependencias frontend
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.node.json",
    "vite.config.ts",
    "index.html",
    "web.config",
    ".gitignore",
    ".eslintrc.cjs",
    "README.md"
)

# Archivos de documentación y scripts
$docsYScripts = @(
    "*.md",                  # Todos los archivos markdown
    "*.ps1",                 # Scripts PowerShell
    "*.sql",                 # Scripts SQL
    "*.bat"                  # Scripts batch
)

$copiados = 0
$omitidos = 0

foreach ($item in $itemsACopiar) {
    $rutaOrigen = Join-Path $rutaProyecto $item
    if (Test-Path $rutaOrigen) {
        $rutaDestino = Join-Path $rutaBackup $item
        $destinoParent = Split-Path $rutaDestino -Parent
        if (-not (Test-Path $destinoParent)) {
            New-Item -ItemType Directory -Path $destinoParent -Force | Out-Null
        }
        Copy-Item -Path $rutaOrigen -Destination $rutaDestino -Recurse -Force
        Write-Host "  ✅ $item" -ForegroundColor Green
        $copiados++
    } else {
        Write-Host "  ⚠ No encontrado: $item" -ForegroundColor Yellow
        $omitidos++
    }
}

# Copiar archivos de documentación y scripts
Write-Host ""
Write-Host "Copiando documentación y scripts..." -ForegroundColor Yellow
foreach ($patron in $docsYScripts) {
    $archivos = Get-ChildItem -Path $rutaProyecto -Filter $patron -File -ErrorAction SilentlyContinue
    foreach ($archivo in $archivos) {
        Copy-Item -Path $archivo.FullName -Destination (Join-Path $rutaBackup $archivo.Name) -Force
        Write-Host "  ✅ $($archivo.Name)" -ForegroundColor Green
        $copiados++
    }
}

# ============================================
# CREAR ARCHIVO DE INFORMACIÓN
# ============================================
Write-Host ""
Write-Host "Creando archivo de información..." -ForegroundColor Yellow

$infoBackup = @"
CHECKPOINT DE DESARROLLO
========================
Fecha: $fecha $hora
Versión: $Version
Proyecto: Sistema de Gestión de Socios - Club Social

ESTADO ACTUAL DEL CÓDIGO:
--------------------------
✅ Frontend completo con React + TypeScript
✅ Backend completo con Node.js + Express
✅ Base de datos MySQL configurada
✅ Autenticación y permisos implementados
✅ Sistema de liquidaciones funcionando
✅ Gestión de medios de pago con múltiples cajas
✅ Interfaz de usuario completa

FUNCIONALIDADES IMPLEMENTADAS:
------------------------------
✅ CRUD completo de Socios
✅ CRUD completo de Categorías
✅ CRUD completo de Liquidaciones
✅ CRUD completo de Medios de Pago (con múltiples cajas)
✅ CRUD completo de Cajas
✅ Sistema de Pagos
✅ Gestión de Usuarios y Permisos
✅ Sistema de Backup
✅ Tesorería
✅ Envío de WhatsApp
✅ Impresión de reportes

CAMBIOS RECIENTES:
------------------
✅ Medios de pago pueden asociarse a múltiples cajas
✅ Interfaz con checkboxes para selección múltiple
✅ Tabla intermedia medio_pago_cajas creada
✅ Columna tipo_movimiento agregada
✅ Corrección de errores SQL en inserción múltiple

ESTRUCTURA DEL BACKUP:
----------------------
- src/                    → Código fuente del frontend
- server/src/             → Código fuente del backend
- package.json            → Dependencias del proyecto
- *.md                    → Documentación
- *.ps1                   → Scripts de automatización
- *.sql                   → Scripts de base de datos

ARCHIVOS NO INCLUIDOS:
----------------------
- node_modules/           → Se reinstala con npm install
- dist/                   → Se regenera con npm run build
- server/node_modules/    → Se reinstala con npm install
- server/uploads/         → Archivos de producción
- .env                    → Configuración local (no versionar)

PARA RESTAURAR ESTE BACKUP:
---------------------------
1. Copia todos los archivos de vuelta a la carpeta del proyecto
2. Instala dependencias del frontend:
   npm install

3. Instala dependencias del backend:
   cd server
   npm install

4. Crea archivo .env en server/ con tu configuración:
   PORT=4000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=tu_password
   DB_NAME=club_social
   JWT_SECRET=tu_secret_key

5. Inicia el desarrollo:
   npm run dev

NOTAS:
------
- Este backup es del código de DESARROLLO
- No incluye datos de producción
- No incluye node_modules (se reinstalan)
- Verifica que todas las dependencias estén en package.json
"@

if ($Descripcion -ne "") {
    $infoBackup += "`r`n`r`nDESCRIPCION ADICIONAL:`r`n$Descripcion"
}

$infoBackup | Out-File -FilePath (Join-Path $rutaBackup "INFO-BACKUP.txt") -Encoding UTF8

# ============================================
# CREAR LISTA DE ARCHIVOS
# ============================================
Write-Host "Generando lista de archivos..." -ForegroundColor Yellow

$listaArchivos = "LISTA DE ARCHIVOS EN EL BACKUP`r`n"
$listaArchivos += "================================`r`n`r`n"

Get-ChildItem -Path $rutaBackup -Recurse -File | ForEach-Object {
    $rutaRelativa = $_.FullName.Replace($rutaBackup, "").TrimStart('\')
    $tamano = [math]::Round($_.Length / 1KB, 2)
    $listaArchivos += "$rutaRelativa ($tamano KB)`r`n"
}

$listaArchivos | Out-File -FilePath (Join-Path $rutaBackup "LISTA-ARCHIVOS.txt") -Encoding UTF8

# ============================================
# RESUMEN
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKUP COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Calcular tamano
$tamanoTotal = (Get-ChildItem $rutaBackup -Recurse -File | Measure-Object -Property Length -Sum).Sum
$tamanoMB = [math]::Round($tamanoTotal / 1MB, 2)

Write-Host "Ubicacion: $rutaBackup" -ForegroundColor Green
Write-Host "Tamano total: $tamanoMB MB" -ForegroundColor Cyan
Write-Host "Archivos copiados: $copiados" -ForegroundColor Green
if ($omitidos -gt 0) {
    Write-Host "Archivos omitidos: $omitidos" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Estructura del backup:" -ForegroundColor Yellow
Get-ChildItem $rutaBackup -Directory | ForEach-Object {
    $tamanoDir = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  [DIR] $($_.Name) ($([math]::Round($tamanoDir, 2)) MB)" -ForegroundColor White
}
Get-ChildItem $rutaBackup -File | ForEach-Object {
    Write-Host "  📄 $($_.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ Backup de desarrollo creado exitosamente" -ForegroundColor Green
Write-Host ""
Write-Host "Puedes continuar desarrollando nuevas funcionalidades." -ForegroundColor Cyan
Write-Host "Si necesitas restaurar este backup, sigue las instrucciones en INFO-BACKUP.txt" -ForegroundColor Cyan
Write-Host ""

