Param()
# Removes Office lock files, zero-byte files, and re-stages changes to ensure a clean mirror

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

# Remove Office lock files
Get-ChildItem -File -Recurse -Filter '~$*' | ForEach-Object {
  Write-Host "Removing Office lock: $($_.FullName)"
  Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
}

# Remove zero-byte files (except .gitkeep)
Get-ChildItem -File -Recurse | Where-Object { $_.Length -eq 0 -and $_.Name -notin @('.gitkeep') } | ForEach-Object {
  Write-Host "Removing empty file: $($_.FullName)"
  Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
}

# Unlock any read-only test fixtures to allow staging
$fixture = Join-Path $repoRoot 'backend\tests\fixtures\large-dummy.jpg'
if (Test-Path $fixture) {
  attrib -R $fixture | Out-Null
}

# Re-stage
& git add -A
& git status --porcelain
