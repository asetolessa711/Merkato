$ErrorActionPreference = 'Stop'

# Ensure backend tests point to local MongoDB (IPv4) to avoid ::1 issues on Windows
if (-not $env:MONGO_URI) {
  $env:MONGO_URI = 'mongodb://127.0.0.1:27017/merkato_test'
}

# Run frontend tests
Write-Host 'Running frontend tests...'
npm run test:frontend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Run backend tests
Write-Host 'Running backend tests...'
npm run test:backend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Run e2e tests
Write-Host 'Running e2e tests...'
# Prefer Windows-friendly core subset for speed/stability if available
$frontendPkg = Get-Content ./frontend/package.json | Out-String | ConvertFrom-Json
if ($frontendPkg.scripts.'e2e:core:win') {
  npm --prefix frontend run e2e:core:win
} elseif ($frontendPkg.scripts.'e2e:run') {
  npm --prefix frontend run e2e:run
} elseif ($frontendPkg.scripts.e2e) {
  npm --prefix frontend run e2e
} else {
  Write-Error 'No e2e script found in frontend/package.json'
  exit 1
}
exit $LASTEXITCODE
