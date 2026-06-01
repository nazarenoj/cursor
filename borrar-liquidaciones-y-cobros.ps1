# =============================================================================
# Script para BORRAR liquidaciones, cobros y TODOS los movimientos de caja
# en la base de datos de PRODUCCION. Pone las cajas a saldo inicial 0.
# =============================================================================
# Ejecutar en el SERVIDOR de produccion, en PowerShell (como administrador
# si hace falta para acceder a MySQL).
#
# Este script:
#   1. Recuerda hacer backup antes.
#   2. Pide confirmacion antes de ejecutar.
#   3. Ejecuta el SQL que borra: todos los movimientos_cajas, liquidaciones_cuotas,
#      liquidaciones_mensuales, y pone saldo_inicial de cajas en 0.
# =============================================================================

$ErrorActionPreference = "Stop"

# Ruta del script SQL (misma carpeta que este .ps1)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile   = Join-Path $scriptDir "borrar-liquidaciones-y-cobros.sql"

# Ajustar si tu instalacion de MySQL esta en otra ruta
$mysqlBin  = "C:\Program Files\MySQL\MySQL Server 8.0\bin"
$mysqlExe  = Join-Path $mysqlBin "mysql.exe"
$dbName    = "club_social"
$backupDir = "C:\backups"

Write-Host ""
Write-Host "=== BORRAR LIQUIDACIONES, COBROS Y MOVIMIENTOS DE CAJA - Produccion ===" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $sqlFile)) {
    Write-Host "Error: No se encuentra el archivo SQL:" $sqlFile -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $mysqlExe)) {
    Write-Host "Error: No se encuentra MySQL en:" $mysqlExe -ForegroundColor Red
    Write-Host "Ajusta la variable mysqlBin en este script si MySQL esta en otra ruta." -ForegroundColor Gray
    exit 1
}

Write-Host "1. BACKUP OBLIGATORIO" -ForegroundColor Cyan
Write-Host "   Antes de continuar, hace backup de la base de datos."
Write-Host "   Ejemplo (ejecutar en PowerShell):"
Write-Host "   cd" $mysqlBin -ForegroundColor Gray
$backupExample = Join-Path $backupDir ("backup-antes-borrar-liquidaciones-" + (Get-Date -Format "yyyyMMdd-HHmm") + ".sql")
Write-Host "   .\mysqldump.exe -u root -p" $dbName ">" $backupExample -ForegroundColor Gray
Write-Host ""

$backupOk = Read-Host "Ya hiciste el backup de la base de datos? (escribe SI en mayusculas para continuar)"
if ($backupOk -ne "SI") {
    Write-Host "Ejecuta el backup primero y volve a correr este script." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "2. CONFIRMACION" -ForegroundColor Cyan
Write-Host "   Se van a BORRAR:"
Write-Host "   - TODOS los movimientos de caja (movimientos_cajas)"
Write-Host "   - Todas las cuotas de liquidacion (liquidaciones_cuotas)"
Write-Host "   - Todas las liquidaciones mensuales (liquidaciones_mensuales)"
Write-Host "   - Saldo inicial de todas las cajas se pondra en 0"
Write-Host ""
Write-Host "   NO se borran: socios, categorias, usuarios, definicion de cajas ni medios de pago." -ForegroundColor Green
Write-Host ""

$confirmar = Read-Host "Estas seguro? Escribi BORRAR para ejecutar"
if ($confirmar -ne "BORRAR") {
    Write-Host "Cancelado. No se modifico la base de datos." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Ejecutando script SQL..." -ForegroundColor Yellow

# Ruta del SQL con barras normales (MySQL acepta asi en source)
$sqlPath = (Resolve-Path $sqlFile).Path -replace '\\', '/'

try {
    & $mysqlExe -u root -p $dbName -e "source $sqlPath"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error al ejecutar MySQL. Revisa usuario/contrasena y que la base" $dbName "exista." -ForegroundColor Red
        exit 1
    }
    Write-Host "Listo. Liquidaciones, cobros, movimientos de caja borrados; cajas a 0." -ForegroundColor Green
} catch {
    $errMsg = $_.Exception.Message
    Write-Host "Error:" $errMsg -ForegroundColor Red
    exit 1
}

Write-Host ""
