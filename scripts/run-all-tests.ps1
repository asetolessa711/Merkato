$ErrorActionPreference = 'Stop'

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
npm run test:e2e
exit $LASTEXITCODE
