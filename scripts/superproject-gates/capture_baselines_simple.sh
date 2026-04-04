#!/bin/bash
set -euo pipefail

DB_PATH="./.goalie/risk_tracking.db"

echo "📊 Capturing baselines..."

# Repos count
REPOS=$(find . -maxdepth 2 -name ".git" 2>/dev/null | wc -l | tr -d ' ')

# Lines of code by language (excluding node_modules, venv, etc)
# Using cat for more reliable line counting
count_lines() {
    local pattern=$1
    local path=${2:-.}
    local total=0
    while IFS= read -r file; do
        if [[ "$file" == *.py || "$file" == *.rs || "$file" == *.ts || "$file" == *.js ]]; then
            lines=$(wc -l < "$file" 2>/dev/null || echo "0")
            total=$((total + lines))
        fi
    done < <(find "$path" -type f -name "$pattern" \( ! -path "*/node_modules/*" ! -path "*/.venv/*" ! -path "*/target/*" ! -path "*/.archived-temp/*" \) 2>/dev/null)
    echo "$total"
}

LOC_PYTHON=$(count_lines "*.py")
LOC_RUST=$(count_lines "*.rs")
LOC_TYPESCRIPT=$(count_lines "*.ts")
LOC_JAVASCRIPT=$(count_lines "*.js")

# Calculate total
LOC_TOTAL=$((LOC_PYTHON + LOC_RUST + LOC_TYPESCRIPT + LOC_JAVASCRIPT))

# Lines of code by module/directory
count_module_lines() {
    local module_path=$1
    local total=0
    while IFS= read -r file; do
        if [[ "$file" == *.py || "$file" == *.rs || "$file" == *.ts || "$file" == *.js || "$file" == *.sh ]]; then
            lines=$(wc -l < "$file" 2>/dev/null || echo "0")
            total=$((total + lines))
        fi
    done < <(find "$module_path" -type f \( -name "*.py" -o -name "*.rs" -o -name "*.ts" -o -name "*.js" -o -name "*.sh" \) ! -path "*/node_modules/*" 2>/dev/null)
    echo "$total"
}

LOC_SCRIPTS=$(count_module_lines "./scripts")
LOC_SRC=$(count_module_lines "./src")
LOC_AGENTIC_CORE=$(count_module_lines "./agentic-flow-core/src")

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
INSERT OR REPLACE INTO baselines VALUES ('hackathon_repos', $HACKATHON_REPOS, 'count', datetime('now'));
SQL

echo "✅ Baselines captured:"
echo "   Total Repos: $REPOS"
echo "   Hackathon Repos: $HACKATHON_REPOS"
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
