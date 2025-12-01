#!/usr/bin/env sh
set -e

echo 'Building the Vite app...'
npm run build

echo 'Deploying with PM2...'

# Make sure PM2 is available
which pm2 > /dev/null || npm install -g pm2

# Delete old process if exists (don't fail if it doesn't)
pm2 delete prime.client 2>/dev/null || true

# Wait a moment
sleep 1

# Start the serve process
pm2 start "npm run serve" --name prime.client --no-autorestart

# Save PM2 config to autostart
pm2 save

echo '✅ Frontend deployed successfully'
echo 'Waiting for serve to start...'
sleep 3

# List PM2 processes
pm2 list