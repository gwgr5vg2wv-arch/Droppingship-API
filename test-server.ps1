$ErrorActionPreference = 'SilentlyContinue'
$proc = Start-Process -FilePath "node" -ArgumentList "server\index.js" -PassThru
Start-Sleep -Seconds 3
if ($proc -and -not $proc.HasExited) {
    Write-Host "SUCCESS: Server started successfully"
    Stop-Process -Id $proc.Id -Force
} else {
    Write-Host "FAILED: Server failed to start or crashed"
}
