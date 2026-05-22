# =========================================================================================
# dShopping Lite - Script de Despliegue Automatizado para Cloudflare Pages
# =========================================================================================
#
# Propósito: Automatizar la compilación de producción y el despliegue interactivo del
#           frontend Vite hacia Cloudflare Pages de forma segura y robusta.
#
# Requisitos: Node.js (v18+), npm, y acceso a internet.
# Ejecución: En PowerShell: .\scripts\deploy.ps1
#
# =========================================================================================

# Configurar codificación para evitar caracteres rotos
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Clear-Host

# Colores y cabecera estética
$Purple = "[38;5;129m"
$Yellow = "[38;5;220m"
$Cyan   = "[38;5;51m"
$Green  = "[38;5;46m"
$Red    = "[38;5;196m"
$Reset  = "[0m"

Write-Host "${Purple}======================================================================${Reset}"
Write-Host "${Yellow}         dShopping Lite - Cloudflare Pages Deployer Utility          ${Reset}"
Write-Host "${Purple}======================================================================${Reset}"
Write-Host "Iniciando proceso de validación y compilación para el entorno local...`n"

# 1. Verificar existencia de dependencias
if (!(Test-Path "package.json")) {
    Write-Host "${Red}[ERROR] No se encuentra package.json en el directorio actual.${Reset}"
    Write-Host "Por favor, ejecute este script desde la raíz del proyecto dShopping Lite."
    Read-Host "Presione Enter para salir..."
    exit 1
}

# 2. Confirmación inicial del usuario
$Confirm = Read-Host "¿Desea iniciar la compilación y el despliegue en Cloudflare Pages? (S/N)"
if ($Confirm -ne "S" -and $Confirm -ne "s" -and $Confirm -ne "si" -and $Confirm -ne "SI") {
    Write-Host "`n${Yellow}[INFO] Operación cancelada por el usuario.${Reset}"
    Read-Host "Presione Enter para salir..."
    exit 0
}

# 3. Limpiar y reconstruir dist/
Write-Host "`n${Cyan}[1/4] Ejecutando análisis de tipado y compilación de producción...${Reset}"
Write-Host "Comando: npm run build"
Write-Host "----------------------------------------------------------------------"

# Ejecutar compilación y capturar estado
$BuildTime = Measure-Command {
    npm run build
}
$BuildExitCode = $LASTEXITCODE

Write-Host "----------------------------------------------------------------------"

if ($BuildExitCode -ne 0) {
    Write-Host "${Red}[ERROR] La compilación (npm run build) falló con código de salida $BuildExitCode.${Reset}"
    Write-Host "Por favor revise los errores de TypeScript o configuración antes de reintentar."
    Read-Host "Presione Enter para salir..."
    exit 1
}

$BuildDuration = [Math]::Round($BuildTime.TotalSeconds, 2)
Write-Host "${Green}[ÉXITO] Compilación exitosa en $BuildDuration segundos.${Reset}"

# 4. Validar existencia del directorio dist
if (!(Test-Path "dist")) {
    Write-Host "${Red}[ERROR] No se generó la carpeta de distribución 'dist'.${Reset}"
    Read-Host "Presione Enter para salir..."
    exit 1
}

Write-Host "${Green}[VISTO] Carpeta de distribución 'dist/' lista para desplegar.${Reset}"

# 5. Configurar método de autenticación Wrangler
Write-Host "`n${Cyan}[2/4] Preparando entorno de autenticación Cloudflare...${Reset}"
Write-Host "Wrangler requiere iniciar sesión. Si ya tiene una sesión web activa o una variable"
Write-Host "de entorno CLOUDFLARE_API_TOKEN configurada, el despliegue continuará de forma automática."
Write-Host "De lo contrario, Wrangler abrirá una ventana de navegador web para autenticar."

# Consultar si desea ingresar un token de API
$UseToken = Read-Host "¿Desea especificar un CLOUDFLARE_API_TOKEN manual ahora mismo? (S/N - Por defecto: N)"
if ($UseToken -eq "S" -or $UseToken -eq "s" -or $UseToken -eq "si") {
    $Token = Read-Host -AsSecureString "Ingrese su CLOUDFLARE_API_TOKEN (la entrada estará oculta)"
    # Convertir SecureString a texto plano para la sesión de proceso
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token)
    $PlainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    $env:CLOUDFLARE_API_TOKEN = $PlainToken
    Write-Host "${Green}[TOKEN] Token de API cargado en el contexto actual del proceso.${Reset}"
}

# 6. Ejecutar despliegue interactivo con Wrangler
Write-Host "`n${Cyan}[3/4] Iniciando despliegue de la carpeta 'dist' mediante Wrangler...${Reset}"
Write-Host "Comando: npx wrangler pages deploy dist"
Write-Host "----------------------------------------------------------------------"

npx wrangler pages deploy dist

$DeployExitCode = $LASTEXITCODE
Write-Host "----------------------------------------------------------------------"

# Limpiar token del proceso por seguridad si se ingresó
if ($UseToken -eq "S" -or $UseToken -eq "s") {
    $env:CLOUDFLARE_API_TOKEN = $null
}

# 7. Resumen de resultados
if ($DeployExitCode -eq 0) {
    Write-Host "`n${Green}======================================================================${Reset}"
    Write-Host "${Green}           ¡DESPLIEGUE COMPLETADO CON ÉXITO EN CLOUDFLARE!            ${Reset}"
    Write-Host "${Green}======================================================================${Reset}"
    Write-Host "La versión de producción de dShopping Lite ya se encuentra en línea."
    Write-Host "Puede consultar su URL de producción asignada en la salida superior de Wrangler."
} else {
    Write-Host "`n${Red}======================================================================${Reset}"
    Write-Host "${Red}                   EL DESPLIEGUE HA FALLADO                           ${Reset}"
    Write-Host "${Red}======================================================================${Reset}"
    Write-Host "Código de salida: $DeployExitCode"
    Write-Host "Posibles causas:"
    Write-Host "1. Falta de autenticación en Wrangler (no aprobó la redirección del navegador)."
    Write-Host "2. No existe el proyecto de Pages en Cloudflare (debe crearlo en el Dashboard o seguir las instrucciones)."
    Write-Host "3. Problemas de conexión de red o permisos del token de API."
}

Write-Host "`nProceso finalizado."
Read-Host "Presione Enter para cerrar esta ventana..."
