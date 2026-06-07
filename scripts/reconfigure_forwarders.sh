#!/bin/bash
# Sovereign Swarm Autonomous Forwarder Reconfiguration
# Paste this directly into the WHM Web Terminal

echo "🌊 Initiating Agentic Wave: Social Forwarder Reconfiguration"

# 1. 720.chat (User: c720)
echo "🔗 Reconfiguring 720.chat forwarders..."
uapi --user=c720 SubDomain addsubdomain domain=discord rootdomain=720.chat dir=public_html/discord > /dev/null
uapi --user=c720 Mime add_redirect domain=discord.720.chat src=/ redirect=https://discord.gg/X65dHfmnbX type=permanent > /dev/null

uapi --user=c720 SubDomain addsubdomain domain=facebook rootdomain=720.chat dir=public_html/facebook > /dev/null
uapi --user=c720 Mime add_redirect domain=facebook.720.chat src=/ redirect=https://Facebook.com/720chat type=permanent > /dev/null

uapi --user=c720 SubDomain addsubdomain domain=instagram rootdomain=720.chat dir=public_html/instagram > /dev/null
uapi --user=c720 Mime add_redirect domain=instagram.720.chat src=/ redirect=https://instagram.com/720chat type=permanent > /dev/null

# 2. tag.vote (User: tagvote)
echo "🔗 Reconfiguring tag.vote forwarders..."
uapi --user=tagvote SubDomain addsubdomain domain=discord rootdomain=tag.vote dir=public_html/discord > /dev/null
uapi --user=tagvote Mime add_redirect domain=discord.tag.vote src=/ redirect=https://discord.gg/Err7Hnw9ch type=permanent > /dev/null

uapi --user=tagvote SubDomain addsubdomain domain=youtube rootdomain=tag.vote dir=public_html/youtube > /dev/null
uapi --user=tagvote Mime add_redirect domain=youtube.tag.vote src=/ redirect=https://youtube.com/@tag-vote type=permanent > /dev/null

# 3. epic.cab 
# NOTE: epic.cab was not in the live server mapping, meaning it wasn't migrated/created yet!
# Once you create it in WHM, you can run these:
uapi --user=epiccab SubDomain addsubdomain domain=telegram rootdomain=epic.cab dir=public_html/telegram > /dev/null
# uapi --user=epiccab Mime add_redirect domain=telegram.epic.cab src=/ redirect=https://t.me/+9v7FcPdnDVxhMmQx type=permanent > /dev/null

echo "✅ All Social Subdomains & Redirects injected into the UAPI routing layer!"
