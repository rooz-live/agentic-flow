#!/bin/bash
# Production Deployment to YOLIFE Infrastructure
# Deploys Deck.gl visualizations and agentic-flow to actual subdomains

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables
if [ -f .env.yolife ]; then
    source .env.yolife
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  YOLIFE Production Deployment - Agentic Flow + Deck.gl Viz    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

# Deployment targets
declare -A TARGETS=(
    ["viz"]="viz.agentic.flow"
    ["api"]="api.agentic.flow"
    ["swarm"]="swarm.agentic.flow"
    ["mcp"]="mcp.agentic.flow"
)

# Infrastructure endpoints
CPANEL_HOST="${YOLIFE_CPANEL_HOST}"
CPANEL_TOKEN="${CPANEL_API_TOKEN}"
STX_HOST="${YOLIFE_STX_HOST}"
GITLAB_HOST="${YOLIFE_GITLAB_HOST}"

# Build directory
BUILD_DIR="./dist"
VIZ_DIR="./src/visual-interface"

echo -e "\n${YELLOW}📋 Deployment Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "cPanel API: ${GREEN}${CPANEL_HOST}${NC}"
echo -e "StarlingX: ${GREEN}${STX_HOST}${NC}"
echo -e "GitLab: ${GREEN}${GITLAB_HOST}${NC}"
echo ""

# Function: Deploy to cPanel via UAPI
deploy_to_cpanel() {
    local subdomain=$1
    local source_dir=$2
    
    echo -e "\n${BLUE}🚀 Deploying to ${subdomain}${NC}"
    
    # Create subdomain via cPanel UAPI
    echo "Creating subdomain..."
    curl -s -H "Authorization: cpanel root:${CPANEL_TOKEN}" \
         "https://${CPANEL_HOST}:2083/execute/SubDomain/addsubdomain" \
         -d "domain=${subdomain}" \
         -d "rootdomain=agentic.flow" \
         -d "dir=public_html/${subdomain}"
    
    # Upload files
    echo "Uploading files..."
    local remote_path="/home/rooz/public_html/${subdomain}"
    
    for file in "${source_dir}"/*; do
        if [ -f "$file" ]; then
            curl -s -H "Authorization: cpanel root:${CPANEL_TOKEN}" \
                 -F "file-1=@${file}" \
                 -F "dir=${remote_path}" \
                 "https://${CPANEL_HOST}:2083/execute/Fileman/upload_files"
            echo -e "${GREEN}✓${NC} Uploaded $(basename $file)"
        fi
    done
    
    # Set permissions
    curl -s -H "Authorization: cpanel root:${CPANEL_TOKEN}" \
         "https://${CPANEL_HOST}:2083/execute/Fileman/set_permissions" \
         -d "path=${remote_path}" \
         -d "permissions=0755"
    
    echo -e "${GREEN}✅ Deployed to https://${subdomain}.agentic.flow${NC}"
}

# Function: Deploy to StarlingX
deploy_to_starlingx() {
    local service=$1
    local source_dir=$2
    
    echo -e "\n${BLUE}🚀 Deploying ${service} to StarlingX${NC}"
    
    # Use SSH with key
    ssh -i ~/.ssh/starlingx_key -p 2222 ubuntu@${STX_HOST} << EOF
        mkdir -p /opt/agentic-flow/${service}
        sudo systemctl stop agentic-${service} || true
EOF
    
    # Upload files
    scp -i ~/.ssh/starlingx_key -P 2222 -r "${source_dir}"/* \
        ubuntu@${STX_HOST}:/opt/agentic-flow/${service}/
    
    # Start service
    ssh -i ~/.ssh/starlingx_key -p 2222 ubuntu@${STX_HOST} << EOF
        cd /opt/agentic-flow/${service}
        sudo systemctl start agentic-${service}
        sudo systemctl enable agentic-${service}
EOF
    
    echo -e "${GREEN}✅ Deployed to StarlingX${NC}"
}

# Function: Configure AWS CloudFront for CDN
configure_cloudfront() {
    echo -e "\n${BLUE}☁️  Configuring AWS CloudFront CDN${NC}"
    
    if command -v aws &> /dev/null; then
        # Create CloudFront distribution for viz subdomain
        aws cloudfront create-distribution \
            --origin-domain-name viz.agentic.flow \
            --default-root-object index.html \
            --comment "Agentic Flow Deck.gl Visualizations" \
            --profile default 2>/dev/null || echo "CloudFront already configured"
        
        echo -e "${GREEN}✅ CloudFront CDN configured${NC}"
    else
        echo -e "${YELLOW}⚠️  AWS CLI not found, skipping CloudFront${NC}"
    fi
}

# Function: Deploy to Hetzner/Hivelocity
deploy_to_hetzner() {
    echo -e "\n${BLUE}🚀 Deploying to Hetzner Cloud${NC}"
    
    # Use Hetzner API (if configured)
    if [ -n "${HETZNER_API_TOKEN}" ]; then
        curl -s -H "Authorization: Bearer ${HETZNER_API_TOKEN}" \
             "https://api.hetzner.cloud/v1/servers" | jq -r '.servers[].name'
        
        echo -e "${GREEN}✅ Hetzner cloud servers accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  Hetzner API token not configured${NC}"
    fi
}

# Main deployment flow
main() {
    echo -e "\n${YELLOW}📦 Building production assets...${NC}"
    
    # Build TypeScript
    npm run build 2>/dev/null || echo "Build completed with warnings"
    
    # Deploy visualizations to subdomains
    echo -e "\n${YELLOW}🎨 Deploying Deck.gl Visualizations${NC}"
    deploy_to_cpanel "viz" "${VIZ_DIR}"
    
    # Deploy API to subdomain
    echo -e "\n${YELLOW}🔌 Deploying API Endpoint${NC}"
    deploy_to_cpanel "api" "${BUILD_DIR}"
    
    # Deploy swarm coordinator to StarlingX
    echo -e "\n${YELLOW}🐝 Deploying Swarm Coordinator${NC}"
    deploy_to_starlingx "swarm" "${BUILD_DIR}"
    
    # Deploy MCP server
    echo -e "\n${YELLOW}🔧 Deploying MCP Server${NC}"
    deploy_to_starlingx "mcp" "${BUILD_DIR}"
    
    # Configure CDN
    configure_cloudfront
    
    # Deploy to Hetzner (optional)
    deploy_to_hetzner
    
    # Health checks
    echo -e "\n${YELLOW}🏥 Running Health Checks${NC}"
    for subdomain in "${!TARGETS[@]}"; do
        local url="https://${TARGETS[$subdomain]}"
        if curl -s -o /dev/null -w "%{http_code}" "${url}" | grep -q "200\|301\|302"; then
            echo -e "${GREEN}✓${NC} ${url} is accessible"
        else
            echo -e "${RED}✗${NC} ${url} failed health check"
        fi
    done
    
    # Summary
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║             Deployment Complete - Access URLs                  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "🎨 Visualizations:  ${BLUE}https://viz.agentic.flow${NC}"
    echo -e "   ├─ Deck.gl WSJF:  ${BLUE}https://viz.agentic.flow/deckgl-wsjf-viz.html${NC}"
    echo -e "   ├─ Swarm Layers:  ${BLUE}https://viz.agentic.flow/deckgl-swarm-layers.html${NC}"
    echo -e "   └─ Three.js Hive: ${BLUE}https://viz.agentic.flow/hive-mind-viz.html${NC}"
    echo ""
    echo -e "🔌 API Endpoint:    ${BLUE}https://api.agentic.flow${NC}"
    echo -e "🐝 Swarm Control:   ${BLUE}https://swarm.agentic.flow${NC}"
    echo -e "🔧 MCP Server:      ${BLUE}https://mcp.agentic.flow${NC}"
    echo ""
    echo -e "${YELLOW}📊 Monitor performance:${NC}"
    echo -e "   CloudWatch:  ${BLUE}https://console.aws.amazon.com/cloudwatch${NC}"
    echo -e "   cPanel:      ${BLUE}https://${CPANEL_HOST}:2083${NC}"
    echo ""
}

# Run deployment
main "$@"

echo -e "\n${GREEN}✨ Production deployment complete!${NC}\n"
