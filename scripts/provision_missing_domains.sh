#!/bin/bash
# Sovereign Swarm: Missing Node Provisioning
# Paste this directly into the WHM Web Terminal as root

echo "🌊 Initiating Agentic Wave: Hydrating decibel.co & epic.cab"

# 1. Create the cPanel Accounts via WHMAPI
echo "🏗️ Creating cPanel isolated containers..."
whmapi1 createacct domain=decibel.co username=decibel
whmapi1 createacct domain=epic.cab username=epiccab

# 2. Inject SSH Keys perfectly (One single line, no clipboard wrap issues)
echo "🔐 Injecting Cryptographic Identity (Keyless CI/CD)..."
mkdir -p /home/decibel/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILkBo+V6kLRTlXVW6K+HLkekbdddlrZy43RVJKufExdy sovereign_swarm_agent" > /home/decibel/.ssh/authorized_keys
chmod 700 /home/decibel/.ssh
chmod 600 /home/decibel/.ssh/authorized_keys
chown -R decibel:decibel /home/decibel/.ssh

mkdir -p /home/epiccab/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILkBo+V6kLRTlXVW6K+HLkekbdddlrZy43RVJKufExdy sovereign_swarm_agent" > /home/epiccab/.ssh/authorized_keys
chmod 700 /home/epiccab/.ssh
chmod 600 /home/epiccab/.ssh/authorized_keys
chown -R epiccab:epiccab /home/epiccab/.ssh

# 3. Apply Epic.cab Telegram Forwarder via UAPI
echo "🔗 Reconfiguring epic.cab Telegram Forwarder..."
uapi --user=epiccab SubDomain addsubdomain domain=telegram rootdomain=epic.cab dir=public_html/telegram > /dev/null
uapi --user=epiccab Mime add_redirect domain=telegram.epic.cab src=/ redirect=https://t.me/+6RUdERX1EKo2YTRh type=permanent > /dev/null

echo "🛡️ Enforcing physical edge cryptography (AutoSSL) for pur.tag.vote..."
whmapi1 enqueue_autossl_check user=tagvote

echo "✅ Missing nodes successfully joined to the Sovereign Swarm!"
