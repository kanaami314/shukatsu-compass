$ErrorActionPreference = 'Stop'
$settings = [Console]::In.ReadToEnd() | ConvertFrom-Json
$program = Join-Path $env:LOCALAPPDATA 'ShukatsuCompassBackup'
New-Item -ItemType Directory -Force -Path $program | Out-Null
foreach ($name in @('backup-core.mjs','run-backup.mjs','run-backup.ps1')) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $program $name) -Force }
$secure = ConvertTo-SecureString -String $settings.token -AsPlainText -Force
$config = @{siteUrl=$settings.siteUrl;owner=$settings.owner;encryptedToken=(ConvertFrom-SecureString $secure);backupDirectory='E:\就活コンパスバックアップ';maxBytes=2147483648;nodePath=(Get-Command node).Source}
$config | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $program 'config.json') -Encoding utf8
$action=New-ScheduledTaskAction -Execute (Get-Command pwsh).Source -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -File "'+(Join-Path $program 'run-backup.ps1')+'"')
$user=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$triggers=@((New-ScheduledTaskTrigger -Daily -At '09:00'),(New-ScheduledTaskTrigger -AtLogOn -User $user))
$taskSettings=New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 15)
$principal=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'ShukatsuCompassDailyBackup' -Action $action -Trigger $triggers -Settings $taskSettings -Principal $principal -Description '就活コンパスの保存済みデータを毎日圧縮バックアップ。上限2GB、同一内容は省略。' -Force | Out-Null
Write-Output 'バックアップの実行設定を保存しました。'
