#!/usr/bin/env bash
# Display 90-day roadmap summary from CONSOLIDATED_ACTIONS.yaml

set -euo pipefail

YAML_FILE=".goalie/CONSOLIDATED_ACTIONS.yaml"

echo "═══════════════════════════════════════════════════════════════"
echo "90-DAY ROADMAP SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📅 Scope: 2025-01-13 to 2025-04-12 (13 weeks, 7 sprints)"
echo "📍 Source: ${YAML_FILE} (lines 202-930)"
echo ""

# Extract top 5 WSJF items
echo "🎯 TOP 5 WSJF PRIORITIES:"
echo ""
grep -A 15 'roadmap_items:' "$YAML_FILE" | grep -E '(id:|title:|wsjf_score:|priority:|week:)' | head -30 | \
  awk '
    /id:/ { id=$2 }
    /title:/ { gsub(/^[ \t]*title: "/, ""); gsub(/"$/, ""); title=$0 }
    /wsjf_score:/ { wsjf=$2 }
    /priority:/ { priority=$2; gsub(/"/, "", priority) }
    /week:/ { 
      week=$2
      if (NR % 5 == 0) {
        printf "  %s (%.2f) - %s [%s] Week %s\n", id, wsjf, title, priority, week
      }
    }
  ' | head -5

echo ""
echo "📊 METRICS TARGETS:"
echo ""
echo "Process:"
echo "  • Time retro→code: <1 hour (current: <30 min ✅)"
echo "  • Action completion: >80% (current: 66.7% ⚠️)"
echo "  • Context switches: <5/day (current: 0/day ✅)"
echo ""
echo "Flow:"
echo "  • Lead time: <24 hours (current: 12.75h ✅)"
echo "  • Cycle time: <20 hours (current: 10.20h ✅)"
echo "  • Throughput: >1 item/day (current: 1.87/day ✅)"
echo "  • WIP violations: <5% (current: 0% ✅)"
echo ""
echo "Learning:"
echo "  • Experiments/sprint: >3 (current: 5 ✅)"
echo "  • Retro→features: >60% (current: 7.1% 🔴)"
echo "  • Days to implement: <7 (current: 1.0 ✅)"
echo ""

echo "⚠️  RISKS (5 tracked):"
echo ""
echo "  • RISK-001 (HIGH): Discord credentials dependency"
echo "  • RISK-002 (MEDIUM): API rate limits → SQLite caching"
echo "  • RISK-003 (RESOLVED): Governor throttling"
echo "  • RISK-004 (ACCEPTED): 90-day scope aggressive → Week 13 buffer"
echo "  • RISK-005 (MITIGATED): Cloudflare deployment → Health check"
echo ""

echo "🗓️  WEEKLY MILESTONES:"
echo ""
echo "  Week 1: Discord bot + Cloudflare Worker"
echo "  Week 2: Earnings calendar + options analyzer"
echo "  Week 3: Oversold scanner + analyst sentiment"
echo "  Week 4: WSJF automation + metrics linking"
echo "  Week 5: Portfolio risk analytics"
echo "  Week 6: Multi-channel alerts"
echo "  Week 7-8: ML predictor + infrastructure"
echo "  Week 9-10: Backtesting + monitoring dashboard"
echo "  Week 11-12: Twitch integration"
echo "  Week 13: Buffer + polish + user testing"
echo ""

echo "🚀 NEXT ACTIONS (WSJF Order):"
echo ""
echo "NOW (This Week):"
echo "  1. DISCORD-1: Deploy Discord bot (requires user credentials)"
echo "  2. DISCORD-2: Cloudflare Worker endpoint"
echo "  3. EARNINGS-1: Earnings calendar data source"
echo ""
echo "NEXT (Next Week):"
echo "  4. EARNINGS-2: Options strategy analyzer"
echo "  5. SCANNER-1: Oversold tech scanner"
echo "  6. SCANNER-2: Analyst sentiment integration"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "Full details: ${YAML_FILE}"
echo "View specific item: grep -A 30 'id: \"DISCORD-1\"' ${YAML_FILE}"
echo "═══════════════════════════════════════════════════════════════"
