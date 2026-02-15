#!/bin/bash
# Script to restart the Prime Ops Web frontend server
# Run this on the remote server (31.97.228.226)

echo "🔍 Checking current PM2 status..."
pm2 list

echo ""
echo "🛑 Stopping prime.client..."
pm2 stop prime.client 2>/dev/null || echo "Process not running"

echo ""
echo "🗑️  Deleting prime.client..."
pm2 delete prime.client 2>/dev/null || echo "Process not found"

echo ""
echo "🔪 Killing any stray processes on port 5173..."
pkill -9 -f "serve.*5173" 2>/dev/null || echo "No stray processes found"
lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "Port 5173 is free"

sleep 2

echo ""
echo "🚀 Starting the server..."
cd /var/lib/jenkins/workspace/prime-ops-web || cd ~/prime-ops-web || cd /root/prime-ops-web || {
    echo "❌ Could not find prime-ops-web directory"
    echo "Please update this script with the correct path"
    exit 1
}

echo "📍 Current directory: $(pwd)"
echo "📦 Checking if dist exists..."
ls -la dist/ 2>/dev/null || {
    echo "⚠️  dist/ not found. Building..."
    npm run build
}

echo ""
echo "🎯 Starting PM2 with serve..."
pm2 start npx --name prime.client -- serve -s dist -l 5173

sleep 3

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "📊 PM2 Status:"
pm2 list

echo ""
echo "🔍 Checking if port 5173 is listening..."
sleep 2
lsof -i:5173 || netstat -tuln | grep 5173 || ss -tuln | grep 5173 || echo "⚠️  Could not verify port status"

echo ""
echo "🧪 Testing localhost:5173..."
curl -I http://localhost:5173 2>/dev/null || echo "⚠️  Could not connect to localhost:5173"

echo ""
echo "✅ Script complete!"
echo "📡 Your site should be available at: http://31.97.228.226:5173"
