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
    -Status          : affiche l'etat (dossiers surveilles, file d'attente, echecs, derniers envois)
    -RetryFailed     : efface les echecs d'analyse et remet les fiches bloquees (queue\failed) dans la file, pour un nouvel essai

  config.json (%APPDATA%\rl-replay-uploader) accepte aussi :
    "demos" : "D:\\Replays" ou une liste de dossiers de replays en plus (chemin choisi dans le jeu, autre disque)
    "epic"  : un id Epic ou une liste d'ids (second compte Epic sur le meme Windows)
#>
[CmdletBinding()]
param([switch]$Once,[switch]$DryRun,[string]$TestFile,[switch]$ResetKey,[switch]$ResetToken,[switch]$BallchasingOff,[switch]$BallchasingOn,
      [switch]$Install,[switch]$Uninstall,[switch]$Update,[switch]$Ping,[switch]$Status,[switch]$RetryFailed,[switch]$Quiet,[int]$IntervalSec=15,
      [string]$Endpoint,[string]$GitHubApi,[string]$Analyzer,[string]$ConfigDir,[string]$DemosDir,[string]$UpdateBase)

$ErrorActionPreference = 'Stop'
$UploaderVersion = '2.0.3'
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
$FailLog   = Join-Path $CfgDir 'analysis-failed.log' # nom:taille|code|version exe|date|essais|definitif(1/0)
$FailedDir = Join-Path $QueueDir 'failed'            # fiches refusees 5 fois par GitHub : ecartees pour ne pas bloquer la file
$PutFails  = Join-Path $QueueDir 'put-fails.txt'     # id|nombre d'echecs d'envoi
$MaxAnalyzeTries = 3                                 # essais d'analyse (meme version de l'analyseur) avant d'abandonner
$MaxPutTries = 5
$ExpFile   = Join-Path $CfgDir 'token-expiry.txt'    # date d'expiration du jeton GitHub (lue dans les reponses de GitHub, pas un secret)
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
$script:ExpWarnDay = ''          # avertissement d'expiration du jeton : une fois par jour
$script:TokenCheckAt = [DateTime]::MinValue
$script:SeenSize = @{}            # taille vue au passage precedent (fichier en cours d'ecriture ?)
$script:Toast = $null
$NulDev = '/dev/null'; if ($IsWin) { $NulDev = 'NUL' }

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
    # pas d'attente bloquante (v2.0.3) : l'icone reste jusqu'a la bulle suivante ou la fin du script
    if ($script:Toast) { try { $script:Toast.Dispose() } catch { } }
    $n = New-Object System.Windows.Forms.NotifyIcon
    $icons = 'System.Drawing.SystemIcons' -as [type]; $n.Icon = $icons::Information
    $n.BalloonTipTitle = $title; $n.BalloonTipText = $text; $n.Visible = $true
    $n.ShowBalloonTip(5000); $script:Toast = $n
  } catch { }
}
function Close-Toast { if ($script:Toast) { try { $script:Toast.Dispose() } catch { }; $script:Toast = $null } }

function Protect-Dir([string]$path) {
  if (-not $IsWin) { return }
  try { & icacls.exe $path /inheritance:r /grant:r ("{0}:(OI)(CI)F" -f $env:USERNAME) | Out-Null } catch { }
}
function Ensure-Dirs {
  if (-not (Test-Path $CfgDir)) { New-Item -ItemType Directory -Path $CfgDir -Force | Out-Null; Protect-Dir $CfgDir }
  if (-not (Test-Path $QueueDir)) { New-Item -ItemType Directory -Path $QueueDir -Force | Out-Null }
}
function Limit-Log([string]$file, [int]$keep = 5000) {
  # journal > 1 Mo : on garde les dernieres lignes (la cle est en debut de ligne, rien d'autre a recharger)
  try {
    if ((Test-Path $file) -and ((Get-Item $file).Length -gt 1MB)) {
      $tail = @(Get-Content $file -Tail $keep)
      $tmp = $file + '.tmp'; Set-Content -Path $tmp -Value $tail -Encoding UTF8; Move-Item $tmp $file -Force
      Write-Line ("Journal {0} raccourci aux {1} dernieres lignes." -f (Split-Path $file -Leaf), $keep) 'DarkGray'
    }
  } catch { }
}
function Clear-OldTemp {
  # dossiers temporaires laisses par -TestFile (ou un arret brutal) : supprimes apres 7 jours
  try {
    Get-ChildItem -Path ([IO.Path]::GetTempPath()) -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^rl[afu]-[0-9a-f]{32}$' -and $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
      ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
  } catch { }
}

# ---------------- configuration / secrets ----------------
function Read-Cfg {
  $c = @{ names = @('443Blood','M8_Blood'); epic = '8d1cf32b760442a297d5e317093fe9b0'; repo = 'Blood63/gaming-tracker'; branch = 'main'; minDate = '2026-10-01'; bc = $false; key = $null; gh = $null; demos = @() }
  if (Test-Path $CfgFile) {
    try {
      $j = Get-Content $CfgFile -Raw | ConvertFrom-Json
      foreach ($p in $j.PSObject.Properties) { $c[$p.Name] = $p.Value }
      if ($c.names -is [string]) { $c.names = @($c.names) }
      if ($null -eq $c.demos) { $c.demos = @() } elseif ($c.demos -is [string]) { $c.demos = @($c.demos) }
    } catch { Write-Line 'config.json illisible : ignore (cles a ressaisir).' 'Yellow' }
  }
  return $c
}
function Save-Cfg($c) {
  Ensure-Dirs
  $o = @{}; foreach ($k in $c.Keys) { $o[$k] = $c[$k] }
  $o | ConvertTo-Json | Set-Content -Path $CfgFile -Encoding UTF8
}
function ConvertFrom-Secure($sec) {
  # copie en clair puis effacement du tampon BSTR (ZeroFreeBSTR) : le secret ne traine pas en memoire non geree
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}
function Unprotect-Str([string]$enc) {
  return (ConvertFrom-Secure (ConvertTo-SecureString $enc))
}
function Read-Secret([string]$prompt) {
  $sec = Read-Host -AsSecureString $prompt
  $plain = ConvertFrom-Secure $sec
  return @{ plain = $plain.Trim(); sec = $sec }
}

function New-HeaderFile([string[]]$lines) {
  # les en-tetes (donc les secrets) passent a curl par un fichier temporaire : jamais dans la ligne de commande
  $f = [IO.Path]::GetTempFileName(); [IO.File]::WriteAllText($f, ($lines -join "`n")); return $f
}

# --- ballchasing
function Test-BcKey([string]$key) {
  $h = New-HeaderFile @("Authorization: $key")
  try { $code = & $Curl -s -o $NulDev -w '%{http_code}' --max-time 30 -H "@$h" 'https://ballchasing.com/api/' } finally { Remove-Item $h -Force -ErrorAction SilentlyContinue }
  return [int]$code
}
function Get-BcKey($cfg, [switch]$Force) {
  if ($env:BALLCHASING_API_KEY -and -not $IsWin) { return $env:BALLCHASING_API_KEY }  # tests Linux uniquement
  if ($cfg.key -and -not $Force) { try { return (Unprotect-Str $cfg.key) } catch { } }
  if ($Quiet -and -not $Force) { Stop-NeedsInput 'Cle ballchasing' }
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
    $limit = $false; $exp = ''
    try {
      $ht = Get-Content $hdr -Raw
      if ($ht -match '(?im)^x-ratelimit-remaining:\s*0') { $limit = $true }
      if ($ht -match '(?im)^github-authentication-token-expiration:\s*(\d{4}-\d{2}-\d{2})') { $exp = $Matches[1] }
    } catch { }
    return @{ code = $code; file = $out; limit = $limit; exp = $exp }
  } finally { Remove-Item $h, $hdr -Force -ErrorAction SilentlyContinue }
}
function Read-BodyJson($r) { try { return (Get-Content $r.file -Raw | ConvertFrom-Json) } catch { return $null } }

function Test-GhToken([string]$token, [string]$repo) {
  $r = Invoke-GH 'GET' "/repos/$repo" $token
  $j = Read-BodyJson $r; Remove-Item $r.file -Force -ErrorAction SilentlyContinue
  if ($r.code -eq 200) { Save-TokenExpiry $r.exp }
  if ($r.code -eq 200 -and $j -and $j.permissions -and $j.permissions.push) { return 'ok' }
  if ($r.code -eq 200) { return 'readonly' }
  if ($r.code -eq 401) { return 'refuse' }
  if ($r.code -eq 404) { return 'introuvable' }
  return ('http' + $r.code)
}
function Get-DaysLeft([string]$d) {
  try { return [int]([datetime]::ParseExact($d, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture) - (Get-Date).Date).TotalDays } catch { return $null }
}
function Save-TokenExpiry([string]$exp) {
  # GitHub renvoie la date d'expiration du jeton dans chaque reponse : on la garde pour -Status et on previent 14 j avant
  if ($DryRun -or $TestFile) { return }
  try {
    $old = ''; if (Test-Path $ExpFile) { $old = ([string](Get-Content $ExpFile -Raw)).Trim() }
    if (-not $exp) { if ($old) { Remove-Item $ExpFile -Force -ErrorAction SilentlyContinue }; return }   # jeton sans expiration
    if ($old -ne $exp) { Set-Content -Path $ExpFile -Value $exp -Encoding ASCII }
    $left = Get-DaysLeft $exp; $today = (Get-Date).ToString('yyyy-MM-dd')
    if ($null -ne $left -and $left -le 14 -and $script:ExpWarnDay -ne $today) {
      $script:ExpWarnDay = $today
      $msg = "Jeton GitHub : expire le $exp (dans $left j). Cree un nouveau jeton puis lance 4-Changer-le-jeton-GitHub.bat."
      if ($left -lt 0) { $msg = "Jeton GitHub expire depuis le $exp : cree un nouveau jeton puis lance 4-Changer-le-jeton-GitHub.bat." }
      Write-Line $msg 'Yellow'; Show-Toast 'Replay Rocket League' $msg
    }
  } catch { }
}
function Stop-NeedsInput([string]$what) {
  # lance cache au demarrage (-Quiet) : aucune fenetre pour taper une cle -> on le dit au lieu d'attendre indefiniment
  $msg = "$what manquant ou illisible : lance $(if ($what -like '*GitHub*') { '4-Changer-le-jeton-GitHub.bat' } else { '2-Lancer-maintenant.bat' }) pour le saisir."
  Write-Line $msg 'Red'; Show-Toast 'Replay Rocket League' $msg
  exit 1
}
function Get-GhToken($cfg, [switch]$Force) {
  if ($env:GT_GITHUB_TOKEN -and -not $IsWin) { return $env:GT_GITHUB_TOKEN }  # tests Linux uniquement
  if ($cfg.gh -and -not $Force) { try { return (Unprotect-Str $cfg.gh) } catch { } }
  if ($Quiet -and -not $Force) { Stop-NeedsInput 'Jeton GitHub' }
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
  $dirs = @()
  # dossiers en plus choisis dans config.json ("demos" : chemin ou liste), v2.0.3 : le raccourci de demarrage ne passe pas -DemosDir
  foreach ($x in @($script:Cfg.demos)) { if ($x -and (Test-Path -LiteralPath ([string]$x)) -and ($dirs -notcontains [string]$x)) { $dirs += [string]$x } }
  $docs = @([Environment]::GetFolderPath('MyDocuments'))
  if ($env:USERPROFILE) { $docs += (Join-Path $env:USERPROFILE 'Documents') }
  if ($env:OneDrive) { $docs += (Join-Path $env:OneDrive 'Documents'); $docs += (Join-Path $env:OneDrive 'Documents\Documents') }
  if ($env:OneDriveConsumer) { $docs += (Join-Path $env:OneDriveConsumer 'Documents') }
  if ($env:OneDriveCommercial) { $docs += (Join-Path $env:OneDriveCommercial 'Documents') }
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
  # fichier completement ecrit (v2.0.3) : taille stable sur deux lectures, puis ouverture en lecture partagee.
  # Le jeu garde un verrou d'ecriture tant qu'il ecrit (l'ouverture echoue) ; OneDrive, qui lit pour synchroniser, ne bloque plus.
  if ($f.Length -lt 1024) { return $false }
  $key = $f.FullName
  if ($f.LastWriteTime -gt (Get-Date).AddSeconds(-60)) {
    if ($Once -or $DryRun) { $s1 = $f.Length; Start-Sleep -Seconds 3; $f.Refresh(); if ($f.Length -ne $s1) { return $false } }
    elseif (-not $script:SeenSize.ContainsKey($key) -or $script:SeenSize[$key] -ne $f.Length) { $script:SeenSize[$key] = $f.Length; return $false }   # 2e lecture au passage suivant, sans attente
  }
  try { $fs = [IO.File]::Open($f.FullName, 'Open', 'Read', 'Read'); $fs.Close(); [void]$script:SeenSize.Remove($key); return $true } catch { return $false }
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
  foreach ($e in @($cfg.epic)) { if ($e) { $a += @('--me-epic', [string]$e) } }   # un ou plusieurs comptes Epic
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

function Read-Fails {
  # derniere ligne par replay et par version de l'analyseur : nom:taille|code|version|date|essais|definitif
  $fails = @{}
  if (Test-Path $FailLog) {
    foreach ($l in Get-Content $FailLog) {
      $p = $l -split '\|'; if ($p.Count -lt 4) { continue }
      $n = $MaxAnalyzeTries; $perm = $true                      # ancien format (v2.0.2) : echec fige pour cette version
      if ($p.Count -ge 6) { $n = [int]$p[4]; $perm = ($p[5] -eq '1') }
      $d = [DateTime]::MinValue; try { $d = [DateTime]::Parse($p[3], [Globalization.CultureInfo]::InvariantCulture) } catch { }
      $fails[$p[0] + '|' + $p[2]] = @{ code = [int]$p[1]; n = $n; perm = $perm; at = $d }
    }
  }
  return $fails
}
function Test-PermanentFailure([int]$code, [string]$err) {
  # definitif seulement si le fichier lui-meme est en cause : replay illisible (code 4) ou trop court.
  # "joueur introuvable", fichier encore pris, exe en cours de remplacement, compteurs illisibles : nouvel essai.
  return ($code -eq 4 -or $err -match 'trop court')
}
function Invoke-AnalyzePass($files) {
  $known = Read-KeySet $AnLog
  $fails = Read-Fails
  $ver = Get-AnalyzerVersion; $n = 0
  foreach ($f in $files) {
    $key = '{0}:{1}' -f $f.Name, $f.Length
    if ($known.ContainsKey($key)) { continue }
    $fk = $key + '|' + $ver; $prev = $null
    if ($fails.ContainsKey($fk)) {
      $prev = $fails[$fk]
      if ($prev.perm -or $prev.n -ge $MaxAnalyzeTries) { continue }      # abandonne pour cette version (-RetryFailed pour reessayer)
      $wait = 5 * [Math]::Pow(4, $prev.n - 1)                              # 5 min puis 20 min entre deux essais
      if ((Get-Date) -lt $prev.at.AddMinutes($wait)) { continue }
    }
    if ($f.LastWriteTime.AddDays(1).ToString('yyyy-MM-dd') -lt $script:Cfg.minDate) { continue }   # bien trop ancien (date exacte du match verifiee apres analyse)
    if (-not (Test-FileReady $f)) { continue }
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ('rla-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tmp -Force | Out-Null
    try {
      $r = Invoke-Analyze $f $null $tmp
      if ($r.code -ne 0 -or -not $r.id -or -not (Test-Path (Join-Path $tmp ($r.id + '.idx.json')))) {
        $msg = (([string]$r.err).Trim() -split "`n" | Select-Object -First 1)
        $tries = 1; if ($prev) { $tries = $prev.n + 1 }
        $perm = Test-PermanentFailure $r.code $msg
        $what = "essai $tries/$MaxAnalyzeTries, nouvel essai plus tard"
        if ($perm) { $what = 'definitif' } elseif ($tries -ge $MaxAnalyzeTries) { $what = "abandon apres $tries essais : 3-Reessayer-les-analyses.bat pour relancer" }
        Write-Line ("Analyse impossible ({0}, code {1}, {2}) : {3}" -f $f.Name, $r.code, $what, $msg) 'Yellow'
        if (-not $DryRun) { Add-Content -Path $FailLog -Value ('{0}|{1}|{2}|{3}|{4}|{5}' -f $key, $r.code, $ver, (Get-Date -Format s), $tries, $(if ($perm) { 1 } else { 0 })) -Encoding UTF8 }
        continue
      }
      $idxFile = Join-Path $tmp ($r.id + '.idx.json')
      # date reelle du match (heure locale du replay) plutot que la date du fichier (v2.0.3)
      $mj = $null; try { $mj = Get-Content $idxFile -Raw | ConvertFrom-Json } catch { }
      if ($mj -and $mj.date_local -and ([string]$mj.date_local).Length -ge 10 -and ([string]$mj.date_local).Substring(0, 10) -lt $script:Cfg.minDate) {
        if (-not $DryRun) { Add-Content -Path $AnLog -Value ('{0}|{1}|old|{2}' -f $key, $r.id, (Get-Date -Format s)) -Encoding UTF8 }
        continue
      }
      $sum = Format-Summary $idxFile
      if ($DryRun) { Write-Line ("[test] serait envoye a l'app : {0} ({1}) -> {2}" -f $f.Name, $r.id, $sum) 'Yellow'; $n++; continue }
      Move-Item (Join-Path $tmp ($r.id + '.json')) (Join-Path $QueueDir ($r.id + '.json')) -Force
      Move-Item $idxFile (Join-Path $QueueDir ($r.id + '.idx.json')) -Force
      Add-Content -Path $AnLog -Value ('{0}|{1}|queued|{2}' -f $key, $r.id, (Get-Date -Format s)) -Encoding UTF8
      Write-Line ("Analyse : {0} -> {1}" -f $f.Name, $sum) 'Cyan'; $n++
    } finally { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
  }
  return $n
}
function Invoke-RetryFailed {
  $nf = 0; if (Test-Path $FailLog) { $nf = @(Get-Content $FailLog).Count; Move-Item $FailLog ($FailLog + '.old') -Force }
  $nq = 0
  if (Test-Path $FailedDir) {
    foreach ($it in @(Get-ChildItem -Path $FailedDir -File -ErrorAction SilentlyContinue)) { Move-Item $it.FullName (Join-Path $QueueDir $it.Name) -Force; $nq++ }
  }
  if (Test-Path $PutFails) { Remove-Item $PutFails -Force -ErrorAction SilentlyContinue }
  Write-Line ("Echecs effaces : {0} ligne(s) d'analyse (analyzed.log intact), {1} fichier(s) remis dans la file. Nouvel essai au prochain passage." -f $nf, $nq) 'Green'
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
function Add-PutFailure([string]$id) {
  $m = @{}
  if (Test-Path $PutFails) { foreach ($l in Get-Content $PutFails) { $p = $l -split '\|'; if ($p.Count -ge 2) { $m[$p[0]] = [int]$p[1] } } }
  $m[$id] = 1 + [int]$m[$id]
  Set-Content -Path $PutFails -Value @($m.Keys | ForEach-Object { '{0}|{1}' -f $_, $m[$_] }) -Encoding ASCII
  return $m[$id]
}
function Move-ToFailed([string]$id) {
  if (-not (Test-Path $FailedDir)) { New-Item -ItemType Directory -Path $FailedDir -Force | Out-Null }
  foreach ($n in ($id + '.json'), ($id + '.idx.json')) { $src = Join-Path $QueueDir $n; if (Test-Path $src) { Move-Item $src (Join-Path $FailedDir $n) -Force } }
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
      if ($m.code -eq 200 -or $m.code -eq 404) { Save-TokenExpiry $m.exp; $script:TokenCheckAt = Get-Date }
      $sha = $null; $cur = Join-Path $work 'index-cur.json'
      if ($m.code -eq 404) { Set-Content -Path $cur -Value '' -Encoding ASCII }
      elseif ($m.code -eq 200 -and $mj -and $mj.sha) {
        $sha = $mj.sha
        $raw = Invoke-GH 'GET' $idxPath $token $null 'application/vnd.github.raw+json'
        if ($raw.code -ne 200) { Remove-Item $raw.file -Force -ErrorAction SilentlyContinue; Set-Backoff; return 0 }
        Move-Item $raw.file $cur -Force
      }
      elseif ($m.code -eq 401 -or ($m.code -eq 403 -and -not $m.limit)) { $script:GhDisabled = $true; Write-Line 'Jeton GitHub refuse : analyses mises en file d''attente. Relance avec -ResetToken.' 'Red'; Show-Toast 'Replay Rocket League' 'Jeton GitHub refuse : relance 4-Changer-le-jeton-GitHub.bat'; return 0 }
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
        # fiche refusee : apres $MaxPutTries echecs elle est ecartee (queue\failed) pour ne pas bloquer les suivantes (v2.0.3)
        if ($p.code -ne 0 -and -not $p.limit -and (Add-PutFailure $id) -ge $MaxPutTries) {
          Move-ToFailed $id
          Write-Line ("Fiche {0} refusee {1} fois par GitHub (HTTP {2}) : ecartee dans queue\failed, la file continue (3-Reessayer-les-analyses.bat pour la remettre)." -f $id, $MaxPutTries, $p.code) 'Red'
          return 0
        }
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
    # verification legere du jeton au demarrage puis 1 fois par jour (date d'expiration), meme sans replay a envoyer
    if (((Get-Date) - $script:TokenCheckAt).TotalHours -ge 24) { $script:TokenCheckAt = Get-Date; try { [void](Test-GhToken $ghToken $script:Cfg.repo) } catch { } }
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
function Restart-Background {
  # apres un changement de jeton : l'uploader deja lance en arriere-plan garde l'ancien jeton en memoire -> on le relance
  if (-not $IsWin) { return }
  $others = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*rl-replay-uploader.ps1*' -and $_.ProcessId -ne $PID })
  if ($others.Count -eq 0) { return }
  Stop-Others
  $ps1 = Join-Path (Join-Path $env:LOCALAPPDATA $AppName) 'rl-replay-uploader.ps1'; if (-not (Test-Path $ps1)) { $ps1 = $PSCommandPath }
  $pp = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  Start-Process -FilePath $pp -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File', $ps1, '-Quiet') -WindowStyle Hidden
  Write-Line 'Uploader en arriere-plan relance avec le nouveau jeton.' 'Green'
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
  Protect-Dir $dest   # v2.0.3 : comme la config, le dossier du script lance au demarrage n'est modifiable que par ton compte
  $startup = [Environment]::GetFolderPath('Startup')
  $lnk = Join-Path $startup 'RL Replay Uploader.lnk'
  $ws = New-Object -ComObject WScript.Shell
  $s = $ws.CreateShortcut($lnk)
  $s.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $s.Arguments = ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -Quiet' -f (Join-Path $dest 'rl-replay-uploader.ps1'))
  $s.WorkingDirectory = $dest; $s.WindowStyle = 7; $s.Description = 'Analyse locale des replays Rocket League + envoi a l''app'
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
$AllowedUpdateFiles = @('rl-replay-uploader.ps1', 'rl-analyzer.exe', 'LISEZ-MOI.txt', '1-Installer.bat', '2-Lancer-maintenant.bat', '3-Reessayer-les-analyses.bat', '4-Changer-le-jeton-GitHub.bat', '5-Tester-un-replay.bat', '6-Voir-letat.bat', '7-Mettre-a-jour.bat', '8-Desinstaller.bat')
function Get-Sha([string]$path) { return (Get-FileHash -Path $path -Algorithm SHA256).Hash.ToLower() }
function Invoke-SelfUpdate {
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ('rlu-' + [Guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Path $tmp -Force | Out-Null
  try {
    $mf = Join-Path $tmp 'latest.json'
    $c = & $Curl -s -S -L --max-time 60 -o $mf -w '%{http_code}' ($RawBase + '/latest.json')
    if ([int]$c -ne 200) { throw "Impossible de lire latest.json (HTTP $c)." }
    $m = Get-Content $mf -Raw | ConvertFrom-Json
    $changed = @()
    $root = [IO.Path]::GetFullPath($ScriptDir).TrimEnd('\', '/')
    foreach ($p in $m.files.PSObject.Properties) {
      # liste blanche (v2.0.3) : seuls les fichiers de l'outil, dans ce dossier ; empreinte SHA-256 obligatoire
      if ($AllowedUpdateFiles -notcontains $p.Name) { throw "Fichier inattendu dans latest.json : $($p.Name). Mise a jour annulee." }
      if ([string]$p.Value -notmatch '^[0-9a-f]{64}$') { throw "Empreinte invalide pour $($p.Name) dans latest.json. Mise a jour annulee." }
      $target = Join-Path $ScriptDir $p.Name
      if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($target)).TrimEnd('\', '/') -ne $root) { throw "Chemin hors du dossier de l'outil : $($p.Name). Mise a jour annulee." }
      if ((Test-Path $target) -and ((Get-Sha $target) -eq $p.Value)) { continue }
      $dl = Join-Path $tmp $p.Name
      $c = & $Curl -s -S -L --max-time 300 -o $dl -w '%{http_code}' ($RawBase + '/' + $p.Name)
      if ([int]$c -ne 200) { throw "Telechargement de $($p.Name) impossible (HTTP $c)." }
      if ((Get-Sha $dl) -ne $p.Value) { throw "Empreinte SHA-256 incorrecte pour $($p.Name) : mise a jour annulee." }
      $changed += $p.Name
    }
    if ($changed.Count -eq 0) { Write-Line ('Deja a jour (version ' + $m.version + ').') 'Green'; return }
    $bakDir = Join-Path $ScriptDir 'backups'
    New-Item -ItemType Directory -Force -Path $bakDir | Out-Null
    foreach ($n in $changed) {
      $target = Join-Path $ScriptDir $n
      if (Test-Path $target) {
        $h = (Get-Sha $target).Substring(0, 8)
        $bak = Join-Path $bakDir ('{0}-{1}-{2}.bak' -f $n, (Get-Date -Format 'yyyyMMdd-HHmmss'), $h)
        Copy-Item $target $bak -Force
      }
    }
    Stop-Others
    foreach ($n in $changed) { Copy-Item (Join-Path $tmp $n) (Join-Path $ScriptDir $n) -Force }
    if ($env:LOCALAPPDATA -and $root -eq [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA $AppName)).TrimEnd('\', '/')) { Protect-Dir $root }
    Write-Line ('Mis a jour vers la version {0} : {1}.' -f $m.version, ($changed -join ', ')) 'Green'
    if ($IsWin) {
      $pp = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
      $newPs1 = Join-Path $ScriptDir 'rl-replay-uploader.ps1'
      Start-Process -FilePath $pp -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File', $newPs1, '-Quiet') -WindowStyle Hidden
      Write-Line 'Uploader relance en arriere-plan avec la nouvelle version.' 'Green'
    }
  } finally { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}

# ---------------- main ----------------
Ensure-Dirs
if ($Uninstall) { Uninstall-Startup; return }
if ($Update) { Invoke-SelfUpdate; return }
if ($BallchasingOff) { $c0 = Read-Cfg; $c0.bc = $false; Save-Cfg $c0; Write-Line 'Envoi vers ballchasing : desactive' 'Green'; return }
if ($BallchasingOn) {
  # v2.0.3 : active seulement avec une cle valide (cle enregistree verifiee, sinon saisie)
  $c0 = Read-Cfg; $k = $null
  if ($c0.key) { try { $k = Unprotect-Str $c0.key } catch { } }
  if ($k -and (Test-BcKey $k) -eq 200) { $c0.bc = $true; Save-Cfg $c0 } else { [void](Get-BcKey $c0 -Force); $c0 = Read-Cfg }
  Write-Line ('Envoi vers ballchasing : ' + $(if ($c0.bc) { 'active' } else { 'desactive' })) 'Green'; return
}
if ($RetryFailed) { Invoke-RetryFailed; return }
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
    Write-Line ("Rien n'a ete envoye. Fichiers de test gardes pour inspection : {0} (supprimes automatiquement apres 7 jours)" -f $tmp) 'DarkGray'
    exit 0
  } finally { }
}

if ($Status) {
  Write-Host ("Version uploader {0} | analyseur {1}" -f $UploaderVersion, $ver)
  $dd = @(Get-DemoDirs); Write-Host ("Dossiers surveilles : {0}" -f $(if ($dd.Count) { $dd -join ' ; ' } else { 'aucun pour l''instant (ajoute "demos" dans config.json si tes replays sont ailleurs)' }))
  Write-Host ("En file d'attente : {0}" -f @(Get-ChildItem $QueueDir -Filter '*.idx.json' -File -ErrorAction SilentlyContinue).Count)
  $nfq = @(Get-ChildItem $FailedDir -Filter '*.idx.json' -File -ErrorAction SilentlyContinue).Count
  if ($nfq) { Write-Host ("Fiches ecartees (refusees par GitHub) : {0} -> 3-Reessayer-les-analyses.bat" -f $nfq) -ForegroundColor Yellow }
  $fl = Read-Fails; $fv = @($fl.Keys | Where-Object { $_.EndsWith('|' + $ver) })
  $fperm = @($fv | Where-Object { $fl[$_].perm }).Count; $fstop = @($fv | Where-Object { -not $fl[$_].perm -and $fl[$_].n -ge $MaxAnalyzeTries }).Count; $fretry = $fv.Count - $fperm - $fstop
  if ($fv.Count) { Write-Host ("Analyses en echec ({0}) : {1} definitif(s), {2} abandonne(s) apres {3} essais, {4} a reessayer -> 3-Reessayer-les-analyses.bat" -f $ver, $fperm, $fstop, $MaxAnalyzeTries, $fretry) -ForegroundColor Yellow }
  Write-Host ("Envoyes a l'app : {0}" -f (Read-KeySet $PushLog).Keys.Count)
  Write-Host ("ballchasing : {0}" -f $(if ($script:Cfg.bc) { 'actif' } else { 'desactive' }))
  if (Test-Path $ExpFile) { $e = ([string](Get-Content $ExpFile -Raw)).Trim(); Write-Host ("Jeton GitHub : expire le {0} (dans {1} j)" -f $e, (Get-DaysLeft $e)) } else { Write-Host 'Jeton GitHub : pas de date d''expiration connue' }
  if (Test-Path $TextLog) { Get-Content $TextLog -Tail 8 }
  return
}

$bcKey = $null
if ($script:Cfg.bc -or $ResetKey) { $bcKey = Get-BcKey $script:Cfg -Force:$ResetKey; $script:Cfg = Read-Cfg }
$ghToken = $null
if (-not $DryRun) { $ghToken = Get-GhToken $script:Cfg -Force:$ResetToken; $script:Cfg = Read-Cfg }
if ($ResetToken -and $ghToken) { Restart-Background }

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
  $owned = $false
  # v2.0.3 : apres un arret brutal (veille, mise a jour Windows, processus tue), le verrou est "abandonne" :
  # WaitOne leve AbandonedMutexException MAIS nous en devenons proprietaires -> on continue (avant : arret silencieux)
  try { $owned = $mtx.WaitOne(0) }
  catch [System.Threading.AbandonedMutexException] { $owned = $true; Write-Line 'Verrou laisse par un arret brutal precedent : repris, la surveillance continue.' 'Yellow' }
  if (-not $owned) { Write-Line 'Deja en cours d''execution.' 'Yellow'; return }
}
Clear-OldTemp
foreach ($lf in $LogFile, $AnLog, $PushLog, $FailLog) { Limit-Log $lf }
try {
  $dirs = Get-DemoDirs
  if (-not $dirs) { Write-Line 'Dossier des replays introuvable pour l''instant (Documents\My Games\Rocket League\TAGame\DemosEpic pour Epic, ou \Demos pour Steam). Il sera cree a ton 1er replay sauvegarde ; surveillance active.' 'Yellow' }
  else { Write-Line ('Surveillance : ' + ($dirs -join ' ; ') + '  [uploader ' + $UploaderVersion + ', analyseur ' + $ver + ']') 'Cyan' }
  $n = Invoke-Pass $bcKey $ghToken
  Write-Line ("Rattrapage termine : {0} replay(s) analyse(s)." -f $n) 'Cyan'
  if ($Once -or $DryRun) { return }
  while ($true) { Start-Sleep -Seconds $IntervalSec; [void](Invoke-Pass $bcKey $ghToken) }
} finally { Close-Toast; if ($mtx) { try { $mtx.ReleaseMutex() } catch { } } }
