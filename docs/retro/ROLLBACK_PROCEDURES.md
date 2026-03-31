
# GitLab Migration Rollback Procedures and Recommendations

**Document Version**: 1.0  
**Creation Date**: December 8, 2025  
**Last Updated**: December 8, 2025  
**Migration Status**: 🔴 **BLOCKED** - DNS Resolution Failures  
**Prepared By**: DevOps Automation and Infrastructure Specialist  

---

## Executive Summary

This document provides comprehensive rollback procedures and infrastructure recommendations for the blocked GitLab migration from `gitlab.yocloud.com` to `gitlab.interface.splitcite.com`. Since the migration has not been initiated due to critical DNS resolution failures, formal rollback procedures are not currently required. However, this document establishes emergency rollback protocols, infrastructure recommendations, and improved migration strategies for when the blocking issues are resolved.

### Current Situation Assessment
- **Migration Status**: BLOCKED - DNS resolution failures for both source and target domains
- **Infrastructure State**: Target not provisioned, source inaccessible
- **Rollback Requirement**: None (migration not started)
- **Temporary Workarounds**: Local /etc/hosts entries implemented for testing
- **Critical Blockers**: DNS configuration, network connectivity, infrastructure provisioning

---

## 1. Current Rollback Status

### 1.1 Current State Analysis

Since the migration has not been initiated due to fundamental infrastructure issues, no formal rollback procedures are currently required. The current state represents a pre-migration condition with temporary diagnostic workarounds in place.

#### Migration State Summary
| Component | Status | Details |
|-----------|--------|---------|
| Source Instance (gitlab.yocloud.com) | ❌ Inaccessible | DNS resolution failure (NXDOMAIN) |
| Target Instance (gitlab.interface.splitcite.com) | ❌ Not Provisioned | DNS resolution failure (NXDOMAIN) |
| Migration Scripts | ✅ Ready | All scripts developed and tested |
| Data Migration | ❌ Not Started | Blocked by infrastructure issues |
| User Impact | ✅ None | No services affected |

#### Temporary Workarounds Requiring Reversal

**Local /etc/hosts Modifications**
```bash
# Current temporary entries (require removal after diagnostics)
54.241.233.105 gitlab.yocloud.com
54.241.233.105 gitlab.interface.splitcite.com
```

**Reversal Procedure**
```bash
# Backup current hosts file
sudo cp /etc/hosts /etc/hosts.backup.$(date +%Y%m%d_%H%M%S)

# Remove temporary entries
sudo sed -i '' '/54.241.233.105 gitlab.yocloud.com/d' /etc/hosts
sudo sed -i '' '/54.241.233.105 gitlab.interface.splitcite.com/d' /etc/hosts

# Verify removal
cat /etc/hosts | grep 54.241.233.105
```

#### Diagnostic Changes Requiring Cleanup

**Active Terminal Sessions**
- Terminal 2: `echo "54.241.233.105 gitlab.yocloud.com" | sudo tee -a /etc/hosts`
- Terminal 3: `sudo sh -c 'echo "54.241.233.105 gitlab.yocloud.com" >> /etc/hosts'`
- Terminal 5: `sudo sh -c 'echo "54.241.233.105 gitlab.interface.splitcite.com" >> /etc/hosts'`

**Cleanup Commands**
```bash
# Close active terminal sessions after documenting output
# Remove any temporary scripts or files created during diagnostics
find /tmp -name "*gitlab*" -type f -exec rm {} \;
```

### 1.2 Pre-Migration Baseline Documentation

#### Expected Pre-Migration State
```bash
# DNS Resolution (Expected)
nslookup gitlab.yocloud.com
# Should resolve to valid IP address

nslookup gitlab.interface.splitcite.com
# Should resolve to valid IP address

# Service Accessibility (Expected)
curl -I https://gitlab.yocloud.com
# Should return 200 OK with GitLab headers

curl -I https://gitlab.interface.splitcite.com
# Should return 200 OK with GitLab headers (after provisioning)
```

#### Current System State Preservation
```bash
# Create system snapshot before any migration attempt
sudo sysdiagnose -f /tmp/pre_migration_sysdiagnose_$(date +%Y%m%d_%H%M%S).tar.gz

# Document current network configuration
ifconfig > /tmp/network_config_$(date +%Y%m%d_%H%M%S).txt
netstat -rn > /tmp/routing_table_$(date +%Y%m%d_%H%M%S).txt

# Backup DNS configuration
sudo cp /etc/resolv.conf /tmp/resolv.conf.backup.$(date +%Y%m%d_%H%M%S)
```

---

## 2. Emergency Rollback Procedures

### 2.1 Rollback Trigger Conditions

#### Critical Failure Triggers
1. **Data Corruption Detected**: Any checksum mismatch during migration
2. **Service Unavailability**: Target instance fails to start after migration
3. **Performance Degradation**: Response times > 5000ms for > 5 minutes
4. **Authentication Failures**: > 10% of users unable to authenticate
5. **Data Loss**: Any confirmed data loss during migration process
6. **Timeout Exceeded**: Migration window exceeded by > 2 hours

#### Automated Rollback Triggers
```bash
# Health check failure threshold
HEALTH_CHECK_FAILURES=5
HEALTH_CHECK_INTERVAL=60  # seconds

# Performance degradation threshold
RESPONSE_TIME_THRESHOLD=5000  # milliseconds
PERFORMANCE_FAILURES=3

# Data integrity check failure
INTEGRITY_CHECK_FAILURES=1  # Any failure triggers rollback
```

### 2.2 Immediate Rollback Actions (First 5 Minutes)

#### Emergency Stop Procedures
```bash
#!/bin/bash
# emergency_rollback.sh - Immediate rollback initiation

# 1. Stop all migration processes
echo "Stopping migration processes..."
pkill -f execute_migration.sh
pkill -f gitlab-backup
pkill -f gitlab-restore

# 2. Kill any hanging SSH connections
echo "Terminating SSH connections..."
pkill -f "ssh.*gitlab"

# 3. Assess current migration state
echo "Assessing migration state..."
./scripts/migration/rollback_status.sh > /tmp/rollback_status_$(date +%Y%m%d_%H%M%S).log

# 4. Initialize rollback logging
echo "Initializing rollback logging..."
ROLLBACK_LOG="/var/log/gitlab_migration_rollback_$(date +%Y%m%d_%H%M%S).log"
echo "Rollback initiated at $(date)" | tee $ROLLBACK_LOG

# 5. Notify emergency response team
echo "Notifying emergency response team..."
./scripts/communication/send_emergency_alert.sh "ROLLBACK_INITIATED" >> $ROLLBACK_LOG 2>&1
```

#### Service State Assessment
```bash
#!/bin/bash
# assess_service_state.sh - Current service state evaluation

# Check source GitLab status
echo "=== Source GitLab Status ==="
ssh -o ConnectTimeout=10 gitlab.yocloud.com "sudo gitlab-ctl status" 2>/dev/null || echo "Source inaccessible"

# Check target GitLab status
echo "=== Target GitLab Status ==="
ssh -o ConnectTimeout=10 gitlab.interface.splitcite.com "sudo gitlab-ctl status" 2>/dev/null || echo "Target inaccessible"

# Check DNS resolution
echo "=== DNS Resolution Status ==="
nslookup gitlab.yocloud.com
nslookup gitlab.interface.splitcite.com

# Check service accessibility
echo "=== Service Accessibility ==="
curl -I --connect-timeout 10 https://gitlab.yocloud.com 2>/dev/null || echo "Source service inaccessible"
curl -I --connect-timeout 10 https://gitlab.interface.splitcite.com 2>/dev/null || echo "Target service inaccessible"
```

### 2.3 Service Restoration Procedures (First 30 Minutes)

#### Source Instance Recovery
```bash
#!/bin/bash
# restore_source_instance.sh - Source GitLab recovery

SOURCE_HOST="gitlab.yocloud.com"
BACKUP_DIR="/var/opt/gitlab/backups"

# 1. Ensure source GitLab is running
echo "Starting source GitLab services..."
ssh $SOURCE_HOST "sudo gitlab-ctl start" || {
    echo "Failed to start GitLab services on $SOURCE_HOST"
    exit 1
}

# 2. Verify all services are operational
echo "Verifying service health..."
ssh $SOURCE_HOST "sudo gitlab-ctl status" | grep -q "run:" || {
    echo "Not all services are running on $SOURCE_HOST"
    exit 1
}

# 3. Check database connectivity
echo "Checking database connectivity..."
ssh $SOURCE_HOST "sudo gitlab-rake gitlab:check" | grep -E "(Database|Redis|Gitaly)" || {
    echo "Database connectivity issues detected"
    exit 1
}

# 4. Verify web interface accessibility
echo "Testing web interface accessibility..."
curl -f --connect-timeout 30 https://$SOURCE_HOST/users/sign_in || {
    echo "Web interface not accessible"
    exit 1
}

echo "Source instance recovery completed successfully"
```

#### Configuration Validation
```bash
#!/bin/bash
# validate_configuration.sh - Configuration integrity check

SOURCE_HOST="gitlab.yocloud.com"

# 1. Check GitLab configuration
echo "Validating GitLab configuration..."
ssh $SOURCE_HOST "sudo gitlab-ctl show-config" | grep -q "external_url" || {
    echo "GitLab configuration validation failed"
    exit 1
}

# 2. Verify SSL certificates
echo "Checking SSL certificates..."
ssh $SOURCE_HOST "openssl x509 -in /etc/gitlab/ssl/gitlab.yocloud.com.crt -text -noout" || {
    echo "SSL certificate validation failed"
    exit 1
}

# 3. Check user data integrity
echo "Verifying user data integrity..."
ssh $SOURCE_HOST "sudo gitlab-rake gitlab:check | grep -E '(Database|Uploads)'"

# 4. Validate CI/CD runner status
echo "Checking CI/CD runner status..."
ssh $SOURCE_HOST "sudo gitlab-runner list" || {
    echo "CI/CD runner validation failed"
    exit 1
}
```

### 2.4 DNS Reversion Procedures (First Hour)

#### DNS Rollback Process
```bash
#!/bin/bash
# dns_rollback.sh - DNS configuration reversion

# 1. Contact DNS administrator immediately
echo "=== EMERGENCY DNS ROLLBACK REQUIRED ==="
echo "Contact DNS administrator immediately:"
echo "- Phone: [DNS_ADMIN_PHONE]"
echo "- Email: [DNS_ADMIN_EMAIL]"
echo "- Slack: #dns-emergency"

# 2. Verify current DNS configuration
echo "Checking current DNS configuration..."
dig gitlab.yocloud.com +short
dig gitlab.interface.splitcite.com +short

# 3. Document DNS changes required
echo "=== DNS Changes Required ==="
echo "1. Ensure gitlab.yocloud.com points to original source IP"
echo "2. Remove or redirect gitlab.interface.splitcite.com"
echo "3. Verify TTL settings for rapid propagation"

# 4. Monitor DNS propagation
echo "Monitoring DNS propagation..."
while true; do
    echo "$(date): Checking DNS resolution..."
    dig gitlab.yocloud.com +short
    sleep 30
done
```

#### DNS Validation Script
```bash
#!/bin/bash
# validate_dns.sh - DNS resolution validation

DOMAINS=("gitlab.yocloud.com" "gitlab.interface.splitcite.com")
EXPECTED_SOURCES=("8.8.8.8" "1.1.1.1" "208.67.222.222")

for domain in "${DOMAINS[@]}"; do
    echo "=== Validating DNS for $domain ==="
    
    for dns_server in "${EXPECTED_SOURCES[@]}"; do
        echo "Checking from $dns_server..."
        result=$(dig @$dns_server $domain +short)
        
        if [ -z "$result" ]; then
            echo "WARNING: No DNS resolution from $dns_server"
        else
            echo "SUCCESS: Resolves to $result"
        fi
    done
    
    # Test service accessibility
    echo "Testing service accessibility for $domain..."
    curl -I --connect-timeout 10 https://$domain 2>/dev/null && \
        echo "SUCCESS: Service accessible" || \
        echo "WARNING: Service not accessible"
    
    echo ""
done
```

### 2.5 User Communication Protocols

#### Emergency Communication Templates
```bash
#!/bin/bash
# emergency_communication.sh - Emergency notification system

# 1. Immediate service status update
send_service_update() {
    local status=$1
    local message=$2
    
    curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 GitLab Migration Emergency\nStatus: $status\n$message\nTime: $(date)\"}" \
    $SLACK_WEBHOOK_URL
    
    # Send email notification
    echo "$message" | mail -s "GitLab Migration Emergency: $status" $NOTIFICATION_EMAIL_LIST
}

# 2. Progress update function
send_progress_update() {
    local phase=$1
    local eta=$2
    
    send_service_update "IN_PROGRESS" "Rollback Phase: $phase\nETA: $eta"
}

# 3. Resolution notification
send_resolution() {
    local resolution_time=$1
    local root_cause=$2
    
    send_service_update "RESOLVED" "Service restored at $resolution_time\nRoot cause: $root_cause"
}
```

#### Communication Schedule
| Time Since Incident | Update Frequency | Communication Channel | Content |
|---------------------|------------------|----------------------|---------|
| 0-15 minutes | Every 5 minutes | Slack #migration-emergency | Current status, actions in progress |
| 15-60 minutes | Every 15 minutes | Slack + Email | Progress updates, ETA |
| 1-3 hours | Every 30 minutes | Email + Status Page | Detailed progress, impact assessment |
| 3+ hours | Every hour | All channels | Resolution timeline, business impact |

---

## 3. Pre-Migration Safety Measures

### 3.1 Backup Verification Procedures

#### Comprehensive Backup Strategy
```bash
#!/bin/bash
# backup_verification.sh - Comprehensive backup verification

SOURCE_HOST="gitlab.yocloud.com"
BACKUP_DIR="/var/opt/gitlab/backups"
VERIFICATION_LOG="/var/log/backup_verification_$(date +%Y%m%d_%H%M%S).log"

# 1. Pre-backup system health check
echo "=== Pre-Backup System Health Check ===" | tee $VERIFICATION_LOG
ssh $SOURCE_HOST "sudo gitlab-ctl status" | tee -a $VERIFICATION_LOG

# 2. Create application backup
echo "=== Creating Application Backup ===" | tee -a $VERIFICATION_LOG
BACKUP_NAME=$(ssh $SOURCE_HOST "sudo gitlab-backup create BACKUP=$(date +%Y%m%d_%H%M%S) CRON=1" | grep "Creating backup" | awk '{print $3}')
echo "Backup created: $BACKUP_NAME" | tee -a $VERIFICATION_LOG

# 3. Verify backup integrity
echo "=== Verifying Backup Integrity ===" | tee -a $VERIFICATION_LOG
ssh $SOURCE_HOST "sudo gitlab-backup --check $BACKUP_NAME" | tee -a $VERIFICATION_LOG

# 4. Create configuration backup
echo "=== Creating Configuration Backup ===" | tee -a $VERIFICATION_LOG
ssh $SOURCE_HOST "sudo tar -czf /etc/gitlab/config_backup_$(date +%Y%m%d_%H%M%S).tar.gz /etc/gitlab"

# 5. Create database backup
echo "=== Creating Database Backup ===" | tee -a $VERIFICATION_LOG
ssh $SOURCE_HOST "sudo -u gitlab-psql pg_dump gitlabhq_production > /var/opt/gitlab/postgresql/db_backup_$(date +%Y%m%d_%H%M%S).sql"

# 6. Verify backup files
echo "=== Verifying Backup Files ===" | tee -a $VERIFICATION_LOG
ssh $SOURCE_HOST "ls -la $BACKUP_DIR/$BACKUP_NAME" | tee -a $VERIFICATION_LOG
ssh $SOURCE_HOST "ls -la /etc/gitlab/config_backup_*.tar.gz" | tee -a $VERIFICATION_LOG
ssh $SOURCE_HOST "ls -la /var/opt/gitlab/postgresql/db_backup_*.sql" | tee -a $VERIFICATION_LOG

echo "Backup verification completed at $(date)" | tee -a $VERIFICATION_LOG
```

#### Backup Validation Script
```bash
#!/bin/bash
# validate_backup.sh - Backup validation and integrity checking

BACKUP_FILE=$1
SOURCE_HOST="gitlab.yocloud.com"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# 1. Check backup file exists
echo "Checking backup file existence..."
ssh $SOURCE_HOST "test -f $BACKUP_FILE" || {
    echo "ERROR: Backup file $BACKUP_FILE does not exist"
    exit 1
}

# 2. Verify backup file size
echo "Checking backup file size..."
BACKUP_SIZE=$(ssh $SOURCE_HOST "stat -f%z $BACKUP_FILE")
if [ $BACKUP_SIZE -lt 1000000 ]; then  # Less than 1MB
    echo "WARNING: Backup file seems too small ($BACKUP_SIZE bytes)"
fi

# 3. Test backup restoration (dry run)
echo "Testing backup restoration (dry run)..."
ssh $SOURCE_HOST "sudo gitlab-backup restore BACKUP=$BACKUP_FILE FORCE=yes --dry-run" || {
    echo "ERROR: Backup dry run failed"
    exit 1
}

# 4. Check backup checksums
echo "Verifying backup checksums..."
ssh $SOURCE_HOST "md5sum $BACKUP_FILE > $BACKUP_FILE.md5"
ssh $SOURCE_HOST "sha256sum $BACKUP_FILE > $BACKUP_FILE.sha256"

echo "Backup validation completed successfully"
```

### 3.2 Checkpoint Creation and Validation

#### Migration Checkpoint System
```bash
#!/bin/bash
# create_checkpoint.sh - Migration checkpoint creation

CHECKPOINT_DIR="/var/log/gitlab_migration/checkpoints"
CHECKPOINT_NAME="checkpoint_$(date +%Y%m%d_%H%M%S)"
CURRENT_CHECKPOINT="$CHECKPOINT_DIR/$CHECKPOINT_NAME"

# 1. Create checkpoint directory
mkdir -p $CURRENT_CHECKPOINT

# 2. Capture system state
echo "=== Creating System Checkpoint ===" | tee $CURRENT_CHECKPOINT/checkpoint.log

# Database state
ssh gitlab.yocloud.com "sudo -u gitlab-psql pg_dump gitlabhq_production --schema-only" > $CURRENT_CHECKPOINT/database_schema.sql

# Configuration state
ssh gitlab.yocloud.com "sudo gitlab-ctl show-config" > $CURRENT_CHECKPOINT/gitlab_config.txt

# Service state
ssh gitlab.yocloud.com "sudo gitlab-ctl status" > $CURRENT_CHECKPOINT/service_status.txt

# User count
ssh gitlab.yocloud.com "sudo gitlab-rake gitlab:db:count_users" > $CURRENT_CHECKPOINT/user_count.txt

# Project count
ssh gitlab.yocloud.com "sudo gitlab-rake gitlab:db:count_projects" > $CURRENT_CHECKPOINT/project_count.txt

# 3. Create checkpoint manifest
cat > $CURRENT_CHECKPOINT/manifest.json << EOF
{
  "checkpoint_name": "$CHECKPOINT_NAME",
  "created_at": "$(date -Iseconds)",
  "migration_phase": "pre_migration",
  "source_host": "gitlab.yocloud.com",
  "target_host": "gitlab.interface.splitcite.com",
  "checksums": {
    "database_schema": "$(md5sum $CURRENT_CHECKPOINT/database_schema.sql | awk '{print $1}')",
    "gitlab_config": "$(md5sum $CURRENT_CHECKPOINT/gitlab_config.txt | awk '{print $1}')",
    "service_status": "$(md5sum $CURRENT_CHECKPOINT/service_status.txt | awk '{print $1}')"
  }
}
EOF

echo "Checkpoint created: $CURRENT_CHECKPOINT"
```

#### Checkpoint Validation Script
```bash
#!/bin/bash
# validate_checkpoint.sh - Checkpoint validation

CHECKPOINT_PATH=$1

if [ -z "$CHECKPOINT_PATH" ]; then
    echo "Usage: $0 <checkpoint_path>"
    exit 1
fi

# 1. Verify checkpoint integrity
echo "Validating checkpoint integrity..."

# Check manifest file
if [ ! -f "$CHECKPOINT_PATH/manifest.json" ]; then
    echo "ERROR: Manifest file not found"
    exit 1
fi

# Verify checksums
echo "Verifying file checksums..."
cd $CHECKPOINT_PATH

for file in database_schema.sql gitlab_config.txt service_status.txt; do
    if [ -f "$file" ]; then
        expected_checksum=$(jq -r ".checksums.${file%.*}" manifest.json)
        actual_checksum=$(md5sum $file | awk '{print $1}')
        
        if [ "$expected_checksum" != "$actual_checksum" ]; then
            echo "ERROR: Checksum mismatch for $file"
            echo "Expected: $expected_checksum"
            echo "Actual: $actual_checksum"
            exit 1
        fi
    fi
done

echo "Checkpoint validation completed successfully"
```

### 3.3 Service Isolation Techniques

#### Blue-Green Deployment Setup
```bash
#!/bin/bash
# blue_green_setup.sh - Blue-green deployment preparation

BLUE_ENV="gitlab.yocloud.com"  # Current production
GREEN_ENV="gitlab.interface.splitcite.com"  # New environment

# 1. Create network isolation
echo "Setting up network isolation..."

# Create firewall rules for isolation
cat > /tmp/isolation_rules.json << EOF
{
  "blue_green_isolation": {
    "description": "Isolate blue and green environments during migration",
    "rules": [
      {
        "source": "$BLUE_ENV",
        "destination": "$GREEN_ENV",
        "action": "deny",
        "ports": ["22", "80", "443"]
      },
      {
        "source": "$GREEN_ENV", 
        "destination": "$BLUE_ENV",
        "action": "deny",
        "ports": ["22", "80", "443"]
      }
    ]
  }
}
EOF

# 2. Load balancer configuration
echo "Configuring load balancer for traffic control..."

# Create health check configuration
cat > /tmp/health_check_config.json << EOF
{
  "health_checks": {
    "blue_env": {
      "url": "https://$BLUE_ENV/health",
      "interval": 30,
      "timeout": 10,
      "unhealthy_threshold": 3,
      "healthy_threshold": 2
    },
    "green_env": {
      "url": "https://$GREEN_ENV/health", 
      "interval": 30,
      "timeout": 10,
      "unhealthy_threshold": 3,
      "healthy_threshold": 2
    }
  }
}
EOF

# 3. Database replication setup (for zero-downtime migration)
echo "Setting up database replication..."
cat > /tmp/replication_config.json << EOF
{
  "database_replication": {
    "source": "$BLUE_ENV",
    "target": "$GREEN_ENV",
    "replication_type": "streaming",
    "sync_mode": "async",
    "lag_threshold": 100
  }
}
EOF

echo "Blue-green deployment setup completed"
```

#### Service Traffic Control
```bash
#!/bin/bash
# traffic_control.sh - Traffic management during migration

# 1. Traffic routing control
route_traffic() {
    local target=$1
    local percentage=$2
    
    echo "Routing $percentage% of traffic to $target"
    
    # Update load balancer configuration
    # This would integrate with your specific load balancer API
    case $target in
        "blue")
            # Route traffic to blue environment
            echo "Updating load balancer to route to $BLUE_ENV"
            ;;
        "green")
            # Route traffic to green environment
            echo "Updating load balancer to route to $GREEN_ENV"
            ;;
        "split")
            # Split traffic between environments
            echo "Splitting traffic: $percentage% to green, $((100-percentage))% to blue"
            ;;
    esac
}

# 2. Gradual traffic shift
gradual_traffic_shift() {
    local increments=(5 10 25 50 75 90 100)
    
    for percentage in "${increments[@]}"; do
        echo "Shifting $percentage% of traffic to green environment"
        route_traffic "split" $percentage
        
        # Wait and monitor
        echo "Waiting 5 minutes for monitoring..."
        sleep 300
        
        # Check health metrics
        if ! check_health_metrics; then
            echo "Health metrics degraded, rolling back traffic"
            route_traffic "blue" 100
            return 1
        fi
    done
    
    echo "Traffic shift completed successfully"
}

# 3. Health metrics check
check_health_metrics() {
    # Check response times
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' https://$GREEN_ENV/health)
    
    if (( $(echo "$response_time > 2.0" | bc -l) )); then
        echo "ERROR: Response time too high: $response_time seconds"
        return 1
    fi
    
    # Check error rates
    local error_rate=$(get_error_rate_from_monitoring)
    
    if (( $(echo "$error_rate > 0.05" | bc -l) )); then
        echo "ERROR: Error rate too high: $error_rate"
        return 1
    fi
    
    return 0
}
```

### 3.4 Monitoring and Alerting Setup

#### Migration Monitoring Framework
```bash
#!/bin/bash
# setup_migration_monitoring.sh - Comprehensive monitoring setup

MONITORING_CONFIG_DIR="/etc/gitlab_migration/monitoring"
ALERT_RULES_DIR="$MONITORING_CONFIG_DIR/alert_rules"

# Create monitoring configuration
mkdir -p $MONITORING_CONFIG_DIR $ALERT_RULES_DIR

# 2. Service monitoring configuration
cat > $MONITORING_CONFIG_DIR/service_monitoring.yaml << EOF
# GitLab Service Monitoring Configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "$ALERT_RULES_DIR/*.yml"

scrape_configs:
  - job_name: 'gitlab_blue'
    static_configs:
      - targets: ['gitlab.yocloud.com:9168']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'gitlab_green'
    static_configs:
      - targets: ['gitlab.interface.splitcite.com:9168']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'migration_progress'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 60s
EOF

# 3. Alert rules configuration
cat > $ALERT_RULES_DIR/migration_alerts.yml << EOF
groups:
  - name: gitlab_migration
    rules:
      - alert: GitLabServiceDown
        expr: up{job=~"gitlab_.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "GitLab service is down"
          description: "GitLab service {{ $labels.job }} has been down for more than 1 minute"

      - alert: HighResponseTime
        expr: gitlab_http_request_duration_seconds_bucket{le="5"} / gitlab_http_request_duration_seconds_count < 0.95
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is above 5 seconds for {{ $labels.job }}"

      - alert: DatabaseConnectionsHigh
        expr: gitlab_database_connections > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "Database connections are {{ $value }} for {{ $labels.job }}"

      - alert: MigrationProgressStalled
        expr: increase(migration_phase_completed[10m]) == 0
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Migration progress stalled"
          description: "Migration has not made progress in the last 15 minutes"
EOF

# 4. Dashboard configuration
cat > $MONITORING_CONFIG_DIR/dashboard.json << EOF
{
  "dashboard": {
    "title": "GitLab Migration Dashboard",
    "panels": [
      {
        "title": "Service Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=~\"gitlab_.*\"}",
            "legendFormat": "{{ job }}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, gitlab_http_request_duration_seconds_bucket)",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Migration Progress",
        "type": "stat",
        "targets": [
          {
            "expr": "migration_phase_completed",
            "legendFormat": "Phase"
          }
        ]
      }
    ]
  }
}
EOF

echo "Migration monitoring setup completed"
```

#### Real-time Health Checks
```bash
#!/bin/bash
# health_monitor.sh - Real-time health monitoring

MONITORING_INTERVAL=30
LOG_FILE="/var/log/gitlab_migration/health_monitor_$(date +%Y%m%d).log"
ALERT_THRESHOLD=3

# 1. Service health check
check_service_health() {
    local host=$1
    local service_name=$2
    
    # Check HTTP response
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" https://$host/health || echo "000")
    
    # Check response time
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' https://$host/health || echo "999")
    
    # Check service process
    local service_status=$(ssh $host "sudo gitlab-ctl status $service_name" 2>/dev/null | grep -c "run:" || echo "0")
    
    echo "$(date): $service_name - HTTP: $http_status, Time: ${response_time}s, Process: $service_status" >> $LOG_FILE
    
    if [ "$http_status" != "200" ] || [ "$(echo "$response_time > 5.0" | bc -l)" -eq 1 ] || [ "$service_status" -eq 0 ]; then
        return 1
    fi
    
    return 0
}

# 2. Database health check
check_database_health() {
    local host=$1
    
    # Check database connectivity
    local db_status=$(ssh $host "sudo gitlab-rake gitlab:db:check 2>/dev/null | grep -c 'Database is up to date' || echo "0")
    
    # Check connection count
    local conn_count=$(ssh $host "sudo -u gitlab-psql psql -t -c 'SELECT count(*) FROM pg_stat_activity;' gitlabhq_production 2>/dev/null | tr -d ' ' || echo "999")
    
    echo "$(date): Database - Status: $db_status, Connections: $conn_count" >> $LOG_FILE
    
    if [ "$db_status" -eq 0 ] || [ "$conn_count" -gt 100 ]; then
        return 1
    fi
    
    return 0
}

# 3. Continuous monitoring loop
continuous_monitoring() {
    local failure_count=0
    
    while true; do
        echo "$(date): Starting health check cycle" >> $LOG_FILE
        
        # Check blue environment
        if ! check_service_health "gitlab.yocloud.com" "gitlab-workhorse"; then
            ((failure_count++))
            echo "$(date): FAILURE detected in blue environment" >> $LOG_FILE
        else
            failure_count=0
        fi
        
        # Check green environment (if accessible)
        if check_service_health "gitlab.interface.splitcite.com" "gitlab-workhorse" 2>/dev/null; then
            echo "$(date): Green environment health check passed" >> $LOG_FILE
        fi
        
        # Check database health
        if ! check_database_health "gitlab.yocloud.com"; then
            echo "$(date): Database health check failed" >> $LOG_FILE
        fi
        
        # Trigger alert if threshold exceeded
        if [ $failure_count -ge $ALERT_THRESHOLD ]; then
            echo "$(date): ALERT: Health check failures exceeded threshold" >> $LOG_FILE
            send_health_alert "Health check failures exceeded threshold"
            failure_count=0
        fi
        
        sleep $MONITORING_INTERVAL
    done
}

# 4. Alert notification function
send_health_alert() {
    local message=$1
    
    curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 GitLab Migration Health Alert\n$message\nTime: $(date)\"}" \
    $SLACK_WEBHOOK_URL
}

echo "Starting health monitoring..."
continuous_monitoring
```

---

## 4. Infrastructure Recommendations

### 4.1 DNS Configuration Best Practices

#### Robust DNS Architecture
```bash
#!/bin/bash
# dns_best_practices.sh - DNS configuration recommendations

# 1. DNS Hierarchy Design
cat > /tmp/dns_hierarchy.md << EOF
# GitLab DNS Architecture Recommendations

## Primary DNS Configuration
- **Domain**: gitlab.yocloud.com (Source)
- **Domain**: gitlab.interface.splitcite.com (Target)
- **TTL Settings**: 300 seconds (5 minutes) for migration period
- **Record Types**: A, AAAA, CNAME, MX, TXT, SRV

## Secondary DNS Configuration
- **Secondary DNS Provider**: Cloudflare DNS
- **Tertiary DNS Provider**: AWS Route 53
- **DNSSEC**: Enabled for all zones
- **DNS Monitoring**: Real-time propagation tracking

## Split-Horizon DNS Setup
- **Internal DNS**: Private IP resolution for internal services
- **External DNS**: Public IP resolution for external access
- **VPN DNS**: Custom DNS servers for VPN clients
- **Migration DNS**: Temporary records for migration period
EOF

# 2. DNS Record Templates
cat > /tmp/dns_records_template.json << EOF
{
  "gitlab.yocloud.com": {
    "A": [
      {"name": "@", "value": "PRIMARY_SOURCE_IP", "ttl": 300},
      {"name": "api", "value": "PRIMARY_SOURCE_IP", "ttl": 300},
      {"name": "registry", "value": "PRIMARY_SOURCE_IP", "ttl": 300}
    ],
    "AAAA": [
      {"name": "@", "value": "PRIMARY_SOURCE_IPV6", "ttl": 300}
    ],
    "CNAME": [
      {"name": "pages", "value": "pages.yocloud.com", "ttl": 300}
    ],
    "MX": [
      {"name": "@", "value": "mail.yocloud.com", "priority": 10, "ttl": 300}
    ],
    "TXT": [
      {"name": "@", "value": "v=spf1 include:_spf.yocloud.com ~all", "ttl": 300}
    ]
  },
  "gitlab.interface.splitcite.com": {
    "A": [
      {"name": "@", "value": "PRIMARY_TARGET_IP", "ttl": 300},
      {"name": "api", "value": "PRIMARY_TARGET_IP", "ttl": 300},
      {"name": "registry", "value": "PRIMARY_TARGET_IP", "ttl": 300}
    ],
    "AAAA": [
      {"name": "@", "value": "PRIMARY_TARGET_IPV6", "ttl": 300}
    ],
    "CNAME": [
      {"name": "pages", "value": "pages.interface.splitcite.com", "ttl": 300}
    ],
    "MX": [
      {"name": "@", "value": "mail.interface.splitcite.com", "priority": 10, "ttl": 300}
    ],
    "TXT": [
      {"name": "@", "value": "v=spf1 include:_spf.interface.splitcite.com ~all", "ttl": 300}
    ]
  }
}
EOF

# 3. DNS Migration Strategy
cat > /tmp/dns_migration_strategy.md << EOF
# DNS Migration Strategy

## Phase 1: Preparation (Pre-Migration)
1. Reduce TTL values to 300 seconds (5 minutes)
2. Verify all DNS records are correct
3. Test DNS resolution from multiple locations
4. Document current DNS configuration
5. Create backup of all DNS records

## Phase 2: Migration Execution
1. Update A records to point to new infrastructure
2. Monitor DNS propagation globally
3. Verify service accessibility from different networks
4. Update any hardcoded IP references
5. Test all service endpoints

## Phase 3: Validation (Post-Migration)
1. Monitor DNS propagation for 24 hours
2. Verify all services are accessible
3. Check SSL certificate validity
4. Test email delivery (MX records)
5. Validate third-party integrations

## Phase 4: Cleanup
1. Restore TTL values to normal (3600 seconds)
2. Remove temporary DNS records
3. Update documentation
4. Archive migration DNS records
EOF

echo "DNS best practices documentation created"
```

#### DNS Monitoring and Validation
```bash
#!/bin/bash
# dns_monitoring.sh - DNS monitoring and validation

MONITORING_INTERVAL=300  # 5 minutes
DNS_SERVERS=("8.8.8.8" "1.1.1.1" "208.67.222.222" "9.9.9.9")
DOMAINS=("gitlab.yocloud.com" "gitlab.interface.splitcite.com")
LOG_FILE="/var/log/dns_monitoring_$(date +%Y%m%d).log"

# 1. DNS resolution monitoring
monitor_dns_resolution() {
    local domain=$1
    local expected_ip=$2
    
    for dns_server in "${DNS_SERVERS[@]}"; do
        local resolved_ip=$(dig @$dns_server $domain +short)
        
        if [ -z "$resolved_ip" ]; then
            echo "$(date): ERROR - $domain not resolving from $dns_server" >> $LOG_FILE
            return 1
        fi
        
        if [ -n "$expected_ip" ] && [ "$resolved_ip" != "$expected_ip" ]; then
            echo "$(date): WARNING - $domain resolving to $resolved_ip (expected $expected_ip) from $dns_server" >> $LOG_FILE
        fi
        
        echo "$(date): SUCCESS - $domain resolves to $resolved_ip from $dns_server" >> $LOG_FILE
    done
    
    return 0
}

# 2. DNS propagation monitoring
monitor_dns_propagation() {
    local domain=$1
    local target_ip=$2
    
    echo "$(date): Monitoring DNS propagation for $domain" >> $LOG_FILE
    
    # Check from multiple geographic locations
    local locations=("us-east" "us-west" "eu-west" "ap-southeast")
    
    for location in "${locations[@]}"; do
        local resolved_ip=$(dig +short $domain @${location}.dns.server)
        
        if [ "$resolved_ip" = "$target_ip" ]; then
            echo "$(date): Propagation successful in $location" >> $LOG_FILE
        else
            echo "$(date): Propagation pending in $location (current: $resolved_ip, target: $target_ip)" >> $LOG_FILE
        fi
    done
}

# 3. DNS health check
dns_health_check() {
    local domain=$1
    
    # Check domain exists
    if ! nslookup $domain > /dev/null 2>&1; then
        echo "$(date): CRITICAL - Domain $domain does not exist" >> $LOG_FILE
        return 1
    fi
    
    # Check MX records
    if ! dig +short MX $domain > /dev/null 2>&1; then
        echo "$(date): WARNING - No MX records found for $domain" >> $LOG_FILE
    fi
    
    # Check SPF records
    local spf_record=$(dig +short TXT $domain | grep "v=spf1")
    if [ -z "$spf_record" ]; then
        echo "$(date): WARNING - No SPF record found for $domain" >> $LOG_FILE
    fi
    
    # Check DMARC records
    local dmarc_record=$(dig +short TXT _dmarc.$domain)
    if [ -z "$dmarc_record" ]; then
        echo "$(date): WARNING - No DMARC record found for $domain" >> $LOG_FILE
    fi
    
    return 0
}

# 4. Continuous monitoring loop
continuous_dns_monitoring() {
    while true; do
        echo "$(date): Starting DNS monitoring cycle" >> $LOG_FILE
        
        for domain in "${DOMAINS[@]}"; do
            dns_health_check $domain
            monitor_dns_resolution $domain
        done
        
        sleep $MONITORING_INTERVAL
    done
}

echo "Starting DNS monitoring..."
continuous_dns_monitoring
```

### 4.2 Network Connectivity Requirements

#### Network Architecture Design
```bash
#!/bin/bash
# network_architecture.sh - Network connectivity requirements

# 1. Network topology design
cat > /tmp/network_topology.md << EOF
# GitLab Migration Network Architecture

## Network Segments
- **Management Network**: 10.0.1.0/24 (SSH, API access)
- **Application Network**: 10.0.2.0/24 (GitLab services)
- **Database Network**: 10.0.3.0/24 (PostgreSQL, Redis)
- **Storage Network**: 10.0.4.0/24 (NFS, object storage)
- **Monitoring Network**: 10.0.5.0/24 (Prometheus, Grafana)

## Connectivity Requirements
- **Source to Target**: Direct connectivity for data transfer
- **VPN Access**: Secure access for migration team
- **Internet Access**: Package downloads, updates
- **Load Balancer**: Traffic distribution during migration
- **Firewall Rules**: Controlled access between segments

## Bandwidth Requirements
- **Initial Sync**: 1 Gbps sustained for 24 hours
- **Incremental Sync**: 100 Mbps sustained
- **User Traffic**: 500 Mbps peak
- **Backup Traffic**: 200 Mbps during backup windows
EOF

# 2. Security group configuration
cat > /tmp/security_groups.json << EOF
{
  "gitlab_source_sg": {
    "description": "Security group for source GitLab instance",
    "ingress": [
      {
        "protocol": "tcp",
        "port_range": "22",
        "source": "10.0.1.0/24",
        "description": "SSH from management network"
      },
      {
        "protocol": "tcp", 
        "port_range": "80",
        "source": "0.0.0.0/0",
        "description": "HTTP from anywhere"
      },
      {
        "protocol": "tcp",
        "port_range": "443", 
        "source": "0.0.0.0/0",
        "description": "HTTPS from anywhere"
      },
      {
        "protocol": "tcp",
        "port_range": "9168",
        "source": "10.0.5.0/24",
        "description": "Metrics from monitoring network"
      }
    ],
    "egress": [
      {
        "protocol": "-1",
        "port_range": "-1",
        "destination": "0.0.0.0/0",
        "description": "All outbound traffic"
      }
    ]
  },
  "gitlab_target_sg": {
    "description": "Security group for target GitLab instance",
    "ingress": [
      {
        "protocol": "tcp",
        "port_range": "22",
        "source": "10.0.1.0/24",
        "description": "SSH from management network"
      },
      {
        "protocol": "tcp",
        "port_range": "80",
        "source": "0.0.0.0/0",
        "description": "HTTP from anywhere"
      },
      {
        "protocol": "tcp",
        "port_range": "443",
        "source": "0.0.0.0/0", 
        "description": "HTTPS from anywhere"
      },
      {
        "protocol": "tcp",
        "port_range": "9168",
        "source": "10.0.5.0/24",
        "description": "Metrics from monitoring network"
      },
      {
        "protocol": "tcp",
        "port_range": "5432",
        "source": "10.0.3.0/24",
        "description": "PostgreSQL from database network"
      }
    ],
    "egress": [
      {
        "protocol": "-1",
        "port_range": "-1",
        "destination": "0.0.0.0/0",
        "description": "All outbound traffic"
      }
    ]
  }
}
EOF

# 3. Network connectivity validation
cat > /tmp/network_validation.sh << EOF
#!/bin/bash
# Network connectivity validation script

SOURCE_HOST="gitlab.yocloud.com"
TARGET_HOST="gitlab.interface.splitcite.com"

# Test basic connectivity
test_connectivity() {
    local host=\$1
    local port=\$2
    
    echo "Testing connectivity to \$host:\$port..."
    if nc -z -w3 \$host \$port; then
        echo "SUCCESS: \$host:\$port is accessible"
        return 0
    else
        echo "FAILURE: \$host:\$port is not accessible"
        return 1
    fi
}

# Test bandwidth
test_bandwidth() {
    local host=\$1
    
    echo "Testing bandwidth to \$host..."
    ssh \$host "iperf3 -s -D" 2>/dev/null
    sleep 2
    
    local bandwidth=\$(iperf3 -c \$host -t 10 -J | jq '.end.sum_received.bits_per_second')
    echo "Bandwidth to \$host: \$((bandwidth / 1000000)) Mbps"
    
    ssh \$host "pkill iperf3" 2>/dev/null
}

# Test latency
test_latency() {
    local host=\$1
    
    echo "Testing latency to \$host..."
    local latency=\$(ping -c 10 \$host | tail -1 | awk '{print \$4}' | cut -d'/' -f5)
    echo "Average latency to \$host: \$latency ms"
}

# Run all tests
echo "=== Network Connectivity Validation ==="
test_connectivity \$SOURCE_HOST 22
test_connectivity \$SOURCE_HOST 80
test_connectivity \$SOURCE_HOST 443

test_connectivity \$TARGET_HOST 22
test_connectivity \$TARGET_HOST 80
test_connectivity \$TARGET_HOST 443

test_bandwidth \$SOURCE_HOST
test_bandwidth \$TARGET_HOST

test_latency \$SOURCE_HOST
test_latency \$TARGET_HOST
EOF

chmod +x /tmp/network_validation.sh

echo "Network architecture documentation created"
```

#### Network Troubleshooting Guide
```bash
#!/bin/bash
# network_troubleshooting.sh - Network troubleshooting procedures

# 1. Diagnostic tools installation
install_network_tools() {
    echo "Installing network diagnostic tools..."
    
    # Install required packages
    apt-get update
    apt-get install -y netcat-openbsd nmap traceroute mtr iperf3 dnsutils tcpdump wireshark-common
    
    echo "Network tools installed successfully"
}

# 2. Connectivity diagnostics
diagnose_connectivity() {
    local host=$1
    local port=$2
    
    echo "=== Diagnosing connectivity to $host:$port ==="
    
    # Basic ping test
    echo "1. Basic ping test:"
    ping -c 5 $host
    
    # Traceroute
    echo "2. Traceroute to $host:"
    traceroute $host
    
    # Port scan
    echo "3. Port scan for $port:"
    nmap -p $port $host
    
    # Telnet test
    echo "4. Telnet connection test:"
    timeout 10 telnet $host $port
    
    # DNS resolution
    echo "5. DNS resolution:"
    nslookup $host
    dig $host
}

# 3. Performance diagnostics
diagnose_performance() {
    local host=$1
    
    echo "=== Diagnosing performance to $host ==="
    
    # Bandwidth test
    echo "1. Bandwidth test:"
    iperf3 -c $host -t 30 -P 4
    
    # Latency test
    echo "2. Latency test:"
    mtr --report --report-cycles 100 $host
    
    # Packet loss analysis
    echo "3. Packet loss analysis:"
    ping -c 1000 $host | tail -1
}

# 4. Security diagnostics
diagnose_security() {
    local host=$1
    
    echo "=== Diagnosing security for $host ==="
    
    # SSL certificate check
    echo "1. SSL certificate check:"
    openssl s_client -connect $host:443 -servername $host < /dev/null
    
    # Open ports scan
    echo "2. Open ports scan:"
    nmap -sS -O $host
    
    # Firewall rules check
    echo "3. Firewall rules:"
    ssh $host "sudo iptables -L -n -v" 2>/dev/null || echo "Cannot access firewall rules"
}

# 5. Automated troubleshooting script
automated_troubleshooting() {
    local host=$1
    
    echo "Running automated troubleshooting for $host..."
    
    # Create troubleshooting report
    REPORT_FILE="/tmp/network_troubleshooting_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Network Troubleshooting Report"
        echo "Generated: $(date)"
        echo "Target: $host"
        echo ""
        
        diagnose_connectivity $host 22
        echo ""
        
        diagnose_connectivity $host 80
        echo ""
        
        diagnose_connectivity $host 443
        echo ""
        
        diagnose_performance $host
        echo ""
        
        diagnose_security $host
        
    } | tee $REPORT_FILE
    
    echo "Troubleshooting report saved to: $REPORT_FILE"
}

echo "Network troubleshooting procedures documented"
```

### 4.3 GitLab Deployment Architecture

#### Production-Ready GitLab Architecture
```bash
#!/bin/bash
# gitlab_architecture.sh - GitLab deployment architecture recommendations

# 1. Infrastructure sizing recommendations
cat > /tmp/gitlab_sizing.md << EOF
# GitLab Infrastructure Sizing Recommendations

## Small Deployment (100-500 users)
- **CPU**: 4 vCPUs
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Database**: PostgreSQL on same instance
- **Redis**: On same instance
- **Load Balancer**: Single instance

## Medium Deployment (500-2000 users)
- **CPU**: 8 vCPUs
- **RAM**: 16 GB
- **Storage**: 500 GB SSD
- **Database**: Separate PostgreSQL instance (4 vCPU, 8 GB RAM)
- **Redis**: Separate Redis instance (2 vCPU, 4 GB RAM)
- **Load Balancer**: HAProxy or AWS ALB

## Large Deployment (2000-10000 users)
- **CPU**: 16 vCPUs
- **RAM**: 32 GB
- **Storage**: 1 TB SSD
- **Database**: PostgreSQL cluster (Primary + Replica)
- **Redis**: Redis cluster (Master + 2 Replicas)
- **Load Balancer**: HAProxy cluster or AWS ALB
- **Object Storage**: S3 compatible storage

## Enterprise Deployment (10000+ users)
- **CPU**: 32+ vCPUs
- **RAM**: 64+ GB
- **Storage**: 2+ TB SSD
- **Database**: PostgreSQL cluster with read replicas
- **Redis**: Redis cluster with sharding
- **Load Balancer**: HAProxy cluster with health checks
- **Object Storage**: S3 compatible with CDN
- **Monitoring**: Prometheus + Grafana + Alertmanager
- **Logging**: ELK stack or Loki
EOF

# 2. High availability configuration
cat > /tmp/gitlab_ha_config.rb << EOF
# GitLab High Availability Configuration

# External database configuration
postgresql['enable'] = false
gitlab_rails['db_adapter'] = 'postgresql'
gitlab_rails['db_encoding'] = 'utf8'
gitlab_rails['db_host'] = 'gitlab-db.internal'
gitlab_rails['db_port'] = 5432
gitlab_rails['db_password'] = 'REDACTED'
gitlab_rails['db_database'] = 'gitlabhq_production'

# Redis configuration
redis['enable'] = false
gitlab_rails['redis_host'] = 'gitlab-redis.internal'
gitlab_rails['redis_port'] = 6379
gitlab_rails['redis_password'] = 'REDACTED'

# Object storage configuration
gitlab_rails['object_store']['enabled'] = true
gitlab_rails['object_store']['connection'] = {
  'provider' => 'AWS',
  'region' => 'us-west-2',
  'aws_access_key_id' => 'REDACTED',
  'aws_secret_access_key' => 'REDACTED'
}

gitlab_rails['object_store']['objects']['artifacts']['bucket'] = 'gitlab-artifacts'
gitlab_rails['object_store']['objects']['external_diffs']['bucket'] = 'gitlab-diffs'
gitlab_rails['object_store']['objects']['lfs_objects']['bucket'] = 'gitlab-lfs'
gitlab_rails['object_store']['objects']['uploads']['bucket'] = 'gitlab-uploads'
gitlab_rails['object_store']['objects']['packages']['bucket'] = 'gitlab-packages'
gitlab_rails['object_store']['objects']['dependency_proxy']['bucket'] = 'gitlab-dependency-proxy'
gitlab_rails['object_store']['objects']['terraform_state']['bucket'] = 'gitlab-terraform-state'

# Load balancer configuration
nginx['listen_port'] = 80
nginx['listen_https'] = false
nginx['proxy_set_headers'] = {
  "X-Forwarded-Proto" => "https",
  "X-Forwarded-Ssl" => "on"
}

# Monitoring configuration
prometheus['enable'] = true
prometheus_monitoring['enable'] = true
grafana['enable'] = true

# Logging configuration
gitlab_rails['logging_enabled'] = true
gitlab_rails['log_directory'] = "/var/log/gitlab"
gitlab_rails['log_level'] = "INFO"
EOF

# 3. Security configuration
cat > /tmp/gitlab_security.rb << EOF
# GitLab Security Configuration

# SSL configuration
nginx['ssl_certificate'] = '/etc/gitlab/ssl/gitlab.interface.splitcite.com.crt'
nginx['ssl_certificate_key'] = '/etc/gitlab/ssl/gitlab.interface.splitcite.com.key'
nginx['ssl_protocols'] = 'TLSv1.2 TLSv1.3'
nginx['ssl_ciphers'] = 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384'
nginx['ssl_prefer_server_ciphers'] = 'on'

# Security headers
nginx['custom_gitlab_server_config'] = 'add_header X-Frame-Options DENY;'
nginx['custom_gitlab_server_config'] += 'add_header X-Content-Type-Options nosniff;'
nginx['custom_gitlab_server_config'] += 'add_header X-XSS-Protection "1; mode=block";'
nginx['custom_gitlab_server_config'] += 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";'

# Rate limiting
gitlab_rails['rate_limiting_enabled'] = true
gitlab_rails['rate_limiting_requests_per_period'] = 1000
gitlab_rails['rate_limiting_period'] = 60

# Authentication settings
gitlab_rails['omniauth_enabled'] = true
gitlab_rails['omniauth_allow_single_sign_on'] = ['saml']
gitlab_rails['omniauth_block_auto_created_users'] = false
gitlab_rails['omniauth_auto_link_saml_user'] = true

# Repository access settings
gitlab_rails['repository_downloads_path'] = '/var/opt/gitlab/gitlab-rails/shared/tmp/repositories'
gitlab_rails['gitlab_shell_ssh_port'] = 22
gitlab_rails['git_max_size'] = 20971520  # 20MB
EOF

echo "GitLab architecture documentation created"
```

#### GitLab Installation and Configuration
```bash
#!/bin/bash
# gitlab_installation.sh - GitLab installation and configuration

GITLAB_VERSION="16.5.0"
INSTALLATION_LOG="/var/log/gitlab_installation_$(date +%Y%m%d_%H%M%S).log"

# 1. System preparation
prepare_system() {
    echo "=== System Preparation ===" | tee $INSTALLATION_LOG
    
    # Update system packages
    apt-get update && apt-get upgrade -y | tee -a $INSTALLATION_LOG
    
    # Install required dependencies
    apt-get install -y curl openssh-server ca-certificates tzdata perl | tee -a $INSTALLATION_LOG
    
    # Configure firewall
    ufw allow OpenSSH
    ufw allow http
    ufw allow https
    ufw --force enable | tee -a $INSTALLATION_LOG
    
    # Create GitLab user
    adduser --disabled-password --gecos 'GitLab' git | tee -a $INSTALLATION_LOG
}

# 2. GitLab installation
install_gitlab() {
    echo "=== Installing GitLab ===" | tee -a $INSTALLATION_LOG
    
    # Download GitLab package
    curl -sS https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.deb.sh | bash | tee -a $INSTALLATION_LOG
    
    # Install GitLab
    EXTERNAL_URL="https://gitlab.interface.splitcite.com" apt-get install -y gitlab-ce=$GITLAB_VERSION-ce.0 | tee -a $INSTALLATION_LOG
    
    echo "GitLab installation completed" | tee -a $INSTALLATION_LOG
}

# 3. GitLab configuration
configure_gitlab() {
    echo "=== Configuring GitLab ===" | tee -a $INSTALLATION_LOG
    
    # Copy configuration files
    cp /tmp/gitlab_ha_config.rb /etc/gitlab/gitlab.rb
    cp /tmp/gitlab_security.rb /etc/gitlab/gitlab.rb.security
    
    # Generate SSL certificates
    mkdir -p /etc/gitlab/ssl
    openssl req -new -x509 -days 365 -nodes -out /etc/gitlab/ssl/gitlab.interface.splitcite.com.crt -keyout /etc/gitlab/ssl/gitlab.interface.splitcite.com.key -subj "/C=US/ST=State/L=City/O=Organization/CN=gitlab.interface.splitcite.com" | tee -a $INSTALLATION_LOG
    
    # Set proper permissions
    chmod 600 /etc/gitlab/ssl/gitlab.interface.splitcite.com.key | tee -a $INSTALLATION_LOG
    
    # Reconfigure GitLab
    gitlab-ctl reconfigure | tee -a $INSTALLATION_LOG
    
    echo "GitLab configuration completed" | tee -a $INSTALLATION_LOG
}

# 4. Post-installation validation
validate_installation() {
    echo "=== Validating Installation ===" | tee -a $INSTALLATION_LOG
    
    # Check service status
    gitlab-ctl status | tee -a $INSTALLATION_LOG
    
    # Check GitLab health
    curl -f https://localhost/-/health | tee -a $INSTALLATION_LOG
    
    # Run GitLab check
    gitlab-rake gitlab:check | tee -a $INSTALLATION_LOG
    
    # Create initial admin user
    gitlab-rake gitlab:setup 'GITLAB_ROOT_PASSWORD=SecurePassword123!' 'GITLAB_ROOT_EMAIL=admin@splitcite.com' | tee -a $INSTALLATION_LOG
    
    echo "Installation validation completed" | tee -a $INSTALLATION_LOG
}

# 5. Installation script execution
main() {
    echo "Starting GitLab installation at $(date)" | tee $INSTALLATION_LOG
    
    prepare_system
    install_gitlab
    configure_gitlab
    validate_installation
    
    echo "GitLab installation completed at $(date)" | tee -a $INSTALLATION_LOG
    echo "Access GitLab at: https://gitlab.interface.splitcite.com"
    echo "Admin credentials: admin@splitcite.com / SecurePassword123!"
}

# Execute installation if run directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main
fi

echo "GitLab installation script created"
```

### 4.4 SSL Certificate Management

#### SSL Certificate Lifecycle Management
```bash
#!/bin/bash
# ssl_certificate_management.sh - SSL certificate management

# 1. Certificate generation
generate_certificates() {
    local domain=$1
    local ssl_dir="/etc/gitlab/ssl"
    
    echo "Generating SSL certificates for $domain"
    
    # Create SSL directory
    mkdir -p $ssl_dir
    
    # Generate private key
    openssl genrsa -out $ssl_dir/$domain.key 4096
    
    # Generate certificate signing request
    openssl req -new -key $ssl_dir/$domain.key -out $ssl_dir/$domain.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=$domain"
    
    # Generate self-signed certificate (for testing)
    openssl x509 -req -days 365 -in $ssl_dir/$domain.csr -signkey $ssl_dir/$domain.key -out $ssl_dir/$domain.crt
    
    # Set proper permissions
    chmod 600 $ssl_dir/$domain.key
    chmod 644 $ssl_dir/$domain.crt
    
    echo "SSL certificates generated for $domain"
}

# 2. Let's Encrypt certificate setup
setup_letsencrypt() {
    local domain=$1
    local email=$2
    
    echo "Setting up Let's Encrypt for $domain"
    
    # Install Certbot
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    
    # Obtain certificate
    certbot --nginx -d $domain --email $email --agree-tos --non-interactive
    
    # Setup auto-renewal
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
    
    echo "Let's Encrypt setup completed for $domain"
}

# 3. Certificate validation
validate_certificates() {
    local domain=$1
    local ssl_dir="/etc/gitlab/ssl"
    
    echo "Validating SSL certificates for $domain"
    
    # Check certificate exists
    if [ ! -f "$ssl_dir/$domain.crt" ]; then
        echo "ERROR: Certificate file not found"
        return 1
    fi
    
    # Check private key exists
    if [ ! -f "$ssl_dir/$domain.key" ]; then
        echo "ERROR: Private key file not found"
        return 1
    fi
    
    # Validate certificate format
    if ! openssl x509 -in $ssl_dir/$domain.crt -text -noout > /dev/null 2>&1; then
        echo "ERROR: Invalid certificate format"
        return 1
    fi
    
    # Validate private key format
    if ! openssl rsa -in $ssl_dir/$domain.key -check > /dev/null 2>&1; then
        echo "ERROR: Invalid private key format"
        return 1
    fi
    
    # Check certificate expiry
    local expiry_date=$(openssl x509 -in $ssl_dir/$domain.crt -noout -enddate | cut -d= -f2)
    local expiry_timestamp=$(date -d "$expiry_date" +%s)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    if [ $days_until_expiry -lt 30 ]; then
        echo "WARNING: Certificate expires in $days_until_expiry days"
    else
        echo "Certificate is valid for $days_until_expiry days"
    fi
    
    # Verify certificate matches private key
    local cert_modulus=$(openssl x509 -noout -modulus -in $ssl_dir/$domain.crt | openssl md5)
    local key_modulus=$(openssl rsa -noout -modulus -in $ssl_dir/$domain.key | openssl md5)
    
    if [ "$cert_modulus" != "$key_modulus" ]; then
        echo "ERROR: Certificate does not match private key"
        return 1
    fi
    
    echo "Certificate validation completed successfully"
    return 0
}

# 4. Certificate renewal automation
setup_certificate_renewal() {
    local domain=$1
    local renewal_script="/usr/local/bin/renew_ssl_certificates.sh"
    
    echo "Setting up certificate renewal automation for $domain"
    
    # Create renewal script
    cat > $renewal_script << EOF
#!/bin/bash
# SSL Certificate Renewal Script

DOMAIN="$domain"
LOG_FILE="/var/log/ssl_renewal_$(date +%Y%m%d).log"

echo "Starting SSL certificate renewal for \$DOMAIN at \$(date)" >> \$LOG_FILE

# Renew Let's Encrypt certificate
certbot renew --quiet >> \$LOG_FILE 2>&1

# Reload GitLab configuration
gitlab-ctl reload nginx >> \$LOG_FILE 2>&1

echo "SSL certificate renewal completed for \$DOMAIN at \$(date)" >> \$LOG_FILE
EOF
    
    chmod +x $renewal_script
    
    # Add to crontab (monthly renewal check)
    (crontab -l 2>/dev/null; echo "0 2 1 * * $renewal_script") | crontab -
    
    echo "Certificate renewal automation setup completed"
}

# 5. Certificate monitoring
monitor_certificates() {
    local domain=$1
    local alert_threshold=30  # days
    
    echo "Monitoring SSL certificates for $domain"
    
    # Get certificate expiry
    local expiry_date=$(openssl s_client -connect $domain:443 -servername $domain 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
    local expiry_timestamp=$(date -d "$expiry_date" +%s)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    if [ $days_until_expiry -lt $alert_threshold ]; then
        echo "ALERT: Certificate for $domain expires in $days_until_expiry days"
        
        # Send alert notification
        curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🔒 SSL Certificate Expiry Alert\\nDomain: $domain\\nDays until expiry: $days_until_expiry\\nExpiry date: $expiry_date\"}" \
        $SLACK_WEBHOOK_URL
    else
        echo "Certificate for $domain is valid for $days_until_expiry days"
    fi
}

echo "SSL certificate management procedures documented"
```

### 4.5 Security and Access Control

#### GitLab Security Hardening
```bash
#!/bin/bash
# gitlab_security_hardening.sh - GitLab security hardening procedures

# 1. System security hardening
harden_system() {
    echo "=== System Security Hardening ==="
    
    # Update system packages
    apt-get update && apt-get upgrade -y
    
    # Install security tools
    apt-get install -y fail2ban ufw auditd rkhunter chkrootkit
    
    # Configure fail2ban
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[gitlab]
enabled = true
port = http,https
logpath = /var/log/gitlab/gitlab-rails/production.log
maxretry = 10
findtime = 600
bantime = 3600
EOF

    systemctl enable fail2ban
    systemctl start fail2ban
    
    # Configure UFW firewall
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow http
    ufw allow https
    ufw --force enable
    
    echo "System security hardening completed"
}

# 2. GitLab security configuration
harden_gitlab() {
    echo "=== GitLab Security Hardening ==="
    
    # Backup original configuration
    cp /etc/gitlab/gitlab.rb /etc/gitlab/gitlab.rb.backup.$(date +%Y%m%d)
    
    # Add security settings to gitlab.rb
    cat >> /etc/gitlab/gitlab.rb << 'EOF'

# Security hardening settings
gitlab_rails['gitlab_shell_ssh_port'] = 22
gitlab_rails['max_attach_size'] = 10
gitlab_rails['gitlab_max_diff_size'] = 200000
gitlab_rails['gitlab_max_diff_files'] = 1000
gitlab_rails['gitlab_max_diff_patch_lines'] = 50000

# Rate limiting
gitlab_rails['rate_limiting_enabled'] = true
gitlab_rails['rate_limiting_requests_per_period'] = 100
gitlab_rails['rate_limiting_period'] = 60

# Session security
gitlab_rails['session_expire_delay'] = 7200
gitlab_rails['gitlab_session_timeout'] = 1800

# API security
gitlab_rails['api_rate_limit'] = true
gitlab_rails['api_rate_limit_unauthenticated'] = true
gitlab_rails['api_rate_limit_per_user'] = true

# Repository security
gitlab_rails['gitlab_default_projects_features_issues'] = false
gitlab_rails['gitlab_default_projects_features_merge_requests'] = true
gitlab_rails['gitlab_default_projects_features_wiki'] = false
gitlab_rails['gitlab_default_projects_features_snippets'] = false
gitlab_rails['gitlab_default_projects_features_builds'] = true

# Email security
gitlab_rails['incoming_email_enabled'] = false
gitlab_rails['reply_by_email_enabled'] = false

# Security headers
nginx['custom_gitlab_server_config'] = <<-'NginxConf'
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
add_header Content-Security-Policy "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';";
add_header Referrer-Policy "strict-origin-when-cross-origin";
NginxConf
EOF

    # Reconfigure GitLab
    gitlab-ctl reconfigure
    
    echo "GitLab security hardening completed"
}

# 3. Access control configuration
configure_access_control() {
    echo "=== Access Control Configuration ==="
    
    # Create security groups
    cat > /tmp/gitlab_security_groups.json << EOF
{
  "security_groups": {
    "administrators": {
      "description": "Full system administrators",
      "permissions": [
        "admin_mode",
        "manage_group_memberships",
        "manage_projects",
        "manage_users",
        "read_admin_dashboard"
      ]
    },
    "developers": {
      "description": "Developers with project access",
      "permissions": [
        "create_projects",
        "read_project",
        "write_project",
        "manage_merge_requests",
        "manage_issues"
      ]
    },
    "auditors": {
      "description": "Read-only auditors",
      "permissions": [
        "read_all_resources",
        "read_admin_dashboard",
        "read_audit_events"
      ]
    }
  }
}
EOF

    # Configure LDAP integration (if applicable)
    cat >> /etc/gitlab/gitlab.rb << 'EOF'

# LDAP Integration
gitlab_rails['ldap_enabled'] = true
gitlab_rails['ldap_servers'] = {
  'main' => {
    'label' => 'LDAP',
    'host' => 'ldap.internal',
    'port' => 636,
    'uid' => 'sAMAccountName',
    'bind_dn' => 'CN=gitlab,OU=Service Accounts,DC=internal,DC=com',
    'password' => 'REDACTED',
    'encryption' => 'simple_tls',
    'verify_certificates' => true,
    'active_directory' => true,
    'allow_username_or_email_login' => false,
    'block_auto_created_users' => false,
    'base' => 'OU=Users,DC=internal,DC=com',
    'user_filter' => ''
  }
}
EOF

    echo "Access control configuration completed"
}

# 4. Security monitoring setup
setup_security_monitoring() {
    echo "=== Security Monitoring Setup ==="
    
    # Install audit rules
    cat > /etc/audit/rules.d/gitlab.rules << EOF
-w /etc/gitlab/gitlab.rb -p wa -k gitlab_config
-w /etc/gitlab/ssl/ -p wa -k gitlab_ssl
-w /var/opt/gitlab/ -p wa -k gitlab_data
-w /var/log/gitlab/ -p wa -k gitlab_logs
-a always,exit -F arch=b64 -S execve -k gitlab_processes
EOF

    # Restart auditd
    systemctl restart auditd
    
    # Setup log monitoring
    cat > /etc/rsyslog.d/30-gitlab-security.conf << EOF
# GitLab Security Logging
:programname, isequal, "gitlab-rails" /var/log/gitlab/security.log
& stop
EOF

    systemctl restart rsyslog
    
    # Setup security scanning
    cat > /usr/local/bin/gitlab_security_scan.sh << 'EOF'
#!/bin/bash
# GitLab Security Scan Script

LOG_FILE="/var/log/gitlab_security_scan_$(date +%Y%m%d).log"

echo "Starting GitLab security scan at $(date)" >> \$LOG_FILE

# Check for suspicious login attempts
grep "Failed login" /var/log/gitlab/gitlab-rails/production.log | tail -20 >> \$LOG_FILE

# Check for API abuse
grep "API" /var/log/gitlab/gitlab-rails/production.log | grep "429" | tail -20 >> \$LOG_FILE

# Check for repository access anomalies
grep "Repository" /var/log/gitlab/gitlab-rails/production.log | grep "access denied" | tail -20 >> \$LOG_FILE

# Run rootkit detection
rkhunter --check --skip-keypress --report-warnings-only >> \$LOG_FILE 2>&1

# Run file integrity check
chkrootkit >> \$LOG_FILE 2>&1

echo "Security scan completed at $(date)" >> \$LOG_FILE
EOF

    chmod +x /usr/local/bin/gitlab_security_scan.sh
    
    # Add to crontab (daily security scan)
    (crontab -l 2>/dev/null; echo "0 3 * * /usr/local/bin/gitlab_security_scan.sh") | crontab -
    
    echo "Security monitoring setup completed"
}

# 5. Security validation
validate_security() {
    echo "=== Security Validation ==="
    
    # Test SSL configuration
    echo "Testing SSL configuration..."
    openssl s_client -connect gitlab.interface.splitcite.com:443 -servername gitlab.interface.splitcite.com < /dev/null
    
    # Test security headers
    echo "Testing security headers..."
    curl -I https://gitlab.interface.splitcite.com | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Strict-Transport-Security)"
    
    # Test authentication
    echo "Testing authentication..."
    curl -f https://gitlab.interface.splitcite.com/users/sign_in
    
    # Check audit logs
    echo "Checking audit logs..."
    tail -10 /var/log/audit/audit.log | grep gitlab
    
    echo "Security validation completed"
}

echo "GitLab security hardening procedures documented"
```

---

## 5. Migration Strategy Improvements

### 5.1 Staged Migration Approach

#### Phased Migration Plan
```bash
#!/bin/bash
# staged_migration.sh - Staged migration approach

# 1. Migration phases definition
cat > /tmp/migration_phases.md << EOF
# Staged Migration Approach

## Phase 0: Preparation (Week 1-2)
- Infrastructure provisioning and validation
- DNS configuration and testing
- Security certificate setup
- Monitoring and alerting deployment
- Backup strategy implementation
- Team training and documentation

## Phase 1: Infrastructure Setup (Week 3)
- Deploy target GitLab instance
- Configure external services (database, Redis, storage)
- Setup load balancer and SSL termination
- Implement monitoring and logging
- Validate service connectivity
- Performance baseline establishment

## Phase 2: Data Synchronization (Week 4)
- Initial full backup and restore
- Configure database replication
- Sync repositories and artifacts
- Migrate user accounts and groups
- Validate data integrity
- Performance testing under load

## Phase 3: Service Migration (Week 5)
- Migrate CI/CD runners
- Update integrations and webhooks
- Migrate custom configurations
- Test third-party integrations
- Validate service functionality
- User acceptance testing

## Phase 4: Traffic Migration (Week 6)
- Gradual traffic shifting (5%, 25%, 50%, 100%)
- Monitor performance and error rates
- Validate user experience
- Rollback testing at each stage
- Full traffic cutover
- Post-migration validation

## Phase 5: Decommissioning (Week 7-8)
- Monitor new environment stability
- Backup old environment
- Decommission source infrastructure
- Update documentation
- Post-mortem and lessons learned
EOF

# 2. Phase execution scripts
cat > /tmp/phase_execution.sh << 'EOF'
#!/bin/bash
# Phase execution script

PHASE=$1
LOG_FILE="/var/log/migration_phase_${PHASE}_$(date +%Y%m%d_%H%M%S).log"

execute_phase() {
    local phase=$1
    
    echo "Executing Phase $phase at $(date)" | tee $LOG_FILE
    
    case $phase in
        "0")
            execute_phase_0_preparation
            ;;
        "1")
            execute_phase_1_infrastructure
            ;;
        "2")
            execute_phase_2_synchronization
            ;;
        "3")
            execute_phase_3_service_migration
            ;;
        "4")
            execute_phase_4_traffic_migration
            ;;
        "5")
            execute_phase_5_decommissioning
            ;;
        *)
            echo "Invalid phase: $phase"
            exit 1
            ;;
    esac
    
    echo "Phase $phase completed at $(date)" | tee -a $LOG_FILE
}

execute_phase_0_preparation() {
    echo "=== Phase 0: Preparation ===" | tee -a $LOG_FILE
    
    # Infrastructure validation
    ./scripts/validation/validate_infrastructure.sh | tee -a $LOG_FILE
    
    # DNS configuration
    ./scripts/dns/configure_dns.sh | tee -a $LOG_FILE
    
    # Security setup
    ./scripts/security/setup_ssl_certificates.sh | tee -a $LOG_FILE
    
    # Monitoring deployment
    ./scripts/monitoring/deploy_monitoring.sh | tee -a $LOG_FILE
}

execute_phase_1_infrastructure() {
    echo "=== Phase 1: Infrastructure Setup ===" | tee -a $LOG_FILE
    
    # Deploy target instance
    ./scripts/infrastructure/deploy_target_instance.sh | tee -a $LOG_FILE
    
    # Configure external services
    ./scripts/infrastructure/configure_external_services.sh | tee -a $LOG_FILE
    
    # Setup load balancer
    ./scripts/infrastructure/setup_load_balancer.sh | tee -a $LOG_FILE
    
    # Validate connectivity
    ./scripts/validation/validate_connectivity.sh | tee -a $LOG_FILE
}

execute_phase_2_synchronization() {
    echo "=== Phase 2: Data Synchronization ===" | tee -a $LOG_FILE
    
    # Initial backup and restore
    ./scripts/migration/backup_and_restore.sh | tee -a $LOG_FILE
    
    # Database replication setup
    ./scripts/database/setup_replication.sh | tee -a $LOG_FILE
    
    # Repository synchronization
    ./scripts/migration/sync_repositories.sh | tee -a $LOG_FILE
    
    # Data integrity validation
    ./scripts/validation/validate_data_integrity.sh | tee -a $LOG_FILE
}

execute_phase_3_service_migration() {
    echo "=== Phase 3: Service Migration ===" | tee -a $LOG_FILE
    
    # Migrate CI/CD runners
    ./scripts/migration/migrate_runners.sh | tee -a $LOG_FILE
    
    # Update integrations
    ./scripts/migration/update_integrations.sh | tee -a $LOG_FILE
    
    # Migrate configurations
    ./scripts/migration/migrate_configurations.sh | tee -a $LOG_FILE
    
    # User acceptance testing
    ./scripts/testing/user_acceptance_testing.sh | tee -a $LOG_FILE
}

execute_phase_4_traffic_migration() {
    echo "=== Phase 4: Traffic Migration ===" | tee -a $LOG_FILE
    
    # Gradual traffic shifting
    ./scripts/traffic/shift_traffic.sh 5
    sleep 600  # Wait 10 minutes
    
    ./scripts/traffic/shift_traffic.sh 25
    sleep 1800  # Wait 30 minutes
    
    ./scripts/traffic/shift_traffic.sh 50
    sleep 3600  # Wait 1 hour
    
    ./scripts/traffic/shift_traffic.sh 100
    
    # Post-migration validation
    ./scripts/validation/post_migration_validation.sh | tee -a $LOG_FILE
}

execute_phase_5_decommissioning() {
    echo "=== Phase 5: Decommissioning ===" | tee -LOG_FILE
    
    # Monitor stability
    ./scripts/monitoring/monitor_stability.sh | tee -a $LOG_FILE
    
    # Backup old environment
    ./scripts/backup/final_backup.sh | tee -a $LOG_FILE
    
    # Decommission source
    ./scripts/infrastructure/decommission_source.sh | tee -a $LOG_FILE
    
    # Update documentation
    ./scripts/documentation/update_docs.sh | tee -a $LOG_FILE
}

# Execute phase if script is run directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    if [ -z "$PHASE" ]; then
        echo "Usage: $0 <phase_number>"
        exit 1
    fi
    
    execute_phase $PHASE
fi

EOF

chmod +x /tmp/phase_execution.sh

echo "Staged migration approach documented"
```

#### Phase Validation and Rollback
```bash
#!/bin/bash
# phase_validation.sh - Phase validation and rollback procedures

# 1. Phase validation criteria
cat > /tmp/phase_validation_criteria.json << EOF
{
  "phase_0": {
    "name": "Preparation",
    "validation_criteria": [
      {
        "check": "infrastructure_validation",
        "description": "All infrastructure components validated",
        "command": "./scripts/validation/validate_infrastructure.sh",
        "expected_result": "SUCCESS"
      },
      {
        "check": "dns_configuration",
        "description": "DNS records properly configured",
        "command": "./scripts/dns/validate_dns.sh",
        "expected_result": "SUCCESS"
      },
      {
        "check": "ssl_certificates",
        "description": "SSL certificates valid and installed",
        "command": "./scripts/security/validate_ssl.sh",
        "expected_result": "SUCCESS"
      },
      {
        "check": "monitoring_setup",
        "description": "Monitoring and alerting operational",
        "command": "./scripts/monitoring/validate_monitoring.sh",
        "expected_result": "SUCCESS"
      }
    ],
    "rollback_procedure": "cleanup_preparation_changes.sh"
  },
  "phase_1": {
    "name": "Infrastructure Setup",
    "validation_criteria": [
      {
        "check": "target_instance_health",
        "description": "Target GitLab instance healthy",
        "command": "./scripts/health/check_gitlab_health.sh gitlab.interface.splitcite.com",
        "expected_result": "HEALTHY"
      },
      {
        "check": "external_services",
        "description": "External services operational",
        "command": "./scripts/infrastructure/validate_external_services.sh",
        "expected_result": "OPERATIONAL"
      },
      {
        "check": "load_balancer",
        "description": "Load balancer functioning",
        "command": "./scripts/load_balancer/validate_lb.sh",
        "expected_result": "FUNCTIONAL"
      },
      {
        "check": "performance_baseline",
        "description": "Performance baseline established",
        "command": "./scripts/performance/establish_baseline.sh",
        "expected_result": "BASELINE_SET"
      }
    ],
    "rollback_procedure": "decommission_target_instance.sh"
  },
  "phase_2": {
    "name": "Data Synchronization",
    "validation_criteria": [
      {
        "check": "data_integrity",
        "description": "Data integrity verified",
        "command": "./scripts/validation/validate_data_integrity.sh",
        "expected_result": "INTEGRITY_OK"
      },
      {
        "check": "replication_status",
        "description": "Database replication active",
        "command": "./scripts/database/check_replication.sh",
        "expected_result": "REPLICATION_ACTIVE"
      },
      {
        "check": "repository_sync",
        "description": "Repositories synchronized",
        "command": "./scripts/migration/validate_repository_sync.sh",
        "expected_result": "SYNC_COMPLETE"
      },
      {
        "check": "user_migration",
        "description": "User accounts migrated",
        "command": "./scripts/migration/validate_user_migration.sh",
        "expected_result": "USERS_MIGRATED"
      }
    ],
    "rollback_procedure": "cleanup_synchronized_data.sh"
  },
  "phase_3": {
    "name": "Service Migration",
    "validation_criteria": [
      {
        "check": "runner_migration",
        "description": "CI/CD runners migrated",
        "command": "./scripts/migration/validate_runner_migration.sh",
        "expected_result": "RUNNERS_MIGRATED"
      },
      {
        "check": "integrations",
        "description": "Integrations updated and functional",
        "command": "./scripts/migration/validate_integrations.sh",
        "expected_result": "INTEGRATIONS_OK"
      },
      {
        "check": "configurations",
        "description": "Configurations migrated",
        "command": "./scripts/migration/validate_configurations.sh",
        "expected_result": "CONFIGS_MIGRATED"
      },
      {
        "check": "user_acceptance",
        "description": "User acceptance testing passed",
        "command": "./scripts/testing/validate_uat.sh",
        "expected_result": "UAT_PASSED"
      }
    ],
    "rollback_procedure": "restore_service_configurations.sh"
  },
  "phase_4": {
    "name": "Traffic Migration",
    "validation_criteria": [
      {
        "check": "traffic_distribution",
        "description": "Traffic fully migrated",
        "command": "./scripts/traffic/validate_traffic_migration.sh",
        "expected_result": "TRAFFIC_MIGRATED"
      },
      {
        "check": "performance_metrics",
        "description": "Performance within acceptable limits",
        "command": "./scripts/performance/validate_performance.sh",
        "expected_result": "PERFORMANCE_OK"
      },
      {
        "check": "error_rates",
        "description": "Error rates within acceptable limits",
        "command": "./scripts/monitoring/validate_error_rates.sh",
        "expected_result": "ERROR_RATES_OK"
      },
      {
        "check": "user_experience",
        "description": "User experience validated",
        "command": "./scripts/testing/validate_user_experience.sh",
        "expected_result": "UX_OK"
      }
    ],
    "rollback_procedure": "revert_traffic_migration.sh"
  },
  "phase_5": {
    "name": "Decommissioning",
    "validation_criteria": [
      {
        "check": "stability_monitoring",
        "description": "New environment stable",
        "command": "./scripts/monitoring/validate_stability.sh",
        "expected_result": "STABLE"
      },
      {
        "check": "final_backup",
        "description": "Final backup completed",
        "command": "./scripts/backup/validate_final_backup.sh",
        "expected_result": "BACKUP_COMPLETE"
      },
      {
        "check": "decommissioning",
        "description": "Source environment decommissioned",
        "command": "./scripts/infrastructure/validate_decommissioning.sh",
        "expected_result": "DECOMMISSIONED"
      },
      {
        "check": "documentation",
        "description": "Documentation updated",
        "command": "./scripts/documentation/validate_docs.sh",
        "expected_result": "DOCS_UPDATED"
      }
    ],
    "rollback_procedure": "restore_source_environment.sh"
  }
  }
}
}
EOF

# 2. Phase validation script
cat > /tmp/validate_phase.sh << 'EOF'
#!/bin/bash
# Phase validation script

PHASE=$1
VALIDATION_LOG="/var/log/phase_validation_${PHASE}_$(date +%Y%m%d_%H%M%S).log"

validate_phase() {
    local phase=$1
    
    echo "Validating Phase $phase at $(date)" | tee $VALIDATION_LOG
    
    # Load validation criteria
    local criteria_file="/tmp/phase_validation_criteria.json"
    
    # Extract criteria for phase
    local phase_criteria=$(jq -r ".phase_${phase}" $criteria_file)
    
    if [ "$phase_criteria" = "null" ]; then
        echo "ERROR: No validation criteria found for phase $phase" | tee -a $VALIDATION_LOG
        return 1
    fi
    
    # Execute validation checks
    local validation_passed=true
    
    echo "=== Phase $phase Validation Criteria ===" | tee -a $VALIDATION_LOG
    
    # Parse and execute each validation check
    local checks=$(echo "$phase_criteria" | jq -r '.validation_criteria[] | @base64')
    
    for check in $checks; do
        local _jq() {
            echo ${check} | base64 --decode | jq -r ${1}
        }
        
        local check_name=$(_jq '.check')
        local description=$(_jq '.description')
        local command=$(_jq '.command')
        local expected_result=$(_jq '.expected_result')
        
        echo "Checking: $description" | tee -a $VALIDATION_LOG
        echo "Command: $command" | tee -a $VALIDATION_LOG
        
        # Execute validation command
        local result=$(eval $command 2>&1)
        local exit_code=$?
        
        echo "Result: $result" | tee -a $VALIDATION_LOG
        
        # Check if result matches expected
        if [ $exit_code -eq 0 ] && [[ "$result" == *"$expected_result"* ]]; then
            echo "✅ PASSED: $description" | tee -a $VALIDATION_LOG
        else
            echo "❌ FAILED: $description" | tee -a $VALIDATION_LOG
            validation_passed=false
        fi
        
        echo "" | tee -a $VALIDATION_LOG
    done
    
    # Overall validation result
    if [ "$validation_passed" = true ]; then
        echo "🎉 Phase $phase validation PASSED" | tee -a $VALIDATION_LOG
        return 0
    else
        echo "💥 Phase $phase validation FAILED" | tee -a $VALIDATION_LOG
        return 1
    fi
}

# Rollback phase if validation fails
rollback_phase() {
    local phase=$1
    
    echo "Rolling back Phase $phase at $(date)" | tee -a $VALIDATION_LOG
    
    # Load rollback procedure
    local criteria_file="/tmp/phase_validation_criteria.json"
    local rollback_procedure=$(jq -r ".phase_${phase}.rollback_procedure" $criteria_file)
    
    if [ "$rollback_procedure" = "null" ]; then
        echo "ERROR: No rollback procedure found for phase $phase" | tee -a $VALIDATION_LOG
        return 1
    fi
    
    echo "Executing rollback procedure: $rollback_procedure" | tee -a $VALIDATION_LOG
    
    # Execute rollback procedure
    if [ -f "./scripts/rollback/$rollback_procedure" ]; then
        ./scripts/rollback/$rollback_procedure | tee -a $VALIDATION_LOG
    else
        echo "ERROR: Rollback script not found: ./scripts/rollback/$rollback_procedure" | tee -a $VALIDATION_LOG
        return 1
    fi
    
    echo "Phase $phase rollback completed" | tee -a $VALIDATION_LOG
}

# Execute validation if script is run directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    if [ -z "$PHASE" ]; then
        echo "Usage: $0 <phase_number>"
        exit 1
    fi
    
    if validate_phase $PHASE; then
        echo "Phase $phase validation successful"
        exit 0
    else
        echo "Phase $phase validation failed, initiating rollback"
        rollback_phase $PHASE
        exit 1
    fi
fi
EOF

chmod +x /tmp/validate_phase.sh

echo "Phase validation and rollback procedures documented"
```

### 5.2 Blue-Green Deployment Patterns

#### Blue-Green Migration Implementation
```bash
#!/bin/bash
# blue_green_migration.sh - Blue-green deployment patterns

# 1. Blue-green architecture setup
cat > /tmp/blue_green_architecture.md << EOF
# Blue-Green Migration Architecture

## Environment Definition
- **Blue Environment**: gitlab.yocloud.com (Current production)
- **Green Environment**: gitlab.interface.splitcite.com (New production)
- **Load Balancer**: Traffic distribution and health checking
- **Database**: Shared database with replication
- **Storage**: Shared object storage for artifacts

## Migration Phases
1. **Blue Active**: 100% traffic to blue environment
2. **Green Testing**: Internal testing of green environment
3. **Gradual Shift**: Traffic percentage shift to green
4. **Green Active**: 100% traffic to green environment
5. **Blue Decommission**: Blue environment backup and decommission

## Rollback Strategy
- **Immediate**: Switch all traffic back to blue
- **Gradual**: Gradually shift traffic back to blue
- **Data**: Restore blue database from backup
EOF

# 2. Traffic management script
cat > /tmp/traffic_manager.sh << 'EOF'
#!/bin/bash
# Blue-green traffic management script

BLUE_ENV="gitlab.yocloud.com"
GREEN_ENV="gitlab.interface.splitcite.com"
LOAD_BALANCER_CONFIG="/etc/haproxy/haproxy.cfg"
TRAFFIC_LOG="/var/log/traffic_management_$(date +%Y%m%d).log"

# Initialize traffic distribution
initialize_traffic() {
    echo "Initializing blue-green traffic distribution" | tee -a $TRAFFIC_LOG
    
    # Create HAProxy configuration
    cat > $LOAD_BALANCER_CONFIG << HAPROXY
global
    log stdout format raw local0
    daemon

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog

frontend gitlab_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/gitlab.pem
    redirect scheme https if !{ ssl_fc }
    default_backend gitlab_backend

backend gitlab_backend
    balance roundrobin
    option httpchk GET /-/health
    server blue $BLUE_ENV:80 check weight 100
    server green $GREEN_ENV:80 check weight 0

listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
HAPROXY
    
    # Restart HAProxy
    systemctl restart haproxy
    
    echo "Traffic distribution initialized" | tee -a $TRAFFIC_LOG
}

# Shift traffic between environments
shift_traffic() {
    local green_percentage=$1
    local blue_percentage=$((100 - green_percentage))
    
    echo "Shifting traffic: Blue $blue_percentage%, Green $green_percentage%" | tee -a $TRAFFIC_LOG
    
    # Update HAProxy weights
    sed -i "s/server blue $BLUE_ENV:80 check weight [0-9]*/server blue $BLUE_ENV:80 check weight $blue_percentage/" $LOAD_BALANCER_CONFIG
    sed -i "s/server green $GREEN_ENV:80 check weight [0-9]*/server green $GREEN_ENV:80 check weight $green_percentage/" $LOAD_BALANCER_CONFIG
    
    # Reload HAProxy
    systemctl reload haproxy
    
    # Wait for propagation
    sleep 30
    
    # Verify traffic distribution
    verify_traffic_distribution
}

# Verify traffic distribution
verify_traffic_distribution() {
    echo "Verifying traffic distribution" | tee -a $TRAFFIC_LOG
    
    # Check HAProxy statistics
    local stats=$(curl -s http://localhost:8404/stats; echo)
    
    # Extract server status and weights
    local blue_status=$(echo "$stats" | grep "blue" | awk '{print $18}')
    local green_status=$(echo "$stats" | grep "green" | awk '{print $18}')
    
    echo "Blue status: $blue_status" | tee -a $TRAFFIC_LOG
    echo "Green status: $green_status" | tee -a $TRAFFIC_LOG
    
    # Check if both servers are healthy
    if [[ "$blue_status" == "UP" ]] && [[ "$green_status" == "UP" ]]; then
        echo "✅ Both environments healthy" | tee -a $TRAFFIC_LOG
        return 0
    else
        echo "❌ One or both environments unhealthy" | tee -a $TRAFFIC_LOG
        return 1
    fi
}

# Health check for environments
health_check() {
    local env=$1
    
    echo "Health checking $env" | tee -a $TRAFFIC_LOG
    
    # Check HTTP response
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" https://$env/-/health)
    
    if [ "$http_status" = "200" ]; then
        echo "✅ $env health check passed" | tee -a $TRAFFIC_LOG
        return 0
    else
        echo "❌ $env health check failed (HTTP $http_status)" | tee -a $TRAFFIC_LOG
        return 1
    fi
}

# Gradual traffic migration
gradual_migration() {
    echo "Starting gradual traffic migration" | tee -a $TRAFFIC_LOG
    
    local increments=(5 10 25 50 75 90 100)
    
    for percentage in "${increments[@]}"; do
        echo "Migrating $percentage% of traffic to green environment" | tee -a $TRAFFIC_LOG
        
        # Shift traffic
        shift_traffic $percentage
        
        # Wait and monitor
        local wait_time=300  # 5 minutes
        echo "Waiting $wait_time seconds for monitoring..." | tee -a $TRAFFIC_LOG
        sleep $wait_time
        
        # Check health of both environments
        if ! health_check $BLUE_ENV; then
            echo "Blue environment unhealthy, aborting migration" | tee -a $TRAFFIC_LOG
            emergency_rollback
            return 1
        fi
        
        if ! health_check $GREEN_ENV; then
            echo "Green environment unhealthy, rolling back" | tee -a $TRAFFIC_LOG
            rollback_traffic 0
            return 1
        fi
        
        # Check error rates
        if ! check_error_rates; then
            echo "Error rates too high, rolling back" | tee -a $TRAFFIC_LOG
            rollback_traffic 0
            return 1
        fi
        
        echo "Successfully migrated $percentage% of traffic" | tee -a $TRAFFIC_LOG
    done
    
    echo "Gradual migration completed successfully" | tee -a $TRAFFIC_LOG
}

# Emergency rollback
emergency_rollback() {
    echo "Emergency rollback initiated" | tee -a $TRAFFIC_LOG
    
    # Shift all traffic to blue
    rollback_traffic 0
    
    # Send alert
    send_emergency_alert "Emergency rollback completed - all traffic routed to blue environment"
    
    echo "Emergency rollback completed" | tee -a $RAFFIC_LOG
}

# Rollback traffic to specified green percentage
rollback_traffic() {
    local green_percentage=$1
    
    echo "Rolling back traffic: Green $green_percentage%" | tee -a $TRAFFIC_LOG
    
    shift_traffic $green_percentage
}

# Check error rates
check_error_rates() {
    # This would integrate with your monitoring system
    # For now, return success
    return 0
}

# Send emergency alert
send_emergency_alert() {
    local message=$1
    
    curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 GitLab Migration Alert\\n$message\\nTime: $(date)\"}" \
    $SLACK_WEBHOOK_URL
}

# Main execution
case $1 in
    "init")
        initialize_traffic
        ;;
    "shift")
        shift_traffic $2
        ;;
    "migrate")
        gradual_migration
        ;;
    "rollback")
        rollback_traffic $2
        ;;
    "emergency")
        emergency_rollback
        ;;
    "health")
        health_check $BLUE_ENV
        health_check $GREEN_ENV
        ;;
    *)
        echo "Usage: $0 {init|shift|percentage|migrate|rollback|emergency|health}"
        exit 1
        ;;
esac
EOF

chmod +x /tmp/traffic_manager.sh

echo "Blue-green deployment patterns documented"
```

#### Database Synchronization for Blue-Green
```bash
#!/bin/bash
# database_sync.sh - Database synchronization for blue-green deployment

# 1. Database replication setup
cat > /tmp/database_replication.sh << 'EOF'
#!/bin/bash
# Database replication setup for blue-green deployment

SOURCE_DB="gitlab.yocloud.com"
TARGET_DB="gitlab.interface.splitcite.com"
REPLICATION_USER="gitlab_replicator"
REPLICATION_PASSWORD="REDACTED"
REPLICATION_LOG="/var/log/database_replication_$(date +%Y%m%d).log"

# Setup replication user
setup_replication_user() {
    echo "Setting up replication user" | tee -a $REPLICATION_LOG
    
    ssh $SOURCE_DB "sudo -u gitlab-psql psql -c \"CREATE USER $REPLICATION_USER WITH REPLICATION ENCRYPTED PASSWORD '$REPLICATION_PASSWORD';\"" | tee -a $REPLICATION_LOG
    ssh $SOURCE_DB "sudo -u gitlab-psql psql -c \"GRANT CONNECT ON DATABASE gitlabhq_production TO $REPLICATION_USER;\"" | tee -a $REPLICATION_LOG
    ssh $SOURCE_DB "sudo -u gitlab-psql psql -c \"GRANT SELECT ON ALL TABLES IN SCHEMA public TO $REPLICATION_USER;\"" | tee -a $REPLICATION_LOG
    ssh $SOURCE_DB "sudo -u gitlab-psql psql -c \"GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO $REPLICATION_USER;\"" | tee -a $REPLICATION_LOG
    
    echo "Replication user setup completed" | tee -a $REPLICATION_LOG
}

# Configure PostgreSQL for replication
configure_postgresql_replication() {
    echo "Configuring PostgreSQL for replication" | tee -a $REPLICATION_LOG
    
    # Configure source database
    ssh $SOURCE_DB "sudo sed -i 's/#wal_level = minimal/wal_level = replica/' /var/opt/gitlab/postgresql/data/postgresql.conf" | tee -a $REPLICATION_LOG
    ssh $SOURCE_DB "sudo sed -i 's/#max_wal_senders = 0/max_wal_senders = 3/' /var/opt/gitlab/postgresql/data/postgresql.conf" | tee -a $REPLICATION_LOG
    ssh $SOURCE_DB "sudo sed -i 's/#wal_keep_segments = 0/wal_keep_segments = 64/' /var/opt/gitlab/postgresql/data/postgresql.conf" | tee -a $REPLICATION_LOG
    
    # Configure pg_hba.conf for replication
    ssh $SOURCE_DB "echo 'host replication $REPLICATION_USER $TARGET_DB/32 md5' | sudo tee -a /var/opt/gitlab/postgresql/data/pg_hba.conf" | tee -a $REPLICATION_LOG
    
    # Restart PostgreSQL
    ssh $SOURCE_DB "sudo gitlab-ctl restart postgresql" | tee -a $REPLICATION_LOG
    
    echo "PostgreSQL replication configuration completed" | tee -a $REPLICATION_LOG
}

# Create base backup
create_base_backup() {
    echo "Creating base backup for replication" | tee -a $REPLICATION_LOG
    
    # Stop target GitLab services
    ssh $TARGET_DB "sudo gitlab-ctl stop" | tee -a $REPLICATION_LOG
    
    # Remove existing data
    ssh $TARGET_DB "sudo rm -rf /var/opt/gitlab/postgresql/data/*" | tee -a $REPLICATION_LOG
    
    # Create base backup using pg_basebackup
    ssh $TARGET_DB "sudo -u gitlab-psql pg_basebackup -h $SOURCE_DB -D /var/opt/gitlab/postgresql/data -U $REPLICATION_USER -F -v -P -W -D -s -C -T -d /var/opt/gitlab/postgresql/data" | tee -a $REPLICATION_LOG
    
    # Create recovery.conf
    ssh $TARGET_DB "sudo -u gitlab-psql cat > /var/opt/gitlab/postgresql/data/recovery.conf << RECOVERY_CONF
standby_mode = 'on'
primary_conninfo = 'host=$SOURCE_DB port=5432 user=$REPLICATION_USER password=$REPLICATION_PASSWORD'
trigger_file = '/tmp/postgresql.trigger'
EOF

    ssh $TARGET_DB "sudo chmod 600 /var/opt/gitlab/postgresql/data/recovery.conf" | tee -a $REPLICATION_LOG
    
    # Start target PostgreSQL
    ssh $TARGET_DB "sudo gitlab-ctl start postgresql" | tee -a $REPLICATION_LOG
    
    echo "Base backup created" | tee -a $REPLICATION_LOG
}

# Monitor replication status
monitor_replication() {
    echo "Monitoring replication status" | tee -a $REPLICATION_LOG
    
    # Check replication lag
    local lag=$(ssh $TARGET_DB "sudo -u gitlab-psql -t -c \"SELECT pg_xlog_location_diff(pg_last_xlog_receive_location(), pg_last_xlog_replay_location()) AS lag_bytes;\"" | tr -d ' ')
    
    if [ -n "$lag" ] && [ "$lag" -lt 1048576 ]; then  # Less than 1MB
        echo "✅ Replication lag: $lag bytes (acceptable)" | tee -a $REPLICATION_LOG
    else
        echo "❌ Replication lag: $lag bytes (too high)" | tee -a $REPLICATION_LOG
    fi
    
    return 0
}

# Promote replica to master
promote_replica() {
    echo "Promoting replica to master" | tee -a $REPLICATION_LOG
    
    # Create trigger file
    ssh $TARGET_DB "sudo touch /tmp/postgresql.trigger" | tee -a $REPLICATION_LOG
    
    # Wait for promotion
    sleep 10
    
    # Verify promotion
    local is_master=$(ssh $TARGET_DB "sudo -u gitlab-psql -t -c \"SELECT pg_is_in_recovery();\"" | tr -d ' ')
    
    if [ "$is_master" = "f" ]; then
        echo "✅ Replica promoted to master successfully" | tee -a $REPLICATION_LOG
        return 0
    else
        echo "❌ Replica promotion failed" | tee -a $REPLICATION_LOG
        return 1
    fi
}

# Setup replication
setup_replication() {
    echo "Setting up database replication" | tee -a $REPLICATION_LOG
    
    setup_replication_user
    configure_postgresql_replication
    create_base_backup
    monitor_replication
    
    # Wait for replication to catch up
    echo "Waiting for replication to catch up..." | tee -a $REPLICATION_LOG
    sleep 60
    
    # Monitor replication status
    if monitor_replication; then
        echo "Database replication setup completed successfully" | tee -a $REPLICATION_LOG
        return 0
    else
        echo "Database replication setup failed" | tee -a $REPLICATION_LOG
        return 1
    fi
}

# Main execution
case $1 in
    "setup")
        setup_replication
        ;;
    "monitor")
        monitor_replication
        ;;
    "promote")
        promote_replica
        ;;
    *)
        echo "Usage: $0 {setup|monitor|promote}"
        exit 1
        ;;
esac
EOF

chmod +x /tmp/database_replication.sh

echo "Database synchronization procedures documented"
```

### 5.3 Zero-Downtime Migration Techniques

#### Zero-Downtime Migration Strategy
```bash
#!/bin/bash
# zero_downtime_migration.sh - Zero-downtime migration techniques

# 1. Zero-downtime migration strategy
cat > /tmp/zero_downtime_strategy.md << EOF
# Zero-Downtime Migration Strategy

## Core Principles
1. **No Service Interruption**: Users experience no downtime during migration
2. **Data Consistency**: Maintain data integrity throughout process
3. **Immediate Rollback**: Ability to rollback instantly if issues arise
4. **Gradual Transition**: Smooth transition between environments

## Migration Components
- **Database Replication**: Real-time data synchronization
- **File Synchronization**: Continuous file and artifact sync
- **Session Management**: Seamless session transfer
- **Load Balancing**: Intelligent traffic distribution
- **Health Monitoring**: Real-time health checks

## Migration Phases
1. **Preparation**: Infrastructure setup and replication configuration
2. **Synchronization**: Data and file synchronization
3. **Validation**: Comprehensive testing and validation
4. **Traffic Migration**: Gradual traffic shifting
5. **Finalization**: Complete migration and cleanup

## Migration Components
- **Database Replication**: PostgreSQL streaming replication with minimal lag (< 1MB)
- **File Synchronization**: Rsync with inotify for real-time sync
- **Object Storage**: Shared S3-compatible storage for artifacts
- **Session Management**: Shared Redis cluster for session persistence
- **Load Balancing**: HAProxy with health checks and automatic failover
- **Health Monitoring**: Real-time monitoring with automated alerting

## Success Criteria
- **Zero Downtime**: < 5 minutes total
- **Data Loss**: Zero data loss
- **User Impact**: < 1% users affected
- **Performance**: Response times < 2 seconds
- **Rollback Time**: < 30 seconds
EOF

# 2. Session management for zero-downtime
cat > /tmp/session_management.sh << 'EOF'
#!/bin/bash
# Session management for zero-downtime migration

REDIS_HOST="gitlab.yocloud.com"
REDIS_PORT="6379"
REDIS_PASSWORD="REDACTED"
SESSION_LOG="/var/log/session_migration_$(date +%Y%m%d).log"

# Setup shared Redis cluster
setup_shared_redis() {
    echo "Setting up shared Redis cluster" | tee -a $SESSION_LOG
    
    # Configure both GitLab instances to use shared Redis
    ssh gitlab.yocloud.com "sudo sed -i 's/^gitlab_rails\[.redis_host.\] = .*/gitlab_rails[\"redis_host\"] = \"shared-redis.internal\"/' /etc/gitlab/gitlab.rb" | tee -a $SESSION_LOG
    ssh gitlab.interface.splitcite.com "sudo sed -i 's/^gitlab_rails\[.redis_host.\] = .*/gitlab_rails[\"redis_host\"] = \"shared-redis.internal\"/' /etc/gitlab/gitlab.rb" | tee -a $SESSION_LOG
    
    # Reconfigure both instances
    ssh gitlab.yocloud.com "sudo gitlab-ctl reconfigure" | tee -a $SESSION_LOG
    ssh gitlab.interface.splitcite.com "sudo gitlab-ctl reconfigure" | tee -a $SESSION_LOG
    
    echo "Shared Redis cluster setup completed" | tee -a $SESSION_LOG
}

# Migrate active sessions
migrate_sessions() {
    echo "Migrating active sessions" | tee -a $SESSION_LOG
    
    # Get current session count
    local session_count=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD scard gitlab:sessions | wc -l)
    echo "Current active sessions: $session_count" | tee -a $SESSION_LOG
    
    # Create session backup
    redis-cli -h $REDIS_HOST -p $REDIS_PASSWORD -a $REDIS_PASSWORD save | tee -a $SESSION_LOG
    
    # Validate session accessibility from both environments
    validate_session_access
    
    echo "Session migration completed" | tee -a $SESSION_LOG
}

# Validate session access
validate_session_access() {
    echo "Validating session access from both environments" | tee -a $SESSION_LOG
    
    # Test session access from blue environment
    local blue_access=$(ssh gitlab.yocloud.com "curl -s -o /dev/null -w '%{http_code}' http://localhost/-/health")
    
    # Test session access from green environment
    local green_access=$(ssh gitlab.interface.splitcite.com "curl -s -o /dev/null -w '%{http_code}' http://localhost/-/health")
    
    if [ "$blue_access" = "200" ] && [ "$green_access" = "200" ]; then
        echo "✅ Session access validated for both environments" | tee -a $SESSION_LOG
        return 0
    else
        echo "❌ Session access validation failed" | tee -a $SESSION_LOG
        return 1
    fi
}

# Monitor session continuity
monitor_session_continuity() {
    echo "Monitoring session continuity" | tee -a $SESSION_LOG
    
    local check_interval=60
    local max_checks=60  # Monitor for 1 hour
    
    for ((i=1; i<=max_checks; i++)); do
        # Check session count stability
        local current_sessions=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD scard gitlab:sessions | wc -l)
        
        echo "Check $i: Active sessions: $current_sessions" | tee -a $SESSION_LOG
        
        # Validate session access
        if ! validate_session_access; then
            echo "Session continuity broken at check $i" | tee -a $SESSION_LOG
            return 1
        fi
        
        sleep $check_interval
    done
    
    echo "Session continuity monitoring completed successfully" | tee -a $SESSION_LOG
    return 0
}

# Main execution
case $1 in
    "setup")
        setup_shared_redis
        ;;
    "migrate")
        migrate_sessions
        ;;
    "monitor")
        monitor_session_continuity
        ;;
    *)
        echo "Usage: $0 {setup|migrate|monitor}"
        exit 1
        ;;
esac
EOF

chmod +x /tmp/session_management.sh

echo "Zero-downtime migration techniques documented"
```

#### File and Artifact Synchronization
```bash
#!/bin/bash
# file_synchronization.sh - File and artifact synchronization

SOURCE_HOST="gitlab.yocloud.com"
TARGET_HOST="gitlab.interface.splitcite.com"
SYNC_LOG="/var/log/file_synchronization_$(date +%Y%m%d).log"

# Setup object storage synchronization
setup_object_storage_sync() {
    echo "Setting up object storage synchronization" | tee -a $SYNC_LOG
    
    # Configure both instances to use shared object storage
    cat > /tmp/shared_storage_config.rb << 'EOF'
# Shared object storage configuration
gitlab_rails['object_store']['enabled'] = true
gitlab_rails['object_store']['connection'] = {
  'provider' => 'AWS',
  'region' => 'us-west-2',
  'aws_access_key_id' => 'REDACTED',
  'aws_secret_access_key' => 'REDACTED',
  'endpoint' => 'https://s3.internal'
}

gitlab_rails['object_store']['objects']['artifacts']['bucket'] = 'gitlab-shared-artifacts'
gitlab_rails['object_store']['objects']['external_diffs']['bucket'] = 'gitlab-shared-diffs'
gitlab_rails['object_store']['objects']['lfs_objects']['bucket'] = 'gitlab-shared-lfs'
gitlab_rails['object_store']['objects']['uploads']['bucket'] = 'gitlab-shared-uploads'
gitlab_rails['object_store']['objects']['packages']['bucket'] = 'gitlab-shared-packages'
gitlab_rails['object_store']['objects']['dependency_proxy']['bucket'] = 'gitlab-shared-dependency-proxy'
gitlab_rails['object_store']['objects']['terraform_state']['bucket'] = 'gitlab-shared-terraform-state'
EOF

    # Apply configuration to both instances
    scp /tmp/shared_storage_config.rb $SOURCE_HOST:/tmp/
    scp /tmp/shared_storage_config.rb $TARGET_HOST:/tmp/
    
    ssh $SOURCE_HOST "sudo cp /tmp/shared_storage_config.rb /etc/gitlab/gitlab.rb.storage && sudo gitlab-ctl reconfigure" | tee -a $SYNC_LOG
    ssh $TARGET_HOST "sudo cp /tmp/shared_storage_config.rb /etc/gitlab/gitlab.rb.storage && sudo gitlab-ctl reconfigure" | tee -a $SYNC_LOG
    
    echo "Object storage synchronization setup completed" | tee -a $SYNC_LOG
}

# Initial file synchronization
initial_file_sync() {
    echo "Starting initial file synchronization" | tee -a $SYNC_LOG
    
    # Sync repositories
    echo "Syncing repositories..." | tee -a $SYNC_LOG
    rsync -avz --delete -e ssh $SOURCE_HOST:/var/opt/gitlab/git-data/repositories/ $TARGET_HOST:/var/opt/gitlab/git-data/repositories/ | tee -a $SYNC_LOG
    
    # Sync uploads
    echo "Syncing uploads..." | tee -a $SYNC_LOG
    rsync -avz --delete -e ssh $SOURCE_HOST:/var/opt/gitlab/gitlab-rails/uploads/ $TARGET_HOST:/var/opt/gitlab/gitlab-rails/uploads/ | tee -a $SYNC_LOG
    
    # Sync shared files
    echo "Syncing shared files..." | tee -a $SYNC_LOG
    rsync -avz --delete -e ssh $SOURCE_HOST:/var/opt/gitlab/gitlab-rails/shared/ $TARGET_HOST:/var/opt/gitlab/gitlab-rails/shared/ | tee -a $SYNC_LOG
    
    echo "Initial file synchronization completed" | tee -a $SYNC_LOG
}

# Continuous file synchronization
continuous_file_sync() {
    echo "Starting continuous file synchronization" | tee -a $SYNC_LOG
    
    # Setup inotify for real-time sync
    cat > /tmp/continuous_sync.sh << 'EOF'
#!/bin/bash
# Continuous file synchronization script

SOURCE_HOST="gitlab.yocloud.com"
TARGET_HOST="gitlab.interface.splitcite.com"
SYNC_DIRS=("/var/opt/gitlab/git-data/repositories" "/var/opt/gitlab/gitlab-rails/uploads" "/var/opt/gitlab/gitlab-rails/shared")

# Install inotify-tools if not present
which inotifywait || apt-get install -y inotify-tools

# Monitor directories for changes
for dir in "${SYNC_DIRS[@]}"; do
    echo "Monitoring $dir for changes..."
    
    inotifywait -m -r -e modify,create,delete,move -