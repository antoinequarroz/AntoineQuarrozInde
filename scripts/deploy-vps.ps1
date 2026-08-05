param(
  [Parameter(Mandatory = $true)]
  [string]$KeyPath,

  [Parameter(Mandatory = $false)]
  [string]$ServerHost = "179.237.65.71",

  [Parameter(Mandatory = $false)]
  [string]$User = "ubuntu",

  [Parameter(Mandatory = $false)]
  [string]$ProjectDir = "",

  [Parameter(Mandatory = $false)]
  [string]$Branch = "main"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($msg) {
  Write-Host ""
  Write-Host "[DEPLOY] $msg" -ForegroundColor Cyan
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "Key not found: $KeyPath"
}

$remote = "$User@$ServerHost"

if ([string]::IsNullOrWhiteSpace($ProjectDir)) {
  Write-Step "Recherche automatique du dossier projet sur le VPS..."
  $findCmd = "find / -name docker-compose.yml 2>/dev/null"
  $composePaths = & ssh -i $KeyPath $remote $findCmd
  if ($LASTEXITCODE -ne 0) {
    throw "La recherche du projet sur le VPS a échoué."
  }
  if (-not $composePaths) {
    throw "Aucun docker-compose.yml trouvé sur le VPS."
  }

  $candidate = $composePaths |
    Where-Object {
      $_ -notmatch "(?i)backup" -and
      $_ -match "(?i)/antoinequarroz-vitrine/docker-compose\.yml$"
    } |
    Select-Object -First 1

  if (-not $candidate) {
    $candidate = $composePaths | Select-Object -First 1
  }

  # Split-Path converts Linux separators to Windows backslashes. Keep the
  # remote path in POSIX format because it is passed directly to SSH/bash.
  $ProjectDir = $candidate -replace "/docker-compose\.yml$", ""
  Write-Step "Dossier projet détecté: $ProjectDir"
}

Write-Step "Déploiement sur $remote dans $ProjectDir (branche $Branch)"

$remoteScript = @"
set -euo pipefail
cd "$ProjectDir"
test -f docker-compose.yml
test -f .env
git fetch --prune origin
git checkout "$Branch"
git pull --ff-only origin "$Branch"
docker compose up -d --build --remove-orphans
docker compose ps
"@

& ssh -i $KeyPath $remote $remoteScript
if ($LASTEXITCODE -ne 0) {
  throw "Le déploiement distant a échoué."
}

Write-Step "Logs du service web (80 dernières lignes)"
& ssh -i $KeyPath $remote "cd '$ProjectDir' && docker compose logs --tail=80 web"
if ($LASTEXITCODE -ne 0) {
  throw "La lecture des logs du service web a échoué."
}

Write-Host ""
Write-Host "Deploy terminé." -ForegroundColor Green
