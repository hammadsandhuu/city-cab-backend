#!/usr/bin/env bash
# One-time: clone this repo on the VPS and prepare Docker deploy
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/hammadsandhuu/city-airport-taxis.git}"
APP_ROOT="${APP_ROOT:-/opt/city-airport-taxis}"
BACKEND_DIR="${APP_ROOT}/backend"

echo "==> Cloning ${REPO_URL} into ${APP_ROOT}"
if [[ -d "${APP_ROOT}/.git" ]]; then
  echo "Repo already exists — pulling latest"
  git -C "${APP_ROOT}" pull --ff-only
else
  git clone --depth 1 "${REPO_URL}" "${APP_ROOT}"
fi

cd "${BACKEND_DIR}"

if [[ ! -f ".env.production" ]]; then
  echo "Create .env.production on the VPS (copy from your local machine — never commit):"
  echo "  nano ${BACKEND_DIR}/.env.production"
fi

chmod +x deploy/docker-deploy.sh deploy/docker-vps-setup.sh 2>/dev/null || true

echo ""
echo "Next steps:"
echo "  1. nano ${BACKEND_DIR}/.env.production"
echo "  2. sudo bash deploy/docker-vps-setup.sh   # if Docker not installed yet"
echo "  3. Configure GitHub Actions secrets (see .github/DEPLOY.md)"
echo "  4. Push to main OR run 'Backend Deploy' workflow in GitHub Actions"
