# =========================================================================================
# Utility: Script de Despliegue Genérico y Gestión de Ramas (Git Sync + Build)
# =========================================================================================
#
# Propósito: Automatizar el ciclo de vida completo de despliegue sincronizando las ramas
#           'main' y 'prod' en el repositorio 'origin', compilando el bundle de producción
#           e implementando en la plataforma de hosting (Cloudflare Pages u otra).
#
# Uso: Ejecutar desde PowerShell en la raíz del proyecto:
#      .\scripts\deploy.ps1
#
# =========================================================================================

# Configurar codificación para evitar caracteres rotos
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Clear-Host

# Colores y cabecera estética
$Purple = " [38;5;129m"
$Yellow = " [38;5;220m"
$Cyan   = " [38;5;51m"
$Green  = " [38;5;46m"
$Red    = " [38;5;196m"
$Reset  = " [0m"

Write-Host "${Purple}======================================================================${Reset}"
Write-Host "${Yellow}         Utility: Desplegador Genérico y Sincronizador de Ramas        ${Reset}"
Write-Host "${Purple}======================================================================${Reset}"

# --- FASE 1: VALIDACIÓN DE REPOSITORIO GIT ---
Write-Host "${Cyan}[1/5] Validando entorno Git...${Reset}"

# Verificar si git está instalado
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "${Red}[ERROR] Git no está instalado o no se encuentra en el PATH de Windows.${Reset}"
    Read-Host "Presione Enter para salir..."
    exit 1
}

# Verificar si estamos en un repositorio de git
git rev-parse --is-inside-work-tree > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "${Red}[ERROR] Este directorio no es un repositorio Git activo.${Reset}"
    Read-Host "Presione Enter para salir..."
    exit 1
}

# Obtener repositorio remoto 'origin'
$OriginUrl = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "${Red}[ERROR] No se encuentra configurado el repositorio remoto 'origin'.${Reset}"
    Read-Host "Presione Enter para salir..."
    exit 1
}

# Obtener rama activa
$ActiveBranch = git branch --show-current
Write-Host "Rama local activa: ${Yellow}$ActiveBranch${Reset}"
Write-Host "Repositorio remoto (origin): ${Yellow}$OriginUrl${Reset}"

# Verificar si hay cambios locales pendientes
$GitStatus = git status --porcelain
if ($GitStatus) {
    Write-Host "`n${Yellow}[ADVERTENCIA] Tienes cambios locales pendientes de confirmación:${Reset}"
    git status -s
    $ProceedGit = Read-Host "¿Deseas continuar con el despliegue de todas formas? (S/N)"
    if ($ProceedGit -ne "S" -and $ProceedGit -ne "s" -and $ProceedGit -ne "si" -and $ProceedGit -ne "SI") {
        Write-Host "${Yellow}[INFO] Operación cancelada para resguardar tus cambios locales.${Reset}"
        Read-Host "Presione Enter para salir..."
        exit 0
    }
}

# --- FASE 2: SELECCIÓN DE FLUJO DE TRABAJO ---
Write-Host "`n${Cyan}[2/5] Seleccione el Flujo de Despliegue:${Reset}"
Write-Host " [1] Ciclo Completo (Sincronizar Git main -> prod, Compilar y Desplegar)"
Write-Host " [2] Solo Sincronización Git (Empujar main -> Fusionar prod -> Empujar prod)"
Write-Host " [3] Solo Despliegue Local (Compilar y Desplegar sin modificar Git)"
Write-Host " [4] Cancelar Operación"
Write-Host "----------------------------------------------------------------------"

$Option = Read-Host "Ingrese una opción (1-4)"

if ($Option -eq "4" -or -not $Option) {
    Write-Host "`n${Yellow}[INFO] Operación cancelada por el usuario.${Reset}"
    Read-Host "Presione Enter para salir..."
    exit 0
}

# --- FASE 3: SINOPSIS Y EJECUCIÓN GIT ---
$ExecuteGitSync = ($Option -eq "1" -or $Option -eq "2")
$ExecuteBuildAndDeploy = ($Option -eq "1" -or $Option -eq "3")

if ($ExecuteGitSync) {
    Write-Host "`n${Cyan}[3/5] Iniciando Flujo de Sincronización de Ramas (Git Sync)...${Reset}"
    
    # 1. Asegurar que estamos en main o pedir confirmación
    if ($ActiveBranch -ne "main") {
        Write-Host "${Yellow}[Aviso] La sincronización recomendada inicia en la rama 'main'.${Reset}"
        $SwitchBranch = Read-Host "¿Desea cambiar automáticamente a la rama 'main' para iniciar? (S/N)"
        if ($SwitchBranch -eq "S" -or $SwitchBranch -eq "s" -or $SwitchBranch -eq "si") {
            git checkout main
            if ($LASTEXITCODE -ne 0) {
                Write-Host "${Red}[ERROR] No se pudo cambiar a la rama 'main'.${Reset}"
                Read-Host "Presione Enter para salir..."
                exit 1
            }
            $ActiveBranch = "main"
        }
    }

    # 2. Empujar cambios de main a origin
    Write-Host "`nEmpujando cambios de la rama '${Yellow}$ActiveBranch${Reset}' hacia origin/main..."
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "${Red}[ERROR] Error al empujar cambios a origin/main.${Reset}"
        Read-Host "Presione Enter para salir..."
        exit 1
    }
    Write-Host "${Green}[ÉXITO] Rama '$ActiveBranch' sincronizada en origin.${Reset}"

    # 3. Checkout a prod
    Write-Host "`nCambiando a la rama de producción '${Yellow}prod${Reset}'..."
    git checkout prod
    if ($LASTEXITCODE -ne 0) {
        Write-Host "${Red}[ERROR] No se pudo cambiar a la rama 'prod'. Asegúrese de que exista localmente.${Reset}"
        Read-Host "Presione Enter para salir..."
        exit 1
    }

    # 4. Traer últimos cambios de prod
    Write-Host "Sincronizando rama 'prod' local con origin/prod..."
    git pull origin prod 2>$null

    # 5. Fusionar main en prod
    Write-Host "`nFusionando cambios de '${Yellow}main${Reset}' dentro de '${Yellow}prod${Reset}'..."
    git merge main -m "merge: fusionar avances de main a la rama de produccion de forma automatizada"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "${Red}[ERROR] Conflicto detectado durante el merge.${Reset}"
        Write-Host "Por favor resuelva los conflictos manualmente antes de continuar."
        Read-Host "Presione Enter para salir..."
        exit 1
    }
    Write-Host "${Green}[ÉXITO] Fusión completada sin conflictos.${Reset}"

    # 6. Empujar prod a origin
    Write-Host "`nEmpujando rama de producción '${Yellow}prod${Reset}' hacia origin/prod..."
    git push origin prod
    if ($LASTEXITCODE -ne 0) {
        Write-Host "${Red}[ERROR] Error al empujar cambios a origin/prod.${Reset}"
        # Regresar a main por seguridad
        git checkout main > $null 2>&1
        Read-Host "Presione Enter para salir..."
        exit 1
    }
    Write-Host "${Green}[ÉXITO] Rama 'prod' sincronizada en origin.${Reset}"
}

# --- FASE 4: COMPILACIÓN DEL PROYECTO ---
if ($ExecuteBuildAndDeploy) {
    Write-Host "`n${Cyan}[4/5] Iniciando Compilación del Bundle de Producción...${Reset}"
    
    if (!(Test-Path "package.json")) {
        Write-Host "${Red}[ERROR] No se encuentra package.json en el directorio actual.${Reset}"
        # Regresar a main si veníamos de sync git
        if ($ExecuteGitSync) { git checkout main > $null 2>&1 }
        Read-Host "Presione Enter para salir..."
        exit 1
    }

    Write-Host "Comando: npm run build"
    Write-Host "----------------------------------------------------------------------"
    $BuildTime = Measure-Command {
        npm run build
    }
    $BuildExitCode = $LASTEXITCODE
    Write-Host "----------------------------------------------------------------------"

    if ($BuildExitCode -ne 0) {
        Write-Host "${Red}[ERROR] La compilación (npm run build) falló con código de salida $BuildExitCode.${Reset}"
        if ($ExecuteGitSync) { git checkout main > $null 2>&1 }
        Read-Host "Presione Enter para salir..."
        exit 1
    }

    $BuildDuration = [Math]::Round($BuildTime.TotalSeconds, 2)
    Write-Host "${Green}[ÉXITO] Compilación completada con éxito en $BuildDuration segundos.${Reset}"

    if (!(Test-Path "dist")) {
        Write-Host "${Red}[ERROR] No se generó la carpeta de distribución 'dist'.${Reset}"
        if ($ExecuteGitSync) { git checkout main > $null 2>&1 }
        Read-Host "Presione Enter para salir..."
        exit 1
    }
}

# --- FASE 5: DESPLIEGUE FINAL (Hacia Plataforma de Hosting) ---
if ($ExecuteBuildAndDeploy) {
    Write-Host "`n${Cyan}[5/5] Iniciando Despliegue en Cloudflare Pages...${Reset}"
    Write-Host "Wrangler utilizará la sesión activa del navegador o la variable CLOUDFLARE_API_TOKEN."

    # Consultar si desea ingresar un token de API
    $UseToken = Read-Host "¿Desea especificar un CLOUDFLARE_API_TOKEN manual? (S/N - Por defecto: N)"
    if ($UseToken -eq "S" -or $UseToken -eq "s" -or $UseToken -eq "si") {
        $Token = Read-Host -AsSecureString "Ingrese su CLOUDFLARE_API_TOKEN (la entrada estará oculta)"
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token)
        $PlainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        $env:CLOUDFLARE_API_TOKEN = $PlainToken
        Write-Host "${Green}[TOKEN] Token cargado al contexto actual.${Reset}"
    }

    Write-Host "`nEjecutando: npx wrangler pages deploy dist"
    Write-Host "----------------------------------------------------------------------"
    
    npx wrangler pages deploy dist
    $DeployExitCode = $LASTEXITCODE
    
    Write-Host "----------------------------------------------------------------------"

    # Limpiar token
    if ($UseToken -eq "S" -or $UseToken -eq "s") {
        $env:CLOUDFLARE_API_TOKEN = $null
    }

    if ($DeployExitCode -eq 0) {
        Write-Host "`n${Green}======================================================================${Reset}"
        Write-Host "${Green}           ¡PROCESO DE DESPLIEGUE FINALIZADO CON ÉXITO!              ${Reset}"
        Write-Host "${Green}======================================================================${Reset}"
        Write-Host "La versión más reciente de la aplicación ya está disponible en la nube."
    } else {
        Write-Host "`n${Red}[ERROR] El despliegue de Wrangler falló con código $DeployExitCode.${Reset}"
    }
}

# --- FASE FINAL: RETORNO DE SEGURIDAD ---
if ($ExecuteGitSync -and $ActiveBranch -eq "main") {
    Write-Host "`nRestaurando espacio de trabajo a la rama local '${Yellow}main${Reset}'..."
    git checkout main > $null 2>&1
    Write-Host "${Green}[VISTO] Espacio de trabajo restaurado a 'main'.${Reset}"
}

Write-Host "`nProceso finalizado."
Read-Host "Presione Enter para cerrar esta ventana..."
