#!/usr/bin/env bash
#
# STX Health Probes - Read-Only Diagnostic Checks
# All checks are idempotent and produce structured JSON output
#
# Usage: ./stx_health_probes.sh [--format json|text] [--probe <name>] [--thresholds <path>]
#
# Probes:
#   api_server      - Kubernetes API Server availability
#   nodes           - Node status and readiness
#   resources       - Resource utilization thresholds
#   critical_pods   - Critical pods health in kube-system
#   services        - Service availability
#   dependencies    - etcd, CoreDNS, CNI health
#   ingress         - NGINX Ingress status
#   monitoring      - Prometheus/Grafana availability
#   connectivity    - Pod-to-ClusterIP connectivity validation
#   all             - Run all probes (default)
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_FORMAT="${STX_HEALTH_OUTPUT:-json}"
THRESHOLDS_FILE="${STX_HEALTH_THRESHOLDS:-$PROJECT_ROOT/config/stx-health-thresholds.yaml}"
PROBE_NAME="${1:-all}"
VERBOSE="${VERBOSE:-false}"

# Known ports from context
PROMETHEUS_PORT="${PROMETHEUS_PORT:-30060}"
GRAFANA_PORT="${GRAFANA_PORT:-30091}"
INGRESS_HTTP_PORT="${INGRESS_HTTP_PORT:-30080}"
INGRESS_HTTPS_PORT="${INGRESS_HTTPS_PORT:-30443}"

# Colors (only for text output)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --probe)
            PROBE_NAME="$2"
            shift 2
            ;;
        --thresholds)
            THRESHOLDS_FILE="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--format json|text] [--probe <name>] [--thresholds <path>]"
            echo ""
            echo "Probes: api_server, nodes, resources, critical_pods, services, dependencies, ingress, monitoring, connectivity, all"
            exit 0
            ;;
        *)
            if [[ -z "${PROBE_NAME:-}" || "$PROBE_NAME" == "all" ]]; then
                PROBE_NAME="$1"
            fi
            shift
            ;;
    esac
done

# Load thresholds if file exists
load_thresholds() {
    if [[ -f "$THRESHOLDS_FILE" ]]; then
        # Parse YAML thresholds (simple parsing for flat structure)
        CPU_WARNING=$(grep 'cpu_warning:' "$THRESHOLDS_FILE" 2>/dev/null | awk '{print $2}' || echo "70")
        CPU_CRITICAL=$(grep 'cpu_critical:' "$THRESHOLDS_FILE" 2>/dev/null | awk '{print $2}' || echo "90")
        MEMORY_WARNING=$(grep 'memory_warning:' "$THRESHOLDS_FILE" 2>/dev/null | awk '{print $2}' || echo "75")
        MEMORY_CRITICAL=$(grep 'memory_critical:' "$THRESHOLDS_FILE" 2>/dev/null | awk '{print $2}' || echo "95")
        NODE_NOT_READY_CRITICAL=$(grep 'node_not_ready_critical:' "$THRESHOLDS_FILE" 2>/dev/null | awk '{print $2}' || echo "1")
        POD_PENDING_WARNING=$(grep 'pod_pending_warning:' "$THRESHOLDS_FILE" 2>/dev/null | awk '{print $2}' || echo "5")
        POD_FAILED_CRITICAL=$(grep 'pod_failed_critical:' "$THRESHOLDS_FILE" 2>/dev/null | awk '{print $2}' || echo "1")
    else
        # Defaults
        CPU_WARNING=70
        CPU_CRITICAL=90
        MEMORY_WARNING=75
        MEMORY_CRITICAL=95
        NODE_NOT_READY_CRITICAL=1
        POD_PENDING_WARNING=5
        POD_FAILED_CRITICAL=1
    fi
}

# Check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &>/dev/null; then
        echo '{"error":"kubectl not found in PATH","status":"fatal"}'
        exit 1
    fi
}

# Check if jq is available
check_jq() {
    if ! command -v jq &>/dev/null; then
        echo '{"error":"jq not found in PATH","status":"fatal"}'
        exit 1
    fi
}

# Probe: Kubernetes API Server Availability
probe_api_server() {
    local start_time end_time latency_ms status error_msg
    start_time=$(date +%s%3N 2>/dev/null || echo "0")
    
    if kubectl cluster-info &>/dev/null; then
        end_time=$(date +%s%3N 2>/dev/null || echo "0")
        if [[ "$start_time" != "0" && "$end_time" != "0" ]]; then
            latency_ms=$((end_time - start_time))
        else
            latency_ms=0
        fi
        
        # Get API server endpoint
        local api_endpoint
        api_endpoint=$(kubectl cluster-info 2>/dev/null | head -1 | awk '{print $NF}' | sed 's/\x1b\[[0-9;]*m//g' || echo "unknown")
        
        # Check /healthz endpoint
        local healthz_status
        healthz_status=$(kubectl get --raw /healthz 2>/dev/null || echo "unknown")
        
        cat <<EOF
{"probe":"api_server","status":"healthy","latency_ms":$latency_ms,"endpoint":"$api_endpoint","healthz":"$healthz_status"}
EOF
    else
        error_msg=$(kubectl cluster-info 2>&1 | head -1 || echo "API server unreachable")
        cat <<EOF
{"probe":"api_server","status":"unhealthy","error":"$error_msg"}
EOF
    fi
}

# Probe: Node Status
probe_nodes() {
    if ! kubectl get nodes &>/dev/null; then
        echo '{"probe":"nodes","status":"error","error":"Cannot retrieve node information"}'
        return
    fi
    
    kubectl get nodes -o json 2>/dev/null | jq --argjson threshold "$NODE_NOT_READY_CRITICAL" '{
        probe: "nodes",
        total: (.items | length),
        ready: ([.items[] | select(.status.conditions[] | select(.type=="Ready" and .status=="True"))] | length),
        not_ready: ([.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True"))] | length),
        status: (if ([.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True"))] | length) >= $threshold then "critical" else "healthy" end),
        nodes: [.items[] | {
            name: .metadata.name,
            ready: (.status.conditions[] | select(.type=="Ready") | .status == "True"),
            roles: ([.metadata.labels | to_entries[] | select(.key | startswith("node-role.kubernetes.io/")) | .key | split("/")[1]] | join(",")),
            kubelet_version: .status.nodeInfo.kubeletVersion,
            os_image: .status.nodeInfo.osImage
        }]
    }'
}

# Probe: Resource Utilization Thresholds
probe_resources() {
    local metrics_output
    metrics_output=$(kubectl top nodes --no-headers 2>/dev/null) || {
        echo '{"probe":"resources","status":"unavailable","error":"metrics-server not responding or not installed"}'
        return
    }
    
    if [[ -z "$metrics_output" ]]; then
        echo '{"probe":"resources","status":"unavailable","error":"No metrics data available"}'
        return
    fi
    
    echo "$metrics_output" | awk -v cpu_warn="$CPU_WARNING" -v cpu_crit="$CPU_CRITICAL" \
        -v mem_warn="$MEMORY_WARNING" -v mem_crit="$MEMORY_CRITICAL" '
    BEGIN { 
        cpu_total=0; mem_total=0; count=0
        print "{"
        print "\"probe\":\"resources\","
        print "\"nodes\":["
    }
    {
        gsub(/%/, "", $3); gsub(/%/, "", $5)
        gsub(/m/, "", $2); gsub(/Mi/, "", $4)
        cpu_total += $3; mem_total += $5; count++
        
        cpu_status = "healthy"
        if ($3 >= cpu_crit) cpu_status = "critical"
        else if ($3 >= cpu_warn) cpu_status = "warning"
        
        mem_status = "healthy"
        if ($5 >= mem_crit) mem_status = "critical"
        else if ($5 >= mem_warn) mem_status = "warning"
        
        if (NR > 1) print ","
        printf "{\"name\":\"%s\",\"cpu_percent\":%.1f,\"memory_percent\":%.1f,\"cpu_status\":\"%s\",\"memory_status\":\"%s\"}", $1, $3, $5, cpu_status, mem_status
    }
    END {
        print "],"
        if (count > 0) {
            avg_cpu = cpu_total/count
            avg_mem = mem_total/count
            
            overall_status = "healthy"
            if (avg_cpu >= cpu_crit || avg_mem >= mem_crit) overall_status = "critical"
            else if (avg_cpu >= cpu_warn || avg_mem >= mem_warn) overall_status = "warning"
            
            printf "\"avg_cpu_percent\":%.1f,\"avg_memory_percent\":%.1f,\"node_count\":%d,\"status\":\"%s\"", avg_cpu, avg_mem, count, overall_status
        } else {
            print "\"status\":\"unavailable\",\"error\":\"No nodes found\""
        }
        print "}"
    }'
}

# Probe: Critical Pods Health
probe_critical_pods() {
    if ! kubectl get pods -n kube-system &>/dev/null; then
        echo '{"probe":"critical_pods","status":"error","error":"Cannot retrieve pod information from kube-system"}'
        return
    fi
    
    kubectl get pods -n kube-system -o json 2>/dev/null | jq --argjson pending_warn "$POD_PENDING_WARNING" \
        --argjson failed_crit "$POD_FAILED_CRITICAL" '{
        probe: "critical_pods",
        namespace: "kube-system",
        total: (.items | length),
        running: ([.items[] | select(.status.phase=="Running")] | length),
        pending: ([.items[] | select(.status.phase=="Pending")] | length),
        failed: ([.items[] | select(.status.phase=="Failed")] | length),
        succeeded: ([.items[] | select(.status.phase=="Succeeded")] | length),
        unknown: ([.items[] | select(.status.phase=="Unknown")] | length),
        status: (
            if ([.items[] | select(.status.phase=="Failed")] | length) >= $failed_crit then "critical"
            elif ([.items[] | select(.status.phase=="Pending")] | length) >= $pending_warn then "warning"
            else "healthy"
            end
        ),
        critical_components: [
            .items[] | select(
                .metadata.name | test("^(kube-apiserver|kube-controller|kube-scheduler|etcd|coredns|calico|flannel|cilium)")
            ) | {
                name: .metadata.name,
                phase: .status.phase,
                ready: ([.status.containerStatuses[]? | select(.ready == true)] | length) > 0,
                restarts: ([.status.containerStatuses[]?.restartCount] | add // 0)
            }
        ]
    }'
}

# Probe: Service Availability
probe_services() {
    if ! kubectl get svc -A &>/dev/null; then
        echo '{"probe":"services","status":"error","error":"Cannot retrieve service information"}'
        return
    fi
    
    local monitored_services='["kubernetes","prometheus-server","prometheus-kube-prometheus-prometheus","grafana","kube-dns","ingress-nginx-controller"]'
    
    kubectl get svc -A -o json 2>/dev/null | jq --argjson svc "$monitored_services" '{
        probe: "services",
        monitored: $svc,
        available: [.items[] | select(.metadata.name as $n | $svc | index($n)) | {
            name: .metadata.name,
            namespace: .metadata.namespace,
            type: .spec.type,
            cluster_ip: .spec.clusterIP,
            ports: [.spec.ports[]? | {port: .port, protocol: .protocol, node_port: .nodePort}]
        }],
        status: (if ([.items[] | select(.metadata.name as $n | $svc | index($n))] | length) > 0 then "healthy" else "warning" end),
        total_services: (.items | length),
        service_types: (reduce .items[] as $item ({}; .[$item.spec.type] = (.[$item.spec.type] // 0) + 1))
    }'
}

# Probe: Dependency Health (etcd, CoreDNS, CNI)
probe_dependencies() {
    local etcd_health="unknown"
    local etcd_members=0
    local coredns_health="unknown"
    local coredns_pods=0
    local cni_health="unknown"
    local cni_type="unknown"
    local cni_pods=0
    
    # etcd health (via component status or etcd pods)
    if kubectl get componentstatuses etcd-0 &>/dev/null 2>&1; then
        etcd_health="healthy"
    else
        # Try checking etcd pods directly
        etcd_pods=$(kubectl get pods -n kube-system -l component=etcd --no-headers 2>/dev/null | grep -c Running || echo 0)
        if [[ "$etcd_pods" -gt 0 ]]; then
            etcd_health="healthy"
            etcd_members=$etcd_pods
        fi
    fi
    
    # CoreDNS health
    coredns_pods=$(kubectl get pods -n kube-system -l k8s-app=kube-dns --no-headers 2>/dev/null | grep -c Running || echo 0)
    if [[ "$coredns_pods" -gt 0 ]]; then
        coredns_health="healthy"
    else
        coredns_health="degraded"
    fi
    
    # CNI health (check for common CNI solutions)
    # Check Calico
    cni_pods=$(kubectl get pods -n kube-system -l k8s-app=calico-node --no-headers 2>/dev/null | grep -c Running || echo 0)
    if [[ "$cni_pods" -gt 0 ]]; then
        cni_type="calico"
        cni_health="healthy"
    else
        # Check Flannel
        cni_pods=$(kubectl get pods -n kube-system -l app=flannel --no-headers 2>/dev/null | grep -c Running || echo 0)
        if [[ "$cni_pods" -gt 0 ]]; then
            cni_type="flannel"
            cni_health="healthy"
        else
            # Check Cilium
            cni_pods=$(kubectl get pods -n kube-system -l k8s-app=cilium --no-headers 2>/dev/null | grep -c Running || echo 0)
            if [[ "$cni_pods" -gt 0 ]]; then
                cni_type="cilium"
                cni_health="healthy"
            else
                # Check Weave
                cni_pods=$(kubectl get pods -n kube-system -l name=weave-net --no-headers 2>/dev/null | grep -c Running || echo 0)
                if [[ "$cni_pods" -gt 0 ]]; then
                    cni_type="weave"
                    cni_health="healthy"
                fi
            fi
        fi
    fi
    
    # Determine overall status
    local overall_status="healthy"
    if [[ "$etcd_health" != "healthy" ]]; then
        overall_status="critical"
    elif [[ "$coredns_health" != "healthy" || "$cni_health" != "healthy" ]]; then
        overall_status="degraded"
    fi
    
    cat <<EOF
{"probe":"dependencies","status":"$overall_status","etcd":{"status":"$etcd_health","members":$etcd_members},"coredns":{"status":"$coredns_health","replicas":$coredns_pods},"cni":{"type":"$cni_type","status":"$cni_health","pods":$cni_pods}}
EOF
}

# Probe: NGINX Ingress Status
probe_ingress() {
    local ingress_health="unknown"
    local ingress_pods=0
    local ingress_class=""
    
    # Check for ingress-nginx controller
    ingress_pods=$(kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller --no-headers 2>/dev/null | grep -c Running || \
                   kubectl get pods -A -l app.kubernetes.io/name=ingress-nginx --no-headers 2>/dev/null | grep -c Running || echo 0)
    
    if [[ "$ingress_pods" -gt 0 ]]; then
        ingress_health="healthy"
    else
        ingress_health="not_found"
    fi
    
    # Get ingress class
    ingress_class=$(kubectl get ingressclass -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "none")
    
    # Count ingress resources
    local ingress_count
    ingress_count=$(kubectl get ingress -A --no-headers 2>/dev/null | wc -l | tr -d ' ' || echo 0)
    
    cat <<EOF
{"probe":"ingress","status":"$ingress_health","controller_pods":$ingress_pods,"ingress_class":"$ingress_class","ingress_resources":$ingress_count,"configured_ports":{"http":$INGRESS_HTTP_PORT,"https":$INGRESS_HTTPS_PORT}}
EOF
}

# Probe: Monitoring Stack (Prometheus/Grafana)
probe_monitoring() {
    local prometheus_health="unknown"
    local prometheus_pods=0
    local grafana_health="unknown"
    local grafana_pods=0
    
    # Check Prometheus
    prometheus_pods=$(kubectl get pods -A -l app.kubernetes.io/name=prometheus --no-headers 2>/dev/null | grep -c Running || \
                      kubectl get pods -A -l app=prometheus --no-headers 2>/dev/null | grep -c Running || echo 0)
    
    if [[ "$prometheus_pods" -gt 0 ]]; then
        prometheus_health="healthy"
    else
        prometheus_health="not_found"
    fi
    
    # Check Grafana
    grafana_pods=$(kubectl get pods -A -l app.kubernetes.io/name=grafana --no-headers 2>/dev/null | grep -c Running || \
                   kubectl get pods -A -l app=grafana --no-headers 2>/dev/null | grep -c Running || echo 0)
    
    if [[ "$grafana_pods" -gt 0 ]]; then
        grafana_health="healthy"
    else
        grafana_health="not_found"
    fi
    
    # Determine overall status
    local overall_status="healthy"
    if [[ "$prometheus_health" == "not_found" && "$grafana_health" == "not_found" ]]; then
        overall_status="not_deployed"
    elif [[ "$prometheus_health" != "healthy" || "$grafana_health" != "healthy" ]]; then
        overall_status="degraded"
    fi
    
    cat <<EOF
{"probe":"monitoring","status":"$overall_status","prometheus":{"status":"$prometheus_health","pods":$prometheus_pods,"port":$PROMETHEUS_PORT},"grafana":{"status":"$grafana_health","pods":$grafana_pods,"port":$GRAFANA_PORT}}
EOF
}

# Probe: Pod-to-ClusterIP Connectivity Validation
# Deploys ephemeral diagnostic pod to test network path from pod network to ClusterIP services
probe_connectivity() {
    local test_namespace="kube-system"
    local test_pod_name="connectivity-test-$(date +%s)"
    local timeout_seconds="${CONNECTIVITY_TIMEOUT:-10}"
    local overall_status="healthy"
    local tests_passed=0
    local tests_failed=0
    local test_results=()
    local cleanup_done=false
    
    # Cleanup function
    cleanup_test_pod() {
        if [[ "$cleanup_done" == "false" ]]; then
            kubectl delete pod "$test_pod_name" -n "$test_namespace" --grace-period=0 --force &>/dev/null || true
            cleanup_done=true
        fi
    }
    
    # Set trap for cleanup
    trap cleanup_test_pod EXIT
    
    # Services to test
    local services=(
        "kubernetes.default.svc:443"
        "kube-dns.kube-system.svc:53"
    )
    
    # Add optional application services if they exist
    if kubectl get svc prometheus-kube-prometheus-prometheus -n monitoring &>/dev/null 2>&1; then
        services+=("prometheus-kube-prometheus-prometheus.monitoring.svc:9090")
    fi
    
    # Create ephemeral diagnostic pod
    local pod_yaml='
apiVersion: v1
kind: Pod
metadata:
  name: '"$test_pod_name"'
  namespace: '"$test_namespace"'
  labels:
    app: connectivity-test
    purpose: diagnostic
spec:
  restartPolicy: Never
  terminationGracePeriodSeconds: 0
  containers:
  - name: nettest
    image: busybox:1.28
    command: ["sleep", "300"]
    resources:
      requests:
        memory: "16Mi"
        cpu: "10m"
      limits:
        memory: "32Mi"
        cpu: "50m"
'
    
    # Deploy test pod
    if ! echo "$pod_yaml" | kubectl apply -f - &>/dev/null 2>&1; then
        cat <<EOF
{"probe":"connectivity","status":"error","error":"Failed to create diagnostic pod","tests":[]}
EOF
        return
    fi
    
    # Wait for pod to be ready (max 30 seconds)
    local wait_count=0
    while [[ $wait_count -lt 30 ]]; do
        local pod_phase
        pod_phase=$(kubectl get pod "$test_pod_name" -n "$test_namespace" -o jsonpath='{.status.phase}' 2>/dev/null || echo "")
        if [[ "$pod_phase" == "Running" ]]; then
            break
        fi
        sleep 1
        ((wait_count++))
    done
    
    if [[ $wait_count -ge 30 ]]; then
        cleanup_test_pod
        cat <<EOF
{"probe":"connectivity","status":"error","error":"Diagnostic pod failed to start within 30s","tests":[]}
EOF
        return
    fi
    
    # Test connectivity to each service
    for service in "${services[@]}"; do
        local svc_host="${service%%:*}"
        local svc_port="${service##*:}"
        local test_start test_end latency_ms test_status error_msg=""
        
        test_start=$(date +%s%3N 2>/dev/null || echo "0")
        
        # Use nc (netcat) to test TCP connectivity
        if kubectl exec "$test_pod_name" -n "$test_namespace" -- \
            sh -c "nc -z -w $timeout_seconds $svc_host $svc_port" &>/dev/null 2>&1; then
            test_status="pass"
            ((tests_passed++))
        else
            # Try wget for HTTP-based services
            if [[ "$svc_port" == "443" || "$svc_port" == "9090" || "$svc_port" == "3000" ]]; then
                local proto="http"
                [[ "$svc_port" == "443" ]] && proto="https"
                if kubectl exec "$test_pod_name" -n "$test_namespace" -- \
                    wget -q -O /dev/null --timeout="$timeout_seconds" --no-check-certificate \
                    "${proto}://${svc_host}:${svc_port}/healthz" &>/dev/null 2>&1; then
                    test_status="pass"
                    ((tests_passed++))
                else
                    test_status="fail"
                    ((tests_failed++))
                    error_msg="Connection timeout or refused"
                fi
            else
                test_status="fail"
                ((tests_failed++))
                error_msg="Connection timeout or refused"
            fi
        fi
        
        test_end=$(date +%s%3N 2>/dev/null || echo "0")
        if [[ "$test_start" != "0" && "$test_end" != "0" ]]; then
            latency_ms=$((test_end - test_start))
        else
            latency_ms=0
        fi
        
        # Build test result JSON
        if [[ -n "$error_msg" ]]; then
            test_results+=("{\"service\":\"$svc_host\",\"port\":$svc_port,\"status\":\"$test_status\",\"latency_ms\":$latency_ms,\"error\":\"$error_msg\"}")
        else
            test_results+=("{\"service\":\"$svc_host\",\"port\":$svc_port,\"status\":\"$test_status\",\"latency_ms\":$latency_ms}")
        fi
    done
    
    # DNS resolution test
    local dns_test_start dns_test_end dns_latency dns_status dns_result
    dns_test_start=$(date +%s%3N 2>/dev/null || echo "0")
    
    if kubectl exec "$test_pod_name" -n "$test_namespace" -- \
        nslookup kubernetes.default &>/dev/null 2>&1; then
        dns_status="pass"
        ((tests_passed++))
    else
        dns_status="fail"
        ((tests_failed++))
    fi
    
    dns_test_end=$(date +%s%3N 2>/dev/null || echo "0")
    if [[ "$dns_test_start" != "0" && "$dns_test_end" != "0" ]]; then
        dns_latency=$((dns_test_end - dns_test_start))
    else
        dns_latency=0
    fi
    
    test_results+=("{\"service\":\"dns-resolution\",\"port\":53,\"status\":\"$dns_status\",\"latency_ms\":$dns_latency,\"target\":\"kubernetes.default\"}")
    
    # Cleanup
    cleanup_test_pod
    
    # Determine overall status
    if [[ $tests_failed -gt 0 ]]; then
        if [[ $tests_passed -eq 0 ]]; then
            overall_status="critical"
        else
            overall_status="degraded"
        fi
    fi
    
    # Build tests array
    local tests_json
    tests_json=$(printf '%s,' "${test_results[@]}")
    tests_json="[${tests_json%,}]"
    
    cat <<EOF
{"probe":"connectivity","status":"$overall_status","tests_passed":$tests_passed,"tests_failed":$tests_failed,"total_tests":$((tests_passed + tests_failed)),"timeout_seconds":$timeout_seconds,"tests":$tests_json}
EOF
}

# Main execution - run all probes
run_all_probes() {
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Collect all probe results
    local api_result nodes_result resources_result pods_result services_result deps_result ingress_result monitoring_result connectivity_result
    
    api_result=$(probe_api_server)
    nodes_result=$(probe_nodes)
    resources_result=$(probe_resources)
    pods_result=$(probe_critical_pods)
    services_result=$(probe_services)
    deps_result=$(probe_dependencies)
    ingress_result=$(probe_ingress)
    monitoring_result=$(probe_monitoring)
    connectivity_result=$(probe_connectivity)
    
    # Build final JSON report
    cat <<EOF
{
  "stx_health_report": {
    "timestamp": "$timestamp",
    "cluster_info": {
      "kubernetes_version": "$(kubectl version --short 2>/dev/null | grep Server | awk '{print $3}' || echo 'unknown')",
      "platform": "StarlingX/Hivelocity"
    },
    "thresholds": {
      "cpu_warning": $CPU_WARNING,
      "cpu_critical": $CPU_CRITICAL,
      "memory_warning": $MEMORY_WARNING,
      "memory_critical": $MEMORY_CRITICAL,
      "node_not_ready_critical": $NODE_NOT_READY_CRITICAL,
      "pod_pending_warning": $POD_PENDING_WARNING,
      "pod_failed_critical": $POD_FAILED_CRITICAL
    },
    "probes": [
      $api_result,
      $nodes_result,
      $resources_result,
      $pods_result,
      $services_result,
      $deps_result,
      $ingress_result,
      $monitoring_result,
      $connectivity_result
    ],
    "summary": {
      "total_probes": 9,
      "healthy": $(echo "$api_result $nodes_result $resources_result $pods_result $services_result $deps_result $ingress_result $monitoring_result $connectivity_result" | grep -o '"status":"healthy"' | wc -l | tr -d ' '),
      "warning": $(echo "$api_result $nodes_result $resources_result $pods_result $services_result $deps_result $ingress_result $monitoring_result $connectivity_result" | grep -o '"status":"warning"' | wc -l | tr -d ' '),
      "critical": $(echo "$api_result $nodes_result $resources_result $pods_result $services_result $deps_result $ingress_result $monitoring_result $connectivity_result" | grep -o '"status":"critical"' | wc -l | tr -d ' '),
      "degraded": $(echo "$api_result $nodes_result $resources_result $pods_result $services_result $deps_result $ingress_result $monitoring_result $connectivity_result" | grep -o '"status":"degraded"' | wc -l | tr -d ' ')
    }
  }
}
EOF
}

# Run single probe
run_single_probe() {
    local probe="$1"
    case "$probe" in
        api_server)
            probe_api_server
            ;;
        nodes)
            probe_nodes
            ;;
        resources)
            probe_resources
            ;;
        critical_pods)
            probe_critical_pods
            ;;
        services)
            probe_services
            ;;
        dependencies)
            probe_dependencies
            ;;
        ingress)
            probe_ingress
            ;;
        monitoring)
            probe_monitoring
            ;;
        connectivity)
            probe_connectivity
            ;;
        *)
            echo "{\"error\":\"Unknown probe: $probe\",\"available_probes\":[\"api_server\",\"nodes\",\"resources\",\"critical_pods\",\"services\",\"dependencies\",\"ingress\",\"monitoring\",\"connectivity\",\"all\"]}"
            exit 1
            ;;
    esac
}

# Main
main() {
    check_kubectl
    check_jq
    load_thresholds
    
    if [[ "$PROBE_NAME" == "all" ]]; then
        run_all_probes | jq .
    else
        run_single_probe "$PROBE_NAME" | jq .
    fi
}

# Execute
main "$@"
