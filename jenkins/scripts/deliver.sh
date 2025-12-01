#!/bin/bash
set -e

WORKSPACE_DIR="$(pwd)"
echo "Workspace: $WORKSPACE_DIR"
ls -la "$WORKSPACE_DIR" | head -10

echo 'Building the Vite app...'
cd "$WORKSPACE_DIR"
npm run build
echo "Build complete. Checking dist..."
ls -la "$WORKSPACE_DIR/dist" | head -5

echo 'Ensuring serve is installed...'
npm list serve || npm install serve

echo 'Stopping and removing old PM2 process...'
pm2 stop prime.client 2>/dev/null || echo "Process not running (OK)"
sleep 2
pm2 delete prime.client 2>/dev/null || echo "Process not found (OK)"
sleep 2

echo 'Killing any stray serve processes on port 5173...'
pkill -9 -f "serve.*5173" 2>/dev/null || echo "No stray processes"
sleep 2

echo 'Starting serve with PM2...'
cd "$WORKSPACE_DIR"

# Use npx to explicitly run serve
pm2 start npx --name prime.client -- serve -s dist -l 5173

sleep 3

echo 'Saving PM2 config...'
pm2 save

echo 'Checking PM2 status...'
pm2 list

echo 'Checking if port 5173 is listening...'
sleep 2
netstat -tuln 2>/dev/null | grep 5173 || echo "Port check skipped (netstat not available)"

echo 'Testing localhost:5173...'
curl -m 5 http://localhost:5173 2>/dev/null | head -20 || echo "Could not connect to localhost:5173"

echo '✅ Frontend deployment script complete'