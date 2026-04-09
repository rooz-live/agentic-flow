#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Codebase Restructure Migration Script
# Incrementally migrates files to new structure
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Create new structure
create_structure() {
    print_header "Creating New Folder Structure"
    
    cd "$CODE_ROOT"
    
    # Create main directories
    mkdir -p projects/{agentic-flow-core,investing,emerging,evaluating}
    mkdir -p config/{mcp,coordination,runtime}
    mkdir -p docs/{governance,operations,architecture}
    mkdir -p observability/{metrics,logs,traces}
    mkdir -p testing/{unit,integration,e2e}
    mkdir -p tooling/{scripts,parsers,utilities}
    mkdir -p experimental/{research,prototypes}
    mkdir -p media/{presentations,demos}
    mkdir -p archive
    mkdir -p retiring
    
    echo -e "${GREEN}✓${NC} New structure created"
}

# Phase 1: Migrate Core Projects
migrate_projects() {
    print_header "Phase 1: Migrating Core Projects"
    
    cd "$CODE_ROOT"
    
    # Create backup
    if [ ! -d ".migration-backup" ]; then
        mkdir -p .migration-backup
    fi
    
    # Migrate agentic-flow-core
    if [ -d "agentic-flow-core" ] && [ ! -L "agentic-flow-core" ]; then
        echo "→ Migrating agentic-flow-core..."
        mv agentic-flow-core projects/ 2>/dev/null || {
            echo -e "${YELLOW}⚠${NC}  agentic-flow-core already in projects/ or migration needed"
        }
    fi
    
    # Migrate investing
    if [ -d "investing" ] && [ ! -L "investing" ]; then
        echo "→ Migrating investing..."
        mv investing projects/ 2>/dev/null || {
            echo -e "${YELLOW}⚠${NC}  investing already in projects/ or migration needed"
        }
    fi
    
    # Migrate emerging
    if [ -d "emerging" ] && [ ! -L "emerging" ]; then
        echo "→ Migrating emerging..."
        mv emerging projects/ 2>/dev/null || {
            echo -e "${YELLOW}⚠${NC}  emerging already in projects/ or migration needed"
        }
    fi
    
    # Migrate evaluating
    if [ -d "evaluating" ] && [ ! -L "evaluating" ]; then
        echo "→ Migrating evaluating..."
        mv evaluating projects/ 2>/dev/null || {
            echo -e "${YELLOW}⚠${NC}  evaluating already in projects/ or migration needed"
        }
    fi
    
    echo -e "${GREEN}✓${NC} Projects migrated"
}

# Phase 2: Migrate Configuration
migrate_config() {
    print_header "Phase 2: Migrating Configuration"
    
    cd "$CODE_ROOT"
    
    # Migrate config/
    if [ -d "config" ] && [ ! -d "config/mcp" ]; then
        echo "→ Migrating config..."
        # Move existing config to config/runtime
        find config -maxdepth 1 -type f -exec mv {} config/runtime/ \; 2>/dev/null || true
    fi
    
    # Migrate coordination/
    if [ -d "coordination" ]; then
        echo "→ Migrating coordination..."
        mv coordination config/ 2>/dev/null || {
            echo -e "${YELLOW}⚠${NC}  coordination migration needed"
        }
    fi
    
    echo -e "${GREEN}✓${NC} Configuration migrated"
}

# Phase 3: Migrate Documentation
migrate_docs() {
    print_header "Phase 3: Migrating Documentation"
    
    cd "$CODE_ROOT"
    
    # Migrate docs from projects
    if [ -d "projects/agentic-flow-core/docs" ]; then
        echo "→ Migrating agentic-flow-core docs..."
        # Copy governance docs
        find projects/agentic-flow-core/docs -name "*governance*" -o -name "*GOVERNANCE*" | \
            xargs -I {} cp {} docs/governance/ 2>/dev/null || true
        # Copy architecture docs
        find projects/agentic-flow-core/docs -name "*arch*" -o -name "*ARCH*" -o -name "*ADR*" | \
            xargs -I {} cp {} docs/architecture/ 2>/dev/null || true
        # Copy operations docs
        find projects/agentic-flow-core/docs -name "*ops*" -o -name "*OPS*" -o -name "*operations*" | \
            xargs -I {} cp {} docs/operations/ 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓${NC} Documentation migrated"
}

# Phase 4: Migrate Observability
migrate_observability() {
    print_header "Phase 4: Migrating Observability"
    
    cd "$CODE_ROOT"
    
    # Migrate memory/ to observability/
    if [ -d "memory" ]; then
        echo "→ Migrating memory..."
        mv memory observability/memory 2>/dev/null || {
            echo -e "${YELLOW}⚠${NC}  memory migration needed"
        }
    fi
    
    # Migrate metrics/
    if [ -d "metrics" ]; then
        echo "→ Migrating metrics..."
        mv metrics observability/ 2>/dev/null || true
    fi
    
    # Migrate logs/
    if [ -d "logs" ]; then
        echo "→ Migrating logs..."
        mv logs observability/ 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓${NC} Observability migrated"
}

# Phase 5: Migrate Testing
migrate_testing() {
    print_header "Phase 5: Migrating Testing"
    
    cd "$CODE_ROOT"
    
    # Migrate tests from projects
    if [ -d "projects/agentic-flow-core/tests" ]; then
        echo "→ Migrating agentic-flow-core tests..."
        cp -r projects/agentic-flow-core/tests/* testing/unit/ 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓${NC} Testing migrated"
}

# Phase 6: Migrate Tooling
migrate_tooling() {
    print_header "Phase 6: Migrating Tooling"
    
    cd "$CODE_ROOT"
    
    # Migrate scripts/
    if [ -d "scripts" ]; then
        echo "→ Migrating scripts..."
        mv scripts tooling/ 2>/dev/null || {
            echo -e "${YELLOW}⚠${NC}  scripts migration needed"
        }
    fi
    
    # Migrate tools/
    if [ -d "tools" ]; then
        echo "→ Migrating tools..."
        find tools -type f -exec mv {} tooling/utilities/ \; 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓${NC} Tooling migrated"
}

# Create symlinks for backward compatibility
create_symlinks() {
    print_header "Creating Backward Compatibility Symlinks"
    
    cd "$CODE_ROOT"
    
    # Create symlinks for common paths
    [ -L "agentic-flow-core" ] || ln -s projects/agentic-flow-core agentic-flow-core 2>/dev/null || true
    [ -L "investing" ] || ln -s projects/investing investing 2>/dev/null || true
    [ -L "emerging" ] || ln -s projects/emerging emerging 2>/dev/null || true
    [ -L "evaluating" ] || ln -s projects/evaluating evaluating 2>/dev/null || true
    [ -L "scripts" ] || ln -s tooling/scripts scripts 2>/dev/null || true
    
    echo -e "${GREEN}✓${NC} Symlinks created"
}

# Main execution
main() {
    print_header "Codebase Restructure Migration"
    
    PHASE="${1:-all}"
    
    case "$PHASE" in
        structure)
            create_structure
            ;;
        projects)
            create_structure
            migrate_projects
            ;;
        config)
            create_structure
            migrate_config
            ;;
        docs)
            create_structure
            migrate_docs
            ;;
        observability)
            create_structure
            migrate_observability
            ;;
        testing)
            create_structure
            migrate_testing
            ;;
        tooling)
            create_structure
            migrate_tooling
            ;;
        symlinks)
            create_symlinks
            ;;
        all)
            create_structure
            migrate_projects
            migrate_config
            migrate_docs
            migrate_observability
            migrate_testing
            migrate_tooling
            create_symlinks
            echo ""
            echo -e "${GREEN}✓${NC} Migration complete!"
            echo ""
            echo "Next steps:"
            echo "  1. Review migrated structure"
            echo "  2. Update paths in code"
            echo "  3. Test functionality"
            echo "  4. Remove symlinks after verification"
            ;;
        *)
            echo "Usage: $0 [structure|projects|config|docs|observability|testing|tooling|symlinks|all]"
            exit 1
            ;;
    esac
}

main "$@"
