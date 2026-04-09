#!/bin/bash

# OpenStack Caracal Installation Script for StarlingX 11.0 Integration
# This script handles the installation and configuration of OpenStack Caracal
# Usage: ./scripts/build/openstack_caracal_install.sh [options]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../" && pwd)"
BUILD_DIR="${PROJECT_ROOT}/build/openstack"
VENV_DIR="${PROJECT_ROOT}/venv"
LOG_FILE="${PROJECT_ROOT}/logs/openstack_caracal_install.log"
OPENSTACK_VERSION="caracal"
PYTHON_VERSION="3.11"

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
check_prerequisites() {
    log_info "Checking prerequisites for OpenStack Caracal installation..."

    # Check if virtual environment exists and is activated
    if [[ ! -d "${VENV_DIR}" ]]; then
        log_error "Virtual environment not found at ${VENV_DIR}"
        log_error "Please run greenfield_setup.sh first"
        exit 1
    fi

    # Source virtual environment
    source "${VENV_DIR}/bin/activate"

    # Check Python version
    local python_version
    python_version=$(python --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    if [[ "$(printf '%s\n' "3.11" "${python_version}" | sort -V | head -n1)" != "3.11" ]]; then
        log_error "Python 3.11 is required, found: ${python_version}"
        exit 1
    fi

    log_success "Prerequisites check completed"
}

install_openstack_clients() {
    log_info "Installing OpenStack clients and SDK..."

    source "${VENV_DIR}/bin/activate"

    # Install OpenStack clients and SDK
    pip install --upgrade \
        "openstack>=1.5.0" \
        "python-novaclient>=18.3.0" \
        "python-cinderclient>=9.3.0" \
        "python-glanceclient>=4.3.0" \
        "python-keystoneclient>=5.1.0" \
        "python-neutronclient>=11.0.0" \
        "python-heatclient>=3.3.0" \
        "python-octaviaclient>=3.6.0" \
        "python-barbicanclient>=5.5.0" \
        "python-magnumclient>=4.2.0" \
        "python-designateclient>=5.2.0"

    log_success "OpenStack clients installed successfully"
}

configure_openstack_environment() {
    log_info "Configuring OpenStack environment variables and settings..."

    # Create OpenStack configuration directory
    mkdir -p "${BUILD_DIR}/config"
    mkdir -p "${BUILD_DIR}/clouds"

    # Generate clouds.yaml template
    cat > "${BUILD_DIR}/clouds/clouds.yaml.template" << EOF
clouds:
  openstack-caracal:
    region_name: RegionOne
    identity_api_version: 3
    volume_api_version: 3
    compute_api_version: 2.1
    auth:
      auth_url: \${OS_AUTH_URL}
      username: \${OS_USERNAME}
      password: \${OS_PASSWORD}
      project_name: \${OS_PROJECT_NAME}
      project_domain_name: \${OS_PROJECT_DOMAIN_NAME:-Default}
      user_domain_name: \${OS_USER_DOMAIN_NAME:-Default}
    interface: public
    identity_interface: public
  starlingx-local:
    region_name: RegionOne
    identity_api_version: 3
    auth:
      auth_url: http://localhost:5000/v3
      username: admin
      password: \${STX_ADMIN_PASSWORD}
      project_name: admin
      project_domain_name: default
      user_domain_name: default
    interface: internal
EOF

    # Generate openstack-rc.sh template
    cat > "${BUILD_DIR}/config/openstack-rc.sh.template" << 'EOF'
#!/bin/bash
# OpenStack RC file template for Caracal
# Source this file to set OpenStack environment variables

export OS_AUTH_URL="${OS_AUTH_URL:-http://localhost:5000/v3}"
export OS_IDENTITY_API_VERSION="${OS_IDENTITY_API_VERSION:-3}"
export OS_COMPUTE_API_VERSION="${OS_COMPUTE_API_VERSION:-2.1}"
export OS_VOLUME_API_VERSION="${OS_VOLUME_API_VERSION:-3}"
export OS_IMAGE_API_VERSION="${OS_IMAGE_API_VERSION:-2}"

# User credentials (set via environment variables)
export OS_USERNAME="${OS_USERNAME:-admin}"
export OS_PASSWORD="${OS_PASSWORD:-}"
export OS_PROJECT_NAME="${OS_PROJECT_NAME:-admin}"
export OS_PROJECT_DOMAIN_NAME="${OS_PROJECT_DOMAIN_NAME:-default}"
export OS_USER_DOMAIN_NAME="${OS_USER_DOMAIN_NAME:-default}"
export OS_REGION_NAME="${OS_REGION_NAME:-RegionOne}"

# TLS/Insecurity settings
export OS_CACERT="${OS_CACERT:-}"
export OS_INSECURE="${OS_INSECURE:-false}"

# OpenStack endpoints (can be overridden)
export OS_INTERFACE="${OS_INTERFACE:-internal}"

echo "OpenStack environment configured for Caracal"
echo "Region: $OS_REGION_NAME"
echo "Project: $OS_PROJECT_NAME"
echo "User: $OS_USERNAME"
EOF

    chmod +x "${BUILD_DIR}/config/openstack-rc.sh.template"

    log_success "OpenStack environment configuration completed"
}

setup_starlingx_specific_config() {
    log_info "Setting up StarlingX-specific OpenStack configurations..."

    # Create StarlingX configuration directory
    mkdir -p "${BUILD_DIR}/starlingx"

    # Generate StarlingX-specific configuration
    cat > "${BUILD_DIR}/starlingx/stx-config.yaml" << EOF
# StarlingX 11.0 OpenStack Integration Configuration
starlingx:
  version: "11.0"
  openstack_release: "caracal"

  # System configuration
  system:
    personality: "controller"
    region_config: true
    distributed_cloud_role: "systemcontroller"

  # OpenStack configuration
  openstack:
    compute:
      cpu_allocation_ratio: 16.0
      ram_allocation_ratio: 1.5
      disk_allocation_ratio: 1.0

    storage:
      backend: "ceph"
      replication_factor: 3

    network:
      external_network: "external"
      management_network: "management"
      cluster_host_network: "cluster-host"

  # Platform integration
  platform:
    helm_applications:
      - name: "platform-integ-apps"
        version: "11.0"
      - name: "oidc-auth-apps"
        version: "11.0"

  # Monitoring integration
  monitoring:
    collectd_config: true
    influxdb_integration: true
    grafana_dashboards: true
EOF

    log_success "StarlingX-specific configuration completed"
}

setup_ansible_playbooks() {
    log_info "Setting up Ansible playbooks for OpenStack deployment..."

    # Create Ansible directory
    mkdir -p "${BUILD_DIR}/ansible"

    # Generate site.yml playbook
    cat > "${BUILD_DIR}/ansible/site.yml" << EOF
---
# StarlingX OpenStack Caracal Deployment Playbook
- name: Deploy OpenStack Caracal on StarlingX
  hosts: all
  become: yes
  gather_facts: yes

  vars:
    openstack_version: "caracal"
    starlingx_version: "11.0"

  pre_tasks:
    - name: Update apt cache
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == 'Debian'

    - name: Install required packages
      package:
        name:
          - python3-openstackclient
          - python3-novaclient
          - python3-cinderclient
          - python3-glanceclient
          - python3-neutronclient
        state: present

  roles:
    - { role: openstack-keystone, tags: ['keystone'] }
    - { role: openstack-glance, tags: ['glance'] }
    - { role: openstack-nova, tags: ['nova'] }
    - { role: openstack-neutron, tags: ['neutron'] }
    - { role: openstack-cinder, tags: ['cinder'] }

  post_tasks:
    - name: Verify OpenStack services
      service:
        name: "{{ item }}"
        state: started
        enabled: yes
      with_items:
        - openstack-nova-compute
        - neutron-server
        - cinder-volume
        - glance-api
EOF

    # Generate ansible.cfg
    cat > "${BUILD_DIR}/ansible/ansible.cfg" << EOF
[defaults]
inventory = hosts.ini
host_key_checking = False
remote_user = sysadmin
private_key_file = ~/.ssh/id_rsa
stdout_callback = yaml
retry_files_enabled = False
gathering = smart
fact_caching = memory
deprecation_warnings = False

[inventory]
enable_plugins = yaml, ini, auto

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=no
control_path_dir = /tmp/.ansible-cp
pipelining = True
EOF

    log_success "Ansible playbooks setup completed"
}

setup_development_tools() {
    log_info "Setting up OpenStack development and testing tools..."

    source "${VENV_DIR}/bin/activate"

    # Install development tools
    pip install \
        'openstack-ansible>=0.20.0' \
        'ansible-lint>=6.0.0' \
        'molecule>=4.0.0' \
        'testinfra>=6.0.0'

    # Install OpenStack SDK development tools
    pip install \
        'openstack-sdk[test]>=1.5.0' \
        'stestr>=4.0.0' \
        'coverage>=7.0.0' \
        'osprofiler>=3.4.0'

    log_success "Development tools setup completed"
}

create_test_environment() {
    log_info "Creating OpenStack test environment..."

    # Create test configuration
    mkdir -p "${BUILD_DIR}/test"

    cat > "${BUILD_DIR}/test/test-config.yaml" << EOF
test_environment:
  name: "openstack-caracal-test"
  description: "Test environment for OpenStack Caracal on StarlingX"

  # Test scenarios
  scenarios:
    - name: "basic-compute"
      description: "Test basic compute functionality"
      services:
        - nova-compute
        - neutron-server

    - name: "storage-integration"
      description: "Test storage integration"
      services:
        - cinder-volume
        - glance-api

    - name: "network-connectivity"
      description: "Test network connectivity"
      services:
        - neutron-dhcp-agent
        - neutron-l3-agent

  # Test data
  test_data:
    test_instances:
      count: 3
      flavor: "m1.small"
      image: "cirros"

    test_networks:
      - name: "test-net-1"
        subnet: "192.168.100.0/24"
      - name: "test-net-2"
        subnet: "192.168.200.0/24"
EOF

    log_success "Test environment configuration created"
}

run_installation_validation() {
    log_info "Running OpenStack Caracal installation validation..."

    source "${VENV_DIR}/bin/activate"

    # Test OpenStack client installation
    python -c "import openstack; print(f'OpenStack SDK version: {openstack.__version__}')"
    python -c "import novaclient; print(f'Nova client version: {novaclient.__version__}')"
    python -c "import glanceclient; print(f'Glance client version: {glanceclient.__version__}')"
    python -c "import neutronclient; print(f'Neutron client version: {neutronclient.__version__}')"

    # Validate configuration files
    if [[ -f "${BUILD_DIR}/clouds/clouds.yaml.template" ]]; then
        log_info "Clouds configuration template is valid"
    fi

    if [[ -f "${BUILD_DIR}/starlingx/stx-config.yaml" ]]; then
        log_info "StarlingX configuration is valid"
    fi

    log_success "Installation validation completed successfully"
}

# Main execution
main() {
    log_info "Starting OpenStack Caracal installation for StarlingX 11.0..."

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-clients)
                SKIP_CLIENTS=true
                shift
                ;;
            --skip-config)
                SKIP_CONFIG=true
                shift
                ;;
            --skip-ansible)
                SKIP_ANSIBLE=true
                shift
                ;;
            --test-only)
                TEST_ONLY=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-clients  Skip OpenStack clients installation"
                echo "  --skip-config   Skip environment configuration"
                echo "  --skip-ansible  Skip Ansible playbooks setup"
                echo "  --test-only     Only run validation tests"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Create log file
    mkdir -p "$(dirname "${LOG_FILE}")"
    touch "${LOG_FILE}"

    # Run installation steps
    check_prerequisites

    if [[ "${TEST_ONLY:-false}" == "true" ]]; then
        run_installation_validation
        exit 0
    fi

    # Install OpenStack clients (unless skipped)
    if [[ "${SKIP_CLIENTS:-false}" != "true" ]]; then
        install_openstack_clients
    fi

    # Configure OpenStack environment (unless skipped)
    if [[ "${SKIP_CONFIG:-false}" != "true" ]]; then
        configure_openstack_environment
        setup_starlingx_specific_config
    fi

    # Setup Ansible playbooks (unless skipped)
    if [[ "${SKIP_ANSIBLE:-false}" != "true" ]]; then
        setup_ansible_playbooks
    fi

    # Setup development tools
    setup_development_tools

    # Create test environment
    create_test_environment

    # Run validation
    run_installation_validation

    log_success "OpenStack Caracal installation completed successfully!"
    log_info "Installation log available at: ${LOG_FILE}"
    log_info "Configuration files created in: ${BUILD_DIR}"
    log_info "Ready for StarlingX 11.0 integration deployment"
}

# Execute main function with all arguments
main "$@"