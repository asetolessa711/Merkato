param()
$ErrorActionPreference = 'Stop'

function Fail($msg) { Write-Host "`n$msg`n" -ForegroundColor Red; exit 1 }

# Ensure we run at repo root
function Get-RepoRoot {
  $dir = Get-Location
  while ($dir -and -not (Test-Path -LiteralPath (Join-Path $dir '.git'))) {
    $dir = (Get-Item $dir).Parent
  }
  if (-not $dir) { Fail 'Not inside a Git repo.' }
  return $dir
}

$repo = Get-RepoRoot
Set-Location $repo

# Detect zero-byte tracked files to avoid committing accidental empties
$tracked = (& git ls-files -z) -split "`0" | Where-Object { $_ }
$trackedZeros = @()
foreach ($f in $tracked) {
  if (Test-Path -LiteralPath $f) {
    $len = (Get-Item -LiteralPath $f).Length
    if ($len -eq 0) { $trackedZeros += $f }
  }
}
if ($trackedZeros.Count -gt 0) {
  Write-Host "Found zero-byte tracked files:" -ForegroundColor Yellow
  $trackedZeros | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
  Fail 'Commit aborted: remove or populate empty files, or add to .gitignore if intentional.'
}

# Run backend tests
Write-Host "\nRunning backend tests..." -ForegroundColor Cyan
pushd backend | Out-Null
try { & npm test --silent } finally { popd | Out-Null }
if ($LASTEXITCODE -ne 0) { Fail 'Backend tests failed.' }

# Run frontend tests
Write-Host "\nRunning frontend tests..." -ForegroundColor Cyan
pushd frontend | Out-Null
try { & npm test --silent } finally { popd | Out-Null }
if ($LASTEXITCODE -ne 0) { Fail 'Frontend tests failed.' }

Write-Host "\nAll tests passed." -ForegroundColor Green
exit 0
