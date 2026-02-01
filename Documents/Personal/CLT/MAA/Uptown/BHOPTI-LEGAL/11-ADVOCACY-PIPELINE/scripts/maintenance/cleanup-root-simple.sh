#!/usr/bin/env bash
# Simple root directory cleanup - moves redundant docs to archive
set -uo pipefail

# Change to project root (2 levels up from scripts/maintenance)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../.."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DRY_RUN="${1:---dry-run}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📁 ROOT DIRECTORY CLEANUP (Simplified)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$DRY_RUN" = "--execute" ]; then
    echo -e "${YELLOW}⚠️  EXECUTE MODE - Changes will be made${NC}"
else
    echo -e "${GREEN}🔍 DRY RUN MODE - No changes will be made${NC}"
fi
echo ""

# Create archive directory
ARCHIVE_DIR="archive/docs-cleanup-$(date +%Y%m%d)"
if [ "$DRY_RUN" = "--execute" ]; then
    mkdir -p "$ARCHIVE_DIR"
fi

# Core files to KEEP in root
declare -a KEEP_FILES=(
    "advocate"
    "advocate-tui"
    "launch-mindmap.sh"
    "EXECUTE-NOW.sh"
    "README.md"
)

echo -e "${YELLOW}Files to KEEP in root:${NC}"
for file in "${KEEP_FILES[@]}"; do
    if [ -f "$file" ] || [ -x "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    fi
done
echo ""

# Files to ARCHIVE
echo -e "${YELLOW}Files to ARCHIVE:${NC}"
count=0

# Archive redundant markdown docs
for file in *.md; do
    # Skip if glob didn't match anything
    [ -e "$file" ] || continue
    if [ -f "$file" ] && [[ ! " ${KEEP_FILES[*]} " =~ " $file " ]]; then
        ((count++))
        if [ "$DRY_RUN" = "--execute" ]; then
            mv "$file" "$ARCHIVE_DIR/"
            echo -e "  ${BLUE}MOVED${NC} $file → $ARCHIVE_DIR/"
        else
            echo -e "  ${BLUE}WOULD MOVE${NC} $file"
        fi
    fi
done

# Archive .txt files
for file in *.txt; do
    [ -e "$file" ] || continue
    if [ -f "$file" ]; then
        ((count++))
        if [ "$DRY_RUN" = "--execute" ]; then
            mv "$file" "$ARCHIVE_DIR/"
            echo -e "  ${BLUE}MOVED${NC} $file → $ARCHIVE_DIR/"
        else
            echo -e "  ${BLUE}WOULD MOVE${NC} $file"
        fi
    fi
done

# Archive redundant .sh scripts (not in KEEP list)
for file in *.sh; do
    [ -e "$file" ] || continue
    if [ -f "$file" ] && [[ ! " ${KEEP_FILES[*]} " =~ " $file " ]]; then
        # Skip if it's a symlink or in KEEP list
        if [ ! -L "$file" ]; then
            ((count++))
            if [ "$DRY_RUN" = "--execute" ]; then
                mv "$file" "$ARCHIVE_DIR/"
                echo -e "  ${BLUE}MOVED${NC} $file → $ARCHIVE_DIR/"
            else
                echo -e "  ${BLUE}WOULD MOVE${NC} $file"
            fi
        fi
    fi
done

# Archive .scpt files
for file in *.scpt; do
    [ -e "$file" ] || continue
    if [ -f "$file" ]; then
        ((count++))
        if [ "$DRY_RUN" = "--execute" ]; then
            mv "$file" "$ARCHIVE_DIR/"
            echo -e "  ${BLUE}MOVED${NC} $file → $ARCHIVE_DIR/"
        else
            echo -e "  ${BLUE}WOULD MOVE${NC} $file"
        fi
    fi
done

# Archive CSV files (except contacts-master.csv if we want to keep it)
for file in *.csv; do
    [ -e "$file" ] || continue
    if [ -f "$file" ]; then
        ((count++))
        if [ "$DRY_RUN" = "--execute" ]; then
            mv "$file" "$ARCHIVE_DIR/"
            echo -e "  ${BLUE}MOVED${NC} $file → $ARCHIVE_DIR/"
        else
            echo -e "  ${BLUE}WOULD MOVE${NC} $file"
        fi
    fi
done

# Archive JSON analytics files
for file in scripts_*.json; do
    [ -e "$file" ] || continue
    if [ -f "$file" ]; then
        ((count++))
        if [ "$DRY_RUN" = "--execute" ]; then
            mv "$file" "$ARCHIVE_DIR/"
            echo -e "  ${BLUE}MOVED${NC} $file → $ARCHIVE_DIR/"
        else
            echo -e "  ${BLUE}WOULD MOVE${NC} $file"
        fi
    fi
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$DRY_RUN" = "--execute" ]; then
    echo -e "${GREEN}✓ Moved $count files to $ARCHIVE_DIR${NC}"
else
    echo -e "${GREEN}Would move $count files${NC}"
    echo ""
    echo "To execute: ./advocate cleanup docs --execute"
    echo "Or directly: ./scripts/maintenance/cleanup-root-simple.sh --execute"
fi
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
