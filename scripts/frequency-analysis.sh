#!/usr/bin/env bash
# frequency-analysis.sh - Analyze skill frequency, patterns, and circulation
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB="$ROOT_DIR/agentdb.db"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

analyze_skill_frequency() {
  echo -e "${CYAN}═══════════════════════════════════════════${NC}"
  echo -e "${CYAN}  📊 Skill Frequency Analysis${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════${NC}"
  echo ""
  
  # Top skills by usage
  echo -e "${BLUE}Top 10 Skills by Usage:${NC}"
  sqlite3 "$AGENTDB" <<EOF
.mode column
.headers on
SELECT 
  skill_name,
  circle,
  usage_count,
  ROUND(usage_count * 100.0 / (SELECT SUM(usage_count) FROM skills), 2) as pct
FROM skills
ORDER BY usage_count DESC
LIMIT 10;
EOF
  
  echo ""
  
  # Skills by circle
  echo -e "${BLUE}Skills Distribution by Circle:${NC}"
  sqlite3 "$AGENTDB" <<EOF
.mode column
.headers on
SELECT 
  circle,
  COUNT(DISTINCT skill_name) as unique_skills,
  SUM(usage_count) as total_usages,
  ROUND(AVG(usage_count), 2) as avg_usage
FROM skills
GROUP BY circle
ORDER BY total_usages DESC;
EOF
  
  echo ""
}

analyze_circulation() {
  echo -e "${CYAN}═══════════════════════════════════════════${NC}"
  echo -e "${CYAN}  💰 Circulation Analysis${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════${NC}"
  echo ""
  
  local total_skills=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM skills;" 2>/dev/null || echo "0")
  local total_episodes=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
  local total_usages=$(sqlite3 "$AGENTDB" "SELECT SUM(usage_count) FROM skills;" 2>/dev/null || echo "0")
  
  # Potential skill instances (episodes × avg skills per episode)
  local potential_skills=$((total_episodes * 3))
  
  if [[ $potential_skills -gt 0 ]]; then
    local circulation_rate=$(echo "scale=2; ($total_skills * 100) / $potential_skills" | bc -l 2>/dev/null || echo "0")
    
    echo "Episodes Generated: $total_episodes"
    echo "Potential Skill Instances: $potential_skills (episodes × 3)"
    echo "Unique Skills Stored: $total_skills"
    echo "Total Skill Usages: $total_usages"
    echo ""
    echo -e "${YELLOW}Circulation Rate: ${circulation_rate}%${NC}"
    
    if (( $(echo "$circulation_rate < 1" | bc -l) )); then
      echo -e "${YELLOW}⚠️  LOW CIRCULATION - Most skills not being captured${NC}"
    elif (( $(echo "$circulation_rate < 10" | bc -l) )); then
      echo -e "${YELLOW}⚠️  MEDIUM CIRCULATION - Capture rate needs improvement${NC}"
    else
      echo -e "${GREEN}✓ GOOD CIRCULATION${NC}"
    fi
  fi
  
  echo ""
  
  # Utilization rate (reuse)
  if [[ $total_skills -gt 0 ]]; then
    local avg_reuse=$(echo "scale=2; $total_usages / $total_skills" | bc -l 2>/dev/null || echo "0")
    echo -e "${BLUE}Average Skill Reuse: ${avg_reuse}x${NC}"
    
    if (( $(echo "$avg_reuse < 2" | bc -l) )); then
      echo -e "${YELLOW}⚠️  LOW REUSE - Skills not being reapplied${NC}"
    elif (( $(echo "$avg_reuse < 5" | bc -l) )); then
      echo -e "${YELLOW}⚠️  MEDIUM REUSE${NC}"
    else
      echo -e "${GREEN}✓ GOOD REUSE - Skills being actively utilized${NC}"
    fi
  fi
  
  echo ""
}

analyze_patterns() {
  echo -e "${CYAN}═══════════════════════════════════════════${NC}"
  echo -e "${CYAN}  🔍 Pattern Analysis${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════${NC}"
  echo ""
  
  # Skill emergence over time
  echo -e "${BLUE}Skill Emergence Timeline:${NC}"
  sqlite3 "$AGENTDB" <<EOF
.mode column
.headers on
SELECT 
  date(learned_at, 'unixepoch') as date,
  COUNT(DISTINCT skill_name) as new_skills,
  SUM(usage_count) as usages
FROM skills
GROUP BY date(learned_at, 'unixepoch')
ORDER BY date DESC
LIMIT 7;
EOF
  
  echo ""
  
  # Ceremony success correlation
  echo -e "${BLUE}Skills by Ceremony:${NC}"
  sqlite3 "$AGENTDB" <<EOF
.mode column
.headers on
SELECT 
  ceremony,
  COUNT(DISTINCT skill_name) as unique_skills,
  SUM(usage_count) as total_usages
FROM skills
WHERE ceremony IS NOT NULL
GROUP BY ceremony
ORDER BY total_usages DESC;
EOF
  
  echo ""
}

generate_report() {
  local report_file="$ROOT_DIR/reports/frequency-analysis-$(date +%Y%m%d-%H%M%S).txt"
  mkdir -p "$ROOT_DIR/reports"
  
  {
    echo "Frequency Analysis Report"
    echo "Generated: $(date)"
    echo ""
    analyze_skill_frequency
    analyze_circulation
    analyze_patterns
  } > "$report_file"
  
  echo -e "${GREEN}📄 Report saved: $report_file${NC}"
}

# Main
main() {
  local command="${1:-all}"
  
  case "$command" in
    frequency)
      analyze_skill_frequency
      ;;
    circulation)
      analyze_circulation
      ;;
    patterns)
      analyze_patterns
      ;;
    all)
      analyze_skill_frequency
      analyze_circulation
      analyze_patterns
      ;;
    report)
      generate_report
      ;;
    *)
      echo "Usage: $0 {frequency|circulation|patterns|all|report}"
      exit 1
      ;;
  esac
}

main "$@"
