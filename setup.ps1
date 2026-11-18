# ==============================================================================
#  ⚡ KEI-NEXUS: ONE-CLICK QUICKSTART INSTALLER (Windows PowerShell) ⚡
#  Challenge Kei Inference — Autonomous AI Agent Ecosystem
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Magenta
Write-Host "  KEI-NEXUS: AUTONOMOUS AI AGENT ECOSYSTEM (1-Click Setup)        " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Magenta

# 1. Check Node.js
Write-Host "`n[1/4] Memeriksa Node.js..." -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js tidak ditemukan! Silakan download & install Node.js v20+ di https://nodejs.org/" -ForegroundColor Red
    Exit 1
}
Write-Host "Node.js terdeteksi: $(node -v)" -ForegroundColor Green

# 2. NPM Install
Write-Host "`n[2/4] Menginstall dependencies (npm install)..." -ForegroundColor Cyan
npm install --no-audit --no-fund

# 3. Configure .env
Write-Host "`n[3/4] Konfigurasi API Key Kei Inference..." -ForegroundColor Cyan
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
}

$needKey = $true
if (Test-Path .env) {
    $existing = Get-Content .env | Select-String "^KEI_API_KEY=(.+)"
    if ($existing -and ($existing.Matches[0].Groups[1].Value -ne "sk-your-key-here")) {
        $ans = Read-Host "API Key sudah terkonfigurasi. Gunakan yang sudah ada? (Y/n)"
        if ($ans -notmatch "^[Nn]$") {
            $needKey = $false
        }
    }
}

if ($needKey) {
    Write-Host "Belum punya key? Minta gratis lewat bot Telegram @KeiInferenceBot" -ForegroundColor Yellow
    $userKey = Read-Host "Masukkan KEI_API_KEY Anda"
    if ($userKey) {
        (Get-Content .env) -replace "^KEI_API_KEY=.*", "KEI_API_KEY=$userKey" | Set-Content .env
        Write-Host "API Key tersimpan ke .env!" -ForegroundColor Green
    }
}

# 4. Build TypeScript
Write-Host "`n[4/4] Melakukan build kompilasi TypeScript..." -ForegroundColor Cyan
npm run build

# 5. Doctor Health Check
Write-Host "`nMenjalankan diagnostik kesehatan..." -ForegroundColor Cyan
npx tsx src/cli/index.ts doctor

# 6. Launcher Menu
Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "  KEI-NEXUS SIAP DIJALANKAN! Pilih opsi yang ingin kamu coba:   " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  1) Buka Web Studio GUI (Browser http://localhost:4100)"
Write-Host "  2) Jalankan Fullstack Security & Architecture Audit"
Write-Host "  3) Jalankan Interactive Slide Deck Generator"
Write-Host "  4) Jalankan Automated Test Suite (Vitest 47/47 passing)"
Write-Host "  5) Keluar"

$choice = Read-Host "`nPilih nomor [1-5] (default 1)"

switch ($choice) {
    "2" {
        npm run workflow:audit
        Write-Host "Selesai! Buka laporan di .workspace\artifacts\audit-report.html" -ForegroundColor Green
    }
    "3" {
        npm run workflow:slides
        Write-Host "Selesai! Buka slide presentasi di .workspace\artifacts\pitch-deck.html" -ForegroundColor Green
    }
    "4" {
        npm test
    }
    "5" {
        Write-Host "Selesai. Jalankan 'npm run studio' kapan saja untuk membuka Web Studio." -ForegroundColor Green
    }
    Default {
        npm run studio
    }
}
