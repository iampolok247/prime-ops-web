# Hostinger hPanel - Server Management Guide

## Problem
Website at http://31.97.228.226:5173 is not accessible because the PM2 service stopped.

## Solution via Hostinger hPanel

### Option 1: Restart via hPanel Terminal (Recommended)

1. **Login to Hostinger hPanel**
   - Go to: https://hpanel.hostinger.com/
   - Login with your Hostinger credentials

2. **Access VPS Management**
   - Go to "VPS" section in the left menu
   - Select your VPS (IP: 31.97.228.226)

3. **Open Browser Terminal**
   - Click on "Browser Terminal" or "SSH Access"
   - This will open a web-based terminal (no password needed if logged into hPanel)

4. **Run these commands in the terminal:**
   ```bash
   pm2 list
   pm2 restart prime.client
   ```

   If that doesn't work, run the full restart:
   ```bash
   pm2 stop prime.client
   pm2 delete prime.client
   cd /var/lib/jenkins/workspace/prime-ops-web || cd /root/prime-ops-web
   pm2 start npx --name prime.client -- serve -s dist -l 5173
   pm2 save
   pm2 list
   ```

### Option 2: Restart VPS (Nuclear option)

1. Login to hPanel: https://hpanel.hostinger.com/
2. Go to VPS section
3. Select your VPS
4. Click "Restart" button
5. Wait 2-3 minutes for the server to come back online
6. PM2 should auto-start all saved processes

### Option 3: Check if PM2 is set to auto-start

If the server restarted and PM2 didn't start:

1. Open hPanel Browser Terminal
2. Run:
   ```bash
   pm2 startup
   pm2 save
   ```

This ensures PM2 starts on boot.

### Option 4: Access via SSH from hPanel

1. Login to hPanel
2. Go to VPS section
3. Look for "SSH Access" or "Root Password"
4. Use the credentials shown there
5. You can either:
   - Use the browser terminal (easiest)
   - Copy the SSH credentials and use them in your local terminal

## Common Hostinger hPanel Locations

- **Main URL**: https://hpanel.hostinger.com/
- **VPS Management**: https://hpanel.hostinger.com/vps
- **SSH Access**: VPS → Your Server → SSH Access
- **Browser Terminal**: VPS → Your Server → Browser Terminal

## After Restart

Test the website: http://31.97.228.226:5173

## If You Need the Root Password

The root password you provided might not work because:
1. It might be the hPanel password, not the VPS root password
2. The VPS might have a different root password set in hPanel

To find the correct password:
1. Login to hPanel
2. Go to VPS section
3. Select your VPS
4. Look for "SSH Access" or "Change Root Password"
5. The correct password will be shown there (or you can reset it)

## Firewall Check in hPanel

If the service is running but not accessible:

1. In hPanel, go to VPS → Firewall
2. Make sure port 5173 is allowed
3. Add a rule if needed:
   - Type: TCP
   - Port: 5173
   - Source: 0.0.0.0/0 (or your specific IP)

## Quick Links

- Hostinger hPanel: https://hpanel.hostinger.com/
- Hostinger Support: https://www.hostinger.com/contact
- VPS Tutorials: https://www.hostinger.com/tutorials/vps
