#!/usr/bin/env bash

# ==============================================================================
# AdosX Take-Home — Environment & Prerequisites Checker
# ==============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo -e "${BOLD}${CYAN}   AdosX Reconciliation — System Prerequisites Check  ${NC}"
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo ""

# Tracking variables
DOCKER_OK=0
COMPOSE_OK=0
PYTHON_OK=0
UV_OK=0
NODE_OK=0
NPM_OK=0

# 1. Check Docker
echo -e "${BOLD}1. Checking Container Tools (Option A: Docker):${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VER=$(docker --version)
    echo -e "   [${GREEN}✓ PASS${NC}] Docker is installed: ${DOCKER_VER}"
    DOCKER_OK=1
else
    echo -e "   [${RED}✗ FAIL${NC}] Docker is NOT installed or not in PATH."
fi

if docker compose version &> /dev/null; then
    COMPOSE_VER=$(docker compose version)
    echo -e "   [${GREEN}✓ PASS${NC}] Docker Compose is available: ${COMPOSE_VER}"
    COMPOSE_OK=1
elif command -v docker-compose &> /dev/null; then
    COMPOSE_VER=$(docker-compose --version)
    echo -e "   [${GREEN}✓ PASS${NC}] docker-compose is available: ${COMPOSE_VER}"
    COMPOSE_OK=1
else
    echo -e "   [${RED}✗ FAIL${NC}] Docker Compose is NOT installed."
fi

echo ""

# 2. Check Local Tools (Option B: Local Non-Docker)
echo -e "${BOLD}2. Checking Local Backend Tools (Python & uv):${NC}"
if command -v python3 &> /dev/null; then
    PY_VER=$(python3 --version)
    echo -e "   [${GREEN}✓ PASS${NC}] Python 3 is installed: ${PY_VER}"
    PYTHON_OK=1
elif command -v python &> /dev/null; then
    PY_VER=$(python --version)
    echo -e "   [${GREEN}✓ PASS${NC}] Python is installed: ${PY_VER}"
    PYTHON_OK=1
else
    echo -e "   [${RED}✗ FAIL${NC}] Python 3 is NOT installed."
fi

if command -v uv &> /dev/null; then
    UV_VER=$(uv --version)
    echo -e "   [${GREEN}✓ PASS${NC}] uv package manager is installed: ${UV_VER}"
    UV_OK=1
else
    echo -e "   [${YELLOW}! WARN${NC}] uv is NOT installed. (Install via: curl -LsSf https://astral.sh/uv/install.sh | sh)"
fi

echo ""

echo -e "${BOLD}3. Checking Local Frontend Tools (Node.js & npm):${NC}"
if command -v node &> /dev/null; then
    NODE_VER=$(node -v)
    echo -e "   [${GREEN}✓ PASS${NC}] Node.js is installed: ${NODE_VER}"
    NODE_OK=1
else
    echo -e "   [${RED}✗ FAIL${NC}] Node.js is NOT installed (required: Node 18+ or 20+)."
fi

if command -v npm &> /dev/null; then
    NPM_VER=$(npm -v)
    echo -e "   [${GREEN}✓ PASS${NC}] npm is installed: ${NPM_VER}"
    NPM_OK=1
else
    echo -e "   [${RED}✗ FAIL${NC}] npm is NOT installed."
fi

echo ""
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo -e "${BOLD}${CYAN}   RECOMMENDED EXECUTION PATH                         ${NC}"
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo ""

# Evaluation
if [ $DOCKER_OK -eq 1 ] && [ $COMPOSE_OK -eq 1 ]; then
    echo -e "${GREEN}${BOLD}✓ OPTION A: Run with Docker (RECOMMENDED - 100% Ready)${NC}"
    echo -e "  Zero local dependencies required. Starts backend, imports CSVs, and starts Next.js frontend:"
    echo ""
    echo -e "    ${BOLD}docker compose up --build${NC}"
    echo ""
    echo -e "  Then open: ${CYAN}http://localhost:3000${NC}"
    echo ""
else
    echo -e "${YELLOW}! OPTION A (Docker): Docker or Docker Compose is missing.${NC}"
    echo -e "  To use Docker, install Docker Desktop from https://www.docker.com/"
    echo ""
fi

if [ $PYTHON_OK -eq 1 ] && [ $UV_OK -eq 1 ] && [ $NODE_OK -eq 1 ] && [ $NPM_OK -eq 1 ]; then
    echo -e "${GREEN}${BOLD}✓ OPTION B: Run Locally without Docker (100% Ready)${NC}"
    echo -e "  All local prerequisites (Python, uv, Node, npm) are satisfied."
    echo ""
    echo -e "  1. Start Backend (Terminal 1):"
    echo -e "     ${BOLD}cd backend && uv sync && uv run python manage.py migrate && uv run python manage.py import_csv && uv run python manage.py runserver${NC}"
    echo ""
    echo -e "  2. Start Frontend (Terminal 2):"
    echo -e "     ${BOLD}cd frontend && npm install && npm run dev${NC}"
    echo ""
    echo -e "  Then open: ${CYAN}http://localhost:3000${NC}"
else
    echo -e "${YELLOW}! OPTION B (Local Run): Some prerequisites are missing.${NC}"
    if [ $UV_OK -eq 0 ]; then
        echo -e "  - Missing ${BOLD}uv${NC}: Run ${CYAN}curl -LsSf https://astral.sh/uv/install.sh | sh${NC}"
    fi
    if [ $PYTHON_OK -eq 0 ]; then
        echo -e "  - Missing ${BOLD}Python 3.12+${NC}: Install via your package manager or https://www.python.org/"
    fi
    if [ $NODE_OK -eq 0 ] || [ $NPM_OK -eq 0 ]; then
        echo -e "  - Missing ${BOLD}Node.js / npm${NC}: Install Node 20 LTS from https://nodejs.org/"
    fi
fi

echo ""
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo ""
