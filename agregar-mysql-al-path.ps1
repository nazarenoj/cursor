# Script para agregar MySQL al PATH de Windows
# Ejecutar como Administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AGREGAR MYSQL AL PATH DE WINDOWS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ruta común de MySQL (ajustar según tu instalación)
$rutaMySQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin"

# Verificar si la ruta existe
if (-not (Test-Path $rutaMySQL)) {
    Write-Host "ERROR: No se encontró MySQL en: $rutaMySQL" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, indica la ruta correcta de MySQL:" -ForegroundColor Yellow
    $rutaMySQL = Read-Host "Ruta completa de la carpeta bin de MySQL (ej: C:\Program Files\MySQL\MySQL Server 8.0\bin)"
    
    if (-not (Test-Path $rutaMySQL)) {
        Write-Host "ERROR: La ruta especificada no existe" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Ruta de MySQL encontrada: $rutaMySQL" -ForegroundColor Green
Write-Host ""

# Obtener el PATH actual del sistema
$pathActual = [Environment]::GetEnvironmentVariable("Path", "Machine")

# Verificar si ya está en el PATH
if ($pathActual -like "*$rutaMySQL*") {
    Write-Host "MySQL ya está en el PATH del sistema" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "¿Deseas continuar de todas formas? (S/N)" -ForegroundColor Yellow
    $continuar = Read-Host
    if ($continuar -ne "S" -and $continuar -ne "s") {
        Write-Host "Operación cancelada" -ForegroundColor Yellow
        exit 0
    }
}

# Agregar al PATH del sistema
try {
    $nuevoPath = $pathActual
    if ($nuevoPath -notlike "*$rutaMySQL*") {
        $nuevoPath = "$nuevoPath;$rutaMySQL"
        [Environment]::SetEnvironmentVariable("Path", $nuevoPath, "Machine")
        Write-Host "MySQL agregado al PATH del sistema exitosamente" -ForegroundColor Green
    } else {
        Write-Host "MySQL ya estaba en el PATH" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "IMPORTANTE:" -ForegroundColor Cyan
    Write-Host "1. Cierra y vuelve a abrir todas las ventanas de PowerShell/CMD" -ForegroundColor Yellow
    Write-Host "2. O reinicia el servidor Node.js para que tome el nuevo PATH" -ForegroundColor Yellow
    Write-Host "3. Verifica con: mysql --version" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host "ERROR: No se pudo agregar MySQL al PATH" -ForegroundColor Red
    Write-Host "Asegúrate de ejecutar este script como Administrador" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PROCESO COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan


