# =========================================================================================
# Agnostic Multi-Project Deployer & Branch Sync Utility (Agent Skill Helper)
# =========================================================================================
#
# Propósito: Script genérico de despliegue para cualquier proyecto. Lee la configuración
#           dinámicamente desde 'deploy.config.json'. Si no existe, lo autogenera basándose
#           en el 'package.json' local.
#
# Uso: Ejecutar desde PowerShell en la raíz de cualquier proyecto:
#      .\.agents\deploy-app\scripts\deploy.ps1
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

# --- FASE 1: GESTIÓN DE CONFIGURACIÓN AGNOSTICA ---
$ConfigFile = "deploy.config.json"
$Config = $null

if (!(Test-Path $ConfigFile)) {
    Write-Host "${Yellow}[CONFIG] No se detectó 'deploy.config.json'. Generando configuración por defecto...${Reset}"
    
    # Intentar leer el nombre desde package.json
    $DefaultAppName = "Agnostic Application"
    $DefaultCFProject = "my-agnostic-app"
    if (Test-Path "package.json") {
        try {
            $PackageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
            if ($PackageJson.name) {
                $DefaultAppName = $PackageJson.name
                $DefaultCFProject = $PackageJson.name.ToLower().Replace(" ", "-")
            }
        } catch {
            # Continuar con valores por defecto si falla la lectura
        }
    }

    # Estructura de configuración por defecto
    $DefaultConfig = @{
        projectName = $DefaultAppName
        buildCmd = "npm run build"
        buildDistDir = "dist"
        remote = "origin"
        branches = @{
            dev = "main"
            prod = "prod"
        }
        deployProvider = "cloudflare" # Opciones: cloudflare, custom, none
        cloudflare = @{
            projectName = $DefaultCFProject
        }
        customDeployCmd = "npx wrangler pages deploy dist"
    }

    # Guardar archivo de configuración formateado
    $DefaultConfig | ConvertTo-Json -Depth 5 | Out-File -FilePath $ConfigFile -Encoding utf8
    Write-Host "${Green}[CONFIG] Archivo '$ConfigFile' creado correctamente con valores sugeridos.${Reset}"
}

# Cargar configuración activa
try {
    $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
    Write-Host "${Purple}======================================================================${Reset}"
    Write-Host "${Yellow}    Deployer Genérico: $($Config.projectName)   ${Reset}"
    Write-Host "${Purple}======================================================================${Reset}"
    Write-Host "Configuración cargada desde: $ConfigFile`n"
} catch {
    Write-Host "${Red}[ERROR] Error al parsear el archivo '$ConfigFile'. Verifique su formato JSON.${Reset}"
    Read-Host "Presione Enter para salir..."
    exit 1
}

# --- FASE 2: VALIDACIÓN DE REPOSITORIO GIT ---
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

# Obtener repositorio remoto configurado
$TargetRemote = $Config.remote
$OriginUrl = git remote get-url $TargetRemote 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "${Red}[ERROR] No se encuentra configurado el repositorio remoto '$TargetRemote'.${Reset}"
    Read-Host "Presione Enter para salir..."
    exit 1
}

# Obtener rama activa y configurar ramas
$DevBranch = $Config.branches.dev
$ProdBranch = $Config.branches.prod

$ActiveBranch = git branch --show-current
Write-Host "Rama local activa: ${Yellow}$ActiveBranch${Reset}"
Write-Host "Repositorio remoto ($TargetRemote): ${Yellow}$OriginUrl${Reset}"
Write-Host "Ramas de sincronización: Desarrollo = ${Yellow}$DevBranch${Reset} | Producción = ${Yellow}$ProdBranch${Reset}"

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

# --- FASE 3: SELECCIÓN DE FLUJO DE TRABAJO ---
Write-Host "`n${Cyan}[2/5] Seleccione el Flujo de Despliegue:${Reset}"
Write-Host " [1] Ciclo Completo (Sincronizar Git $DevBranch -> $ProdBranch, Compilar y Desplegar)"
Write-Host " [2] Solo Sincronización Git (Empujar $DevBranch -> Fusionar $ProdBranch -> Empujar $ProdBranch)"
Write-Host " [3] Solo Despliegue Local (Compilar y Desplegar sin modificar Git)"
Write-Host " [4] Cancelar Operación"
Write-Host "----------------------------------------------------------------------"

$Option = Read-Host "Ingrese una opción (1-4)"

if ($Option -eq "4" -or -not $Option) {
    Write-Host "`n${Yellow}[INFO] Operación cancelada por el usuario.${Reset}"
    Read-Host "Presione Enter para salir..."
    exit 0
}

$ExecuteGitSync = ($Option -eq "1" -or $Option -eq "2")
$ExecuteBuildAndDeploy = ($Option -eq "1" -or $Option -eq "3")

# --- FASE 4: FUSIÓN Y SINCRONIZACIÓN DE RAMAS (GIT SYNC) ---
if ($ExecuteGitSync) {
    Write-Host "`n${Cyan}[3/5] Iniciando Flujo de Sincronización de Ramas (Git Sync)...${Reset}"
    
    # 1. Asegurar que estamos en la rama de desarrollo configurada
    if ($ActiveBranch -ne $DevBranch) {
        Write-Host "${Yellow}[Aviso] La sincronización recomendada inicia en la rama de desarrollo '$DevBranch'.${Reset}"
        $SwitchBranch = Read-Host "¿Desea cambiar automáticamente a la rama '$DevBranch' para iniciar? (S/N)"
        if ($SwitchBranch -eq "S" -or $SwitchBranch -eq "s" -or $SwitchBranch -eq "si") {
            git checkout $DevBranch
            if ($LASTEXITCODE -ne 0) {
                Write-Host "${Red}[ERROR] No se pudo cambiar a la rama '$DevBranch'.${Reset}"
                Read-Host "Presione Enter para salir..."
                exit 1
            }
            $ActiveBranch = $DevBranch
        }
    }

    # 2. Empujar cambios de rama dev a origin
    Write-Host "`nEmpujando cambios de '${Yellow}$ActiveBranch${Reset}' hacia $TargetRemote/$DevBranch..."
    git push $TargetRemote $DevBranch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "${Red}[ERROR] Error al empujar cambios a $TargetRemote/$DevBranch.${Reset}"
        Read-Host "Presione Enter para salir..."
        exit 1
    }
    Write-Host "${Green}[ÉXITO] Rama '$DevBranch' sincronizada en $TargetRemote.${Reset}"

    # 3. Checkout a rama prod
    Write-Host "`nCambiando a la rama de producción '${Yellow}$ProdBranch${Reset}'..."
    git checkout $ProdBranch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "${Red}[ERROR] No se pudo cambiar a la rama '$ProdBranch'. Asegúrese de que exista localmente.${Reset}"
        Read-Host "Presione Enter para salir..."
        exit 1
    }

    # 4. Traer últimos cambios de prod
    Write-Host "Sincronizando rama '$ProdBranch' local con $TargetRemote/$ProdBranch..."
    git pull $TargetRemote $ProdBranch 2>$null

    # 5. Fusionar dev en prod
    Write-Host "`nFusionando cambios de '${Yellow}$DevBranch${Reset}' dentro de '${Yellow}$ProdBranch${Reset}'..."
    git merge $DevBranch -m "merge: fusionar avances de $DevBranch a la rama de produccion de forma automatizada"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "${Red}[ERROR] Conflicto detectado durante el merge.${Reset}"
        Write-Host "Por favor resuelva los conflictos manualmente antes de continuar."
        Read-Host "Presione Enter para salir..."
        exit 1
    }
    Write-Host "${Green}[ÉXITO] Fusión completada sin conflictos.${Reset}"

    # 6. Empujar prod a origin
    Write-Host "`nEmpujando rama de producción '${Yellow}$ProdBranch${Reset}' hacia $TargetRemote/$ProdBranch..."
    git push $TargetRemote $ProdBranch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "${Red}[ERROR] Error al empujar cambios a $TargetRemote/$ProdBranch.${Reset}"
        # Regresar a dev por seguridad
        git checkout $DevBranch > $null 2>&1
        Read-Host "Presione Enter para salir..."
        exit 1
    }
    Write-Host "${Green}[ÉXITO] Rama '$ProdBranch' sincronizada en $TargetRemote.${Reset}"
}

# --- FASE 5: COMPILACIÓN DEL PROYECTO ---
if ($ExecuteBuildAndDeploy) {
    Write-Host "`n${Cyan}[4/5] Iniciando Compilación del Proyecto...${Reset}"
    
    if (!(Test-Path "package.json")) {
        Write-Host "${Red}[ERROR] No se encuentra package.json en el directorio del proyecto.${Reset}"
        if ($ExecuteGitSync) { git checkout $DevBranch > $null 2>&1 }
        Read-Host "Presione Enter para salir..."
        exit 1
    }

    $BuildCmd = $Config.buildCmd
    Write-Host "Comando configurado: $BuildCmd"
    Write-Host "----------------------------------------------------------------------"
    $BuildTime = Measure-Command {
        Invoke-Expression $BuildCmd
    }
    $BuildExitCode = $LASTEXITCODE
    Write-Host "----------------------------------------------------------------------"

    if ($BuildExitCode -ne 0) {
        Write-Host "${Red}[ERROR] La compilación falló con código de salida $BuildExitCode.${Reset}"
        if ($ExecuteGitSync) { git checkout $DevBranch > $null 2>&1 }
        Read-Host "Presione Enter para salir..."
        exit 1
    }

    $BuildDuration = [Math]::Round($BuildTime.TotalSeconds, 2)
    Write-Host "${Green}[ÉXITO] Compilación completada en $BuildDuration segundos.${Reset}"

    $DistDir = $Config.buildDistDir
    if (!(Test-Path $DistDir)) {
        Write-Host "${Red}[ERROR] No se encuentra el directorio de distribución '$DistDir' tras la compilación.${Reset}"
        if ($ExecuteGitSync) { git checkout $DevBranch > $null 2>&1 }
        Read-Host "Presione Enter para salir..."
        exit 1
    }
}

# --- FASE 6: DESPLIEGUE AGNOSTICO EN PLATAFORMA ---
if ($ExecuteBuildAndDeploy) {
    $Provider = $Config.deployProvider
    Write-Host "`n${Cyan}[5/5] Iniciando Despliegue (Proveedor: $Provider)...${Reset}"

    if ($Provider -eq "cloudflare") {
        $CFProject = $Config.cloudflare.projectName
        Write-Host "Desplegando en Cloudflare Pages. Proyecto: $CFProject"
        Write-Host "Wrangler utilizará la sesión activa del navegador o la variable CLOUDFLARE_API_TOKEN."

        $UseToken = Read-Host "¿Desea especificar un CLOUDFLARE_API_TOKEN manual? (S/N - Por defecto: N)"
        if ($UseToken -eq "S" -or $UseToken -eq "s" -or $UseToken -eq "si") {
            $Token = Read-Host -AsSecureString "Ingrese su CLOUDFLARE_API_TOKEN (la entrada estará oculta)"
            $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token)
            $PlainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
            $env:CLOUDFLARE_API_TOKEN = $PlainToken
            Write-Host "${Green}[TOKEN] Token cargado al contexto actual.${Reset}"
        }

        Write-Host "`nEjecutando: npx wrangler pages deploy $($Config.buildDistDir) --project-name=$CFProject"
        Write-Host "----------------------------------------------------------------------"
        npx wrangler pages deploy $($Config.buildDistDir) --project-name=$CFProject
        $DeployExitCode = $LASTEXITCODE
        Write-Host "----------------------------------------------------------------------"

        if ($UseToken -eq "S" -or $UseToken -eq "s") {
            $env:CLOUDFLARE_API_TOKEN = $null
        }

    } elseif ($Provider -eq "custom") {
        $CustomCmd = $Config.customDeployCmd
        Write-Host "Ejecutando comando de despliegue personalizado configurado: $CustomCmd"
        Write-Host "----------------------------------------------------------------------"
        Invoke-Expression $CustomCmd
        $DeployExitCode = $LASTEXITCODE
        Write-Host "----------------------------------------------------------------------"

    } else {
        Write-Host "${Yellow}[INFO] No se configuró ningún proveedor de hosting o se seleccionó 'none'. El despliegue ha sido omitido.${Reset}"
        $DeployExitCode = 0
    }

    if ($DeployExitCode -eq 0) {
        Write-Host "`n${Green}======================================================================${Reset}"
        Write-Host "${Green}           ¡PROCESO DE DESPLIEGUE FINALIZADO CON ÉXITO!              ${Reset}"
        Write-Host "${Green}======================================================================${Reset}"
        Write-Host "La versión más reciente de la aplicación ya se encuentra en línea."
    } else {
        Write-Host "`n${Red}[ERROR] El despliegue falló con código $DeployExitCode.${Reset}"
    }
}

# --- FASE FINAL: RETORNO DE SEGURIDAD ---
if ($ExecuteGitSync -and $ActiveBranch -eq $DevBranch) {
    Write-Host "`nRestaurando espacio de trabajo a la rama local '${Yellow}$DevBranch${Reset}'..."
    git checkout $DevBranch > $null 2>&1
    Write-Host "${Green}[VISTO] Espacio de trabajo restaurado a '$DevBranch'.${Reset}"
}

Write-Host "`nProceso finalizado."
Read-Host "Presione Enter para cerrar esta ventana..."
