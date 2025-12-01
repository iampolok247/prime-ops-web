#!/usr/bin/env sh
set -e

echo 'Building the Vite app...'
set -x
npm run build
set +x

echo 'Starting the production server using PM2...'
set -x

# Get the absolute path to the current directory (Jenkins workspace)
WORKSPACE_DIR=$(pwd)

# Stop and remove existing process
pm2 delete prime.client || true
sleep 1

# Start the serve process with PM2 from the workspace directory
cd $WORKSPACE_DIR
pm2 start "npm run serve" --name prime.client --no-autorestart --cwd $WORKSPACE_DIR
PM2_START_EXIT=$?

set +x

# Check if PM2 start succeeded
if [ $PM2_START_EXIT -ne 0 ]; then
  echo "❌ ERROR: Failed to start prime.client with PM2 (exit code: $PM2_START_EXIT)"
  echo "Checking PM2 logs..."
  pm2 logs prime.client --lines 20 --nostream || true
  exit 1
fi

# Save PM2 config
pm2 save

echo '✅ App running at http://localhost:5173'
echo "Working directory: $WORKSPACE_DIR"
sleep 3

# Verify process is running
if pm2 list | grep -q "prime.client"; then
  echo "✓ prime.client is running"
  pm2 show prime.client | head -20
else
  echo "❌ prime.client is NOT running after start attempt"
  pm2 logs prime.client --lines 30 || true
  exit 1
fi