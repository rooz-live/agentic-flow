#!/usr/bin/env bash
#
# immediate_infrastructure_fixes.sh
# Purpose: Apply immediate infrastructure remediations for M1-M4 gates
# Correlation ID: consciousness-1758658960
#

set -euo pipefail

# ============================================================================
# CONSTANTS
# ============================================================================

readonly CORRELATION_ID="consciousness-1758658960"
readonly COMPONENT="immediate_infrastructure_fixes"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Domain list
readonly DOMAINS=(
    "interface.artchat.art"
    "interface.o-gov.com"
    "interface.rooz.live"
    "interface.tag.ooo"
    "interface.tag.vote"
    "interface.cuddleball.art"
    "interface.grlf.earth"
    "interface.mbo.bio"
    "interface.sali.fun"
)

# ============================================================================
# HEARTBEAT UTILITY
# ============================================================================

heartbeat() {
    local phase="$1"
    local status="$2"
    local start_time="$3"
    local metrics="${4:-}"

    local elapsed=$((SECONDS - start_time))
    local ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    echo "$ts|$COMPONENT|$phase|$status|$elapsed|$CORRELATION_ID|$metrics"
    echo "$ts|$COMPONENT|$phase|$status|$elapsed|$CORRELATION_ID|$metrics" >> "$SCRIPT_DIR/logs/heartbeats.log"
}

# ============================================================================
# BACKOFF HELPERS (Deterministic with jitter)
# ============================================================================

backoff_seconds() {
    local attempt="$1"
    local base=(60 90 120)
    local delay=${base[$((attempt-1))]}
    local jitter=$(( (RANDOM % 21) - 10 ))  # -10..+10 percent
    echo $(( delay + (delay * jitter / 100) ))
}

retry_with_backoff() {
    local name="$1"; shift
    local attempt=1
    while (( attempt<=3 )); do
        if "$@"; then return 0; fi
        local sleep_s=$(backoff_seconds "$attempt")
        local ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        echo "$ts|$COMPONENT|${name}|BACKOFF|${sleep_s}|$CORRELATION_ID|cmd=$*" >> "$SCRIPT_DIR/logs/heartbeats.log"
        sleep "$sleep_s"; ((attempt++))
    done
    return 1
}

# ============================================================================
# ERROR TRAP
# ============================================================================

trap 'heartbeat "error_trap" "ERROR" "$SECONDS" "line=$LINENO"' ERR

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

detect_nginx_root() {
    local nginx_v_output
    nginx_v_output=$(nginx -V 2>&1 || echo "")

    # Try to extract conf-path
    if [[ "$nginx_v_output" =~ --conf-path=([^[:space:]]+) ]]; then
        local conf_path="${BASH_REMATCH[1]}"
        dirname "$conf_path"
    elif [[ "$nginx_v_output" =~ --prefix=([^[:space:]]+) ]]; then
        echo "${BASH_REMATCH[1]}"
    elif [[ -d "/etc/nginx" ]]; then
        echo "/etc/nginx"
    elif [[ -d "/usr/local/etc/nginx" ]]; then
        echo "/usr/local/etc/nginx"
    else
        echo "/etc/nginx"  # fallback
    fi
}

backup_nginx_config() {
    local nginx_root="$1"
    local backup_path="${nginx_root}_backup_${TIMESTAMP}.tar.gz"

    echo "Creating backup: $backup_path"
    sudo tar -czf "$backup_path" -C "$(dirname "$nginx_root")" "$(basename "$nginx_root")" 2>/dev/null || {
        echo "Warning: Could not create tar backup, attempting copy..."
        sudo cp -r "$nginx_root" "${nginx_root}_backup_${TIMESTAMP}" || true
    }

    echo "$backup_path"
}

test_nginx() {
    sudo nginx -t 2>&1
}

reload_nginx() {
    if command -v systemctl &>/dev/null && systemctl is-active --quiet nginx 2>/dev/null; then
        sudo systemctl reload nginx
    else
        sudo nginx -s reload
    fi
}

resolve_public_ip() {
    local ipv4=""
    local ipv6=""

    # Try dig with OpenDNS resolver
    if command -v dig &>/dev/null; then
        ipv4=$(dig +short myip.opendns.com @resolver1.opendns.com 2>/dev/null || echo "")
    fi

    # Fallback methods for IPv4
    if [[ -z "$ipv4" ]]; then
        ipv4=$(curl -s -4 ifconfig.me 2>/dev/null || curl -s -4 icanhazip.com 2>/dev/null || echo "")
    fi

    # Try to get IPv6
    if command -v dig &>/dev/null; then
        ipv6=$(dig +short -6 myip.opendns.com @resolver1.opendns.com AAAA 2>/dev/null || echo "")
    fi

    if [[ -z "$ipv6" ]]; then
        ipv6=$(curl -s -6 ifconfig.me 2>/dev/null || curl -s -6 icanhazip.com 2>/dev/null || echo "")
    fi

    echo "$ipv4|$ipv6"
}

find_php_fpm_socket() {
    local sockets=(
        "/run/php/php8.3-fpm.sock"
        "/run/php/php8.2-fpm.sock"
        "/run/php/php8.1-fpm.sock"
        "/run/php/php8.0-fpm.sock"
        "/run/php/php7.4-fpm.sock"
        "/var/run/php-fpm/www.sock"
        "/var/run/php/php-fpm.sock"
    )

    for socket in "${sockets[@]}"; do
        if [[ -S "$socket" ]]; then
            echo "$socket"
            return 0
        fi
    done

    return 1
}

find_php_fpm_service() {
    local services=(
        "php8.3-fpm"
        "php8.2-fpm"
        "php8.1-fpm"
        "php8.0-fpm"
        "php7.4-fpm"
        "php-fpm"
    )

    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            echo "$service"
            return 0
        fi
    done

    return 1
}

# ============================================================================
# PHASE M1: DNS INSTRUCTIONS
# ============================================================================

phase_m1_dns_instructions() {
    local phase_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Phase M1: DNS Configuration Instructions"
    echo "=========================================="

    heartbeat "m1_dns_instructions" "START" "$phase_start" ""

    local ips
    ips=$(resolve_public_ip)
    local ipv4="${ips%%|*}"
    local ipv6="${ips##*|}"

    local dns_file="$SCRIPT_DIR/dns_instructions_${TIMESTAMP}.md"

    cat > "$dns_file" << EOF
# DNS Configuration Instructions
Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Correlation ID: $CORRELATION_ID

## Detected IP Addresses

- IPv4: ${ipv4:-Not detected}
- IPv6: ${ipv6:-Not detected}

## Required DNS Records

Configure the following A records at your domain registrar:

EOF

    for domain in "${DOMAINS[@]}"; do
        cat >> "$dns_file" << EOF
### $domain
- **A Record**: $domain → ${ipv4:-YOUR_IPV4_HERE}
EOF
        if [[ -n "$ipv6" ]]; then
            cat >> "$dns_file" << EOF
- **AAAA Record**: $domain → $ipv6
EOF
        fi
        cat >> "$dns_file" << EOF
- **TTL**: 60 seconds (recommended during rollout, increase to 14400 after stable)

EOF
    done

    cat >> "$dns_file" << EOF

## Cloudflare Configuration (if applicable)

1. Set **SSL/TLS encryption mode** to **Full (strict)**
2. Enable **HTTP Strict Transport Security (HSTS)**
3. Consider enabling **Always Use HTTPS**
4. Orange-cloud proxy can be enabled for DDoS protection

## Verification

After DNS propagation (0-48 hours), verify with:

\`\`\`bash
for domain in ${DOMAINS[@]}; do
    echo "Checking \$domain..."
    dig +short A \$domain
done
\`\`\`

## Next Steps

1. Apply the DNS changes above at your registrar
2. Wait for DNS propagation
3. Run validation: ./comprehensive_validation_suite.sh
4. Proceed to M2-M4 fixes once DNS resolves correctly

EOF

    echo ""
    echo "DNS instructions saved to: $dns_file"
    echo ""
    cat "$dns_file"


    heartbeat "m1_dns_instructions" "OK" "$phase_start" "domains=9,ipv4=$ipv4,ipv6=$ipv6,file=$dns_file"
}

# ============================================================================
# PHASE M2: HSTS DEPLOYMENT
# ============================================================================

phase_m2_hsts_deployment() {
    local phase_start=$SECONDS
    echo ""
    echo "=========================================="

    echo "Phase M2: HSTS Headers Deployment"
    echo "=========================================="

    heartbeat "m2_hsts_deployment" "START" "$phase_start" ""

    local nginx_root
    nginx_root=$(detect_nginx_root)
    echo "Detected nginx root: $nginx_root"

    # Create backup
    echo "Creating nginx backup..."
    backup_nginx_config "$nginx_root"

    # Create HSTS snippet
    local snippet_dir="$nginx_root/snippets"
    sudo mkdir -p "$snippet_dir"

    local hsts_snippet="$snippet_dir/security_hsts.conf"
    echo "Creating HSTS snippet: $hsts_snippet"

    sudo tee "$hsts_snippet" > /dev/null << 'EOF'
# HSTS (HTTP Strict Transport Security)
# Instructs browsers to always use HTTPS for this domain
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
EOF

    # Insert include into server blocks
    local changed=0
    local sites_dir="$nginx_root/sites-available"

    if [[ -d "$sites_dir" ]]; then
    # Align HSTS snippet naming with docs (create hsts.conf symlink to security_hsts.conf)
    if [[ -d "$snippet_dir" ]]; then
        if [[ ! -e "$snippet_dir/hsts.conf" ]]; then
            sudo ln -sf "$hsts_snippet" "$snippet_dir/hsts.conf" || true
        fi
    fi

        for domain in "${DOMAINS[@]}"; do
            # Find config files containing this domain
            local config_files
            config_files=$(sudo grep -l "server_name.*$domain" "$sites_dir"/* 2>/dev/null || echo "")

            for config in $config_files; do
                # Check if include already exists
                if ! sudo grep -q "include.*security_hsts.conf" "$config"; then
                    echo "Adding HSTS include to: $config"
                    # Insert after first 'server {' line
                    sudo sed -i.bak '/server[[:space:]]*{/a\    include snippets/security_hsts.conf;' "$config"
                    ((changed++))
                fi
            done
        done
    fi

    # Validate and reload
    if retry_with_backoff "m2_nginx_test" bash -lc 'sudo nginx -t'; then
        reload_nginx
        echo "✓ HSTS headers deployed successfully"
        heartbeat "m2_hsts_deployment" "OK" "$phase_start" "changed=$changed,reloaded=1"
    else
        echo "✗ Nginx configuration validation failed (after backoff)"
        heartbeat "m2_hsts_deployment" "ERROR" "$phase_start" "changed=$changed,validation_failed=1"
        return 1
    fi
}

# ============================================================================
# PHASE M3: HEALTH ENDPOINTS
# ============================================================================

phase_m3_health_endpoints() {
    local phase_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Phase M3: Health Endpoints Deployment"
    echo "=========================================="

    heartbeat "m3_health_endpoints" "START" "$phase_start" ""

    local nginx_root
    nginx_root=$(detect_nginx_root)

    # Create health endpoint snippet
    local snippet_dir="$nginx_root/snippets"
    sudo mkdir -p "$snippet_dir"

    local health_snippet="$snippet_dir/location_health.conf"
    echo "Creating health endpoint snippet: $health_snippet"

    sudo tee "$health_snippet" > /dev/null << 'EOF'
# Health check endpoint
location = /healthz {
    access_log off;
    add_header Content-Type "text/plain; charset=utf-8";
    return 200 "OK";
}
EOF

    # Insert include into server blocks
    local changed=0
    local sites_dir="$nginx_root/sites-available"

    if [[ -d "$sites_dir" ]]; then
        for domain in "${DOMAINS[@]}"; do
            local config_files
            config_files=$(sudo grep -l "server_name.*$domain" "$sites_dir"/* 2>/dev/null || echo "")

            for config in $config_files; do
                if ! sudo grep -q "include.*location_health.conf" "$config"; then
                    echo "Adding health endpoint to: $config"
                    sudo sed -i.bak '/server[[:space:]]*{/a\    include snippets/location_health.conf;' "$config"
                    ((changed++))
                fi
            done
        done
    fi

    # Validate and reload
    if retry_with_backoff "m3_nginx_test" bash -lc 'sudo nginx -t'; then
        reload_nginx
        echo "✓ Health endpoints deployed successfully"
        heartbeat "m3_health_endpoints" "OK" "$phase_start" "changed=$changed,reloaded=1"
    else
        echo "✗ Nginx configuration validation failed (after backoff)"
        heartbeat "m3_health_endpoints" "ERROR" "$phase_start" "changed=$changed,validation_failed=1"
        return 1
    fi
}

# ============================================================================
# PHASE M4: FIX ROOZ.LIVE PHP-FPM
# ============================================================================

phase_m4_fix_rooz_phpfpm() {
    local phase_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Phase M4: Fix interface.rooz.live PHP-FPM"
    echo "=========================================="

    heartbeat "m4_rooz_phpfpm" "START" "$phase_start" ""

    # Find PHP-FPM socket
    local socket
    if socket=$(find_php_fpm_socket); then
        echo "Found PHP-FPM socket: $socket"
    else
        echo "Warning: No PHP-FPM socket found, will use TCP 127.0.0.1:9000"
        socket="127.0.0.1:9000"
    fi

    # Find PHP-FPM service
    local service
    if service=$(find_php_fpm_service); then
        echo "Found PHP-FPM service: $service"
    else
        echo "Warning: No active PHP-FPM service found"
        service="php-fpm"
    fi

    # Find rooz.live config
    local nginx_root
    nginx_root=$(detect_nginx_root)
    local sites_dir="$nginx_root/sites-available"

    local rooz_config
    rooz_config=$(sudo grep -l "server_name.*interface.rooz.live" "$sites_dir"/* 2>/dev/null | head -1 || echo "")

    if [[ -z "$rooz_config" ]]; then
        echo "✗ Could not find interface.rooz.live nginx configuration"
        heartbeat "m4_rooz_phpfpm" "ERROR" "$phase_start" "config_not_found=1"
        return 1
    fi

    echo "Found rooz.live config: $rooz_config"

    # Update PHP-FPM configuration
    local updated=0
    if [[ "$socket" =~ ^/ ]]; then
        # Unix socket
        sudo sed -i.bak "s|fastcgi_pass[[:space:]]*[^;]*;|fastcgi_pass unix:$socket;|g" "$rooz_config" && ((updated++))
    else
        # TCP
        sudo sed -i.bak "s|fastcgi_pass[[:space:]]*unix:[^;]*;|fastcgi_pass $socket;|g" "$rooz_config" && ((updated++))
    fi

    # Ensure SCRIPT_FILENAME is correct
    if ! sudo grep -q "fastcgi_param SCRIPT_FILENAME" "$rooz_config"; then
        echo "Adding SCRIPT_FILENAME parameter..."
        sudo sed -i.bak '/fastcgi_pass/a\        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;' "$rooz_config"
        ((updated++))
    fi

    # Validate and reload nginx
    if retry_with_backoff "m4_nginx_test" bash -lc 'sudo nginx -t'; then
        reload_nginx
        echo "✓ Nginx reloaded successfully"
    else
        echo "✗ Nginx validation failed after PHP-FPM fix (after backoff)"
        heartbeat "m4_rooz_phpfpm" "ERROR" "$phase_start" "socket=$socket,validation_failed=1"
        return 1
    fi

    # Restart PHP-FPM service
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        echo "Restarting PHP-FPM service: $service"
        sudo systemctl restart "$service" || true
    fi

    echo "✓ rooz.live PHP-FPM configuration updated"
    heartbeat "m4_rooz_phpfpm" "OK" "$phase_start" "socket=$socket,service=$service,updated=$updated"
}

# ============================================================================
# VALIDATION
# ============================================================================

validate_fixes() {
    local phase_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Validation: Testing All Fixes"
    echo "=========================================="

    heartbeat "validation" "START" "$phase_start" ""

    local dns_ok=0
    local https_ok=0
    local hsts_ok=0
    local health_ok=0

    for domain in "${DOMAINS[@]}"; do
        echo ""
        echo "Testing: $domain"

        # DNS check (with backoff)
        if retry_with_backoff "val_dns_$domain" bash -lc "dig +short A '$domain' 2>/dev/null | grep -q ." ; then
            echo "  ✓ DNS resolves"
            ((dns_ok++))
        else
            echo "  ✗ DNS does not resolve (after backoff)"
        fi

        # HTTPS check (with backoff)
        if retry_with_backoff "val_https_$domain" bash -lc "curl -s -I -m 5 'https://$domain' 2>/dev/null | grep -q 'HTTP.*[23][0-9][0-9]'" ; then
            echo "  ✓ HTTPS responds"
            ((https_ok++))
        else
            echo "  ✗ HTTPS not responding (after backoff)"
        fi

        # HSTS check (with backoff)
        if retry_with_backoff "val_hsts_$domain" bash -lc "curl -s -I -m 5 'https://$domain' 2>/dev/null | grep -qi 'Strict-Transport-Security.*max-age'" ; then
            echo "  ✓ HSTS header present"
            ((hsts_ok++))
        else
            echo "  ✗ HSTS header missing (after backoff)"
        fi

        # Health endpoint check (with backoff)
        if retry_with_backoff "val_health_$domain" bash -lc "curl -s -m 5 'https://$domain/healthz' 2>/dev/null | grep -q 'OK'" ; then
            echo "  ✓ Health endpoint OK"
            ((health_ok++))
        else
            echo "  ✗ Health endpoint not responding (after backoff)"
        fi
    done

    echo ""
    echo "=========================================="
    echo "Validation Summary"
    echo "=========================================="
    echo "DNS Resolution:   $dns_ok / ${#DOMAINS[@]}"
    echo "HTTPS:            $https_ok / ${#DOMAINS[@]}"
    echo "HSTS Headers:     $hsts_ok / ${#DOMAINS[@]}"
    echo "Health Endpoints: $health_ok / ${#DOMAINS[@]}"
    echo ""

    local total_checks=$((${#DOMAINS[@]} * 4))
    local passed_checks=$((dns_ok + https_ok + hsts_ok + health_ok))
    local health_percent=$((passed_checks * 100 / total_checks))

    echo "Overall Health: ${health_percent}%"
    echo ""

    heartbeat "validation" "OK" "$phase_start" "dns=$dns_ok,https=$https_ok,hsts=$hsts_ok,health=$health_ok,total=${#DOMAINS[@]},health_pct=$health_percent"

    if [[ $health_percent -lt 75 ]]; then
        echo "⚠ Health below 75%, consider investigating failures"
        return 1
    fi
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    local main_start=$SECONDS

    echo ""
    echo "=========================================="
    echo "Immediate Infrastructure Fixes"
    echo "Correlation ID: $CORRELATION_ID"
    echo "Timestamp: $(date)"
    echo "=========================================="

    # Create logs directory
    mkdir -p "$SCRIPT_DIR/logs"

    heartbeat "main" "START" "$main_start" "domains=${#DOMAINS[@]}"

    # Execute phases
    phase_m1_dns_instructions

    echo ""
    read -p "Continue with M2 (HSTS deployment)? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        phase_m2_hsts_deployment
    fi

    echo ""
    read -p "Continue with M3 (Health endpoints)? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        phase_m3_health_endpoints
    fi

    echo ""
    read -p "Continue with M4 (Fix rooz.live PHP-FPM)? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        phase_m4_fix_rooz_phpfpm
    fi

    # Always run validation
    validate_fixes

    echo ""
    echo "=========================================="
    echo "✓ Infrastructure Fixes Complete"
    echo "=========================================="
    echo ""
    echo "Next Steps:"
    echo "1. Apply DNS changes from: dns_instructions_${TIMESTAMP}.md"
    echo "2. Wait for DNS propagation (0-48 hours)"
    echo "3. Run comprehensive validation: ./comprehensive_validation_suite.sh"
    echo ""

    heartbeat "main" "OK" "$main_start" "completed=1"
}

# Run main
main "$@"
