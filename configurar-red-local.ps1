# Script para configurar acceso desde la red local
# Ejecutar como Administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuracion de Acceso desde Red Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Obtener IP de la red
Write-Host "Obteniendo IP de la red local..." -ForegroundColor Yellow
$interfaces = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }

if ($interfaces.Count -eq 0) {
    Write-Host "ERROR: No se encontraron interfaces de red." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Interfaces de red encontradas:" -ForegroundColor Green
$ipSeleccionada = $null
$index = 1
$ips = @()

foreach ($interface in $interfaces) {
    $adapter = Get-NetAdapter | Where-Object { $_.InterfaceIndex -eq $interface.InterfaceIndex }
    $ip = $interface.IPAddress
    $ips += $ip
    Write-Host "  [$index] $($adapter.Name): $ip" -ForegroundColor White
    $index++
}

if ($ips.Count -eq 1) {
    $ipSeleccionada = $ips[0]
    Write-Host ""
    Write-Host "Usando IP: $ipSeleccionada" -ForegroundColor Green
} else {
    Write-Host ""
    $opcion = Read-Host "Selecciona el numero de la interfaz a usar (1-$($ips.Count))"
    if ($opcion -match '^\d+$' -and [int]$opcion -ge 1 -and [int]$opcion -le $ips.Count) {
        $ipSeleccionada = $ips[[int]$opcion - 1]
        Write-Host "IP seleccionada: $ipSeleccionada" -ForegroundColor Green
    } else {
        Write-Host "Opcion invalida. Usando la primera IP: $($ips[0])" -ForegroundColor Yellow
        $ipSeleccionada = $ips[0]
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configurando Firewall..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Verificar si ya existen las reglas
$reglaBackend = Get-NetFirewallRule -DisplayName "Club Social Backend" -ErrorAction SilentlyContinue
$reglaFrontend = Get-NetFirewallRule -DisplayName "Club Social Frontend" -ErrorAction SilentlyContinue

# Crear regla para Backend (puerto 4000)
if (-not $reglaBackend) {
    try {
        New-NetFirewallRule -DisplayName "Club Social Backend" `
            -Direction Inbound `
            -LocalPort 4000 `
            -Protocol TCP `
            -Action Allow `
            -Description "Permite acceso al backend del Club Social desde la red local" | Out-Null
        Write-Host "  [OK] Regla de firewall creada para Backend (puerto 4000)" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] No se pudo crear la regla de firewall para Backend" -ForegroundColor Red
        Write-Host "          Asegurate de ejecutar este script como Administrador" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [INFO] Regla de firewall para Backend ya existe" -ForegroundColor Yellow
}

# Crear regla para Frontend (puerto 5173)
if (-not $reglaFrontend) {
    try {
        New-NetFirewallRule -DisplayName "Club Social Frontend" `
            -Direction Inbound `
            -LocalPort 5173 `
            -Protocol TCP `
            -Action Allow `
            -Description "Permite acceso al frontend del Club Social desde la red local" | Out-Null
        Write-Host "  [OK] Regla de firewall creada para Frontend (puerto 5173)" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] No se pudo crear la regla de firewall para Frontend" -ForegroundColor Red
        Write-Host "          Asegurate de ejecutar este script como Administrador" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [INFO] Regla de firewall para Frontend ya existe" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuracion Completada" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IP del servidor: $ipSeleccionada" -ForegroundColor Green
Write-Host ""
Write-Host "URLs de acceso:" -ForegroundColor Yellow
Write-Host "  - Backend:  http://$ipSeleccionada`:4000/api" -ForegroundColor White
Write-Host "  - Frontend: http://$ipSeleccionada`:5173" -ForegroundColor White
Write-Host ""
Write-Host "Para acceder desde otra PC en la red:" -ForegroundColor Yellow
Write-Host "  1. Crea un archivo .env en la raiz del proyecto con:" -ForegroundColor White
Write-Host "     VITE_API_URL=http://$ipSeleccionada`:4000/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Reinicia el servidor de desarrollo:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Desde otra PC, abre en el navegador:" -ForegroundColor White
Write-Host "     http://$ipSeleccionada`:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan


