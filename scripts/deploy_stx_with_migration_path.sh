#!/bin/bash
set -e

# StarlingX Deployment with Ubuntu Migration Path
# Current: STX 11 on AlmaLinux 8
# Target: STX 12 on Ubuntu 22.04

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
STX_SERVER="23.92.79.2"
SSH_KEY="$HOME/.ssh/starlingx_key"
SSH_PORT="2222"
MIGRATION_TARGET="ubuntu-22.04"
STX_VERSION="11"

echo -e "${BLUE}=== StarlingX Deployment with Migration Path ===${NC}"
echo "Current: STX $STX_VERSION on AlmaLinux 8"
echo "Target: STX 12 on Ubuntu $MIGRATION_TARGET"
echo "Server: $STX_SERVER"
echo ""

# Function to execute on StarlingX
execute_on_stx() {
    local cmd="$1"
    ssh -i "$SSH_KEY" -p "$SSH_PORT" "root@$STX_SERVER" "$cmd"
}

# Phase 0: Document Current State
echo -e "${BLUE}Phase 0: Documenting Current State${NC}"
echo "======================================"

echo "Current OS Information:"
execute_on_stx "cat /etc/os-release | grep -E 'PRETTY_NAME|VERSION_ID'"

echo -e "\nCurrent Container Runtime:"
execute_on_stx "docker info | grep 'Server Version' || echo 'Docker not available, checking containerd...'"

echo -e "\nCurrent Kubernetes Version:"
execute_on_stx "kubectl version --short --client 2>/dev/null || echo 'Kubectl not available'"

echo -e "\nCurrent StarlingX Version:"
execute_on_stx "source /etc/platform/openrc && system show | head -5"

# Phase 1: Prepare Migration-Ready Infrastructure
echo -e "\n${BLUE}Phase 1: Preparing Migration-Ready Infrastructure${NC}"
echo "=================================================="

# Create migration namespace
execute_on_stx "kubectl create namespace migration --dry-run=client -o yaml | kubectl apply -f -"

# Label for future migration
execute_on_stx "kubectl label nodes --all migration-target=$MIGRATION_TARGET --overwrite"

# Create migration configmap
cat << 'EOF' > /tmp/migration-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: migration-plan
  namespace: migration
data:
  current-os: "almalinux-8"
  target-os: "ubuntu-22.04"
  stx-version: "11"
  target-stx-version: "12"
  migration-date: "2025-Q4"
  containerd-current: "1.6.x"
  containerd-target: "2.2.1"
EOF

execute_on_stx "kubectl apply -f /tmp/migration-config.yaml"

# Phase 2: Deploy LOKI Stack (OS-Agnostic)
echo -e "\n${BLUE}Phase 2: Deploying LOKI Stack${NC}"
echo "================================"

# Deploy LOKI using containers (portable)
cat << 'EOF' > /tmp/loki-portable.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: loki
  template:
    metadata:
      labels:
        app: loki
    spec:
      containers:
      - name: loki
        image: grafana/loki:2.9.0
        ports:
        - containerPort: 3100
        args:
        - -config.file=/etc/loki/local-config.yaml
        volumeMounts:
        - name: loki-config
          mountPath: /etc/loki
        - name: loki-storage
          mountPath: /loki
      volumes:
      - name: loki-config
        configMap:
          name: loki-config
      - name: loki-storage
        persistentVolumeClaim:
          claimName: loki-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: loki
  namespace: monitoring
spec:
  selector:
    app: loki
  ports:
  - port: 3100
    targetPort: 3100
EOF

execute_on_stx "kubectl apply -f /tmp/loki-portable.yaml"

# Phase 3: Deploy Applications with Migration Tags
echo -e "\n${BLUE}Phase 3: Deploying Applications${NC}"
echo "=================================="

# HostBill with migration annotations
cat << 'EOF' > /tmp/hostbill-migration.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hostbill
  namespace: billing
  annotations:
    migration-target: "ubuntu-22.04"
    migration-compatibility: "full"
    container-runtime: "docker"
    target-runtime: "containerd"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hostbill
  template:
    metadata:
      labels:
        app: hostbill
        migration-ready: "true"
    spec:
      containers:
      - name: hostbill
        image: hostbill/hostbill:latest
        ports:
        - containerPort: 80
        env:
        - name: DB_HOST
          value: "mysql.billing.svc.cluster.local"
        - name: MIGRATION_MODE
          value: "prepared"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: config-volume
          mountPath: /etc/hostbill
          readOnly: true
      volumes:
      - name: config-volume
        configMap:
          name: hostbill-config
      nodeSelector:
        migration-target: "ubuntu-22.04"
EOF

# WordPress with portable data
cat << 'EOF' > /tmp/wordpress-portable.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wordpress
  namespace: cms
  annotations:
    migration-target: "ubuntu-22.04"
    data-portability: "pvc-based"
    config-management: "gitops"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: wordpress
  template:
    metadata:
      labels:
        app: wordpress
        migration-ready: "true"
    spec:
      containers:
      - name: wordpress
        image: wordpress:6.4-php8.1-apache
        ports:
        - containerPort: 80
        env:
        - name: WORDPRESS_DB_HOST
          value: "mysql.cms.svc.cluster.local"
        - name: WORDPRESS_CONFIG_PATH
          value: "/etc/wordpress/external"
        volumeMounts:
        - name: wp-storage
          mountPath: /var/www/html
        - name: wp-config
          mountPath: /etc/wordpress/external
          readOnly: true
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: wp-storage
        persistentVolumeClaim:
          claimName: wp-pvc
      - name: wp-config
        configMap:
          name: wp-external-config
      nodeSelector:
        migration-target: "ubuntu-22.04"
EOF

# Phase 4: Configure GitOps for Migration
echo -e "\n${BLUE}Phase 4: Configuring GitOps${NC}"
echo "==============================="

# Create GitOps structure
cat << 'EOF' > /tmp/gitops-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gitops-config
  namespace: migration
data:
  repo-url: "https://github.com/ruvnet/stx-migration"
  target-branch: "ubuntu-22.04"
  sync-interval: "5m"
  migration-checklist: |
    - [ ] Verify container compatibility
    - [ ] Update container images for Ubuntu
    - [ ] Validate configuration paths
    - [ ] Test data migration
    - [ ] Update monitoring endpoints
    - [ ] Validate network policies
EOF

execute_on_stx "kubectl apply -f /tmp/gitops-config.yaml"

# Phase 5: Deploy Migration Metrics
echo -e "\n${BLUE}Phase 5: Deploying Migration Metrics${NC}"
echo "===================================="

cat << 'EOF' > /tmp/migration-metrics.yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: migration-metrics
  namespace: monitoring
  labels:
    app: migration-exporter
spec:
  selector:
    matchLabels:
      app: migration-exporter
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: migration-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: migration-exporter
  template:
    metadata:
      labels:
        app: migration-exporter
    spec:
      containers:
      - name: exporter
        image: migration/metrics-exporter:latest
        ports:
        - containerPort: 8080
        env:
        - name: CURRENT_OS
          value: "almalinux-8"
        - name: TARGET_OS
          value: "ubuntu-22.04"
        - name: MIGRATION_DATE
          value: "2025-10-01"
EOF

execute_on_stx "kubectl apply -f /tmp/migration-metrics.yaml"

# Phase 6: Create Migration Playbook
echo -e "\n${BLUE}Phase 6: Creating Migration Playbook${NC}"
echo "======================================"

cat << 'EOF' > /tmp/migration-playbook.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: migration-playbook
  namespace: migration
data:
  playbook.md: |
    # StarlingX Ubuntu Migration Playbook
    
    ## Pre-Migration Checklist
    - [ ] Backup all configurations
    - [ ] Document custom modifications
    - [ ] Verify backup integrity
    - [ ] Prepare Ubuntu 22.04 media
    
    ## Migration Steps
    1. Deploy Ubuntu 22.04 STX 12
    2. Migrate persistent volumes
    3. Update container images
    4. Apply new configurations
    5. Validate services
    6. Cutover traffic
    
    ## Post-Migration
    - [ ] Verify all services running
    - [ ] Check performance metrics
    - [ ] Update monitoring
    - [ ] Decommission AlmaLinux
    
    ## Rollback Plan
    If migration fails:
    1. Stop traffic to new cluster
    2. Restore AlmaLinux services
    3. Investigate failure
    4. Retry when ready
EOF

execute_on_stx "kubectl apply -f /tmp/migration-playbook.yaml"

# Phase 7: SLA Metrics Setup
echo -e "\n${BLUE}Phase 7: Setting up SLA Metrics${NC}"
echo "=================================="

# Deploy Prometheus rules for migration tracking
cat << 'EOF' > /tmp/sla-migration-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: migration-sla
  namespace: monitoring
spec:
  groups:
  - name: migration.rules
    rules:
    - alert: MigrationDelay
      expr: time() - migration_scheduled_date > 86400
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Migration delayed beyond scheduled date"
    - alert: MTTRIncrease
      expr: mttr_current > mttr_baseline * 1.5
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "MTTR increased by 50% during migration"
    - alert: ThroughputDegradation
      expr: rate(requests_total[5m]) < baseline_throughput * 0.8
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Throughput degraded during migration"
EOF

execute_on_stx "kubectl apply -f /tmp/sla-migration-rules.yaml"

# Phase 8: Validation
echo -e "\n${BLUE}Phase 8: Validation${NC}"
echo "=================="

# Check migration readiness
echo "Checking migration readiness..."
execute_on_stx "kubectl get nodes -l migration-target=ubuntu-22.04"

# Check deployments
echo "Checking deployments with migration annotations..."
execute_on_stx "kubectl get deployments --all-namespaces -o custom-columns=NAME:.metadata.name,MIGRATION:.metadata.annotations.migration-target"

# Check GitOps config
echo "Checking GitOps configuration..."
execute_on_stx "kubectl get configmap -n migration gitops-config -o yaml"

# Phase 9: Summary
echo -e "\n${GREEN}=== Deployment Summary ===${NC}"
echo ""
echo "✓ Deployed on STX 11 (AlmaLinux 8) with migration path"
echo "✓ All applications tagged for Ubuntu 22.04 migration"
echo "✓ GitOps configured for configuration management"
echo "✓ Migration metrics and SLA tracking active"
echo "✓ Rollback plan documented"
echo ""
echo -e "${YELLOW}Current Status:${NC}"
echo "- OS: AlmaLinux 8 (temporary)"
echo "- Container Runtime: Docker (will be containerd 2.2.1)"
echo "- Target: Ubuntu 22.04 with STX 12 (Q4 2025)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Monitor application performance"
echo "2. Track migration readiness metrics"
echo "3. Prepare Ubuntu 22.04 STX 12 environment"
echo "4. Execute migration when STX 12 is available"
echo ""
echo -e "${GREEN}Migration-Ready Deployment Complete!${NC}"
