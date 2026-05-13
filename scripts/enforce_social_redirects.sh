#!/bin/bash
# Sovereign Swarm: Edge Redirect & AutoSSL Enforcer
# Paste this directly into the WHM Web Terminal as root.

echo "🛡️ Enforcing Root Domain Social Redirects (Anti-AI Slop Protocol)..."

# 1. rooz.live -> Telegram
echo "-> Routing rooz.live to Telegram..."
uapi --user=rooz Mime add_redirect domain=rooz.live src=/ redirect=https://t.me/ShahroozBhopti type=permanent > /dev/null

# 2. tag.vote -> Discord
echo "-> Routing tag.vote to Discord..."
uapi --user=tagvote Mime add_redirect domain=tag.vote src=/ redirect=https://discord.gg/VFGeGDhhfj type=permanent > /dev/null

# 3. o-gov.com -> WhatsApp
echo "-> Routing o-gov.com to WhatsApp..."
uapi --user=ogov Mime add_redirect domain=o-gov.com src=/ redirect=https://wa.me/15551234567 type=permanent > /dev/null

echo "🔒 Triggering Maximum Priority AutoSSL for Redirect Domains..."
whmapi1 start_autossl_check user=rooz
whmapi1 start_autossl_check user=tagvote
whmapi1 start_autossl_check user=ogov

echo "✅ Protocol Enforced! Root domains are now shielded."
echo "⚠️ Note: If you see 'Your connection is not private', AutoSSL is still provisioning. It will resolve in ~3 minutes."
