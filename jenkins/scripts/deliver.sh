#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

echo 'Building the Vite app...'
cd "$WORKSPACE_DIR"
npm run build

echo 'Deploying with PM2...'

# Ensure PM2 is available
which pm2 > /dev/null || npm install -g pm2

# Gracefully stop old process if exists
pm2 stop prime.client 2>/dev/null || true
sleep 1

# Delete old process
pm2 delete prime.client 2>/dev/null || true
sleep 1

# Start the serve process with restart capability
pm2 start "npm run serve" \
  --name prime.client \
  --cwd "$WORKSPACE_DIR" \
  --max-memory-restart 500M \
  --watch false \
  --no-autorestart

# Save PM2 config
pm2 save

echo '✅ Frontend deployed successfully'
echo 'Waiting for serve to start on port 5173...'
sleep 4

# Verify it started
if pm2 list | grep -q "prime.client"; then
  echo "✓ prime.client is running"
  pm2 show prime.client 2>/dev/null || true
else
  echo "⚠️  Checking process status..."
  pm2 list
fi

echo 'Frontend deployment complete'