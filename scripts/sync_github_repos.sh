#!/bin/bash
set -e

# GitHub Repository Sync Script
# Syncs all relevant repos for the agentic-flow ecosystem

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
BASE_DIR="/Users/shahroozbhopti/Documents/code"
GITHUB_USER="ruvnet"
REPOS=(
    "agentic-flow"
    "risk-analytics"
    "midstream"
    "claude-flow"
    "safla"
    "agentic-tribe"
)

echo -e "${BLUE}=== GitHub Repository Sync ===${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}Installing GitHub CLI...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install gh
    else
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update
        sudo apt install gh
    fi
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}Please authenticate with GitHub:${NC}"
    echo "1. Create a PAT at: https://github.com/settings/tokens"
    echo "2. Run: gh auth login --with-token <your-pat>"
    exit 1
fi

# Create base directory if needed
mkdir -p "$BASE_DIR"
cd "$BASE_DIR"

# Sync each repository
for repo in "${REPOS[@]}"; do
    echo -e "\n${BLUE}Processing repository: $repo${NC}"
    
    if [ -d "$repo" ]; then
        echo -e "${YELLOW}Repository exists, updating...${NC}"
        cd "$repo"
        
        # Check for uncommitted changes
        if [ -n "$(git status --porcelain)" ]; then
            echo -e "${RED}Warning: Uncommitted changes in $repo${NC}"
            git status --short
        fi
        
        # Fetch latest changes
        git fetch origin
        
        # Pull if on main/master
        current_branch=$(git branch --show-current)
        if [[ "$current_branch" == "main" || "$current_branch" == "master" ]]; then
            git pull origin "$current_branch"
        else
            echo -e "${YELLOW}Not on main/master branch, skipping pull${NC}"
        fi
        
        cd ..
    else
        echo -e "${YELLOW}Cloning repository...${NC}"
        gh repo clone "$GITHUB_USER/$repo"
    fi
done

# Special handling for agentic-flow subdirectories
echo -e "\n${BLUE}Checking agentic-flow special directories...${NC}"
if [ -d "agentic-flow" ]; then
    cd "agentic-flow"
    
    # Check for important directories
    important_dirs=(
        "scripts"
        "docs"
        ".goalie"
        ".claude"
        ".agentdb"
    )
    
    for dir in "${important_dirs[@]}"; do
        if [ -d "$dir" ]; then
            echo -e "${GREEN}✓ $dir exists${NC}"
        else
            echo -e "${YELLOW}⚠ $dir missing${NC}"
        fi
    done
    
    # Check for recent activity
    echo -e "\n${BLUE}Recent activity in agentic-flow:${NC}"
    git log --oneline -10 --graph --decorate
    
    cd ..
fi

# Summary
echo -e "\n${GREEN}=== Sync Summary ===${NC}"
echo "Base directory: $BASE_DIR"
echo "Repositories processed: ${#REPOS[@]}"
echo "Authentication: $(gh auth status --show-token 2>/dev/null | head -1 || echo 'Not shown')"

# Next steps
echo -e "\n${YELLOW}=== Next Steps ===${NC}"
echo "1. Review any uncommitted changes"
echo "2. Check out feature branches as needed"
echo "3. Run: cd agentic-flow && ./scripts/start_ubuntu_test_env.sh"
echo "4. Begin migration testing"

# Optional: Open in IDE
if command -v code &> /dev/null; then
    echo -e "\n${BLUE}Open in VS Code? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        code "$BASE_DIR/agentic-flow"
    fi
fi

echo -e "${GREEN}✅ Repository sync complete!${NC}"
