#!/bin/bash
# WSJF Command Aliases - Source this file to get easy 'ay' commands
#
# Usage:
#   source scripts/ay-aliases.sh
#   ay swarm init
#   ay monitor
#   ay roam

# Base command
export AY_CMD="npx tsx src/cli/wsjf-commands.ts"

# Main 'wsjf' function (avoids conflict with existing ay command)
function wsjf() {
  case "$1" in
    # Swarm commands
    swarm)
      shift
      $AY_CMD "swarm:$1" "${@:2}"
      ;;
    
    # MCP commands
    mcp)
      shift
      $AY_CMD "mcp:$1" "${@:2}"
      ;;
    
    # ROAM commands
    roam)
      shift
      $AY_CMD "roam:$1" "${@:2}"
      ;;
    
    # Monitor (standalone)
    monitor|mon|tui)
      $AY_CMD monitor "$@"
      ;;
    
    # Quick status
    status)
      echo "🐝 Swarm Status:"
      $AY_CMD swarm:status
      echo ""
      echo "📊 MCP Stats:"
      $AY_CMD mcp:stats
      echo ""
      echo "📋 ROAM Status:"
      $AY_CMD roam:status
      ;;
    
    # Help
    help|--help|-h|"")
      echo "🎯 WSJF Implementation CLI (wsjf)"
      echo ""
      echo "Usage: wsjf <command> [args]"
      echo ""
      echo "Commands:"
      echo "  wsjf swarm init [topology] [maxAgents] [strategy]"
      echo "  wsjf swarm bind <agentId> <type> [name]"
      echo "  wsjf swarm status"
      echo "  wsjf swarm health"
      echo ""
      echo "  wsjf mcp route \"<task>\""
      echo "  wsjf mcp session create [swarmId]"
      echo "  wsjf mcp stats"
      echo ""
      echo "  wsjf roam status"
      echo ""
      echo "  wsjf monitor [refreshMs]     - Start TUI monitor"
      echo "  wsjf status                  - Show all status"
      echo "  wsjf help                    - This help"
      echo ""
      echo "Examples:"
      echo "  wsjf swarm init              # Initialize swarm"
      echo "  wsjf swarm bind ag-001 coder # Bind agent"
      echo "  wsjf monitor                 # Start TUI"
      echo "  wsjf mcp route \"fix bug\"      # Route task"
      ;;
    
    *)
      echo "❌ Unknown command: $1"
      echo "💡 Run 'wsjf help' for available commands"
      return 1
      ;;
  esac
}

# Standalone aliases for convenience
alias ay-swarm="$AY_CMD swarm:status"
alias ay-monitor="$AY_CMD monitor"
alias ay-health="$AY_CMD swarm:health"
alias ay-mcp="$AY_CMD mcp:stats"
alias ay-roam="$AY_CMD roam:status"
alias ay-status="wsjf status"

echo "✅ WSJF CLI aliases loaded!"
echo "💡 Try: wsjf help or ay-swarm, ay-monitor, ay-health, etc."
