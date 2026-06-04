#!/bin/bash
# Ansible Validation Script - Off-Host Syslog Black Box Recorder
# Validates Ansible playbooks, roles, and syntax

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="${SCRIPT_DIR}/../ansible"
ANSIBLE_VERSION="2.15.0"

echo "=========================================="
echo "Ansible Validation Script"
echo "=========================================="
echo ""

# Check if Ansible is installed
if ! command -v ansible &> /dev/null; then
    echo "ERROR: Ansible is not installed"
    echo "Install Ansible: https://docs.ansible.com/ansible/latest/installation_guide/installation_distros.html"
    exit 1
fi

# Check Ansible version
ANS_VERSION=$(ansible --version | awk '{print $2}')
echo "Ansible version: $ANS_VERSION"

# Check Python version
echo ""
echo "1. Checking Python version..."
PYTHON_VERSION=$(python3 --version | awk '{print $2}')
echo "   Python version: $PYTHON_VERSION"

# Check if required Python packages are installed
echo ""
echo "2. Checking required Python packages..."
REQUIRED_PACKAGES=("jinja2" "pyyaml" "cryptography")
for package in "${REQUIRED_PACKAGES[@]}"; do
    if python3 -c "import ${package}" 2>/dev/null; then
        echo "   ✓ ${package} is installed"
    else
        echo "   ✗ ERROR: ${package} is not installed"
        exit 1
    fi
done

# Check inventory file
echo ""
echo "3. Checking inventory file..."
if [ -f "$ANSIBLE_DIR/inventory/hosts.ini" ]; then
    echo "   ✓ Inventory file exists"
    # Validate inventory syntax
    if ansible-inventory -i "$ANSIBLE_DIR/inventory/hosts.ini" --list &> /dev/null; then
        echo "   ✓ Inventory syntax is valid"
    else
        echo "   ✗ ERROR: Inventory syntax is invalid"
        exit 1
    fi
else
    echo "   ✗ ERROR: Inventory file not found"
    exit 1
fi

# Check group_vars
echo ""
echo "4. Checking group_vars..."
if [ -f "$ANSIBLE_DIR/group_vars/all.yml" ]; then
    echo "   ✓ group_vars/all.yml exists"
    # Validate YAML syntax
    if python3 -c "import yaml; yaml.safe_load(open('$ANSIBLE_DIR/group_vars/all.yml'))" 2>/dev/null; then
        echo "   ✓ group_vars YAML is valid"
    else
        echo "   ✗ ERROR: group_vars YAML is invalid"
        exit 1
    fi
else
    echo "   ✗ ERROR: group_vars/all.yml not found"
    exit 1
fi

# Check roles structure
echo ""
echo "5. Checking role structure..."
REQUIRED_ROLES=("syslog-sink" "syslog-client" "security-hardening")
for role in "${REQUIRED_ROLES[@]}"; do
    ROLE_DIR="$ANSIBLE_DIR/roles/${role}"
    if [ -d "$ROLE_DIR" ]; then
        echo "   ✓ Role ${role} exists"

        # Check for required files
        if [ -f "$ROLE_DIR/tasks/main.yml" ]; then
            echo "      ✓ tasks/main.yml exists"
        else
            echo "      ✗ ERROR: tasks/main.yml missing for role ${role}"
            exit 1
        fi

        if [ -f "$ROLE_DIR/handlers/main.yml" ]; then
            echo "      ✓ handlers/main.yml exists"
        else
            echo "      ⚠ WARNING: handlers/main.yml missing for role ${role}"
        fi
    else
        echo "   ✗ ERROR: Role ${role} not found"
        exit 1
    fi
done

# Check playbooks
echo ""
echo "6. Checking playbooks..."
PLAYBOOK_DIR="$ANSIBLE_DIR/playbooks"
if [ -d "$PLAYBOOK_DIR" ]; then
    for playbook in "$PLAYBOOK_DIR"/*.yml; do
        if [ -f "$playbook" ]; then
            PLAYBOOK_NAME=$(basename "$playbook")
            echo "   Checking $PLAYBOOK_NAME..."
            # Validate playbook syntax
            if ansible-playbook --syntax-check "$playbook" 2>/dev/null; then
                echo "      ✓ $PLAYBOOK_NAME syntax is valid"
            else
                echo "      ✗ ERROR: $PLAYBOOK_NAME syntax is invalid"
                exit 1
            fi
        fi
    done
else
    echo "   ✗ ERROR: playbooks directory not found"
    exit 1
fi

# Check templates
echo ""
echo "7. Checking templates..."
REQUIRED_TEMPLATES=(
    "$ANSIBLE_DIR/roles/syslog-sink/templates/rsyslog.conf.j2"
    "$ANSIBLE_DIR/roles/syslog-sink/templates/logrotate.conf.j2"
    "$ANSIBLE_DIR/roles/syslog-client/templates/rsyslog-client.conf.j2"
    "$ANSIBLE_DIR/roles/syslog-client/templates/journald.conf.j2"
)
for template in "${REQUIRED_TEMPLATES[@]}"; do
    if [ -f "$template" ]; then
        TEMPLATE_NAME=$(basename "$template")
        echo "   ✓ Template $TEMPLATE_NAME exists"
    else
        echo "   ✗ ERROR: Template $(basename $template) not found"
        exit 1
    fi
done

# Check requirements.yml
echo ""
echo "8. Checking requirements.yml..."
if [ -f "$ANSIBLE_DIR/requirements.yml" ]; then
    echo "   ✓ requirements.yml exists"
    # Validate YAML syntax
    if python3 -c "import yaml; yaml.safe_load(open('$ANSIBLE_DIR/requirements.yml'))" 2>/dev/null; then
        echo "   ✓ requirements.yml YAML is valid"
    else
        echo "   ✗ ERROR: requirements.yml YAML is invalid"
        exit 1
    fi
else
    echo "   ✗ ERROR: requirements.yml not found"
    exit 1
fi

# Check for ansible-lint
echo ""
echo "9. Checking ansible-lint..."
if command -v ansible-lint &> /dev/null; then
    echo "   ✓ ansible-lint is installed"
    echo "   Running ansible-lint..."
    cd "$ANSIBLE_DIR"
    if ansible-lint --force-color --quiet; then
        echo "   ✓ ansible-lint passed"
    else
        echo "   ✗ ERROR: ansible-lint failed"
        exit 1
    fi
else
    echo "   ⚠ WARNING: ansible-lint is not installed"
    echo "   Install: pip install ansible-lint"
fi

# Check for sensitive data
echo ""
echo "10. Checking for sensitive data..."
SENSITIVE_PATTERNS=("password" "secret" "token" "api_key" "private_key")
FOUND_SENSITIVE=false
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if grep -ri "$pattern" "$ANSIBLE_DIR"/**/*.yml 2>/dev/null | grep -v "description\|#" | grep -v "sensitive.*true"; then
        echo "   ⚠ WARNING: Possible sensitive data found matching '$pattern'"
        FOUND_SENSITIVE=true
    fi
done
if [ "$FOUND_SENSITIVE" = false ]; then
    echo "   ✓ No hardcoded sensitive data found"
fi

# Check TLS configuration
echo ""
echo "11. Checking TLS configuration..."
if grep -q "6514" "$ANSIBLE_DIR"/**/*.yml 2>/dev/null; then
    echo "   ✓ TLS port (6514) is configured"
else
    echo "   ⚠ WARNING: TLS port not found in configuration"
fi

if grep -q "tls" "$ANSIBLE_DIR"/**/*.yml 2>/dev/null; then
    echo "   ✓ TLS configuration is present"
else
    echo "   ⚠ WARNING: TLS configuration may be missing"
fi

# Check log retention settings
echo ""
echo "12. Checking log retention settings..."
if grep -q "retention_days" "$ANSIBLE_DIR/group_vars/all.yml"; then
    echo "   ✓ Log retention settings are defined"
else
    echo "   ⚠ WARNING: Log retention settings not found"
fi

# Summary
echo ""
echo "=========================================="
echo "All validation checks passed!"
echo "=========================================="
exit 0
