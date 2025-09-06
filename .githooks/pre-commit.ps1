Param()

# Windows PowerShell pre-commit hook: run backend and frontend tests
# Skips in CI environments. Keep output concise.

if ($env:CI -eq 'true') { exit 0 }

$ErrorActionPreference = 'Stop'

function Invoke-Test {
  param(
    [string]$Path,
    [string]$Cmd
  )
  Push-Location $Path
  try {
    if (-not (Test-Path node_modules)) { npm ci --silent } else { Write-Host "$Path deps present" }
    & cmd /c $Cmd
  } catch {
    Pop-Location
    throw
  }
  Pop-Location
}

try {
  # Block Office lock files and zero-byte files from being committed
  $staged = git diff --cached --name-only --diff-filter=AM
  $badFiles = @()
  foreach ($f in $staged) {
    if ($f -like '*~$*') { $badFiles += $f; continue }
    $full = Join-Path (Get-Location) $f
    if (Test-Path $full) {
      $len = (Get-Item $full).Length
      if ($len -eq 0) { $badFiles += $f }
    }
  }
  if ($badFiles.Count -gt 0) {
    Write-Error "Blocked committing lock/empty files:`n$($badFiles -join "`n")"
    exit 1
  }

  Write-Host "Running backend tests..."
  Invoke-Test -Path 'backend' -Cmd 'npm test --silent'

  Write-Host "Running frontend tests..."
  Invoke-Test -Path 'frontend' -Cmd 'npm test --silent'
} catch {
  Write-Error "Pre-commit tests failed. Aborting commit. $_"
  exit 1
}

Write-Host "All tests passed. Proceeding with commit."
exit 0
