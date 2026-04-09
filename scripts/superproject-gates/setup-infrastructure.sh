#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Infrastructure Setup Script
# Sets up git remotes, SSH connections, and deployment targets
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# SSH Configuration
setup_ssh_config() {
    print_header "Setting up SSH Configuration"
    
    SSH_CONFIG="$HOME/.ssh/config"
    mkdir -p "$HOME/.ssh"
    
    # Backup existing config
    if [ -f "$SSH_CONFIG" ]; then
        cp "$SSH_CONFIG" "$SSH_CONFIG.backup.$(date +%s)"
    fi
    
    # Add STX host
    if ! grep -q "stx-aio-0.corp.interface.tag.ooo" "$SSH_CONFIG" 2>/dev/null; then
        cat >> "$SSH_CONFIG" << EOF

# StarlingX AIO Instance
Host stx-aio-0
    HostName 23.92.79.2
    User ubuntu
    Port 2222
    IdentityFile ~/.ssh/starlingx_key
    StrictHostKeyChecking no
EOF
        echo -e "${GREEN}✓${NC} Added STX host configuration"
    fi
    
    # Add AWS cPanel host
    if ! grep -q "aws-cpanel" "$SSH_CONFIG" 2>/dev/null; then
        cat >> "$SSH_CONFIG" << EOF

# AWS cPanel Instance
Host aws-cpanel
    HostName 54.241.233.105
    User ubuntu
    Port 22
    IdentityFile ~/pem/rooz.pem
    StrictHostKeyChecking no
EOF
        echo -e "${GREEN}✓${NC} Added AWS cPanel host configuration"
    fi
    
    # Add GitLab host
    if ! grep -q "gitlab-interface" "$SSH_CONFIG" 2>/dev/null; then
        cat >> "$SSH_CONFIG" << EOF

# GitLab Instance
Host gitlab-interface
    HostName 13.56.222.100
    User ubuntu
    Port 22
    IdentityFile ~/pem/rooz.pem
    StrictHostKeyChecking no
EOF
        echo -e "${GREEN}✓${NC} Added GitLab host configuration"
    fi
    
    chmod 600 "$SSH_CONFIG"
    echo -e "${GREEN}✓${NC} SSH configuration complete"
}

# Environment Variables
setup_env_vars() {
    print_header "Setting up Environment Variables"
    
    ENV_FILE="$PROJECT_ROOT/.env.infrastructure"
    
    cat > "$ENV_FILE" << 'EOF'
# Infrastructure Configuration
export YOLIFE_STX_HOST="23.92.79.2"
export YOLIFE_STX_PORTS="2222,22"
export YOLIFE_STX_KEY="$HOME/.ssh/starlingx_key"
export YOLIFE_CPANEL_HOST="54.241.233.105"
export YOLIFE_CPANEL_PORTS="2222,22"
export YOLIFE_CPANEL_KEY="$HOME/pem/rooz.pem"
export YOLIFE_GITLAB_HOST="13.56.222.100"
export YOLIFE_GITLAB_PORTS="2222,22"
export YOLIFE_GITLAB_KEY="$HOME/pem/rooz.pem"
EOF
    
    echo -e "${GREEN}✓${NC} Environment variables saved to $ENV_FILE"
    echo -e "${YELLOW}⚠${NC}  Source this file: source $ENV_FILE"
}

# Git Remotes
setup_git_remotes() {
    print_header "Setting up Git Remotes"
    
    cd "$PROJECT_ROOT"
    
    # Check if git repo
    if [ ! -d ".git" ]; then
        echo -e "${YELLOW}⚠${NC}  Not a git repository, skipping git remote setup"
        return
    fi
    
    # Add various remote options
    echo "Available remote options:"
    echo "  1. GitHub (rooz-live)"
    echo "  2. GitLab (dev.interface.tag.ooo)"
    echo "  3. Local path (/home/rooz/iz)"
    echo ""
    read -p "Add remotes? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # GitHub
        if ! git remote get-url github >/dev/null 2>&1; then
            git remote add github https://github.com/rooz-live/agentic-flow.git 2>/dev/null || true
            echo -e "${GREEN}✓${NC} Added GitHub remote"
        fi
        
        # GitLab
        if ! git remote get-url gitlab >/dev/null 2>&1; then
            git remote add gitlab https://dev.interface.tag.ooo/rooz/agentic-flow.git 2>/dev/null || true
            echo -e "${GREEN}✓${NC} Added GitLab remote"
        fi
        
        # Show current remotes
        echo ""
        echo "Current remotes:"
        git remote -v
    fi
}

# Test SSH Connections
test_ssh_connections() {
    print_header "Testing SSH Connections"
    
    # Test STX
    echo -n "Testing STX connection... "
    if ssh -i ~/.ssh/starlingx_key -p 2222 -o ConnectTimeout=5 ubuntu@23.92.79.2 "echo 'OK'" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}✗${NC} (Connection failed or key not found)"
    fi
    
    # Test AWS cPanel
    echo -n "Testing AWS cPanel connection... "
    if [ -f ~/pem/rooz.pem ] && ssh -i ~/pem/rooz.pem -o ConnectTimeout=5 ubuntu@54.241.233.105 "echo 'OK'" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}✗${NC} (Connection failed or key not found)"
    fi
    
    # Test GitLab
    echo -n "Testing GitLab connection... "
    if [ -f ~/pem/rooz.pem ] && ssh -i ~/pem/rooz.pem -o ConnectTimeout=5 ubuntu@13.56.222.100 "echo 'OK'" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}✗${NC} (Connection failed or key not found)"
    fi
}

# Main execution
main() {
    print_header "Infrastructure Setup"
    
    setup_ssh_config
    echo ""
    setup_env_vars
    echo ""
    setup_git_remotes
    echo ""
    test_ssh_connections
    echo ""
    
    echo -e "${GREEN}✓${NC} Infrastructure setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Source environment: source $PROJECT_ROOT/.env.infrastructure"
    echo "  2. Test connections: ssh stx-aio-0"
    echo "  3. Configure git remotes as needed"
}

main "$@"
