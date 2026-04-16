# Athlix Unified Stack Setup
# Automates Virtual Env creation, Python dependency installation, and npm setup.

Write-Host "--- ATHLIX: Initialising Stack ---" -ForegroundColor Cyan

# 1. Create Python Virtual Environment in Root
if (!(Test-Path ".venv")) {
    Write-Host "[1/4] Creating Python Virtual Environment..." -ForegroundColor Yellow
    python -m venv .venv
} else {
    Write-Host "[1/4] Virtual Environment exists. Skipping..." -ForegroundColor Green
}

# 2. Install Backend Python Dependencies
Write-Host "[2/4] Installing Python requirements..." -ForegroundColor Yellow
& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt
& ".\.venv\Scripts\python.exe" -m pip install -r ai-backend/requirements.txt # Double-check sub-dir as well

# 3. Install Root NPM Dependencies (concurrently)
Write-Host "[3/4] Installing Root Node dependencies..." -ForegroundColor Yellow
npm install

# 4. Install Frontend NPM Dependencies
Write-Host "[4/4] Installing Frontend Node dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

Write-Host "--- ATHLIX: Stack Initialised Successfully ---" -ForegroundColor Green
Write-Host ">>> Run 'npm run dev' to start the entire pipeline." -ForegroundColor Cyan
