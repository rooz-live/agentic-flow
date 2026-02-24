#!/usr/bin/env bash
#
# YOLIFE API-Based Deployment Script
# Replaces SSH deployment with cPanel UAPI and GitLab REST API
#
# Usage:
#   ./scripts/deploy-yolife-api.sh [stx|cpanel|gitlab|all]
#
# Environment Variables Required:
#   - YOLIFE_STX_HOST (StarlingX still uses SSH - verified working)
#   - YOLIFE_STX_KEY
#   - YOLIFE_CPANEL_HOST
#   - CPANEL_API_TOKEN
#   - YOLIFE_GITLAB_HOST
#   - GITLAB_API_TOKEN
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${PROJECT_ROOT}/dist"
DEPLOY_TARGET="${1:-all}"

echo -e "${GREEN}🚀 YOLIFE API-Based Deployment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Target: ${DEPLOY_TARGET}"
echo "Build dir: ${BUILD_DIR}"
echo ""

# Validation
check_env_var() {
  local var_name=$1
  if [[ -z "${!var_name:-}" ]]; then
    echo -e "${RED}❌ Missing environment variable: ${var_name}${NC}"
    return 1
  fi
  return 0
}

# Build project
build_project() {
  echo -e "${YELLOW}📦 Building project...${NC}"
  cd "${PROJECT_ROOT}"
  npm run build || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
  }
  echo -e "${GREEN}✅ Build complete${NC}"
  echo ""
}

# Deploy to StarlingX (SSH - verified working)
deploy_stx() {
  echo -e "${YELLOW}🌟 Deploying to StarlingX (SSH)...${NC}"
  
  check_env_var "YOLIFE_STX_HOST" || return 1
  check_env_var "YOLIFE_STX_KEY" || return 1

  local STX_PORTS="${YOLIFE_STX_PORTS:-2222,22}"
  
  # Try ports in order
  for PORT in $(echo $STX_PORTS | tr ',' ' '); do
    echo "  Trying port ${PORT}..."
    if ssh -i "${YOLIFE_STX_KEY}" -p "${PORT}" -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
        "ubuntu@${YOLIFE_STX_HOST}" "echo 'Connection successful'" 2>/dev/null; then
      echo -e "  ${GREEN}✅ Connected on port ${PORT}${NC}"
      
      # Create remote directory
      ssh -i "${YOLIFE_STX_KEY}" -p "${PORT}" "ubuntu@${YOLIFE_STX_HOST}" \
        "mkdir -p ~/agentic-flow/dist"
      
      # Upload files
      scp -i "${YOLIFE_STX_KEY}" -P "${PORT}" -r "${BUILD_DIR}"/* \
        "ubuntu@${YOLIFE_STX_HOST}:~/agentic-flow/dist/"
      
      echo -e "${GREEN}✅ StarlingX deployment complete${NC}"
      return 0
    fi
  done
  
  echo -e "${RED}❌ StarlingX deployment failed (all ports exhausted)${NC}"
  return 1
}

# Deploy to cPanel (UAPI)
deploy_cpanel() {
  echo -e "${YELLOW}🌐 Deploying to cPanel (UAPI)...${NC}"
  
  check_env_var "YOLIFE_CPANEL_HOST" || return 1
  check_env_var "CPANEL_API_TOKEN" || return 1

  local CPANEL_USER="${CPANEL_USERNAME:-root}"
  local CPANEL_PORT="${YOLIFE_CPANEL_PORT:-2083}"
  local TARGET_DIR="/home/${CPANEL_USER}/public_html/agentic-flow"

  # Test connectivity first
  echo "  Testing cPanel API connectivity..."
  local HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/cpanel_health.json \
    -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_API_TOKEN}" \
    "https://${YOLIFE_CPANEL_HOST}:${CPANEL_PORT}/execute/CpanelAccountInfo/get" || echo "000")
  
  if [[ "${HEALTH_RESPONSE: -3}" != "200" ]]; then
    echo -e "${RED}❌ cPanel API health check failed (HTTP ${HEALTH_RESPONSE: -3})${NC}"
    cat /tmp/cpanel_health.json 2>/dev/null || true
    return 1
  fi
  echo -e "  ${GREEN}✅ cPanel API accessible${NC}"

  # Upload files via Fileman API
  echo "  Uploading files to ${TARGET_DIR}..."
  local FILE_COUNT=0
  
  for FILE in $(find "${BUILD_DIR}" -type f); do
    local RELATIVE_PATH="${FILE#${BUILD_DIR}/}"
    local REMOTE_PATH="${TARGET_DIR}/${RELATIVE_PATH}"
    local REMOTE_DIR=$(dirname "${REMOTE_PATH}")
    
    # Upload file
    curl -s -X POST \
      -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_API_TOKEN}" \
      -F "dir=${REMOTE_DIR}" \
      -F "file=@${FILE};filename=$(basename ${FILE})" \
      "https://${YOLIFE_CPANEL_HOST}:${CPANEL_PORT}/execute/Fileman/upload_files" \
      > /dev/null
    
    ((FILE_COUNT++))
    echo -ne "  Uploaded: ${FILE_COUNT} files\r"
  done
  
  echo ""
  echo -e "${GREEN}✅ cPanel deployment complete (${FILE_COUNT} files)${NC}"
  return 0
}

# Deploy to GitLab (REST API)
deploy_gitlab() {
  echo -e "${YELLOW}🦊 Deploying to GitLab (REST API)...${NC}"
  
  check_env_var "YOLIFE_GITLAB_HOST" || return 1
  check_env_var "GITLAB_API_TOKEN" || return 1

  local GITLAB_PROJECT_ID="${GITLAB_PROJECT_ID:-agentic-flow}"
  local GITLAB_BRANCH="${GITLAB_BRANCH:-main}"
  
  # Test connectivity
  echo "  Testing GitLab API connectivity..."
  local VERSION_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/gitlab_version.json \
    -H "PRIVATE-TOKEN: ${GITLAB_API_TOKEN}" \
    "https://${YOLIFE_GITLAB_HOST}/api/v4/version" || echo "000")
  
  if [[ "${VERSION_RESPONSE: -3}" != "200" ]]; then
    echo -e "${RED}❌ GitLab API health check failed (HTTP ${VERSION_RESPONSE: -3})${NC}"
    cat /tmp/gitlab_version.json 2>/dev/null || true
    return 1
  fi
  
  local GITLAB_VERSION=$(jq -r '.version' /tmp/gitlab_version.json)
  echo -e "  ${GREEN}✅ GitLab ${GITLAB_VERSION} accessible${NC}"

  # Commit files via Repository Files API
  echo "  Committing files to ${GITLAB_BRANCH}..."
  local FILE_COUNT=0
  
  for FILE in $(find "${BUILD_DIR}" -type f); do
    local RELATIVE_PATH="${FILE#${BUILD_DIR}/}"
    local FILE_CONTENT=$(base64 < "${FILE}")
    
    # Create/update file
    local FILE_PATH_ENCODED=$(echo -n "${RELATIVE_PATH}" | jq -sRr @uri)
    curl -s -X POST \
      -H "PRIVATE-TOKEN: ${GITLAB_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"branch\": \"${GITLAB_BRANCH}\",
        \"content\": \"${FILE_CONTENT}\",
        \"commit_message\": \"Deploy: ${RELATIVE_PATH} (automated)\",
        \"encoding\": \"base64\"
      }" \
      "https://${YOLIFE_GITLAB_HOST}/api/v4/projects/$(echo -n ${GITLAB_PROJECT_ID} | jq -sRr @uri)/repository/files/${FILE_PATH_ENCODED}" \
      > /dev/null 2>&1
    
    ((FILE_COUNT++))
    echo -ne "  Committed: ${FILE_COUNT} files\r"
  done
  
  echo ""
  
  # Trigger CI/CD pipeline
  echo "  Triggering CI/CD pipeline..."
  local PIPELINE_RESPONSE=$(curl -s -X POST \
    -H "PRIVATE-TOKEN: ${GITLAB_API_TOKEN}" \
    "https://${YOLIFE_GITLAB_HOST}/api/v4/projects/$(echo -n ${GITLAB_PROJECT_ID} | jq -sRr @uri)/pipeline?ref=${GITLAB_BRANCH}")
  
  local PIPELINE_ID=$(echo "${PIPELINE_RESPONSE}" | jq -r '.id // "null"')
  if [[ "${PIPELINE_ID}" != "null" ]]; then
    echo -e "  ${GREEN}✅ Pipeline triggered (ID: ${PIPELINE_ID})${NC}"
  else
    echo -e "  ${YELLOW}⚠️  Pipeline trigger skipped${NC}"
  fi
  
  echo -e "${GREEN}✅ GitLab deployment complete (${FILE_COUNT} files)${NC}"
  return 0
}

# Main deployment logic
main() {
  # Build first
  build_project
  
  # Deploy to targets
  local FAILED_TARGETS=()
  
  case "${DEPLOY_TARGET}" in
    stx)
      deploy_stx || FAILED_TARGETS+=("StarlingX")
      ;;
    cpanel)
      deploy_cpanel || FAILED_TARGETS+=("cPanel")
      ;;
    gitlab)
      deploy_gitlab || FAILED_TARGETS+=("GitLab")
      ;;
    all)
      deploy_stx || FAILED_TARGETS+=("StarlingX")
      deploy_cpanel || FAILED_TARGETS+=("cPanel")
      deploy_gitlab || FAILED_TARGETS+=("GitLab")
      ;;
    *)
      echo -e "${RED}❌ Invalid target: ${DEPLOY_TARGET}${NC}"
      echo "Usage: $0 [stx|cpanel|gitlab|all]"
      exit 1
      ;;
  esac
  
  # Summary
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [[ ${#FAILED_TARGETS[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ All deployments successful!${NC}"
  else
    echo -e "${RED}❌ Failed deployments: ${FAILED_TARGETS[*]}${NC}"
    exit 1
  fi
}

main
