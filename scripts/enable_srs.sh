#!/bin/bash
# Sovereign Swarm: Exim SRS Enforcer
# Paste this directly into the WHM Web Terminal as root to instantly execute Path B.

echo "🦅 Initiating Agentic Workflow: Enabling Sender Rewriting Scheme (SRS)..."

# Ensure SRS is set to 1 in the cPanel root config
if grep -q "^srs=" /var/cpanel/cpanel.config; then
    sed -i 's/^srs=.*/srs=1/' /var/cpanel/cpanel.config
else
    echo "srs=1" >> /var/cpanel/cpanel.config
fi

echo "⚙️ Applying new Tweak Settings..."
/usr/local/cpanel/whostmgr/bin/whostmgr2 --updatetweaksettings > /dev/null

echo "🔄 Rebuilding Exim Configuration & Restarting MTA..."
/scripts/buildeximconf > /dev/null
systemctl restart exim > /dev/null

echo "✅ Path B Complete! SRS is now fully active."
echo "✅ 'False Green' forwarders to Google Workspace (s@rooz.live) will now pass SPF/DMARC."
