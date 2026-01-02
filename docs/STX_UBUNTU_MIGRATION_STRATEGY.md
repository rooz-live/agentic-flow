# StarlingX Ubuntu Migration Strategy

## Current State vs Future State

### Current (STX 11 on AlmaLinux 8)
- **Server**: 23.92.79.2
- **OS**: AlmaLinux 8
- **Limitation**: No containerd 1.7.x support
- **End of Life**: 2029

### Target (STX 12 on Ubuntu 22.04)
- **Server**: Same hardware
- **OS**: Ubuntu 22.04 LTS
- **Benefits**: containerd 2.2.1, modern kernel, better ecosystem
- **Availability**: Q4 2025 (planned)

## Migration Timeline

### Phase 1: Deploy on Current STX 11 (Immediate - This Week)
- Deploy all platforms on AlmaLinux 8
- Establish baseline metrics
- Document limitations

### Phase 2: Parallel Ubuntu Environment (Week 2-4)
- Set up Ubuntu 22.04 test cluster
- Migrate non-critical services
- Compare performance

### Phase 3: STX 12 Migration (Q4 2025)
- Migrate to Ubuntu-based STX 12
- Full production cutover
- Achieve containerd 2.2.1 benefits

## Immediate Implementation on STX 11

Since STX 12 isn't ready yet, we'll deploy now with migration path:

```yaml
Current Stack (STX 11):
  - Base: AlmaLinux 8
  - Container Runtime: Docker (containerd 1.6.x)
  - Kubernetes: 1.26
  - Monitoring: LOKI
  - Apps: HostBill, WordPress, Flarum, Affiliate, Trading

Migration Path:
  - Docker → containerd 2.2.1 (with STX 12)
  - AlmaLinux 8 → Ubuntu 22.04
  - Manual migration → Automated with StarlingX tools
```

## Updated Implementation Script
```bash
#!/bin/bash
# deploy_stx_current.sh - Deploy on current STX 11

# Acknowledge AlmaLinux limitation
echo "Deploying on STX 11 (AlmaLinux 8) with migration path to Ubuntu 22.04"

# Document current state
echo "Current OS: $(cat /etc/os-release | grep PRETTY_NAME)"
echo "Container runtime: $(docker info | grep 'Server Version')"
echo "Kubernetes: $(kubectl version --short)"

# Deploy with migration markers
kubectl label nodes migration-target=ubuntu-22.04
kubectl annotate deployments migration-date=$(date +%Y-%m-%d)
```

## Migration Readiness Checklist

### For Current Deployment:
- [ ] Use container images compatible with both OS
- [ ] Store configuration in Git (not local files)
- [ ] Use persistent storage that survives migration
- [ ] Document all custom configurations

### For Future Migration:
- [ ] Test Ubuntu 22.04 in parallel
- [ ] Validate STX 12 compatibility
- [ ] Plan cutover strategy
- [ ] Prepare rollback plan

## Performance Comparison

### AlmaLinux 8 (Current)
```
Kernel: 4.18.0
Containerd: 1.6.x (via Docker)
Kubernetes: 1.26
Limitations: No modern container features
```

### Ubuntu 22.04 (Target)
```
Kernel: 5.15+ (or 6.x with HWE)
Containerd: 2.2.1 (native)
Kubernetes: 1.29+
Benefits: Modern features, better performance
```

## Recommendation

Deploy now on STX 11 with:
1. **Migration-aware architecture**
2. **Container-based applications** (portable)
3. **External configuration** (GitOps)
4. **Performance baseline** for comparison

Then migrate to Ubuntu 22.04 when STX 12 is available.

This approach provides:
- ✅ Immediate value delivery
- ✅ Migration path prepared
- ✅ Risk mitigation
- ✅ No waiting for STX 12
