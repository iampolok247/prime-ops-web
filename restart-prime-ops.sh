#!/bin/bash
# This script will work once SSH key authentication is set up

set -e

SERVER="root@31.97.228.226"
PORT=5173

echo "🔧 Prime Ops Web - Automated Server Restart"
echo "==========================================="
echo ""

# Test SSH connection
echo "🔍 Testing SSH connection..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 $SERVER "echo 'Connected'" 2>/dev/null; then
    echo "✅ SSH connection successful (passwordless)"
else
    echo "❌ SSH connection failed"
    echo ""
    echo "Please set up SSH key first by running:"
    echo "  ./setup-ssh-key.sh"
    echo ""
    echo "Or manually connect and add the key to ~/.ssh/authorized_keys"
    exit 1
fi

echo ""
echo "🚀 Restarting Prime Ops Web service..."
echo ""

ssh $SERVER << 'ENDSSH'
echo "📊 Current PM2 status:"
pm2 list

echo ""
echo "🛑 Stopping prime.client..."
pm2 stop prime.client 2>/dev/null || echo "Process not running"

echo ""
echo "🗑️  Deleting prime.client..."
pm2 delete prime.client 2>/dev/null || echo "Process not found"

echo ""
echo "🔪 Killing stray processes on port 5173..."
pkill -9 -f 'serve.*5173' 2>/dev/null || echo "No stray processes"
lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "Port 5173 is free"

sleep 2

echo ""
echo "📍 Finding project directory..."
if [ -d "/var/lib/jenkins/workspace/prime-ops-web" ]; then
    cd /var/lib/jenkins/workspace/prime-ops-web
elif [ -d "/root/prime-ops-web" ]; then
    cd /root/prime-ops-web
elif [ -d "/home/jenkins/prime-ops-web" ]; then
    cd /home/jenkins/prime-ops-web
else
    echo "❌ Could not find prime-ops-web directory"
    echo "Searching for it..."
    find / -name "prime-ops-web" -type d 2>/dev/null | head -5
    exit 1
fi

echo "Current directory: $(pwd)"

echo ""
echo "📦 Checking dist folder..."
if [ ! -d "dist" ]; then
    echo "⚠️  dist folder not found. Running build..."
    npm run build
fi

ls -la dist/ | head -5

echo ""
echo "🎯 Starting PM2 service..."
pm2 start npx --name prime.client -- serve -s dist -l 5173

sleep 3

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "📊 Final PM2 status:"
pm2 list

echo ""
echo "🔍 Verifying port 5173..."
lsof -i:5173 || netstat -tuln | grep 5173 || ss -tuln | grep 5173

echo ""
echo "🧪 Testing local connection..."
curl -I http://localhost:5173 2>&1 | head -5

echo ""
echo "✅ Service restart complete!"
ENDSSH

echo ""
echo "==========================================="
echo "🌐 Testing external connection..."
sleep 2

if curl -I "http://31.97.228.226:$PORT" --connect-timeout 10 2>/dev/null | head -1; then
    echo ""
    echo "✅ SUCCESS! Website is now accessible!"
    echo "🔗 http://31.97.228.226:$PORT"
else
    echo ""
    echo "⚠️  Website might not be externally accessible yet."
    echo "This could be due to:"
    echo "  - Firewall blocking port $PORT"
    echo "  - Service still starting up (wait 30 seconds and try again)"
    echo ""
    echo "Check server logs with:"
    echo "  ssh $SERVER 'pm2 logs prime.client'"
fi

echo ""
echo "==========================================="
