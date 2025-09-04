param(
  [int]$Port = 3000,
  [switch]$FixFirewall = $false
)

Write-Host "[doctor] Starting diagnostics for http://127.0.0.1:$Port" -ForegroundColor Cyan

function Section($name) { Write-Host "`n=== $name ===" -ForegroundColor Yellow }

Section "Port listeners"
try {
  $tcp = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($tcp) {
    $pids = $tcp.OwningProcess | Sort-Object -Unique
    Write-Host "Listening on $Port by PID(s): $($pids -join ', ')"
  } else {
    Write-Host "No LISTEN on $Port via Get-NetTCPConnection; checking netstat..."
    $net = netstat -ano | Select-String ":$Port"
    if ($net) { $net | ForEach-Object { Write-Host $_ } } else { Write-Host "No netstat entry for :$Port" }
  }
} catch { Write-Host "(skipped: Get-NetTCPConnection not available)" }

Section "Connectivity (TCP)"
try {
  $tnc = Test-NetConnection 127.0.0.1 -Port $Port -InformationLevel Detailed
  $tnc | Format-List | Out-String | Write-Host
} catch { Write-Host "Test-NetConnection failed: $($_.Exception.Message)" }

Section "HTTP probe"
try {
  $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 5
  Write-Host "HTTP status: $($resp.StatusCode) $($resp.StatusDescription)"
} catch { Write-Host "HTTP probe failed: $($_.Exception.Message)" }

Section "Proxy configuration"
try {
  Write-Host "WinHTTP proxy:" -NoNewline; Write-Host ""; netsh winhttp show proxy | Write-Host
} catch {}
if ($env:http_proxy) { Write-Host "env:http_proxy=$($env:http_proxy)" }
if ($env:https_proxy) { Write-Host "env:https_proxy=$($env:https_proxy)" }
if ($env:no_proxy) { Write-Host "env:no_proxy=$($env:no_proxy)" }

Section "Hosts file (localhost)"
try {
  $hosts = Get-Content "C:\Windows\System32\drivers\etc\hosts" -ErrorAction SilentlyContinue | Select-String -Pattern "localhost"
  if ($hosts) { $hosts | ForEach-Object { Write-Host $_ } } else { Write-Host "No explicit localhost mapping found (this is OK)." }
} catch { Write-Host "Unable to read hosts file: $($_.Exception.Message)" }

Section "Firewall"
try {
  if ($FixFirewall) {
    Write-Host "Attempting to add inbound allow rule for TCP $Port (may require admin)..."
    New-NetFirewallRule -DisplayName "Merkato Dev Port $Port" -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
  }
  Write-Host "Inbound rules referencing $Port:"; netsh advfirewall firewall show rule name=all | Select-String "LocalPort" | Select-String "$Port" | ForEach-Object { Write-Host $_ }
} catch { Write-Host "Firewall check: $($_.Exception.Message)" }

Section "Browser open"
try {
  Write-Host "Opening http://127.0.0.1:$Port via Start-Process..."
  Start-Process "http://127.0.0.1:$Port" | Out-Null
} catch { Write-Host "Start-Process failed: $($_.Exception.Message)" }

Write-Host "`n[doctor] Done. Review sections above." -ForegroundColor Cyan
