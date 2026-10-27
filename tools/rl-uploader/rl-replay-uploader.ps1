<#
  RL Replay Uploader v2 - analyse tes replays Rocket League SUR TON PC et envoie les stats a ton app (GitHub),
  et continue (en parallele, tant que tu veux) d'envoyer les replays a ballchasing.com.
  Compatible Windows PowerShell 5.1 (Windows 10/11). Utilise curl.exe (fourni avec Windows) et rl-analyzer.exe (a cote de ce fichier).

  Secrets : jamais dans ce fichier ni dans le depot. Cle ballchasing et jeton GitHub sont demandes une fois puis stockes
  chiffres (DPAPI : lisibles uniquement par ton compte Windows) dans %APPDATA%\rl-replay-uploader\config.json.

  Parametres :
    -Once            : traite les replays en attente puis quitte
    -DryRun          : analyse mais n'envoie RIEN (ni GitHub ni ballchasing), n'ecrit aucun journal
    -TestFile <f>    : analyse un seul .replay et affiche le resume (aucun envoi)
    -Ping            : verifie rl-analyzer, la cle ballchasing et le jeton GitHub puis quitte
    -ResetKey        : redemande la cle ballchasing        -ResetToken : redemande le jeton GitHub
    -BallchasingOff / -BallchasingOn : coupe / remet l'envoi vers ballchasing (reglage conserve)
    -Install / -Uninstall : lancement automatique au demarrage de Windows (fenetre cachee)
    -Update          : telecharge la derniere version (ps1 + exe, verifiee par SHA-256) depuis le depot
    -Status          : affiche l'etat (file d'attente, derniers envois)
#>
[CmdletBinding()]
param([switch]$Once,[switch]$DryRun,[string]$TestFile,[switch]$ResetKey,[switch]$ResetToken,[switch]$BallchasingOff,[switch]$BallchasingOn,
      [switch]$Install,[switch]$Uninstall,[switch]$Update,[switch]$Ping,[switch]$Status,[switch]$Quiet,[int]$IntervalSec=15,
      [string]$Endpoint,[string]$GitHubApi,[string]$Analyzer,[string]$ConfigDir,[string]$DemosDir,[string]$UpdateBase)

$ErrorActionPreference = 'Stop'
$UploaderVersion = '2.0.0'
$AppName  = 'rl-replay-uploader'
$IsWin = ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT)
if ($ConfigDir) { $CfgDir = $ConfigDir }
elseif ($env:APPDATA) { $CfgDir = Join-Path $env:APPDATA $AppName } else { $CfgDir = Join-Path $HOME ".$AppName" }   # 2e cas : tests hors Windows
$CfgFile   = Join-Path $CfgDir 'config.json'
$LogFile   = Join-Path $CfgDir 'uploaded.log'        # ballchasing (inchange depuis la v1 : aucun renvoi)
$TextLog   = Join-Path $CfgDir 'activity.log'
$QueueDir  = Join-Path $CfgDir 'queue'               # analyses pretes a pousser (file d'attente hors ligne)
$AnLog     = Join-Path $CfgDir 'analyzed.log'        # nom:taille|id|etat|date
$PushLog   = Join-Path $CfgDir 'pushed.log'          # id|date
$FailLog   = Join-Path $CfgDir 'analysis-failed.log' # nom:taille|code|version exe|date
$UploadUrl = 'https://ballchasing.com/api/v2/upload?visibility=public'
if ($Endpoint) { $UploadUrl = $Endpoint }            # tests uniquement
$GhApi = 'https://api.github.com'
if ($GitHubApi) { $GhApi = $GitHubApi.TrimEnd('/') } # tests uniquement
$RawBase = 'https://raw.githubusercontent.com/Blood63/gaming-tracker/main/tools/rl-uploader'
if ($UpdateBase) { $RawBase = $UpdateBase.TrimEnd('/') }
$Curl = 'curl'
if ($IsWin) { $Curl = Join-Path $env:SystemRoot 'System32\curl.exe' }
$ScriptDir = $PSScriptRoot; if (-not $ScriptDir) { $ScriptDir = (Get-Location).Path }
$Exe = $Analyzer
if (-not $Exe) { if ($IsWin) { $Exe = Join-Path $ScriptDir 'rl-analyzer.exe' } else { $Exe = Join-Path $ScriptDir 'rl-analyzer' } }
$script:BackoffUntil = [DateTime]::MinValue
$script:BackoffN = 0
$script:GhDisabled = $false     # jeton refuse : on analyse et met en file, sans pousser

function Write-Line([string]$msg, [string]$color = 'Gray') {
  $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  if (-not $Quiet) { Write-Host $line -ForegroundColor $color }
  if ($DryRun -or $TestFile) { return }
  try {
    if ((Test-Path $TextLog) -and ((Get-Item $TextLog).Length -gt 1MB)) { Move-Item $TextLog ($TextLog + '.old') -Force }
    Add-Content -Path $TextLog -Value $line -Encoding UTF8
  } catch { }
}

function Show-Toast([string]$title, [string]$text) {
  if (-not $IsWin -or $DryRun) { return }
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
function Ensure-Dirs {
  if (-not (Test-Path $CfgDir)) { New-Item -ItemType Directory -Path $CfgDir -Force | Out-Null; Protect-Dir $CfgDir }
  if (-not (Test-Path $QueueDir)) { New-Item -ItemType Directory -Path $QueueDir -Force | Out-Null }
}

# ---------------- configuration / secrets ----------------
function Read-Cfg {
  $c = @{ names = @('443Blood','M8_Blood'); epic = '8d1cf32b760442a297d5e317093fe9b0'; repo = 'Blood63/gaming-tracker'; branch = 'main'; minDate = '2026-10-01'; bc = $true; key = $null; gh = $null }
  if (Test-Path $CfgFile) {
    try {
      $j = Get-Content $CfgFile -Raw | ConvertFrom-Json
      foreach ($p in $j.PSObject.Properties) { $c[$p.Name] = $p.Value }
      if ($c.names -is [string]) { $c.names = @($c.names) }
    } catch { Write-Line 'config.json illisible : ignore (cles a ressaisir).' 'Yellow' }
  }
  return $c
}
function Save-Cfg($c) {
  Ensure-Dirs
  $o = @{}; foreach ($k in $c.Keys) { $o[$k] = $c[$k] }
  $o | ConvertTo-Json | Set-Content -Path $CfgFile -Encoding UTF8
}
function Unprotect-Str([string]$enc) {
  $sec = ConvertTo-SecureString $enc
  return [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}
function Read-Secret([string]$prompt) {
  $sec = Read-Host -AsSecureString $prompt
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  return @{ plain = $plain.Trim(); sec = $sec }
}

function New-HeaderFile([string[]]$lines) {
  # les en-tetes (donc les secrets) passent a curl par un fichier temporaire : jamais dans la ligne de commande
  $f = [IO.Path]::GetTempFileName(); [IO.File]::WriteAllText($f, ($lines -join "`n")); return $f
}

# --- ballchasing
function Test-BcKey([string]$key) {
  $h = New-HeaderFile @("Authorization: $key")
  try { $code = & $Curl -s -o ([IO.Path]::GetTempFileName()) -w '%{http_code}' --max-time 30 -H "@$h" 'https://ballchasing.com/api/' } finally { Remove-Item $h -Force -ErrorAction SilentlyContinue }
  return [int]$code
}
function Get-BcKey($cfg, [switch]$Force) {
  if ($env:BALLCHASING_API_KEY -and -not $IsWin) { return $env:BALLCHASING_API_KEY }  # tests Linux uniquement
  if ($cfg.key -and -not $Force) { try { return (Unprotect-Str $cfg.key) } catch { } }
  Write-Host ''
  Write-Host 'Cle API ballchasing.com (ballchasing.com > connecte-toi > Upload > "API key").' -ForegroundColor Cyan
  Write-Host 'Appuie sur Entree sans rien taper pour ne PAS envoyer vers ballchasing (analyse locale seulement).' -ForegroundColor DarkGray
  $s = Read-Secret 'Cle API ballchasing'
  if (-not $s.plain) { $cfg.bc = $false; Save-Cfg $cfg; Write-Line 'Envoi vers ballchasing desactive (relance avec -BallchasingOn pour le remettre).' 'Yellow'; return $null }
  if ((Test-BcKey $s.plain) -ne 200) { throw 'Cle refusee par ballchasing.com (verifie-la et relance).' }
  $cfg.key = (ConvertFrom-SecureString $s.sec); $cfg.bc = $true; Save-Cfg $cfg
  Write-Line 'Cle ballchasing valide et enregistree (chiffree pour ton compte Windows).' 'Green'
  return $s.plain
}

# --- GitHub
function Invoke-GH([string]$method, [string]$path, [string]$token, [string]$bodyFile, [string]$accept) {
  $ErrorActionPreference = 'Continue'   # PS 5.1 : un message sur stderr d'un programme natif ne doit pas etre fatal
  if (-not $accept) { $accept = 'application/vnd.github+json' }
  $h = New-HeaderFile @("Authorization: Bearer $token", "Accept: $accept", 'X-GitHub-Api-Version: 2022-11-28', "User-Agent: $AppName/$UploaderVersion")
  $out = [IO.Path]::GetTempFileName(); $hdr = [IO.Path]::GetTempFileName()
  try {
    $a = @('-s', '-S', '--max-time', '90', '-o', $out, '-D', $hdr, '-w', '%{http_code}', '-X', $method, '-H', "@$h")
    if ($bodyFile) { $a += @('--data-binary', "@$bodyFile") }
    $a += ($GhApi + $path)
    $code = 0
    try { $c = & $Curl @a 2>$null; $code = [int]$c } catch { $code = 0 }
    if ($LASTEXITCODE -ne 0) { $code = 0 }
    $limit = $false
    try { $ht = Get-Content $hdr -Raw; if ($ht -match '(?im)^x-ratelimit-remaining:\s*0') { $limit = $true } } catch { }
    return @{ code = $code; file = $out; limit = $limit }
  } finally { Remove-Item $h, $hdr -Force -ErrorAction SilentlyContinue }
}
function Read-BodyJson($r) { try { return (Get-Content $r.file -Raw | ConvertFrom-Json) } catch { return $null } }

function Test-GhToken([string]$token, [string]$repo) {
  $r = Invoke-GH 'GET' "/repos/$repo" $token
  $j = Read-BodyJson $r; Remove-Item $r.file -Force -ErrorAction SilentlyContinue
  if ($r.code -eq 200 -and $j -and $j.permissions -and $j.permissions.push) { return 'ok' }
  if ($r.code -eq 200) { return 'readonly' }
  if ($r.code -eq 401) { return 'refuse' }
  if ($r.code -eq 404) { return 'introuvable' }
  return ('http' + $r.code)
}
function Get-GhToken($cfg, [switch]$Force) {
  if ($env:GT_GITHUB_TOKEN -and -not $IsWin) { return $env:GT_GITHUB_TOKEN }  # tests Linux uniquement
  if ($cfg.gh -and -not $Force) { try { return (Unprotect-Str $cfg.gh) } catch { } }
  Write-Host ''
  Write-Host 'Jeton GitHub (fine-grained) pour envoyer tes stats a l''app. Il doit etre limite au depot' $cfg.repo 'avec "Contents : Read and write".' -ForegroundColor Cyan
  Write-Host '(voir le guide LISEZ-MOI.txt, section Jeton GitHub, pour le creer en 1 minute)' -ForegroundColor DarkGray
  $s = Read-Secret 'Jeton GitHub'
  if (-not $s.plain) { throw 'Aucun jeton saisi.' }
  $t = Test-GhToken $s.plain $cfg.repo
  if ($t -ne 'ok') {
    $why = @{ readonly = 'ce jeton peut lire le depot mais pas ecrire (donne-lui "Contents : Read and write")'; refuse = 'jeton refuse par GitHub (copie-le en entier, verifie sa date d''expiration)'; introuvable = ('depot ' + $cfg.repo + ' introuvable avec ce jeton (limite-le a ce depot)') }[$t]
    if (-not $why) { $why = "reponse inattendue ($t) : verifie ta connexion Internet" }
    throw "Jeton GitHub inutilisable : $why."
  }
  $cfg.gh = (ConvertFrom-SecureString $s.sec); Save-Cfg $cfg
  Write-Line 'Jeton GitHub valide et enregistre (chiffre pour ton compte Windows, jamais dans le depot).' 'Green'
  return $s.plain
}

# ---------------- dossiers de replays / fichiers ----------------
function Get-DemoDirs {
  if ($DemosDir) { return @($DemosDir) }
  $docs = @([Environment]::GetFolderPath('MyDocuments'))
  if ($env:USERPROFILE) { $docs += (Join-Path $env:USERPROFILE 'Documents') }
  if ($env:OneDrive) { $docs += (Join-Path $env:OneDrive 'Documents'); $docs += (Join-Path $env:OneDrive 'Documents\Documents') }
  if ($env:OneDriveConsumer) { $docs += (Join-Path $env:OneDriveConsumer 'Documents') }
  $dirs = @()
  foreach ($d in $docs) {
    if (-not $d) { continue }
    foreach ($sub in 'Demos','DemosEpic') {   # Epic : DemosEpic ; Steam : Demos
      $p = Join-Path $d ('My Games\Rocket League\TAGame\' + $sub)
      if ((Test-Path $p) -and ($dirs -notcontains $p)) { $dirs += $p }
    }
  }
  return $dirs
}
function Read-KeySet([string]$file) {
  $set = @{}
  if (Test-Path $file) { foreach ($l in Get-Content $file) { $k = ($l -split '\|')[0]; if ($k) { $set[$k] = $true } } }
  return $set
}
function Test-FileReady([IO.FileInfo]$f) {
  # fichier completement ecrit : taille stable pendant 3 s et ouvrable en exclusivite
  $s1 = $f.Length; Start-Sleep -Seconds 3; $f.Refresh()
  if ($f.Length -ne $s1 -or $f.Length -lt 1024) { return $false }
  try { $fs = [IO.File]::Open($f.FullName, 'Open', 'Read', 'None'); $fs.Close(); return $true } catch { return $false }
}

# ---------------- ballchasing (inchange : envoi du replay brut) ----------------
function Send-Replay([IO.FileInfo]$f, [string]$key) {
  $out = [IO.Path]::GetTempFileName(); $h = New-HeaderFile @("Authorization: $key")
  try {
    $code = & $Curl -s -o $out -w '%{http_code}' --max-time 300 -H "@$h" -F ("file=@`"{0}`"" -f $f.FullName) $UploadUrl
    $body = ''; try { $body = Get-Content $out -Raw } catch { }
    return @{ code = [int]$code; body = $body }
  } finally { Remove-Item $out, $h -Force -ErrorAction SilentlyContinue }
}
function Invoke-BcPass($files, [string]$key) {
  $done = Read-KeySet $LogFile; $n = 0
  foreach ($f in $files) {
    $id = '{0}:{1}' -f $f.Name, $f.Length
    if ($done.ContainsKey($id)) { continue }
    if (-not (Test-FileReady $f)) { continue }
    if ($DryRun) { Write-Line ("[test] serait envoye a ballchasing : {0}" -f $f.Name) 'Yellow'; continue }
    $r = Send-Replay $f $key
    $rid = ''; try { $rid = ($r.body | ConvertFrom-Json).id } catch { }
    if ($r.code -eq 201 -or $r.code -eq 409) {
      Add-Content -Path $LogFile -Value ('{0}|{1}|{2}|{3}' -f $id, $r.code, $rid, (Get-Date -Format s)) -Encoding UTF8
      $msg = 'Envoye a ballchasing : ' + $f.Name; if ($r.code -eq 409) { $msg = 'Deja sur ballchasing : ' + $f.Name }
      Write-Line $msg 'Green'; $n++
    } elseif ($r.code -eq 429) {
      Write-Line 'Limite ballchasing atteinte (429) : nouvel essai plus tard.' 'Yellow'; return $n
    } elseif ($r.code -eq 401) {
      Write-Line 'Cle ballchasing refusee (401). Relance avec -ResetKey (ou -BallchasingOff).' 'Red'; return $n
    } else {
      Write-Line ("Echec ballchasing {0} pour {1}" -f $r.code, $f.Name) 'Red'
    }
  }
  return $n
}

# ---------------- analyse locale ----------------
function Get-AnalyzerVersion {
  $ErrorActionPreference = 'Continue'
  try { $v = (& $Exe '--version' 2>$null) | Select-Object -First 1; if ($v) { return ([string]$v).Trim() } } catch { }
  return ''
}
function Invoke-Analyze([IO.FileInfo]$f, [string]$cfgNames, [string]$outDir) {
  $ErrorActionPreference = 'Continue'
  $cfg = $script:Cfg
  $off = [int][TimeZoneInfo]::Local.GetUtcOffset($f.LastWriteTime).TotalMinutes
  $a = @($f.FullName, '--tz-offset-min', "$off", '--out', $outDir)
  foreach ($n in $cfg.names) { $a += @('--me-name', [string]$n) }
  if ($cfg.epic) { $a += @('--me-epic', [string]$cfg.epic) }
  $err = [IO.Path]::GetTempFileName()
  try {
    $o = & $Exe @a 2>$err
    $code = $LASTEXITCODE
    $e = ''; try { $e = (Get-Content $err -Raw) } catch { }
    $id = ''; if ($o) { $id = ([string]($o | Select-Object -First 1)).Trim() }
    return @{ code = $code; id = $id; err = $e }
  } finally { Remove-Item $err -Force -ErrorAction SilentlyContinue }
}
function Format-Summary([string]$idxFile) {
  $j = Get-Content $idxFile -Raw | ConvertFrom-Json
  $res = 'defaite'; if ($j.result -eq 'win') { $res = 'victoire' }
  $pl = '{0}v{0}' -f $j.team_size
  return ('{0} {1} {2}-{3} | buts {4} passes {5} arrets {6} tirs {7} | boost moy {8} | supersonique {9}%' -f $pl, $res, $j.team_goals, $j.opp_goals, $j.s.goals, $j.s.assists, $j.s.saves, $j.s.shots, $j.s.avg_boost, $j.s.pct_supersonic)
}

function Invoke-AnalyzePass($files) {
  $known = Read-KeySet $AnLog
  $fails = @{}; if (Test-Path $FailLog) { foreach ($l in Get-Content $FailLog) { $p = $l -split '\|'; if ($p.Count -ge 3) { $fails[$p[0] + '|' + $p[2]] = [int]$p[1] } } }
  $ver = Get-AnalyzerVersion; $n = 0
  foreach ($f in $files) {
    $key = '{0}:{1}' -f $f.Name, $f.Length
    if ($known.ContainsKey($key)) { continue }
    if ($fails.ContainsKey($key + '|' + $ver)) { continue }     # deja en echec avec cette version de l'analyseur
    if ($f.LastWriteTime.ToString('yyyy-MM-dd') -lt $script:Cfg.minDate) { continue }   # trop ancien : l'app l'ignore de toute facon
    if (-not (Test-FileReady $f)) { continue }
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ('rla-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tmp -Force | Out-Null
    try {
      $r = Invoke-Analyze $f $null $tmp
      if ($r.code -ne 0 -or -not $r.id -or -not (Test-Path (Join-Path $tmp ($r.id + '.idx.json')))) {
        Write-Line ("Analyse impossible ({0}, code {1}) : {2}" -f $f.Name, $r.code, (([string]$r.err).Trim() -split "`n" | Select-Object -First 1)) 'Yellow'
        if (-not $DryRun) { Add-Content -Path $FailLog -Value ('{0}|{1}|{2}|{3}' -f $key, $r.code, $ver, (Get-Date -Format s)) -Encoding UTF8 }
        continue
      }
      $sum = Format-Summary (Join-Path $tmp ($r.id + '.idx.json'))
      if ($DryRun) { Write-Line ("[test] serait envoye a l'app : {0} ({1}) -> {2}" -f $f.Name, $r.id, $sum) 'Yellow'; $n++; continue }
      Move-Item (Join-Path $tmp ($r.id + '.json')) (Join-Path $QueueDir ($r.id + '.json')) -Force
      Move-Item (Join-Path $tmp ($r.id + '.idx.json')) (Join-Path $QueueDir ($r.id + '.idx.json')) -Force
      Add-Content -Path $AnLog -Value ('{0}|{1}|queued|{2}' -f $key, $r.id, (Get-Date -Format s)) -Encoding UTF8
      Write-Line ("Analyse : {0} -> {1}" -f $f.Name, $sum) 'Cyan'; $n++
    } finally { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
  }
  return $n
}

# ---------------- envoi vers GitHub (file d'attente) ----------------
function Set-Backoff {
  $script:BackoffN = [Math]::Min($script:BackoffN + 1, 6)
  $sec = [Math]::Min(900, 30 * [Math]::Pow(2, $script:BackoffN - 1))
  $script:BackoffUntil = (Get-Date).AddSeconds($sec)
  Write-Line ("GitHub injoignable ou limite atteinte : nouvel essai dans {0} s (les analyses restent en file d'attente)." -f [int]$sec) 'Yellow'
}
function New-PutBody([string]$srcFile, [string]$message, [string]$branch, [string]$sha) {
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($srcFile))
  $s = '{"message":"' + $message + '","branch":"' + $branch + '","content":"' + $b64 + '"'
  if ($sha) { $s += ',"sha":"' + $sha + '"' }
  $s += '}'
  $f = [IO.Path]::GetTempFileName(); [IO.File]::WriteAllText($f, $s, (New-Object Text.UTF8Encoding($false))); return $f
}
function Invoke-IndexMerge([string]$cur, [string[]]$entries, [string]$new) {
  $ErrorActionPreference = 'Continue'
  $a = @('index-merge', $cur) + $entries + @('--out', $new)
  $o = & $Exe @a 2>$null
  return @{ code = $LASTEXITCODE; out = ($o -join "`n") }
}
function Invoke-Flush([string]$token) {
  $cfg = $script:Cfg; $repo = $cfg.repo; $branch = $cfg.branch
  $items = @(Get-ChildItem -Path $QueueDir -Filter '*.idx.json' -File -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -First 25)
  if ($items.Count -eq 0) { return 0 }
  $work = Join-Path ([IO.Path]::GetTempPath()) ('rlf-' + [Guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Path $work -Force | Out-Null
  try {
    for ($try = 1; $try -le 4; $try++) {
      # 1) index actuel (+ sha)
      $idxPath = "/repos/$repo/contents/rl_local/index.json?ref=$branch"
      $m = Invoke-GH 'GET' $idxPath $token
      $mj = Read-BodyJson $m; Remove-Item $m.file -Force -ErrorAction SilentlyContinue
      $sha = $null; $cur = Join-Path $work 'index-cur.json'
      if ($m.code -eq 404) { Set-Content -Path $cur -Value '' -Encoding ASCII }
      elseif ($m.code -eq 200 -and $mj -and $mj.sha) {
        $sha = $mj.sha
        $raw = Invoke-GH 'GET' $idxPath $token $null 'application/vnd.github.raw+json'
        if ($raw.code -ne 200) { Remove-Item $raw.file -Force -ErrorAction SilentlyContinue; Set-Backoff; return 0 }
        Move-Item $raw.file $cur -Force
      }
      elseif ($m.code -eq 401 -or ($m.code -eq 403 -and -not $m.limit)) { $script:GhDisabled = $true; Write-Line 'Jeton GitHub refuse : analyses mises en file d''attente. Relance avec -ResetToken.' 'Red'; Show-Toast 'Replay Rocket League' 'Jeton GitHub refuse : relance 5-Changer-le-jeton.bat'; return 0 }
      else { Set-Backoff; return 0 }
      # 2) fusion (sans doublon) faite par l'analyseur
      $new = Join-Path $work 'index-new.json'
      $mr = Invoke-IndexMerge $cur @($items | ForEach-Object { $_.FullName }) $new
      if ($mr.code -ne 0) { Write-Line 'Index distant illisible : envoi suspendu par securite (rien n''est ecrase).' 'Red'; Set-Backoff; return 0 }
      $res = $mr.out | ConvertFrom-Json
      $added = @($res.added)
      # 3) fiches detaillees des nouveaux replays
      foreach ($id in $added) {
        $src = Join-Path $QueueDir ($id + '.json')
        if (-not (Test-Path $src)) { continue }
        $body = New-PutBody $src ('RL replay ' + $id) $branch $null
        try { $p = Invoke-GH 'PUT' "/repos/$repo/contents/rl_local/$id.json" $token $body } finally { Remove-Item $body -Force -ErrorAction SilentlyContinue }
        Remove-Item $p.file -Force -ErrorAction SilentlyContinue
        if ($p.code -eq 201 -or $p.code -eq 200 -or $p.code -eq 422) { continue }    # 422 : la fiche existe deja (envoi interrompu avant) = OK
        if ($p.code -eq 401 -or ($p.code -eq 403 -and -not $p.limit)) { $script:GhDisabled = $true; Write-Line 'Jeton GitHub refuse.' 'Red'; return 0 }
        Set-Backoff; return 0
      }
      # 4) index
      if ($added.Count -gt 0) {
        $body = New-PutBody $new ('RL : ' + $added.Count + ' replay(s) analyse(s) sur le PC') $branch $sha
        try { $p = Invoke-GH 'PUT' "/repos/$repo/contents/rl_local/index.json" $token $body } finally { Remove-Item $body -Force -ErrorAction SilentlyContinue }
        Remove-Item $p.file -Force -ErrorAction SilentlyContinue
        if ($p.code -eq 409 -or $p.code -eq 422) { Write-Line 'Index modifie entre-temps : on recommence.' 'Yellow'; Start-Sleep -Seconds 2; continue }
        if ($p.code -eq 401 -or ($p.code -eq 403 -and -not $p.limit)) { $script:GhDisabled = $true; Write-Line 'Jeton GitHub refuse.' 'Red'; return 0 }
        if ($p.code -ne 200 -and $p.code -ne 201) { Set-Backoff; return 0 }
      }
      # 5) succes : on vide la file pour ces replays
      foreach ($it in $items) {
        $id = $it.Name -replace '\.idx\.json$', ''
        Add-Content -Path $PushLog -Value ('{0}|{1}' -f $id, (Get-Date -Format s)) -Encoding UTF8
        Remove-Item (Join-Path $QueueDir ($id + '.json')), $it.FullName -Force -ErrorAction SilentlyContinue
      }
      $script:BackoffN = 0
      if ($added.Count -gt 0) { Write-Line ("Envoye a l'app : {0} replay(s)" -f $added.Count) 'Green'; Show-Toast 'Replay Rocket League' ("{0} replay(s) analyse(s) et envoye(s) a l'app" -f $added.Count) }
      else { Write-Line 'Deja dans l''app : rien a envoyer.' 'DarkGray' }
      return $added.Count
    }
    Write-Line 'Index toujours en conflit apres 4 essais : nouvel essai plus tard.' 'Yellow'; return 0
  } finally { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
}

function Get-AllReplayFiles {
  $all = @()
  foreach ($dir in (Get-DemoDirs)) { $all += @(Get-ChildItem -Path $dir -Filter *.replay -File -ErrorAction SilentlyContinue) }
  return @($all | Sort-Object LastWriteTime)
}
function Invoke-Pass([string]$bcKey, [string]$ghToken) {
  $files = Get-AllReplayFiles
  $nb = 0
  if ($bcKey -and $script:Cfg.bc) { try { $nb = Invoke-BcPass $files $bcKey } catch { Write-Line ('ballchasing : ' + $_.Exception.Message) 'Red' } }
  $na = 0
  try { $na = Invoke-AnalyzePass $files } catch { Write-Line ('Analyse : ' + $_.Exception.Message) 'Red' }
  if ($DryRun) { return $na }
  if ($ghToken -and -not $script:GhDisabled -and (Get-Date) -ge $script:BackoffUntil) {
    try { [void](Invoke-Flush $ghToken) } catch { Write-Line ('Envoi GitHub : ' + $_.Exception.Message) 'Red'; Set-Backoff }
  }
  return $na
}

# ---------------- installation / mise a jour ----------------
function Stop-Others {
  if (-not $IsWin) { return }
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*rl-replay-uploader.ps1*' -and $_.ProcessId -ne $PID } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 800
}
function Install-Startup {
  $dest = Join-Path $env:LOCALAPPDATA $AppName
  Stop-Others
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  foreach ($n in 'rl-replay-uploader.ps1','rl-analyzer.exe','LISEZ-MOI.txt') {
    $src = Join-Path $ScriptDir $n
    if ($n -eq 'rl-replay-uploader.ps1') { $src = $PSCommandPath }
    if (Test-Path $src) { if ((Resolve-Path $src).Path -ne (Join-Path $dest $n)) { Copy-Item -Path $src -Destination (Join-Path $dest $n) -Force } }
  }
  Get-ChildItem -Path $ScriptDir -Filter '*.bat' -File -ErrorAction SilentlyContinue | ForEach-Object { if ($_.DirectoryName -ne $dest) { Copy-Item $_.FullName (Join-Path $dest $_.Name) -Force } }
  $startup = [Environment]::GetFolderPath('Startup')
  $lnk = Join-Path $startup 'RL Replay Uploader.lnk'
  $ws = New-Object -ComObject WScript.Shell
  $s = $ws.CreateShortcut($lnk)
  $s.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $s.Arguments = ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -Quiet' -f (Join-Path $dest 'rl-replay-uploader.ps1'))
  $s.WorkingDirectory = $dest; $s.WindowStyle = 7; $s.Description = 'Analyse locale des replays Rocket League + envoi a l''app (et a ballchasing)'
  $s.Save()
  Write-Line ('Installe : lancement automatique au demarrage de Windows ({0})' -f $lnk) 'Green'
  Start-Process -FilePath $s.TargetPath -ArgumentList $s.Arguments -WindowStyle Hidden
  Write-Line 'Uploader lance en arriere-plan. Tu peux fermer cette fenetre.' 'Green'
}
function Uninstall-Startup {
  $lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'RL Replay Uploader.lnk'
  if (Test-Path $lnk) { Remove-Item $lnk -Force }
  Stop-Others
  Write-Line 'Lancement au demarrage retire et uploader arrete. (Tes cles restent dans %APPDATA%\rl-replay-uploader : supprime ce dossier pour les effacer.)' 'Green'
}
function Get-Sha([string]$path) { return (Get-FileHash -Path $path -Algorithm SHA256).Hash.ToLower() }
function Invoke-SelfUpdate {
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ('rlu-' + [Guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Path $tmp -Force | Out-Null
  try {
    $mf = Join-Path $tmp 'latest.json'
    $c = & $Curl -s -S -L --max-time 60 -o $mf -w '%{http_code}' ($RawBase + '/latest.json')
    if ([int]$c -ne 200) { throw "Impossible de lire latest.json (HTTP $c)." }
    $m = Get-Content $mf -Raw | ConvertFrom-Json
    $changed = @()
    foreach ($p in $m.files.PSObject.Properties) {
      $target = Join-Path $ScriptDir $p.Name
      if ((Test-Path $target) -and ((Get-Sha $target) -eq $p.Value)) { continue }
      $dl = Join-Path $tmp $p.Name
      $c = & $Curl -s -S -L --max-time 300 -o $dl -w '%{http_code}' ($RawBase + '/' + $p.Name)
      if ([int]$c -ne 200) { throw "Telechargement de $($p.Name) impossible (HTTP $c)." }
      if ((Get-Sha $dl) -ne $p.Value) { throw "Empreinte SHA-256 incorrecte pour $($p.Name) : mise a jour annulee." }
      $changed += $p.Name
    }
    if ($changed.Count -eq 0) { Write-Line ('Deja a jour (version ' + $m.version + ').') 'Green'; return }
    Stop-Others
    foreach ($n in $changed) { Copy-Item (Join-Path $tmp $n) (Join-Path $ScriptDir $n) -Force }
    Write-Line ('Mis a jour vers la version {0} : {1}. Relance 2-Lancer-maintenant.bat (ou redemarre Windows).' -f $m.version, ($changed -join ', ')) 'Green'
  } finally { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}

# ---------------- main ----------------
Ensure-Dirs
if ($Uninstall) { Uninstall-Startup; return }
if ($Update) { Invoke-SelfUpdate; return }
if ($BallchasingOff -or $BallchasingOn) { $c0 = Read-Cfg; $c0.bc = [bool]$BallchasingOn; Save-Cfg $c0; Write-Line ('Envoi vers ballchasing : ' + $(if ($c0.bc) { 'active' } else { 'desactive' })) 'Green'; return }
if (-not (Test-Path $Exe)) { Write-Line ("rl-analyzer introuvable : $Exe. Garde rl-analyzer.exe dans le meme dossier que ce script (ou lance -Update).") 'Red'; exit 2 }
$script:Cfg = Read-Cfg
$ver = Get-AnalyzerVersion

if ($TestFile) {
  $f = Get-Item -LiteralPath $TestFile
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ('rla-' + [Guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Path $tmp -Force | Out-Null
  try {
    $r = Invoke-Analyze $f $null $tmp
    if ($r.code -ne 0) { Write-Line ("Echec de l'analyse (code {0}) : {1}" -f $r.code, $r.err) 'Red'; exit 1 }
    Write-Line ("Analyse reussie ({0}) : {1}" -f $ver, (Format-Summary (Join-Path $tmp ($r.id + '.idx.json')))) 'Green'
    Write-Line ("Rien n'a ete envoye. Fichiers de test : {0}" -f $tmp) 'DarkGray'
    exit 0
  } finally { }
}

if ($Status) {
  Write-Host ("Version uploader {0} | analyseur {1}" -f $UploaderVersion, $ver)
  Write-Host ("En file d'attente : {0}" -f @(Get-ChildItem $QueueDir -Filter '*.idx.json' -ErrorAction SilentlyContinue).Count)
  Write-Host ("Envoyes a l'app : {0}" -f (Read-KeySet $PushLog).Keys.Count)
  Write-Host ("ballchasing : {0}" -f $(if ($script:Cfg.bc) { 'actif' } else { 'desactive' }))
  if (Test-Path $TextLog) { Get-Content $TextLog -Tail 8 }
  return
}

$bcKey = $null
if ($script:Cfg.bc -or $ResetKey) { $bcKey = Get-BcKey $script:Cfg -Force:$ResetKey; $script:Cfg = Read-Cfg }
$ghToken = $null
if (-not $DryRun) { $ghToken = Get-GhToken $script:Cfg -Force:$ResetToken; $script:Cfg = Read-Cfg }

if ($Ping) {
  $ok = $true
  Write-Line ("Analyseur : {0}" -f $ver) 'Green'
  if ($bcKey) { $c = Test-BcKey $bcKey; Write-Line ("ballchasing.com /api/ -> HTTP {0}" -f $c); if ($c -ne 200) { $ok = $false } } else { Write-Line 'ballchasing : desactive' 'DarkGray' }
  $t = Test-GhToken $ghToken $script:Cfg.repo; Write-Line ("GitHub ({0}) : {1}" -f $script:Cfg.repo, $t); if ($t -ne 'ok') { $ok = $false }
  if ($ok) { exit 0 } else { exit 1 }
}
if ($Install) { Install-Startup; return }

# une seule instance a la fois
$mtx = $null
if (-not $DryRun) {
  $mtx = New-Object System.Threading.Mutex($false, 'Local\rl-replay-uploader')
  if (-not $mtx.WaitOne(0)) { Write-Line 'Deja en cours d''execution.' 'Yellow'; return }
}
try {
  $dirs = Get-DemoDirs
  if (-not $dirs) { Write-Line 'Dossier des replays introuvable pour l''instant (Documents\My Games\Rocket League\TAGame\DemosEpic pour Epic, ou \Demos pour Steam). Il sera cree a ton 1er replay sauvegarde ; surveillance active.' 'Yellow' }
  else { Write-Line ('Surveillance : ' + ($dirs -join ' ; ') + '  [uploader ' + $UploaderVersion + ', analyseur ' + $ver + ']') 'Cyan' }
  $n = Invoke-Pass $bcKey $ghToken
  Write-Line ("Rattrapage termine : {0} replay(s) analyse(s)." -f $n) 'Cyan'
  if ($Once -or $DryRun) { return }
  while ($true) { Start-Sleep -Seconds $IntervalSec; [void](Invoke-Pass $bcKey $ghToken) }
} finally { if ($mtx) { try { $mtx.ReleaseMutex() } catch { } } }
