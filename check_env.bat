@echo off
setlocal EnableDelayedExpansion

REM ==============================================================================
REM AdosX Take-Home — Environment & Prerequisites Checker (Windows)
REM ==============================================================================

echo.
echo ======================================================
echo    AdosX Reconciliation - System Prerequisites Check
echo ======================================================
echo.

set DOCKER_OK=0
set COMPOSE_OK=0
set PYTHON_OK=0
set UV_OK=0
set NODE_OK=0
set NPM_OK=0

REM 1. Check Docker
echo 1. Checking Container Tools (Option A: Docker):
where docker >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VER=%%i
    echo    [PASS] Docker is installed: !DOCKER_VER!
    set DOCKER_OK=1
) else (
    echo    [FAIL] Docker is NOT installed or not in PATH.
)

docker compose version >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('docker compose version') do set COMPOSE_VER=%%i
    echo    [PASS] Docker Compose is available: !COMPOSE_VER!
    set COMPOSE_OK=1
) else (
    where docker-compose >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        for /f "tokens=*" %%i in ('docker-compose --version') do set COMPOSE_VER=%%i
        echo    [PASS] docker-compose is available: !COMPOSE_VER!
        set COMPOSE_OK=1
    ) else (
        echo    [FAIL] Docker Compose is NOT installed.
    )
)

echo.

REM 2. Check Python & uv
echo 2. Checking Local Backend Tools (Python and uv):
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('python --version') do set PY_VER=%%i
    echo    [PASS] Python is installed: !PY_VER!
    set PYTHON_OK=1
) else (
    where py >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        for /f "tokens=*" %%i in ('py --version') do set PY_VER=%%i
        echo    [PASS] Python launcher is installed: !PY_VER!
        set PYTHON_OK=1
    ) else (
        echo    [FAIL] Python 3 is NOT installed.
    )
)

where uv >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('uv --version') do set UV_VER=%%i
    echo    [PASS] uv package manager is installed: !UV_VER!
    set UV_OK=1
) else (
    echo    [WARN] uv is NOT installed. (Install via: powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex")
)

echo.

REM 3. Check Node & npm
echo 3. Checking Local Frontend Tools (Node.js and npm):
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
    echo    [PASS] Node.js is installed: !NODE_VER!
    set NODE_OK=1
) else (
    echo    [FAIL] Node.js is NOT installed (required: Node 18+ or 20+).
)

where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
    echo    [PASS] npm is installed: !NPM_VER!
    set NPM_OK=1
) else (
    echo    [FAIL] npm is NOT installed.
)

echo.
echo ======================================================
echo    RECOMMENDED EXECUTION PATH
echo ======================================================
echo.

if %DOCKER_OK% EQU 1 if %COMPOSE_OK% EQU 1 (
    echo [RECOMMENDED] OPTION A: Run with Docker (100%% Ready)
    echo Zero local dependencies required. Starts backend, imports CSVs, and starts Next.js frontend:
    echo.
    echo    docker compose up --build
    echo.
    echo Then open: http://localhost:3000
    echo.
) else (
    echo [NOTICE] OPTION A (Docker): Docker or Docker Compose is missing.
    echo To use Docker, install Docker Desktop for Windows from https://www.docker.com/products/docker-desktop/
    echo.
)

if %PYTHON_OK% EQU 1 if %UV_OK% EQU 1 if %NODE_OK% EQU 1 if %NPM_OK% EQU 1 (
    echo OPTION B: Run Locally without Docker (100%% Ready)
    echo All local prerequisites (Python, uv, Node, npm) are satisfied.
    echo.
    echo 1. Start Backend (Terminal 1):
    echo    cd backend
    echo    uv sync
    echo    uv run python manage.py migrate
    echo    uv run python manage.py import_csv
    echo    uv run python manage.py runserver
    echo.
    echo 2. Start Frontend (Terminal 2):
    echo    cd frontend
    echo    npm install
    echo    npm run dev
    echo.
    echo Then open: http://localhost:3000
) else (
    echo [NOTICE] OPTION B (Local Run): Some prerequisites are missing.
    if %UV_OK% EQU 0 echo   - Missing uv: Install via powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    if %PYTHON_OK% EQU 0 echo   - Missing Python 3.12+: Download from https://www.python.org/
    if %NODE_OK% EQU 0 echo   - Missing Node.js / npm: Download Node 20 LTS from https://nodejs.org/
)

echo.
echo ======================================================
echo.

endlocal
pause
