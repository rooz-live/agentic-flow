# OS Evaluation for Greenfield Containerd 1.7.x Implementation

## Executive Summary

With containerd 1.7.x unavailable on AlmaLinux 8/EL8, this analysis evaluates OS alternatives for a greenfield implementation, ranked by ROAM (Risk, Opportunity, Alternatives, Mitigation) risks and WSJF (Weighted Shortest Job First) priority scoring.

## OS Options Analysis

### 1. **Ubuntu 22.04 LTS** (Jammy Jellyfish) ⭐⭐⭐⭐⭐

**Containerd Support:**
- ✅ containerd 1.7.x available in default repos
- ✅ Latest version: 1.7.18+ (as of Dec 2025)
- ✅ Regular security updates

**ROAM Analysis:**
- **Risk**: Low - Widely adopted, excellent community support
- **Opportunity**: High - Modern tooling, large ecosystem
- **Alternatives**: Debian, other Ubuntu LTS versions
- **Mitigation**: Proven track record, extensive documentation

**WSJF Score: 21** (High Priority)
- Cost of Delay: High (modern runtime needs)
- Job Duration: 2-3 weeks migration
- User Value: Very High

**Integration Status:**
- ✅ StarlingX supports Ubuntu (though less common than CentOS)
- ✅ OpenStack has excellent Ubuntu support
- ✅ HostBill/WordPress/Oro all support Ubuntu

### 2. **Debian 12** (Bookworm) ⭐⭐⭐⭐

**Containerd Support:**
- ✅ containerd 1.7.x in backports
- ✅ Version: 1.7.18+
- ✅ Stable foundation

**ROAM Analysis:**
- **Risk**: Low - Debian's stability legendary
- **Opportunity**: Medium - More conservative than Ubuntu
- **Alternatives**: Ubuntu LTS
- **Mitigation**: Rock solid package management

**WSJF Score: 18** (High Priority)
- Cost of Delay: High
- Job Duration: 3-4 weeks
- User Value: High

**Integration Status:**
- ⚠️ StarlingX: Limited support (primarily CentOS-based)
- ✅ OpenStack: Good support
- ✅ HostBill/WordPress/Oro: Full support

### 3. **Rocky Linux 9** ⭐⭐⭐⭐

**Containerd Support:**
- ✅ containerd 1.7.x available
- ✅ Version: 1.7.13+
- ✅ RHEL 9 compatibility

**ROAM Analysis:**
- **Risk**: Medium - Newer distro, smaller community
- **Opportunity**: High - RHEL 9 features without cost
- **Alternatives**: AlmaLinux 9, RHEL 9
- **Mitigation**: Binary compatible with RHEL

**WSJF Score: 19** (High Priority)
- Cost of Delay: High
- Job Duration: 2-3 weeks
- User Value: High

**Integration Status:**
- ⚠️ StarlingX: Not yet supported (STX 11 is EL8-based)
- ✅ OpenStack: Good support
- ✅ All other stacks: Full support

### 4. **AlmaLinux 9** ⭐⭐⭐

**Containerd Support:**
- ✅ containerd 1.7.x available
- ✅ Version: 1.7.13+
- ✅ Stable RHEL clone

**ROAM Analysis:**
- **Risk**: Medium - Smaller than Rocky
- **Opportunity**: Medium - IBM backing
- **Alternatives**: Rocky Linux 9
- **Mitigation**: Enterprise-grade

**WSJF Score: 17** (Medium-High Priority)
- Cost of Delay: High
- Job Duration: 3-4 weeks
- User Value: High

**Integration Status:**
- ❌ StarlingX: No support
- ✅ OpenStack: Good support
- ✅ All others: Full support

### 5. **RHEL 9** ⭐⭐⭐

**Containerd Support:**
- ✅ containerd 1.7.x in AppStream
- ✅ Enterprise support
- ✅ Certified stacks

**ROAM Analysis:**
- **Risk**: Low - Enterprise grade
- **Opportunity**: Medium - Premium support costs
- **Alternatives**: Rocky/Alma 9
- **Mitigation**: Full vendor support

**WSJF Score: 15** (Medium Priority)
- Cost of Delay: Medium (cost barrier)
- Job Duration: 2-3 weeks
- User Value: High

**Integration Status:**
- ❌ StarlingX: No support
- ✅ OpenStack: Excellent support
- ✅ All others: Full support

## StarlingX Compatibility Matrix

| OS | STX 11 Support | STX 12 Roadmap | Migration Path |
|----|---------------|----------------|---------------|
| Ubuntu 22.04 | ⚠️ Limited | ✅ Planned | Greenfield |
| Debian 12 | ❌ None | ❌ Unlikely | Full rewrite |
| Rocky 9 | ❌ None | ✅ Possible | Future proof |
| Alma 9 | ❌ None | ⚠️ Maybe | Future proof |
| RHEL 9 | ❌ None | ✅ Possible | Premium option |

## Integration Considerations

### MCP/StarlingX/OpenStack/HostBill Stack

1. **StarlingX Challenge:**
   - STX 11 is CentOS 8/EL8 based
   - STX 12 roadmap includes Ubuntu support
   - Timeline: STX 12 expected late 2025/early 2026

2. **OpenStack:**
   - Excellent Ubuntu 22.04 support
   - Rocky 9 gaining traction
   - RHEL 9 is reference platform

3. **HostBill/WordPress/Oro:**
   - All support Ubuntu 22.04 natively
   - LAMP stack optimized for Ubuntu
   - Migration paths well documented

## Recommended Migration Strategy

### Phase 1: Immediate (Q1 2025)
**Target: Ubuntu 22.04 LTS**
1. Deploy greenfield Ubuntu 22.04 for new services
2. Containerd 1.7.x immediately available
3. Parallel operation with existing STX 11

### Phase 2: Transitional (Q2-Q3 2025)
1. Migrate non-critical services to Ubuntu
2. Test OpenStack on Ubuntu 22.04
3. Prepare for STX 12 evaluation

### Phase 3: Full Migration (Q4 2025)
1. Evaluate STX 12 Ubuntu support
2. Complete migration if STX 12 ready
3. Maintain STX 11 for legacy workloads

## Risk Mitigation Plan

### Technical Risks
1. **Containerd 1.7.x availability** ✅ Solved
2. **StarlingX compatibility** → Phase approach
3. **OpenStack integration** → Proven on Ubuntu
4. **HostBill migration** → Supported path

### Operational Risks
1. **Team expertise** → Ubuntu widely known
2. **Support contracts** → Canonical available
3. **Documentation** → Extensive Ubuntu resources

### Financial Risks
1. **Migration cost** → Offset by modern efficiency
2. **Downtime** → Parallel deployment minimizes
3. **Training** → Lower than specialized OS

## Decision Matrix

| Factor | Ubuntu 22.04 | Rocky 9 | RHEL 9 |
|--------|--------------|---------|--------|
| Containerd 1.7.x | ✅ Native | ✅ Native | ✅ Native |
| STX Future | ✅ STX 12 | ⚠️ Maybe | ✅ Likely |
| Cost | Low | Low | High |
| Support | Excellent | Good | Premium |
| Ecosystem | Largest | Growing | Enterprise |
| Migration | Easiest | Medium | Medium |

## Final Recommendation

**Primary: Ubuntu 22.04 LTS**
- Best balance of modern features and stability
- Containerd 1.7.x immediately available
- Strong future STX support roadmap
- Lowest total cost of ownership

**Secondary: Rocky Linux 9**
- RHEL compatibility without cost
- Good for OpenStack workloads
- Wait for STX 12 support confirmation

**Avoid:**
- Staying on AlmaLinux 8 (no containerd 1.7.x)
- Debian 12 (poor STX prospects)
- RHEL 9 (cost prohibitive)

## Implementation Timeline

```
Jan 2025: Order Ubuntu 22.04 infrastructure
Feb 2025: Deploy greenfield environment
Mar 2025: Migrate non-critical services
Apr 2025: Test OpenStack on Ubuntu
May 2025: Evaluate STX 12 beta
Jun 2025: Plan full migration
```

## Success Metrics

1. Containerd 1.7.x running in production
2. No service degradation during migration
3. Improved security posture
4. Reduced operational complexity
5. Cost savings from modern tooling
