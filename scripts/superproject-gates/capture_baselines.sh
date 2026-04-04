#!/bin/bash
set -euo pipefail

DB_PATH="./.goalie/risk_tracking.db"

echo "📊 Capturing baselines..."

# Repos count
REPOS=$(find . -maxdepth 2 -name ".git" | wc -l | tr -d ' ')

# Lines of code by language (excluding node_modules, venv, etc)
# Using efficient find with -exec wc -l
LOC_PYTHON=$(find . -type f -name "*.py" \( ! -path "*/node_modules/*" ! -path "*/.venv/*" ! -path "*/target/*" ! -path "*/.archived-temp/*" \) -exec wc -l {} + 2>/dev/null | awk '{sum+=$1} END {print sum}')
LOC_RUST=$(find . -type f -name "*.rs" \( ! -path "*/node_modules/*" ! -path "*/.venv/*" ! -path "*/target/*" ! -path "*/.archived-temp/*" \) -exec wc -l {} + 2>/dev/null | awk '{sum+=$1} END {print sum}')
LOC_TYPESCRIPT=$(find . -type f -name "*.ts" \( ! -path "*/node_modules/*" ! -path "*/.venv/*" ! -path "*/target/*" ! -path "*/.archived-temp/*" \) -exec wc -l {} + 2>/dev/null | awk '{sum+=$1} END {print sum}')
LOC_JAVASCRIPT=$(find . -type f -name "*.js" \( ! -path "*/node_modules/*" ! -path "*/.venv/*" ! -path "*/target/*" ! -path "*/.archived-temp/*" \) -exec wc -l {} + 2>/dev/null | awk '{sum+=$1} END {print sum}')

# Calculate total (handle empty results)
LOC_PYTHON=${LOC_PYTHON:-0}
LOC_RUST=${LOC_RUST:-0}
LOC_TYPESCRIPT=${LOC_TYPESCRIPT:-0}
LOC_JAVASCRIPT=${LOC_JAVASCRIPT:-0}
LOC_TOTAL=$((LOC_PYTHON + LOC_RUST + LOC_TYPESCRIPT + LOC_JAVASCRIPT))

# Lines of code by module/directory
LOC_SCRIPTS=$(find ./scripts -type f \( -name "*.py" -o -name "*.rs" -o -name "*.ts" -o -name "*.js" -o -name "*.sh" \) ! -path "*/node_modules/*" -exec wc -l {} + 2>/dev/null | awk '{sum+=$1} END {print sum}')
LOC_SRC=$(find ./src -type f \( -name "*.py" -o -name "*.rs" -o -name "*.ts" -o -name "*.js" \) ! -path "*/node_modules/*" -exec wc -l {} + 2>/dev/null | awk '{sum+=$1} END {print sum}')
LOC_AGENTIC_CORE=$(find ./agentic-flow-core/src -type f \( -name "*.ts" -o -name "*.js" \) ! -path "*/node_modules/*" -exec wc -l {} + 2>/dev/null | awk '{sum+=$1} END {print sum}')

# Handle empty results
LOC_SCRIPTS=${LOC_SCRIPTS:-0}
LOC_SRC=${LOC_SRC:-0}
LOC_AGENTIC_CORE=${LOC_AGENTIC_CORE:-0}

# Hackathon repos
HACKATHON_REPOS=$(find ./hackathon -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')

# Insert baselines
sqlite3 "$DB_PATH" << SQL
INSERT OR REPLACE INTO baselines VALUES ('repos_count', $REPOS, 'count', datetime('now'));
INSERT OR REPLACE INTO baselines VALUES ('total_loc', $LOC_TOTAL, 'lines', datetime('now'));
INSERT OR REPLACE INTO baselines VALUES ('loc_python', $LOC_PYTHON, 'lines', datetime('now'));
INSERT OR REPLACE INTO baselines VALUES ('loc_rust', $LOC_RUST, 'lines', datetime('now'));
INSERT OR REPLACE INTO baselines VALUES ('loc_typescript', $LOC_TYPESCRIPT, 'lines', datetime('now'));
INSERT OR REPLACE INTO baselines VALUES ('loc_javascript', $LOC_JAVASCRIPT, 'lines', datetime('now'));
INSERT OR REPLACE INTO baselines VALUES ('loc_scripts', $LOC_SCRIPTS, 'lines', datetime('now'));
INSERT OR REPLACE INTO baselines VALUES ('loc_src', $LOC_SRC, 'lines', datetime('now'));
INSERT OR REPLACE INTO baselines VALUES ('loc_agentic_core', $LOC_AGENTIC_CORE, 'lines', datetime('now'));
SQL

echo "✅ Baselines captured:"
echo "   Repos: $REPOS"
echo "   Total LOC: $LOC_TOTAL"
echo "   By Language:"
echo "     Python: $LOC_PYTHON"
echo "     Rust: $LOC_RUST"
echo "     TypeScript: $LOC_TYPESCRIPT"
echo "     JavaScript: $LOC_JAVASCRIPT"
echo "   By Module:"
echo "     Scripts: $LOC_SCRIPTS"
echo "     Src: $LOC_SRC"
echo "     Agentic Core: $LOC_AGENTIC_CORE"

# Display
sqlite3 -header -column "$DB_PATH" "SELECT * FROM baselines;"
