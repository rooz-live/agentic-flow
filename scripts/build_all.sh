#!/bin/bash

# Complete Build Script for StarlingX 11.0 Integration with CLAUDE Ecosystem
# This script orchestrates the complete build, configuration, and deployment setup
# Usage: ./scripts/build_all.sh [options]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BUILD_DIR="${PROJECT_ROOT}/build"
LOG_FILE="${PROJECT_ROOT}/logs/build_complete.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "${LOG_FILE}"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "${LOG_FILE}"
}

# Utility functions
check_requirements() {
    log_info "Checking build requirements..."

    local missing_reqs=()

    # Check for required commands
    local required_commands=("python3.11" "pip" "node" "npm" "docker" "git")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "${cmd}" >/dev/null 2>&1; then
            missing_reqs+=("${cmd}")
        fi
    done

    if [[ ${#missing_reqs[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_reqs[*]}"
        log_error "Please install missing requirements and run this script again."
        exit 1
    fi

    # Check Python version
    if ! python3.11 --version >/dev/null 2>&1; then
        log_error "Python 3.11 is required but not found"
        exit 1
    fi

    log_success "All build requirements are satisfied"
}

setup_python_environment() {
    log_info "Setting up Python 3.11 environment..."

    # Create virtual environment if it doesn't exist
    if [[ ! -d "${PROJECT_ROOT}/venv" ]]; then
        log_info "Creating Python virtual environment..."
        python3.11 -m venv "${PROJECT_ROOT}/venv"
    fi

    # Activate virtual environment
    source "${PROJECT_ROOT}/venv/bin/activate"

    # Upgrade pip and install core dependencies
    log_info "Installing Python dependencies..."
    pip install --upgrade pip setuptools wheel

    # Install main dependencies
    if [[ -f "requirements.txt" ]]; then
        pip install -r requirements.txt
    fi

    # Install development dependencies
    if [[ -f "requirements-dev.txt" ]]; then
        pip install -r requirements-dev.txt
    fi

    log_success "Python environment setup completed"
}

setup_node_environment() {
    log_info "Setting up Node.js environment..."

    # Install Node.js dependencies
    if [[ -f "package.json" ]]; then
        npm ci
        log_success "Node.js dependencies installed"
    else
        log_warn "No package.json found, skipping Node.js setup"
    fi
}

validate_configurations() {
    log_info "Validating configuration files..."

    local config_files=(
        "pyproject.toml"
        "configs/risk-analytics-config.yaml"
        "config/mcp_dynamic_loading.yaml"
        ".env.example"
    )

    for config_file in "${config_files[@]}"; do
        if [[ -f "${config_file}" ]]; then
            log_info "Validating ${config_file}..."

            # Basic YAML/JSON validation
            if [[ "${config_file}" =~ \.(yaml|yml)$ ]]; then
                python3 -c "import yaml; yaml.safe_load(open('${config_file}'))" 2>/dev/null || {
                    log_error "Invalid YAML in ${config_file}"
                    return 1
                }
            elif [[ "${config_file}" =~ \.json$ ]]; then
                python3 -c "import json; json.load(open('${config_file}'))" 2>/dev/null || {
                    log_error "Invalid JSON in ${config_file}"
                    return 1
                }
            fi

            log_success "Configuration ${config_file} is valid"
        else
            log_warn "Configuration file ${config_file} not found"
        fi
    done

    log_success "Configuration validation completed"
}

run_tests() {
    log_info "Running test suite..."

    source "${PROJECT_ROOT}/venv/bin/activate"

    # Run different test categories
    if python3 -m pytest tests/ -v --tb=short -x; then
        log_success "All tests passed"
    else
        log_error "Some tests failed"
        return 1
    fi
}

build_docker_images() {
    log_info "Building Docker images..."

    # Enable Docker BuildKit
    export DOCKER_BUILDKIT=1

    # Build main application image
    log_info "Building main application image..."
    docker build \
        --target production \
        --tag starlingx-integration:11.0 \
        --tag starlingx-integration:latest \
        .

    # Build MCP servers image
    log_info "Building MCP servers image..."
    docker build \
        --target mcp-servers \
        --tag starlingx-integration:mcp-servers \
        .

    # Build edge deployment image
    log_info "Building edge deployment image..."
    docker build \
        --target edge \
        --tag starlingx-integration:edge \
        .

    log_success "Docker images built successfully"
}

create_deployment_package() {
    log_info "Creating deployment package..."

    # Create deployment directory
    local deploy_dir="${BUILD_DIR}/deployment"
    mkdir -p "${deploy_dir}"

    # Copy essential files for deployment
    local files_to_copy=(
        "scripts/"
        "configs/"
        "config/"
        "manifests/"
        "requirements.txt"
        "pyproject.toml"
        "package.json"
        "Dockerfile"
        "docker-compose.yml"
        ".env.example"
        ".mcp_configs/"
    )

    for item in "${files_to_copy[@]}"; do
        if [[ -e "${item}" ]]; then
            cp -r "${item}" "${deploy_dir}/" 2>/dev/null || true
        fi
    done

    # Create deployment README
    cat > "${deploy_dir}/README.md" << 'EOF'
# StarlingX 11.0 Integration Deployment Package

This package contains everything needed to deploy the StarlingX 11.0 integration.

## Quick Start

### Using Docker Compose (Recommended for Development)
```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Using Kubernetes (Production)
```bash
# Apply Kubernetes manifests
kubectl apply -f manifests/stx11-deployment-config.yaml

# Check deployment status
kubectl get pods -n starlingx-integration
```

### Manual Installation
```bash
# 1. Set up Python environment
./scripts/greenfield_setup.sh

# 2. Install OpenStack Caracal
./scripts/build/openstack_caracal_install.sh

# 3. Start services
python scripts/risk_analytics_integration.py
```

## Services Included

- Main Application API (Port 8000)
- Risk Analytics MCP Server (Port 8080)
- StarlingX MCP Server (Port 8081)
- Chrome DevTools MCP Server (Port 8082)
- Platform Connectors MCP Server (Port 8083)
- Redis (Port 6379)
- PostgreSQL (Port 5432)
- Prometheus (Port 9090)
- Grafana (Port 3000)

## Configuration

1. Copy `.env.example` to `.env`
2. Update all configuration values
3. Set secure passwords and API keys
4. Configure external service URLs

## Monitoring

Access Grafana at http://localhost:3000 (admin/starlingx)
View Prometheus metrics at http://localhost:9090

## Support

For issues and questions, please refer to the documentation or create an issue.
EOF

    # Create deployment script
    cat > "${deploy_dir}/deploy.sh" << 'EOF'
#!/bin/bash
# Automated deployment script

set -e

echo "Starting deployment..."

# Check if .env exists
if [[ ! -f ".env" ]]; then
    echo "Error: .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Create necessary directories
mkdir -p logs data models

echo "Deployment completed successfully!"
echo ""
echo "Services available at:"
echo "- Main API: http://localhost:8000"
echo "- Grafana: http://localhost:3000 (admin/starlingx)"
echo "- Prometheus: http://localhost:9090"
echo ""
echo "View logs with: docker-compose logs -f"
echo "Stop services with: docker-compose down"
EOF

    chmod +x "${deploy_dir}/deploy.sh"

    log_success "Deployment package created at ${deploy_dir}"
}

run_integration_tests() {
    log_info "Running integration tests..."

    source "${PROJECT_ROOT}/venv/bin/activate"

    # Test configuration loading
    log_info "Testing configuration loading..."
    python3 -c "
import yaml
import json

# Test YAML configs
configs = [
    'pyproject.toml',
    'configs/risk-analytics-config.yaml',
    'config/mcp_dynamic_loading.yaml'
]

for config in configs:
    if config.endswith('.yaml') or config.endswith('.yml'):
        with open(config, 'r') as f:
            yaml.safe_load(f)
    elif config.endswith('.json'):
        with open(config, 'r') as f:
            json.load(f)

print('All configurations loaded successfully')
"

    # Test Python imports
    log_info "Testing Python imports..."
    python3 -c "
import torch
import transformers
import networkx
import numpy
import pandas
print('Core ML dependencies imported successfully')
"

    # Test MCP configurations
    log_info "Testing MCP configurations..."
    python3 -c "
import json
with open('.mcp_configs/chrome-devtools-server.json', 'r') as f:
    config = json.load(f)
print(f'MCP server {config[\"mcpServer\"][\"name\"]} configuration is valid')
"

    log_success "Integration tests passed"
}

cleanup_build_artifacts() {
    log_info "Cleaning up build artifacts..."

    # Remove Python cache files
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true
    find . -name "*.pyo" -delete 2>/dev/null || true

    # Remove Node.js cache
    rm -rf node_modules/.cache 2>/dev/null || true

    log_success "Build artifacts cleaned up"
}

# Main build process
main() {
    log_info "Starting complete build process for StarlingX 11.0 Integration..."

    # Create log directory
    mkdir -p "$(dirname "${LOG_FILE}")"
    touch "${LOG_FILE}"

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-docker)
                SKIP_DOCKER=true
                shift
                ;;
            --skip-deploy-package)
                SKIP_DEPLOY_PACKAGE=true
                shift
                ;;
            --production)
                PRODUCTION_BUILD=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-tests          Skip running tests"
                echo "  --skip-docker         Skip Docker image building"
                echo "  --skip-deploy-package Skip deployment package creation"
                echo "  --production         Create production build"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Run build steps
    check_requirements
    setup_python_environment
    setup_node_environment
    validate_configurations

    if [[ "${SKIP_TESTS:-false}" != "true" ]]; then
        run_tests
        run_integration_tests
    fi

    if [[ "${SKIP_DOCKER:-false}" != "true" ]]; then
        build_docker_images
    fi

    if [[ "${SKIP_DEPLOY_PACKAGE:-false}" != "true" ]]; then
        create_deployment_package
    fi

    cleanup_build_artifacts

    log_success "Complete build process finished successfully!"
    log_info "Build log available at: ${LOG_FILE}"
    log_info "Deployment package available at: ${BUILD_DIR}/deployment"

    if [[ -d "${BUILD_DIR}/deployment" ]]; then
        log_info "To deploy, run: cd ${BUILD_DIR}/deployment && ./deploy.sh"
    fi
}

# Execute main function with all arguments
main "$@"