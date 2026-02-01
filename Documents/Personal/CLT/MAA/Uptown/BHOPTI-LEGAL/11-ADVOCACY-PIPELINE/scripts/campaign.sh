#!/usr/bin/env bash
# CAMPAIGN.SH - Master Campaign Controller
# Consolidates: send-*.sh, auto-*.sh, smart-*.sh (15 scripts → 1)

set -euo pipefail

BASE="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE"
cd "$BASE"

# Data paths
CONTACTS_CSV="data/contacts/contacts.csv"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    echo "CAMPAIGN.SH - Master Campaign Controller"
    echo ""
    echo "Usage: ./campaign.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  send [--pending|--tier N|--wsjf MIN]  Send emails by filter"
    echo "  status                                  Show campaign stats"
    echo "  next                                    Show next recommended action (WSJF)"
    echo ""
    echo "Examples:"
    echo "  ./campaign.sh send --pending           Send all PENDING emails"
    echo "  ./campaign.sh send --tier 2            Send TIER-2 LOCAL only"
    echo "  ./campaign.sh send --wsjf 80           Send WSJF >= 80 only"
    echo "  ./campaign.sh status                   Show sent/pending/responded counts"
    echo "  ./campaign.sh next                     Show top 5 WSJF contacts to send"
    echo ""
}

send_emails() {
    local filter="${1:-pending}"
    
    case "$filter" in
        --pending)
            query='$8 ~ /PENDING/'
            ;;
        --tier)
            tier="$2"
            query='$7 ~ /TIER-'$tier'/ && $8 ~ /PENDING/'
            ;;
        --wsjf)
            min_wsjf="$2"
            query='$2 >= '$min_wsjf' && $8 ~ /PENDING/'
            ;;
        *)
            query='$8 ~ /PENDING/'
            ;;
    esac
    
    pending=$(awk -F',' "$query" $CONTACTS_CSV | tail -n +2)
    
    if [ -z "$pending" ]; then
        echo "No pending contacts matching filter"
        exit 0
    fi
    
    count=$(echo "$pending" | wc -l | tr -d ' ')
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📧 CAMPAIGN SEND - $count Pending${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Find template (use first available)
    template=$(find TIER-*/*/Ready-To-Send/*.html 2>/dev/null | head -1)
    if [ -z "$template" ]; then
        echo "ERROR: No email templates found in TIER-*/*/Ready-To-Send/"
        exit 1
    fi
    
    echo -e "${YELLOW}📂 Opening template: $template${NC}"
    open "$template"
    sleep 2
    
    # Display each email
    current=0
    while IFS=',' read -r priority wsjf name email cc org category status subject; do
        ((current++))
        cc=$(echo "$cc" | tr -d '"')
        
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}📨 EMAIL $current/$count${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${GREEN}Name:${NC} $name"
        echo -e "${GREEN}Email:${NC} $email"
        if [ -n "$cc" ]; then
            echo -e "${GREEN}CC:${NC} $cc"
        fi
        echo -e "${GREEN}Subject:${NC} $subject"
        echo -e "${GREEN}WSJF:${NC} $wsjf"
        echo ""
        echo "1. Copy from browser (Cmd+A, Cmd+C)"
        echo "2. Mail.app → New Message (Cmd+N)"
        echo "3. Paste (Cmd+V)"
        echo "4. To: $email"
        if [ -n "$cc" ]; then
            echo "5. CC: $cc"
            echo "6. Subject: $subject"
            echo "7. Send (Cmd+Shift+D)"
        else
            echo "5. Subject: $subject"
            echo "6. Send (Cmd+Shift+D)"
        fi
        echo ""
    done <<< "$pending"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}After sending, run:${NC}"
    echo "  ./campaign.sh mark-sent"
    echo ""
}

mark_sent() {
    mkdir -p logs
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Backup
    cp $CONTACTS_CSV contacts-backup-$(date +%s).csv
    
    # Log pending to sent.csv
    awk -F',' '$8 ~ /PENDING/ {print "'"$timestamp"',"$3",SENT,"$4","$2}' $CONTACTS_CSV >> logs/sent.csv
    
    # Update CSV
    sed -i.bak 's/,PENDING,/,SENT,/g' $CONTACTS_CSV
    rm $CONTACTS_CSV.bak
    
    count=$(grep -c "$timestamp" logs/sent.csv || echo 0)
    
    echo "✅ Logged $count emails to logs/sent.csv"
    echo "✅ Updated $CONTACTS_CSV"
}

show_status() {
    total=$(tail -n +2 $CONTACTS_CSV | wc -l | tr -d ' ')
    sent=$(awk -F',' '$8 == "SENT" || $8 == "SENT-VIA-CC"' $CONTACTS_CSV | wc -l | tr -d ' ')
    pending=$(awk -F',' '$8 ~ /PENDING/' $CONTACTS_CSV | wc -l | tr -d ' ')
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 CAMPAIGN STATUS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Total contacts: $total"
    echo "Sent: $sent"
    echo "Pending: $pending"
    echo ""
    
    if [ -f logs/sent.csv ]; then
        recent=$(tail -5 logs/sent.csv)
        echo "Recent sends:"
        echo "$recent"
    fi
}

show_next() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 NEXT RECOMMENDED ACTIONS (by WSJF)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    awk -F',' '$8 ~ /PENDING/ {print $2","$3","$4}' $CONTACTS_CSV | sort -rn -t',' | head -5 | \
        awk -F',' '{printf "WSJF %s: %s (%s)\n", $1, $2, $3}'
    echo ""
    echo "Run: ./campaign.sh send --pending"
}

# Main
case "${1:-help}" in
    send)
        send_emails "${2:-pending}" "${3:-}"
        ;;
    mark-sent)
        mark_sent
        ;;
    status)
        show_status
        ;;
    next)
        show_next
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
