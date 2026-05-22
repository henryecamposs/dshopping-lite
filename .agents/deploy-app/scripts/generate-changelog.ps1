    [string]$TargetFile = "CHANGELOG.md",
    [string]$FromRef = "HEAD~1",
    [string]$ToRef = "HEAD",
    [string]$Version = "",
    [string]$ReleaseName = ""
)

# Verifica si git está disponible
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git no está instalado o no está en el PATH."
    exit 1
}

# Intenta obtener el último tag si FromRef es el predeterminado
if ($FromRef -eq "HEAD~1") {
    $lastTag = git describe --tags --abbrev=0 2>$null
    if ($lastTag) {
        $FromRef = $lastTag
    }
}

Write-Host "Generando changelog desde $FromRef hasta $ToRef..."

# Obtiene los logs de git entre referencias
$logs = git log "$($FromRef)..$($ToRef)" --pretty=format:"%s"

if (-not $logs) {
    Write-Host "No se encontraron cambios entre $FromRef y $ToRef."
    exit 0
}

$added = @()
$fixed = @()
$changed = @()
$breaking = @()

foreach ($line in $logs) {
    if ($line -match "^feat(\(.*\))?!?:") {
        $added += $line -replace "^feat(\(.*\))?!?:", "-"
    } elseif ($line -match "^fix(\(.*\))?!?:") {
        $fixed += $line -replace "^fix(\(.*\))?!?:", "-"
    } elseif ($line -match "^refactor(\(.*\))?!?:|^perf(\(.*\))?!?:|^style(\(.*\))?!?:") {
        $changed += $line -replace "^(refactor|perf|style)(\(.*\))?!?:", "-"
    }
    
    if ($line -match "!") {
        $breaking += $line
    }
}

# Prepara la nueva sección
$date = Get-Date -Format "yyyy-MM-dd"

if ($Version -eq "") {
    $Version = (Get-Content package.json | ConvertFrom-Json).version
}

$headerTitle = "[$date] - v$Version"
if ($ReleaseName -ne "") {
    $headerTitle += " ($ReleaseName)"
}

$newSection = "## $headerTitle`n"

if ($breaking.Count -gt 0) {
    $newSection += "### BREAKING CHANGES`n"
    foreach ($item in $breaking) { $newSection += "$item`n" }
    $newSection += "`n"
}

if ($added.Count -gt 0) {
    $newSection += "### Added`n"
    foreach ($item in $added) { $newSection += "$item`n" }
    $newSection += "`n"
}

if ($fixed.Count -gt 0) {
    $newSection += "### Fixed`n"
    foreach ($item in $fixed) { $newSection += "$item`n" }
    $newSection += "`n"
}

if ($changed.Count -gt 0) {
    $newSection += "### Changed`n"
    foreach ($item in $changed) { $newSection += "$item`n" }
    $newSection += "`n"
}

# Actualiza el archivo CHANGELOG.md existente
if (Test-Path $TargetFile) {
    $content = Get-Content $TargetFile -Raw
    if ($content -match "## \[Unreleased\]") {
        # Actualiza la sección Unreleased existente
        $content = $content -replace "## \[Unreleased\].*?(?=\n##|$)", $newSection
    } else {
        # Inserta después del encabezado principal
        $content = $content -replace "(?<=# Changelog\n.*?\n)", "`n$newSection"
    }
    Set-Content $TargetFile $content
} else {
    $header = "# Changelog`n`n"
    Set-Content $TargetFile ($header + $newSection)
}

Write-Host "CHANGELOG.md actualizado con éxito."
