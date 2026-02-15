# Prime Ops Web Server Troubleshooting

## Server Details
- **Server IP**: 31.97.228.226
- **Port**: 5173
- **Status**: Server is reachable (ping successful) but port 5173 is not responding

## Problem
The website at http://31.97.228.226:5173 is not accessible because:
1. No process is listening on port 5173
2. The PM2 process "prime.client" is likely stopped or crashed

## Solution Steps

### Option 1: SSH into the server and restart manually

1. **Connect to the server** (try these usernames in order):
   ```bash
   ssh root@31.97.228.226
   # OR
   ssh jenkins@31.97.228.226
   # OR
   ssh ubuntu@31.97.228.226
   # OR
   ssh admin@31.97.228.226
   ```

2. **Once connected, check PM2 status**:
   ```bash
   pm2 list
   ```

3. **Run the restart script**:
   ```bash
   cd /var/lib/jenkins/workspace/prime-ops-web
   # OR wherever the project is located
   bash restart-server.sh
   ```

4. **Or restart manually**:
   ```bash
   pm2 restart prime.client
   # OR if that doesn't work:
   pm2 delete prime.client
   pm2 start npx --name prime.client -- serve -s dist -l 5173
   pm2 save
   ```

### Option 2: Check and restart through Jenkins

If you have access to Jenkins:
1. Go to your Jenkins dashboard
2. Find the "prime-ops-web" job
3. Click "Build Now" to redeploy

### Option 3: Check server logs

```bash
# SSH into server first
ssh root@31.97.228.226

# Check PM2 logs
pm2 logs prime.client

# Check if anything is using port 5173
lsof -i:5173

# Check system logs
journalctl -u pm2-* --no-pager -n 50
```

## Common Issues and Fixes

### Issue: PM2 process crashed
```bash
pm2 restart prime.client
```

### Issue: Port 5173 is occupied by another process
```bash
lsof -ti:5173 | xargs kill -9
pm2 restart prime.client
```

### Issue: dist/ folder missing
```bash
cd /var/lib/jenkins/workspace/prime-ops-web
npm run build
pm2 restart prime.client
```

### Issue: PM2 not running at all
```bash
pm2 resurrect
# OR
pm2 start npx --name prime.client -- serve -s dist -l 5173
pm2 save
pm2 startup
```

## Firewall Check

If the service is running but still not accessible:
```bash
# Check firewall status
sudo ufw status

# Allow port 5173 if needed
sudo ufw allow 5173/tcp
```

## Quick One-liner Fix (if you have SSH access)

```bash
ssh root@31.97.228.226 "cd /var/lib/jenkins/workspace/prime-ops-web && pm2 restart prime.client || pm2 start npx --name prime.client -- serve -s dist -l 5173"
```

## Contact
If you need the SSH password or key, check your password manager or server documentation.
