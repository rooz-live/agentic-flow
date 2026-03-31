# Canary Releases & Compliance as Code Implementation

## Canary Releases Pattern

### Overview
Canary releases allow gradual rollout of new features to a subset of users, reducing risk and enabling quick rollback if issues arise.

### Implementation Architecture

```yaml
Canary Infrastructure:
  Production:
    - 90% traffic: Stable version (Ubuntu 20.04/AlmaLinux 8)
    - 10% traffic: Canary version (Ubuntu 22.04)
  
  Load Balancer:
    - Nginx/HAProxy with traffic splitting
    - Health checks for both versions
    - Automatic failover
  
  Monitoring:
    - Prometheus metrics comparison
    - Grafana dashboards
    - Alert thresholds
```

### Ubuntu 22.04 Canary Setup

#### 1. Traffic Splitting Configuration
```nginx
# /etc/nginx/sites-available/canary-split
upstream backend {
    server stable-backend.example.com weight=9;
    server canary-backend.example.com weight=1;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Canary header for debugging
        add_header X-Backend-Server $upstream_addr;
    }
}
```

#### 2. Health Check Script
```bash
#!/bin/bash
# canary-health-check.sh

STABLE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://stable-backend/health)
CANARY_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://canary-backend/health)

if [ "$CANARY_HEALTH" != "200" ]; then
    echo "Canary unhealthy, routing all traffic to stable"
    # Update nginx config to 100% stable
    sed -i 's/weight=1;/weight=0;/' /etc/nginx/sites-available/canary-split
    nginx -s reload
elif [ "$STABLE_HEALTH" != "200" ]; then
    echo "Stable unhealthy, promoting canary"
    # Update nginx config to 100% canary
    sed -i 's/weight=9;/weight=10;/' /etc/nginx/sites-available/canary-split
    sed -i 's/weight=1;/weight=0;/' /etc/nginx/sites-available/canary-split
    nginx -s reload
fi
```

#### 3. Gradual Rollout Script
```bash
#!/bin/bash
# canary-rollout.sh

TRAFFIC_PERCENTAGES=(5 10 20 50 100)
STABLE_WEIGHT=95
CANARY_WEIGHT=5

for percentage in "${TRAFFIC_PERCENTAGES[@]}"; do
    echo "Rolling out to $percentage% canary traffic"
    
    # Calculate weights
    CANARY_WEIGHT=$percentage
    STABLE_WEIGHT=$((100 - $CANARY_WEIGHT))
    
    # Update nginx config
    sed -i "s/weight=[0-9]*;/weight=$STABLE_WEIGHT;/" /etc/nginx/sites-available/canary-split
    sed -i "s/server canary-backend.*weight=[0-9]*;/server canary-backend.example.com weight=$CANARY_WEIGHT;/" /etc/nginx/sites-available/canary-split
    
    nginx -s reload
    
    # Wait and monitor
    echo "Waiting 10 minutes for metrics..."
    sleep 600
    
    # Check metrics
    ERROR_RATE=$(curl -s http://prometheus/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m]) | jq -r '.data.result[0].value[1]')
    
    if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
        echo "Error rate too high ($ERROR_RATE), rolling back"
        # Rollback to stable
        sed -i 's/weight=[0-9]*;/weight=10;/' /etc/nginx/sites-available/canary-split
        sed -i 's/server canary-backend.*weight=[0-9]*;/server canary-backend.example.com weight=0;/' /etc/nginx/sites-available/canary-split
        nginx -s reload
        exit 1
    fi
done

echo "Canary rollout complete!"
```

## Compliance as Code Pattern

### Overview
Compliance as Code defines compliance requirements in code, enabling automated validation and continuous monitoring.

### Implementation Framework

#### 1. Compliance Policy as Code
```yaml
# compliance/policies/ubuntu-22.04-policy.yaml
apiVersion: compliance.openshift.io/v1alpha1
kind: ComplianceProfile
metadata:
  name: ubuntu-22.04-hardening
spec:
  title: Ubuntu 22.04 Security Hardening
  description: CIS Ubuntu 22.04 Benchmark compliance
  
  rules:
    - id: UBUNTU-22-001010
      title: Ensure filesystem permissions are configured
      severity: high
      rationale: Proper permissions prevent unauthorized access
      check:
        script: |
          #!/bin/bash
          find / -type f -perm /o+w -ls 2>/dev/null | head -10
          if [ $? -eq 0 ]; then exit 1; fi
      remediation:
        script: |
          #!/bin/bash
          chmod o-w /path/to/file
    
    - id: UBUNTU-22-001020
      title: Ensure containerd is configured securely
      severity: critical
      rationale: Secure container runtime prevents container escapes
      check:
        script: |
          #!/bin/bash
          grep -E "^\s*disable-legacy-registry" /etc/containerd/config.toml
          grep -E "^\s*enable-cri-plugin" /etc/containerd/config.toml
      remediation:
        script: |
          #!/bin/bash
          sed -i 's/#disable-legacy-registry = true/disable-legacy-registry = true/' /etc/containerd/config.toml
          systemctl restart containerd
    
    - id: UBUNTU-22-001030
      title: Ensure auditd is configured
      severity: medium
      rationale: Audit trails provide accountability
      check:
        script: |
          #!/bin/bash
          systemctl is-active auditd
      remediation:
        script: |
          #!/bin/bash
          systemctl enable --now auditd
```

#### 2. Automated Compliance Scanner
```python
#!/usr/bin/env python3
# compliance-scanner.py

import yaml
import subprocess
import json
import sys
from pathlib import Path

class ComplianceScanner:
    def __init__(self, policy_file):
        with open(policy_file) as f:
            self.policy = yaml.safe_load(f)
    
    def run_check(self, rule):
        """Execute compliance check"""
        try:
            result = subprocess.run(
                rule['check']['script'],
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            return {
                'rule_id': rule['id'],
                'title': rule['title'],
                'severity': rule['severity'],
                'status': 'PASS' if result.returncode == 0 else 'FAIL',
                'output': result.stdout,
                'error': result.stderr
            }
        except subprocess.TimeoutExpired:
            return {
                'rule_id': rule['id'],
                'status': 'ERROR',
                'error': 'Check timed out'
            }
    
    def scan(self):
        """Run all compliance checks"""
        results = []
        for rule in self.policy['spec']['rules']:
            result = self.run_check(rule)
            results.append(result)
        return results
    
    def generate_report(self, results):
        """Generate compliance report"""
        report = {
            'scan_date': datetime.now().isoformat(),
            'policy': self.policy['metadata']['name'],
            'summary': {
                'total': len(results),
                'passed': len([r for r in results if r['status'] == 'PASS']),
                'failed': len([r for r in results if r['status'] == 'FAIL']),
                'errors': len([r for r in results if r['status'] == 'ERROR'])
            },
            'details': results
        }
        
        # Save report
        with open('compliance-report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        return report

if __name__ == '__main__':
    scanner = ComplianceScanner('compliance/policies/ubuntu-22.04-policy.yaml')
    results = scanner.scan()
    report = scanner.generate_report(results)
    
    print(f"Compliance Scan Results:")
    print(f"Total: {report['summary']['total']}")
    print(f"Passed: {report['summary']['passed']}")
    print(f"Failed: {report['summary']['failed']}")
    print(f"Errors: {report['summary']['errors']}")
    
    # Exit with error if any failures
    if report['summary']['failed'] > 0:
        sys.exit(1)
```

#### 3. Compliance as Code in CI/CD
```yaml
# .github/workflows/compliance-check.yml
name: Compliance Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: |
          pip install pyyaml
      
      - name: Run compliance scanner
        run: |
          python compliance-scanner.py
      
      - name: Upload compliance report
        uses: actions/upload-artifact@v3
        with:
          name: compliance-report
          path: compliance-report.json
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('compliance-report.json', 'utf8'));
            
            const comment = `## Compliance Report
            
            - ✅ Passed: ${report.summary.passed}
            - ❌ Failed: ${report.summary.failed}
            - ⚠️ Errors: ${report.summary.errors}
            
            ${report.summary.failed > 0 ? '⚠️ **Compliance issues found. Please review and fix.**' : '✅ **All compliance checks passed!**'}
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

#### 4. Real-time Compliance Monitoring
```bash
#!/bin/bash
# compliance-monitor.sh

# Configuration
COMPLIANCE_API="http://compliance-monitor:8080"
POLL_INTERVAL=300  # 5 minutes

while true; do
    # Run compliance checks
    ./compliance-scanner.py
    
    # Parse results
    FAILED=$(jq -r '.summary.failed' compliance-report.json)
    
    if [ "$FAILED" -gt 0 ]; then
        # Send alert
        curl -X POST "$COMPLIANCE_API/alerts" \
          -H "Content-Type: application/json" \
          -d "{
            \"severity\": \"warning\",
            \"message\": \"$FAILED compliance checks failed\",
            \"details\": $(cat compliance-report.json)
          }"
    fi
    
    # Update dashboard
    curl -X POST "$COMPLIANCE_API/metrics" \
      -H "Content-Type: application/json" \
      -d "$(cat compliance-report.json)"
    
    sleep $POLL_INTERVAL
done
```

## Integration with Ubuntu 22.04 Migration

### Phase 1: Canary Setup
```bash
# 1. Deploy canary infrastructure
./scripts/deploy-canary-infrastructure.sh

# 2. Configure traffic splitting
./scripts/setup-traffic-splitting.sh

# 3. Deploy monitoring
./scripts/deploy-monitoring.sh
```

### Phase 2: Compliance Validation
```bash
# 1. Apply compliance policies
kubectl apply -f compliance/policies/ubuntu-22.04-policy.yaml

# 2. Run initial scan
python compliance-scanner.py

# 3. Fix any failures
./scripts/remediate-compliance.sh
```

### Phase 3: Gradual Rollout
```bash
# 1. Start with 5% traffic
./canary-rollout.sh --percentage=5

# 2. Monitor for 24 hours
./scripts/monitor-canary.sh --duration=24h

# 3. Gradually increase if healthy
./canary-rollout.sh --auto-promote
```

## Best Practices

### Canary Releases
1. **Start small**: Begin with 1-5% traffic
2. **Monitor closely**: Watch error rates, latency, business metrics
3. **Automate rollback**: Immediate rollback on threshold breach
4. **Feature flags**: Use flags to control feature activation
5. **Data consistency**: Ensure database compatibility

### Compliance as Code
1. **Version control**: All policies in git
2. **Automated testing**: CI/CD integration
3. **Continuous monitoring**: Real-time compliance status
4. **Documentation**: Clear rationale for each rule
5. **Regular updates**: Keep policies current

## Tools and Technologies

### Canary Tools
- **Istio**: Advanced traffic management
- **Argo Rollouts**: Progressive delivery
- **Flagger**: Automated canary promotion
- **Linkerd**: Service mesh with traffic splitting

### Compliance Tools
- **OpenSCAP**: Security compliance scanning
- **Chef InSpec**: Infrastructure testing
- **Popeye**: Kubernetes cluster sanitizer
- **Polaris**: Kubernetes validation

## Success Metrics

### Canary Metrics
- Deployment success rate: >99%
- Rollback frequency: <1%
- Time to detect issues: <5 minutes
- User impact: <0.1%

### Compliance Metrics
- Compliance score: >95%
- Remediation time: <24 hours
- False positive rate: <5%
- Audit readiness: 100%

## Conclusion

Implementing Canary Releases and Compliance as Code provides:
- Risk mitigation through gradual rollouts
- Automated compliance validation
- Continuous monitoring and enforcement
- Audit-ready documentation
- Faster, safer deployments

These patterns are essential for the Ubuntu 22.04 migration, ensuring a smooth transition while maintaining security and compliance standards.
