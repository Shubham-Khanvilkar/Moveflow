$logFile = Join-Path $PSScriptRoot '..\.freebuff\preview-dfbbbdbe-bcf2-47c4-ad28-d7a7d58ed6bb.log'
$errFile = "$logFile.err"
$nextBin = Join-Path $PSScriptRoot 'node_modules\next\dist\bin\next'
$webDir = Join-Path $PSScriptRoot 'apps\web'
$proc = Start-Process -FilePath 'node.exe' -ArgumentList "`"$nextBin`"","dev","-p","3080" -WorkingDirectory "$webDir" -RedirectStandardOutput "$logFile" -RedirectStandardError "$errFile" -WindowStyle Hidden -PassThru
Write-Output $proc.Id
