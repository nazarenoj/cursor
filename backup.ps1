# Script de Respaldo para el Proyecto
# Este script crea una copia de seguridad de todos los archivos del proyecto

$fecha = Get-Date -Format "yyyy-MM-dd"
$version = "v2.0.0"
$nombreBackup = "Sistema-Gestion-Socios-$version-$fecha"
$rutaProyecto = "C:\Users\jnazareno\Desktop\Cursor"
$rutaBackup = "C:\Users\jnazareno\Desktop\$nombreBackup"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CREANDO CHECKPOINT DEL PROYECTO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe la carpeta del proyecto
if (-not (Test-Path $rutaProyecto)) {
    Write-Host "ERROR: No se encuentra la carpeta del proyecto" -ForegroundColor Red
    exit 1
}

Write-Host "Proyecto encontrado en: $rutaProyecto" -ForegroundColor Green
Write-Host "Creando backup en: $rutaBackup" -ForegroundColor Yellow
Write-Host ""

# Crear carpeta de backup
New-Item -ItemType Directory -Path $rutaBackup -Force | Out-Null

# Copiar archivos (excluyendo node_modules)
Write-Host "Copiando archivos..." -ForegroundColor Yellow

$archivosACopiar = @(
    "src",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.node.json",
    "vite.config.ts",
    ".gitignore",
    ".eslintrc.cjs",
    "index.html",
    "README.md",
    "CHECKPOINT.md",
    "backup-checklist.txt"
)

foreach ($archivo in $archivosACopiar) {
    $rutaOrigen = Join-Path $rutaProyecto $archivo
    if (Test-Path $rutaOrigen) {
        Copy-Item -Path $rutaOrigen -Destination $rutaBackup -Recurse -Force
        Write-Host "  OK Copiado: $archivo" -ForegroundColor Green
    } else {
        Write-Host "  ADVERTENCIA: No encontrado: $archivo" -ForegroundColor Yellow
    }
}

# Crear archivo de informacion del backup
$infoBackup = "CHECKPOINT DEL PROYECTO`r`n"
$infoBackup += "========================`r`n"
$infoBackup += "Fecha: $fecha`r`n"
$infoBackup += "Version: 1.0.0`r`n"
$infoBackup += "Proyecto: Sistema de Gestion de Socios`r`n`r`n"
$infoBackup += "ESTADO: Proyecto completo y funcional`r`n`r`n"
$infoBackup += "FUNCIONALIDADES:`r`n"
$infoBackup += "  - CRUD completo para Socios`r`n"
$infoBackup += "  - CRUD completo para Categorias`r`n"
$infoBackup += "  - Filtros de busqueda avanzados`r`n"
$infoBackup += "  - Funcionalidad de impresion`r`n"
$infoBackup += "  - Navegacion entre secciones`r`n"
$infoBackup += "  - Validacion de formularios`r`n"
$infoBackup += "  - Diseno responsive`r`n`r`n"
$infoBackup += "NOTA: Este backup NO incluye node_modules`r`n"
$infoBackup += "Para restaurar: Ejecutar npm install despues de restaurar los archivos`r`n"

$infoBackup | Out-File -FilePath (Join-Path $rutaBackup "BACKUP-INFO.txt") -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CHECKPOINT CREADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ubicacion del backup: $rutaBackup" -ForegroundColor Green
Write-Host ""
Write-Host "Para restaurar este backup:" -ForegroundColor Yellow
Write-Host "1. Copia los archivos de vuelta a la carpeta del proyecto" -ForegroundColor White
Write-Host "2. Ejecuta: npm install" -ForegroundColor White
Write-Host "3. Ejecuta: npm run dev" -ForegroundColor White
Write-Host ""
