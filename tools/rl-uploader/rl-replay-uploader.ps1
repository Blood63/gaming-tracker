<#
  RL Replay Uploader - envoie automatiquement les replays Rocket League sur ballchasing.com
  Compatible Windows PowerShell 5.1 (Windows 10/11), aucune installation requise (utilise curl.exe fourni avec Windows).
  La cle API n'est JAMAIS dans ce fichier : elle est demandee au 1er lancement et stockee chiffree (DPAPI, lisible
  uniquement par ton compte Windows) dans %APPDATA%\rl-replay-uploader\config.json.

  Parametres :
    -Once        : envoie les replays en attente puis quitte
    -DryRun      : n'envoie rien, affiche ce qui serait envoye
    -ResetKey    : redemande la cle API
    -Install     : copie l'outil dans %LOCALAPPDATA% et le lance au demarrage de Windows (fenetre cachee)
    -Uninstall   : retire le lancement au demarrage
    -Ping        : verifie la cle (GET https://ballchasing.com/api/) puis quitte
#>
[CmdletBinding()]
param([switch]$Once,[switch]$DryRun,[switch]$ResetKey,[switch]$Install,[switch]$Uninstall,[switch]$Ping,[switch]$Quiet,[int]$IntervalSec=15,[string]$Endpoint)

$ErrorActionPreference = 'Stop'
$AppName  = 'rl-replay-uploader'
if ($env:APPDATA) { $CfgDir = Join-Path $env:APPDATA $AppName } else { $CfgDir = Join-Path $HOME ".$AppName" }   # 2e cas : tests hors Windows
$CfgFile  = Join-Path $CfgDir 'config.json'
$LogFile  = Join-Path $CfgDir 'uploaded.log'
$TextLog  = Join-Path $CfgDir 'activity.log'
$UploadUrl = 'https://ballchasing.com/api/v2/upload?visibility=public'
if ($Endpoint) { $UploadUrl = $Endpoint }   # tests uniquement
$IsWin = ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT)
$Curl = 'curl'
if ($IsWin) { $Curl = Join-Path $env:SystemRoot 'System32\curl.exe' }

function Write-Line([string]$msg, [string]$color = 'Gray') {
  $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  if (-not $Quiet) { Write-Host $line -ForegroundColor $color }
  try { Add-Content -Path $TextLog -Value $line -Encoding UTF8 } catch { }
}

function Show-Toast([string]$title, [string]$text) {
  if (-not $IsWin) { return }
  try {
    Add-Type -AssemblyName System.Windows.Forms, System.Drawing -ErrorAction Stop
    $n = New-Object System.Windows.Forms.NotifyIcon
    $icons = 'System.Drawing.SystemIcons' -as [type]; $n.Icon = $icons::Information
    $n.BalloonTipTitle = $title; $n.BalloonTipText = $text; $n.Visible = $true
    $n.ShowBalloonTip(5000); Start-Sleep -Milliseconds 5500; $n.Dispose()
  } catch { }
}

function Protect-Dir([string]$path) {
  if (-not $IsWin) { return }
  try { & icacls.exe $path /inheritance:r /grant:r ("{0}:(OI)(CI)F" -f $env:USERNAME) | Out-Null } catch { }
}

function Get-ApiKey {
  if ($env:BALLCHASING_API_KEY -and -not $IsWin) { return $env:BALLCHASING_API_KEY }  # tests Linux uniquement
  if (-not (Test-Path $CfgDir)) { New-Item -ItemType Directory -Path $CfgDir | Out-Null; Protect-Dir $CfgDir }
  if ((Test-Path $CfgFile) -and -not $ResetKey) {
    $cfg = Get-Content $CfgFile -Raw | ConvertFrom-Json
    if ($cfg.key) {
      $sec = ConvertTo-SecureString $cfg.key
      return [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
    }
  }
  Write-Host ''
  Write-Host 'Premiere configuration : colle ta cle API ballchasing.com' -ForegroundColor Cyan
  Write-Host '(ballchasing.com > connecte-toi > Upload > "API key", puis copie la cle)' -ForegroundColor DarkGray
  $sec = Read-Host -AsSecureString 'Cle API'
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  $plain = $plain.Trim()
  if (-not $plain) { throw 'Aucune cle saisie.' }
  if ((Test-Key $plain) -ne 200) { throw 'Cle refusee par ballchasing.com (verifie-la et relance).' }
  @{ key = (ConvertFrom-SecureString $sec); created = (Get-Date -Format s) } |
    ConvertTo-Json | Set-Content -Path $CfgFile -Encoding UTF8
  Write-Line 'Cle valide et enregistree (chiffree pour ton compte Windows).' 'Green'
  return $plain
}

function New-HeaderFile([string]$key) {
  # l'en-tete est passe a curl via un fichier temporaire : la cle n'apparait pas dans la ligne de commande
  $f = [IO.Path]::GetTempFileName()
  [IO.File]::WriteAllText($f, "Authorization: $key")
  return $f
}

function Test-Key([string]$key) {
  $h = New-HeaderFile $key
  try { $code = & $Curl -s -o ([IO.Path]::GetTempFileName()) -w '%{http_code}' -H "@$h" 'https://ballchasing.com/api/' } finally { Remove-Item $h -Force -ErrorAction SilentlyContinue }
  return [int]$code
}

function Get-DemoDirs {
  $docs = @([Environment]::GetFolderPath('MyDocuments'))
  if ($env:USERPROFILE) { $docs += (Join-Path $env:USERPROFILE 'Documents') }
  if ($env:OneDrive) { $docs += (Join-Path $env:OneDrive 'Documents'); $docs += (Join-Path $env:OneDrive 'Documents\Documents') }
  if ($env:OneDriveConsumer) { $docs += (Join-Path $env:OneDriveConsumer 'Documents') }
  $dirs = @()
  foreach ($d in $docs) {
    if (-not $d) { continue }
    $p = Join-Path $d 'My Games\Rocket League\TAGame\Demos'
    if ((Test-Path $p) -and ($dirs -notcontains $p)) { $dirs += $p }
  }
  return $dirs
}

function Get-Uploaded {
  $set = @{}
  if (Test-Path $LogFile) { foreach ($l in Get-Content $LogFile) { $k = ($l -split '\|')[0]; if ($k) { $set[$k] = $true } } }
  return $set
}

function Test-FileReady([IO.FileInfo]$f) {
  # fichier completement ecrit : taille stable pendant 3 s et ouvrable en exclusivite
  $s1 = $f.Length; Start-Sleep -Seconds 3; $f.Refresh()
  if ($f.Length -ne $s1 -or $f.Length -lt 1024) { return $false }
  try { $fs = [IO.File]::Open($f.FullName, 'Open', 'Read', 'None'); $fs.Close(); return $true } catch { return $false }
}

function Send-Replay([IO.FileInfo]$f, [string]$key) {
  $out = [IO.Path]::GetTempFileName(); $h = New-HeaderFile $key
  try {
    $code = & $Curl -s -o $out -w '%{http_code}' -H "@$h" -F ("file=@`"{0}`"" -f $f.FullName) $UploadUrl
    $body = ''; try { $body = Get-Content $out -Raw } catch { }
    return @{ code = [int]$code; body = $body }
  } finally { Remove-Item $out, $h -Force -ErrorAction SilentlyContinue }
}

function Invoke-Pass([string]$key) {
  $done = Get-Uploaded; $n = 0
  foreach ($dir in (Get-DemoDirs)) {
    foreach ($f in (Get-ChildItem -Path $dir -Filter *.replay -File | Sort-Object LastWriteTime)) {
      $id = '{0}:{1}' -f $f.Name, $f.Length
      if ($done.ContainsKey($id)) { continue }
      if (-not (Test-FileReady $f)) { continue }
      if ($DryRun) { Write-Line ("[test] serait envoye : {0}" -f $f.Name) 'Yellow'; continue }
      $r = Send-Replay $f $key
      $rid = ''; try { $rid = ($r.body | ConvertFrom-Json).id } catch { }
      if ($r.code -eq 201 -or $r.code -eq 409) {
        Add-Content -Path $LogFile -Value ('{0}|{1}|{2}|{3}' -f $id, $r.code, $rid, (Get-Date -Format s)) -Encoding UTF8
        $msg = 'Envoye : ' + $f.Name; if ($r.code -eq 409) { $msg = 'Deja sur ballchasing : ' + $f.Name }
        Write-Line $msg 'Green'; Show-Toast 'Replay Rocket League' $msg; $n++
      } elseif ($r.code -eq 429) {
        Write-Line 'Limite ballchasing atteinte (429) : nouvel essai plus tard.' 'Yellow'; return $n
      } elseif ($r.code -eq 401) {
        Write-Line 'Cle API refusee (401). Relance avec -ResetKey.' 'Red'; Show-Toast 'Replay Rocket League' 'Cle API refusee : relance l''installateur.'; return $n
      } else {
        Write-Line ("Echec {0} pour {1} : {2}" -f $r.code, $f.Name, $r.body) 'Red'
      }
    }
  }
  return $n
}

function Install-Startup {
  $dest = Join-Path $env:LOCALAPPDATA $AppName
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Copy-Item -Path $PSCommandPath -Destination (Join-Path $dest 'rl-replay-uploader.ps1') -Force
  $startup = [Environment]::GetFolderPath('Startup')
  $lnk = Join-Path $startup 'RL Replay Uploader.lnk'
  $ws = New-Object -ComObject WScript.Shell
  $s = $ws.CreateShortcut($lnk)
  $s.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $s.Arguments = ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -Quiet' -f (Join-Path $dest 'rl-replay-uploader.ps1'))
  $s.WorkingDirectory = $dest; $s.WindowStyle = 7; $s.Description = 'Envoi automatique des replays Rocket League sur ballchasing.com'
  $s.Save()
  Write-Line ('Installe : lancement automatique au demarrage de Windows ({0})' -f $lnk) 'Green'
  Start-Process -FilePath $s.TargetPath -ArgumentList $s.Arguments -WindowStyle Hidden
  Write-Line 'Uploader lance en arriere-plan. Tu peux fermer cette fenetre.' 'Green'
}

function Uninstall-Startup {
  $lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'RL Replay Uploader.lnk'
  if (Test-Path $lnk) { Remove-Item $lnk -Force }
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*rl-replay-uploader.ps1*' -and $_.ProcessId -ne $PID } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Write-Line 'Lancement au demarrage retire et uploader arrete. (Ta cle reste dans %APPDATA%\rl-replay-uploader, supprime ce dossier pour l''effacer.)' 'Green'
}

# ---------------- main ----------------
if (-not (Test-Path $CfgDir)) { New-Item -ItemType Directory -Path $CfgDir | Out-Null; Protect-Dir $CfgDir }
if ($Uninstall) { Uninstall-Startup; return }
$key = Get-ApiKey
if ($Ping) { $c = Test-Key $key; Write-Line ("ballchasing.com /api/ -> HTTP {0}" -f $c); if ($c -eq 200) { exit 0 } else { exit 1 } }
if ($Install) { Install-Startup; return }

# une seule instance a la fois
$mtx = New-Object System.Threading.Mutex($false, 'Local\rl-replay-uploader')
if (-not $mtx.WaitOne(0)) { Write-Line 'Deja en cours d''execution.' 'Yellow'; return }
try {
  $dirs = Get-DemoDirs
  if (-not $dirs) { Write-Line 'Dossier des replays introuvable pour l''instant (Documents\My Games\Rocket League\TAGame\Demos). Il sera cree a ton 1er replay sauvegarde ; surveillance active.' 'Yellow' }
  else { Write-Line ('Surveillance : ' + ($dirs -join ' ; ')) 'Cyan' }
  $n = Invoke-Pass $key
  Write-Line ("Rattrapage termine : {0} replay(s) envoye(s)." -f $n) 'Cyan'
  if ($Once -or $DryRun) { return }
  while ($true) { Start-Sleep -Seconds $IntervalSec; [void](Invoke-Pass $key) }
} finally { $mtx.ReleaseMutex() }
