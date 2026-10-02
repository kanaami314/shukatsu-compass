$ErrorActionPreference = 'Stop'
$configPath = Join-Path $PSScriptRoot 'config.json'
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$secure = $config.encryptedToken | ConvertTo-SecureString
$token = [System.Net.NetworkCredential]::new('', $secure).Password
$token | & $config.nodePath (Join-Path $PSScriptRoot 'run-backup.mjs') $configPath
$token = $null
exit $LASTEXITCODE
