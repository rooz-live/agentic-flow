#!/bin/bash
# EPIC.CAB Telegram edge upgrade — telegram.epic.cab -> community invite
# Ref: https://core.telegram.org/bots/faq (webhook ports 443/80/88/8443; invite via t.me)
set -euo pipefail

INVITE="https://t.me/+9v7FcPdnDVxhMmQx"

echo "🔗 EPIC.CAB: provisioning telegram.epic.cab redirect..."
uapi --user=epiccab SubDomain addsubdomain domain=telegram rootdomain=epic.cab dir=public_html/telegram > /dev/null
uapi --user=epiccab Mime add_redirect domain=telegram.epic.cab src=/ redirect="${INVITE}" type=permanent > /dev/null
whmapi1 start_autossl_check user=epiccab > /dev/null || true
echo "✅ telegram.epic.cab -> ${INVITE}"
