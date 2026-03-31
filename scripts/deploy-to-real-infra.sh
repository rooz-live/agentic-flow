#!/usr/bin/env bash
#
# Real-World Infrastructure Deployment & Testing
# Deploy Deck.gl visualization to actual subdomains instead of localhost
#
# Targets:
#   1. AWS EC2: viz.interface.tag.ooo (cPanel instance i-097706d9355b9f1b2)
#   2. StarlingX: stx-viz.corp.interface.tag.ooo (stx-aio-0)
#   3. Hivelocity: hv-viz.interface.tag.ooo (device 24460)
#   4. Hertzner: hz-viz.interface.tag.ooo (if available)
#
# Usage: bash scripts/deploy-to-real-infra.sh [aws|stx|hivelocity|hertzner|all]
#

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_TARGET="${1:-all}"
BUILD_DIR="${PROJECT_ROOT}/dist"

echo -e "${BLUE}🌐 Real-World Infrastructure Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Target: ${DEPLOY_TARGET}"
echo "Build: ${BUILD_DIR}"
echo ""

# Build with production configuration
build_for_subdomain() {
  local subdomain=$1
  local api_endpoint=$2
  
  echo -e "${YELLOW}📦 Building for ${subdomain}...${NC}"
  
  # Set environment variables for build
  export VITE_API_ENDPOINT="${api_endpoint}"
  export VITE_SUBDOMAIN="${subdomain}"
  export NODE_ENV="production"
  
  # Build
  cd "${PROJECT_ROOT}"
  npm run build || {
    echo -e "${RED}❌ Build failed${NC}"
    return 1
  }
  
  echo -e "${GREEN}✅ Build complete for ${subdomain}${NC}"
  return 0
}

# Deploy to AWS cPanel via UAPI
deploy_aws_cpanel() {
  echo -e "${YELLOW}🔷 Deploying to AWS cPanel (viz.interface.tag.ooo)...${NC}"
  
  # Check prerequisites
  if [[ -z "${YOLIFE_CPANEL_HOST:-}" ]] || [[ -z "${CPANEL_API_TOKEN:-}" ]]; then
    echo -e "${RED}❌ Missing: YOLIFE_CPANEL_HOST or CPANEL_API_TOKEN${NC}"
    echo "   Set these environment variables first"
    return 1
  fi
  
  # Build for AWS subdomain
  build_for_subdomain "viz.interface.tag.ooo" "https://api.interface.tag.ooo" || return 1
  
  # Create subdomain via cPanel API
  echo "  Creating subdomain..."
  curl -s -X POST \
    -H "Authorization: cpanel root:${CPANEL_API_TOKEN}" \
    "https://${YOLIFE_CPANEL_HOST}:2083/execute/SubDomain/addsubdomain" \
    -d "domain=viz&rootdomain=interface.tag.ooo" \
    > /tmp/cpanel_subdomain.json
  
  if jq -e '.status == 1' /tmp/cpanel_subdomain.json > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Subdomain created${NC}"
  else
    echo -e "  ${YELLOW}⚠️  Subdomain may already exist${NC}"
  fi
  
  # Upload files to subdomain directory
  echo "  Uploading Deck.gl visualization..."
  local TARGET_DIR="/home/root/public_html/viz"
  local FILE_COUNT=0
  
  for FILE in $(find "${BUILD_DIR}" -type f -name "*.html" -o -name "*.js" -o -name "*.css"); do
    local RELATIVE_PATH="${FILE#${BUILD_DIR}/}"
    curl -s -X POST \
      -H "Authorization: cpanel root:${CPANEL_API_TOKEN}" \
      -F "dir=${TARGET_DIR}" \
      -F "file=@${FILE};filename=$(basename ${FILE})" \
      "https://${YOLIFE_CPANEL_HOST}:2083/execute/Fileman/upload_files" \
      > /dev/null
    ((FILE_COUNT++))
  done
  
  echo -e "${GREEN}✅ AWS cPanel deployment complete (${FILE_COUNT} files)${NC}"
  echo -e "   URL: https://viz.interface.tag.ooo"
  echo ""
  return 0
}

# Deploy to StarlingX via SSH
deploy_starlingx() {
  echo -e "${YELLOW}⭐ Deploying to StarlingX (stx-viz.corp.interface.tag.ooo)...${NC}"
  
  # Check prerequisites
  if [[ -z "${YOLIFE_STX_HOST:-}" ]] || [[ -z "${YOLIFE_STX_KEY:-}" ]]; then
    echo -e "${RED}❌ Missing: YOLIFE_STX_HOST or YOLIFE_STX_KEY${NC}"
    return 1
  fi
  
  # Build for StarlingX subdomain
  build_for_subdomain "stx-viz.corp.interface.tag.ooo" "https://api.corp.interface.tag.ooo" || return 1
  
  # Upload via SCP
  echo "  Uploading to StarlingX..."
  local STX_PORTS="${YOLIFE_STX_PORTS:-2222,22}"
  
  for PORT in $(echo $STX_PORTS | tr ',' ' '); do
    if ssh -i "${YOLIFE_STX_KEY}" -p "${PORT}" -o ConnectTimeout=5 \
        "ubuntu@${YOLIFE_STX_HOST}" "mkdir -p ~/deck-gl-viz" 2>/dev/null; then
      
      # Upload files
      scp -i "${YOLIFE_STX_KEY}" -P "${PORT}" -r "${BUILD_DIR}"/* \
        "ubuntu@${YOLIFE_STX_HOST}:~/deck-gl-viz/" || {
        echo -e "${RED}❌ Upload failed${NC}"
        return 1
      }
      
      # Setup Nginx/Caddy reverse proxy
      ssh -i "${YOLIFE_STX_KEY}" -p "${PORT}" "ubuntu@${YOLIFE_STX_HOST}" \
        "sudo tee /etc/nginx/sites-available/stx-viz <<EOF
server {
    listen 80;
    server_name stx-viz.corp.interface.tag.ooo;
    root /home/ubuntu/deck-gl-viz;
    index index.html;
    
    location / {
        try_files \\\$uri \\\$uri/ /index.html;
    }
    
    location /api {
        proxy_pass https://api.corp.interface.tag.ooo;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/stx-viz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
" || echo "  ⚠️  Nginx config may need manual setup"
      
      echo -e "${GREEN}✅ StarlingX deployment complete${NC}"
      echo -e "   URL: http://stx-viz.corp.interface.tag.ooo"
      echo ""
      return 0
    fi
  done
  
  echo -e "${RED}❌ StarlingX connection failed${NC}"
  return 1
}

# Deploy to Hivelocity
deploy_hivelocity() {
  echo -e "${YELLOW}🏢 Deploying to Hivelocity (hv-viz.interface.tag.ooo)...${NC}"
  
  # Check prerequisites
  if [[ -z "${HIVELOCITY_API_KEY:-}" ]]; then
    echo -e "${RED}❌ Missing: HIVELOCITY_API_KEY${NC}"
    return 1
  fi
  
  # Build for Hivelocity subdomain
  build_for_subdomain "hv-viz.interface.tag.ooo" "https://api-hv.interface.tag.ooo" || return 1
  
  # Get device 24460 IP
  local DEVICE_IP=$(curl -s -H "X-API-KEY: ${HIVELOCITY_API_KEY}" \
    "https://core.hivelocity.net/api/v2/device/24460" | \
    jq -r '.primaryIp // empty')
  
  if [[ -z "${DEVICE_IP}" ]]; then
    echo -e "${RED}❌ Could not get Hivelocity device IP${NC}"
    return 1
  fi
  
  echo "  Device 24460 IP: ${DEVICE_IP}"
  
  # SSH deployment (assuming SSH key is configured)
  if [[ -f "${HOME}/.ssh/hivelocity_key" ]]; then
    echo "  Uploading to Hivelocity..."
    scp -i "${HOME}/.ssh/hivelocity_key" -r "${BUILD_DIR}"/* \
      "root@${DEVICE_IP}:/var/www/hv-viz/" || {
      echo -e "${RED}❌ Upload failed${NC}"
      return 1
    }
    
    echo -e "${GREEN}✅ Hivelocity deployment complete${NC}"
    echo -e "   URL: http://hv-viz.interface.tag.ooo"
    echo ""
    return 0
  else
    echo -e "${YELLOW}⚠️  SSH key not found at ~/.ssh/hivelocity_key${NC}"
    return 1
  fi
}

# Deploy to Hetzner
deploy_hetzner() {
  echo -e "${YELLOW}🇩🇪 Deploying to Hetzner (hz-viz.interface.tag.ooo)...${NC}"
  
  # Check prerequisites
  if [[ -z "${HETZNER_API_TOKEN:-}" ]]; then
    echo -e "${RED}❌ Missing: HETZNER_API_TOKEN${NC}"
    return 1
  fi
  
  # Build for Hetzner subdomain
  build_for_subdomain "hz-viz.interface.tag.ooo" "https://api-hz.interface.tag.ooo" || return 1
  
  # Get server info via Hetzner Cloud API
  local SERVER_IP=$(curl -s -H "Authorization: Bearer ${HETZNER_API_TOKEN}" \
    "https://api.hetzner.cloud/v1/servers" | \
    jq -r '.servers[0].public_net.ipv4.ip // empty')
  
  if [[ -z "${SERVER_IP}" ]]; then
    echo -e "${YELLOW}⚠️  No Hetzner servers found${NC}"
    return 1
  fi
  
  echo "  Hetzner server IP: ${SERVER_IP}"
  
  # SSH deployment
  if [[ -f "${HOME}/.ssh/hetzner_key" ]]; then
    echo "  Uploading to Hetzner..."
    scp -i "${HOME}/.ssh/hetzner_key" -r "${BUILD_DIR}"/* \
      "root@${SERVER_IP}:/var/www/hz-viz/" || {
      echo -e "${RED}❌ Upload failed${NC}"
      return 1
    }
    
    echo -e "${GREEN}✅ Hetzner deployment complete${NC}"
    echo -e "   URL: http://hz-viz.interface.tag.ooo"
    echo ""
    return 0
  else
    echo -e "${YELLOW}⚠️  SSH key not found at ~/.ssh/hetzner_key${NC}"
    return 1
  fi
}

# Configure AWS CLI
configure_aws() {
  echo -e "${YELLOW}☁️  Configuring AWS CLI...${NC}"
  
  if command -v aws &> /dev/null; then
    # Check if already configured
    if aws sts get-caller-identity &> /dev/null; then
      echo -e "${GREEN}✅ AWS CLI already configured${NC}"
      AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
      AWS_REGION=$(aws configure get region || echo "us-east-1")
      echo "   Account: ${AWS_ACCOUNT}"
      echo "   Region: ${AWS_REGION}"
    else
      echo -e "${YELLOW}⚠️  Run 'aws configure' to set up credentials${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  AWS CLI not installed${NC}"
    echo "   Install: brew install awscli"
  fi
  echo ""
}

# Main deployment logic
main() {
  # Configure AWS if needed
  configure_aws
  
  # Track successes/failures
  local SUCCESS=()
  local FAILED=()
  
  case "${DEPLOY_TARGET}" in
    aws)
      deploy_aws_cpanel && SUCCESS+=("AWS cPanel") || FAILED+=("AWS cPanel")
      ;;
    stx|starlingx)
      deploy_starlingx && SUCCESS+=("StarlingX") || FAILED+=("StarlingX")
      ;;
    hivelocity|hv)
      deploy_hivelocity && SUCCESS+=("Hivelocity") || FAILED+=("Hivelocity")
      ;;
    hetzner|hz)
      deploy_hetzner && SUCCESS+=("Hetzner") || FAILED+=("Hetzner")
      ;;
    all)
      deploy_aws_cpanel && SUCCESS+=("AWS cPanel") || FAILED+=("AWS cPanel")
      deploy_starlingx && SUCCESS+=("StarlingX") || FAILED+=("StarlingX")
      deploy_hivelocity && SUCCESS+=("Hivelocity") || FAILED+=("Hivelocity")
      deploy_hetzner && SUCCESS+=("Hetzner") || FAILED+=("Hetzner")
      ;;
    *)
      echo -e "${RED}❌ Invalid target: ${DEPLOY_TARGET}${NC}"
      echo "Usage: $0 [aws|stx|hivelocity|hetzner|all]"
      exit 1
      ;;
  esac
  
  # Summary
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✅ Successful: ${#SUCCESS[@]}${NC}"
  for target in "${SUCCESS[@]}"; do
    echo "   - ${target}"
  done
  
  if [[ ${#FAILED[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Failed: ${#FAILED[@]}${NC}"
    for target in "${FAILED[@]}"; do
      echo "   - ${target}"
    done
  fi
  
  echo ""
  echo "🌐 Live URLs:"
  [[ " ${SUCCESS[@]} " =~ " AWS cPanel " ]] && echo "   https://viz.interface.tag.ooo"
  [[ " ${SUCCESS[@]} " =~ " StarlingX " ]] && echo "   http://stx-viz.corp.interface.tag.ooo"
  [[ " ${SUCCESS[@]} " =~ " Hivelocity " ]] && echo "   http://hv-viz.interface.tag.ooo"
  [[ " ${SUCCESS[@]} " =~ " Hetzner " ]] && echo "   http://hz-viz.interface.tag.ooo"
}

main
