#!/bin/bash
# Interactive script to fix the Prime Ops Web server
# This script will help you connect to the server and restart the service

SERVER="31.97.228.226"
PORT=5173
APP_NAME="prime.client"

echo "🔧 Prime Ops Web Server Fix Script"
echo "===================================="
echo ""
echo "Server: $SERVER"
echo "Port: $PORT"
echo ""

# Function to test SSH connection
test_ssh_connection() {
    local username=$1
    echo "Testing SSH connection as $username..."
    if ssh -o ConnectTimeout=5 -o BatchMode=yes "${username}@${SERVER}" "echo 'Connected'" 2>/dev/null; then
        echo "✅ Successfully connected as $username"
        return 0
    else
        return 1
    fi
}

# Function to restart the service
restart_service() {
    local username=$1
    echo ""
    echo "🚀 Attempting to restart the service on $SERVER..."
    echo ""
    
    ssh "${username}@${SERVER}" << 'ENDSSH'
        echo "📊 Current PM2 status:"
        pm2 list
        
        echo ""
        echo "🛑 Stopping prime.client..."
        pm2 stop prime.client 2>/dev/null || echo "Not running"
        
        echo ""
        echo "🗑️  Deleting prime.client..."
        pm2 delete prime.client 2>/dev/null || echo "Not found"
        
        echo ""
        echo "🔪 Cleaning up port 5173..."
        pkill -9 -f "serve.*5173" 2>/dev/null || echo "No stray processes"
        
        echo ""
        echo "📍 Finding project directory..."
        if [ -d "/var/lib/jenkins/workspace/prime-ops-web" ]; then
            cd /var/lib/jenkins/workspace/prime-ops-web
        elif [ -d "/root/prime-ops-web" ]; then
            cd /root/prime-ops-web
        elif [ -d "~/prime-ops-web" ]; then
            cd ~/prime-ops-web
        else
            echo "❌ Could not find project directory"
            exit 1
        fi
        
        echo "Current directory: $(pwd)"
        
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
        echo "🔍 Checking port 5173..."
        lsof -i:5173 || netstat -tuln | grep 5173 || echo "Cannot verify port"
        
        echo ""
        echo "✅ Done!"
ENDSSH
    
    return $?
}

# Try common usernames
echo "🔍 Attempting to find correct SSH username..."
echo ""

USERNAMES=("root" "jenkins" "ubuntu" "admin" "prime")

for username in "${USERNAMES[@]}"; do
    if test_ssh_connection "$username"; then
        SSH_USER="$username"
        break
    fi
done

if [ -z "$SSH_USER" ]; then
    echo ""
    echo "❌ Could not automatically connect to the server."
    echo ""
    echo "Please enter the SSH username manually:"
    read -p "Username: " SSH_USER
    
    if [ -z "$SSH_USER" ]; then
        echo "No username provided. Exiting."
        exit 1
    fi
fi

echo ""
echo "📡 Using username: $SSH_USER"
echo ""
read -p "Press Enter to continue with the restart, or Ctrl+C to cancel..."

# Restart the service
if restart_service "$SSH_USER"; then
    echo ""
    echo "✅ Service restart complete!"
    echo ""
    echo "🌐 Testing website..."
    sleep 3
    
    if curl -I "http://${SERVER}:${PORT}" --connect-timeout 10 2>/dev/null | head -1; then
        echo ""
        echo "✅ Website is now accessible!"
        echo "🔗 http://${SERVER}:${PORT}"
    else
        echo ""
        echo "⚠️  Website is still not accessible."
        echo "Please check the server logs:"
        echo "  ssh ${SSH_USER}@${SERVER} 'pm2 logs prime.client'"
    fi
else
    echo ""
    echo "❌ Failed to restart service."
    echo "Please try manually:"
    echo "  ssh ${SSH_USER}@${SERVER}"
    exit 1
fi
