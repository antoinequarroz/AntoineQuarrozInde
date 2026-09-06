param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "[SHIP] Livraison manuelle désactivée" -ForegroundColor Yellow
Write-Host "1. Crée une branche et ouvre une pull request vers main."
Write-Host "2. Attends la validation des contrôles de qualité."
Write-Host "3. Fusionne la pull request."
Write-Host "4. Approuve l'environnement GitHub Production pour déployer le SHA exact."
Write-Host ""
throw "Ce script ne commit, ne pousse et ne déploie plus. Utilise le workflow GitHub PR -> merge -> approbation Production."
