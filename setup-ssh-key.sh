#!/bin/bash

echo "=============================================="
echo "SETUP SSH KEY FOR PASSWORDLESS ACCESS"
echo "=============================================="
echo ""
echo "Your SSH public key has been generated at:"
echo "/Users/jrpolok/.ssh/id_rsa.pub"
echo ""
echo "Here's your public key:"
echo "----------------------------------------------"
cat /Users/jrpolok/.ssh/id_rsa.pub
echo ""
echo "----------------------------------------------"
echo ""
echo "MANUAL SETUP STEPS:"
echo ""
echo "1. Open a new terminal and connect to the server:"
echo "   ssh root@31.97.228.226"
echo "   Password: anB5YrS/H+cvtHz"
echo ""
echo "2. Once logged in, run these commands:"
echo ""
echo "   mkdir -p ~/.ssh"
echo "   chmod 700 ~/.ssh"
echo "   nano ~/.ssh/authorized_keys"
echo ""
echo "3. Paste your public key (shown above) into the file"
echo "   Press Ctrl+X, then Y, then Enter to save"
echo ""
echo "4. Set proper permissions:"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo ""
echo "5. Exit and test:"
echo "   exit"
echo "   ssh root@31.97.228.226"
echo "   (Should connect without password)"
echo ""
echo "=============================================="
echo "QUICK COPY-PASTE METHOD:"
echo "=============================================="
echo ""
echo "If you're already connected via SSH, just run:"
echo ""
cat << 'SSHCMD'
mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys << 'SSHKEY'
SSHCMD
cat /Users/jrpolok/.ssh/id_rsa.pub
cat << 'SSHCMD'
SSHKEY
chmod 600 ~/.ssh/authorized_keys && echo "SSH key added successfully!"
SSHCMD
echo ""
echo "=============================================="
