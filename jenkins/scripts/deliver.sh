#!/usr/bin/env sh
set -e

echo 'Building the Vite app...'
set -x
npm run build
set +x

echo 'Starting the production server using PM2...'
set -x
npm install -g pm2

# Optional: export PM2_HOME=/home/jenkins/.pm2

# Get the absolute path to the current directory (Jenkins workspace)
WORKSPACE_DIR=$(pwd)

pm2 delete prime.client || true
pm2 start "npm --prefix $WORKSPACE_DIR run serve" --name prime.client --no-autorestart
pm2 save
set +x

echo '✅ App running at http://localhost:5173'
echo "Working directory: $WORKSPACE_DIR"
pm2 logs prime.client --lines 5