param(
  [Parameter(Mandatory = $false)]
  [string]$CommitMessage = "",

  [Parameter(Mandatory = $false)]
  [string]$KeyPath = "",

  [Parameter(Mandatory = $false)]
  [string]$ServerHost = "179.237.65.71",

  [Parameter(Mandatory = $false)]
  [string]$User = "ubuntu",

  [Parameter(Mandatory = $false)]
  [string]$ProjectDir = "/home/ubuntu/antoinequarroz-vitrine",

  [Parameter(Mandatory = $false)]
  [string]$Branch = "main"

  ,
  [Parameter(Mandatory = $false)]
  [switch]$AllowPortfolioChanges
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($msg) {
  Write-Host ""
  Write-Host "[SHIP] $msg" -ForegroundColor Cyan
}

function Resolve-KeyPath([string]$InputPath) {
  if (-not [string]::IsNullOrWhiteSpace($InputPath) -and (Test-Path -LiteralPath $InputPath)) {
    return $InputPath
  }

  $downloadsDir = Join-Path $HOME "Downloads"
  $candidate = Get-ChildItem -Path $downloadsDir -File -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -like "*VPSAntoineQuarroz*.txt" -or
      $_.Name -like "*VPS*Antoine*Quarroz*.txt"
    } |
    Select-Object -First 1

  if ($candidate) {
    Write-Step "Cle detectee automatiquement: $($candidate.FullName)"
    return $candidate.FullName
  }

  throw "Key not found. Use -KeyPath or place your key in $downloadsDir"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$ResolvedKeyPath = Resolve-KeyPath $KeyPath

Write-Step "Verification du depot git local"
git rev-parse --is-inside-work-tree | Out-Null

Write-Step "Ajout des fichiers (git add .)"
git add .

$stagedFiles = @(git diff --cached --name-only)
$protectedPortfolioFiles = @(
  "app/assets/css/main.css",
  "app/components/sections/PortfolioSection.vue",
  "app/components/sections/ProjectHelixCarousel.vue"
)

$blockedPortfolioChanges = @($stagedFiles | Where-Object { $protectedPortfolioFiles -contains $_ })
if ($blockedPortfolioChanges.Count -gt 0 -and -not $AllowPortfolioChanges) {
  Write-Host ""
  Write-Host "Portfolio stable protection active. Changes detected in:" -ForegroundColor Yellow
  $blockedPortfolioChanges | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
  throw "Deploy blocked. Re-run with -AllowPortfolioChanges if this is intentional."
}

$hasChanges = $stagedFiles

if ($hasChanges) {
  if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    $CommitMessage = "chore: update site $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  }

  Write-Step "Commit: $CommitMessage"
  git commit -m $CommitMessage

  Write-Step "Push sur origin/$Branch"
  git push origin $Branch
}
else {
  Write-Step "Aucun changement git a commit. Je continue le deploiement."
}

$deployScript = Join-Path $PSScriptRoot "deploy-vps.ps1"
if (-not (Test-Path -LiteralPath $deployScript)) {
  throw "deploy-vps.ps1 not found at: $deployScript"
}

Write-Step "Deploiement VPS"
powershell.exe -ExecutionPolicy Bypass -File $deployScript `
  -KeyPath $ResolvedKeyPath `
  -ServerHost $ServerHost `
  -User $User `
  -ProjectDir $ProjectDir `
  -Branch $Branch

Write-Host ""
Write-Host "Ship termine." -ForegroundColor Green
