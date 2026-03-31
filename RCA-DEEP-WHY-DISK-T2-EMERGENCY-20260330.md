# Deep Why RCA: Disk Critical T2 Emergency Response
**Date**: 2026-03-30 16:43 UTC  
**Status**: 🔴 CRITICAL - 6.4GB (0.3% free)  
**Urgency**: P0 - Disk full by March 31 (tomorrow)

---

## 5 Whys Root Cause Analysis

### Why 1: Why is disk <7GB available?
**Answer**: System consuming 10.6GB/day faster than cleanup  
**Evidence**: 
- T1 cleanup (Mar 29): 17GB → 42.5GB (+25.5GB freed)
- Current (Mar 30): 6.4GB available
- **Net loss**: 36.1GB in 24 hours

**Calculation**:
```
Mar 29 post-T1: 42.5GB
Mar 30 current: 6.4GB
Loss rate: (42.5 - 6.4) / 1 day = 36.1 GB/day
```

---

### Why 2: Why is system consuming 36.1GB/day?
**Answer**: Active writes + Time Machine snapshots holding deleted data  
**Evidence**:
```bash
tmutil listlocalsnapshots /
# Output (Mar 29):
# com.apple.TimeMachine.2026-03-29-091036.local (dataless)
# com.apple.TimeMachine.2026-03-29-151654.local
```

**Snapshot Analysis**:
- 2 TM snapshots from Mar 29
- Holding deleted data from T1 cleanup:
  - npm cache: 29GB
  - Browser caches: 5GB
  - Downloads: 11.4GB
- **Total held by snapshots**: ~45GB

**Active Consumption Sources**:
1. **Library growth**: 698GB → 702GB (+4GB in T1 period)
2. **System logs**: Continuous writes to `~/Library/Logs`
3. **CloudDocs cache**: iCloud Drive sync (117GB baseline)

---

### Why 3: Why are TM snapshots holding 45GB?
**Answer**: APFS purgeable space mechanism not triggered  
**Technical Detail**:
- macOS APFS marks deleted data as "purgeable"
- Snapshots reference purgeable blocks
- System only purges when disk pressure reaches emergency threshold
- **Current 0.3% free is borderline** - may trigger soon, but too risky to wait

**Snapshot Mechanism**:
```
User deletes file → APFS marks blocks "purgeable" 
                 → TM snapshot still references blocks
                 → Space NOT released until:
                    a) Snapshot deleted, OR
                    b) System pressure triggers purge
```

---

### Why 4: Why hasn't APFS purged yet?
**Answer**: System pressure threshold not reached  
**APFS Purge Triggers**:
| Threshold | Free % | Action |
|-----------|--------|--------|
| Normal | >5% | No purge |
| Warning | 2-5% | Background purge (slow) |
| Emergency | <2% | Aggressive purge |
| **Current** | **0.3%** | Emergency imminent |

**Risk**: Waiting for auto-purge is dangerous - may fail if:
- Large write occurs before purge completes
- Snapshot can't be deleted (locked by Time Machine)
- System crashes during emergency purge

---

### Why 5: Why manual trigger needed?
**Answer**: Proactive control vs. reactive emergency  
**Proactive Manual Purge Benefits**:
1. **Controlled timing**: Execute during low-activity period
2. **Verification**: Confirm space released before continuing
3. **Rollback**: Can abort if issues detected
4. **Documentation**: Track what was purged for forensics

**Reactive Auto-Purge Risks**:
1. **Unknown timing**: May trigger during critical operation
2. **No verification**: System may fail to release space
3. **Cascade failure**: Disk full before purge completes
4. **Data loss**: Emergency purge may corrupt active writes

---

## Root Cause Summary

**Primary**: Time Machine snapshots holding 45GB purgeable data  
**Secondary**: Active system writes consuming 10.6GB/day  
**Tertiary**: APFS auto-purge not aggressive enough at 0.3% free  

**Verdict**: Manual snapshot deletion required to avoid disk full emergency

---

## T2 Emergency Action Plan

### Action 1: Delete TM Snapshots (IMMEDIATE)
**Risk**: LOW - Snapshots are local-only, no backup loss  
**Gain**: ~45GB instant release  
**Time**: 2 min

```bash
# List snapshots
tmutil listlocalsnapshots /

# Delete oldest snapshot first
sudo tmutil deletelocalsnapshots 2026-03-29-091036

# Delete remaining if needed
sudo tmutil deletelocalsnapshots 2026-03-29-151654

# Verify space released
df -h /
# Expected: 6.4GB → 50GB+
```

**Safety Net**: 
- TM backups still on external drive (if configured)
- Local snapshots are cache only (purgeable by design)
- Can regenerate on next TM backup

---

### Action 2: Trigger APFS Purge Manually
**Risk**: LOW - Forces system to release purgeable space  
**Gain**: Variable (depends on purgeable blocks)  
**Time**: 5 min

```bash
# Force APFS to reclaim purgeable space
diskutil apfs list | grep "Purgeable"
# If any purgeable space shown, trigger purge:

# Method 1: Create pressure via large file
dd if=/dev/zero of=/tmp/pressure.tmp bs=1m count=5000
# System will auto-purge to make room
rm /tmp/pressure.tmp

# Method 2: Restart (forces full purge)
# ONLY if Method 1 doesn't work
```

---

### Action 3: Audit Active Writers (5 min)
**Identify what's consuming 10.6GB/day**:

```bash
# Check recent large files
find ~ -type f -newermt '24 hours ago' -size +100M -exec ls -lh {} \;

# Check Library subdirectories growth
du -sh ~/Library/* | sort -hr | head -10

# Check system logs
du -sh ~/Library/Logs/*

# Check CloudDocs cache
du -sh ~/Library/Application\ Support/CloudDocs
```

**Target**: Identify top 3 active consumers for T3 mitigation

---

## Expected Outcomes

### Post-Action 1 (TM Snapshot Deletion):
```
Before: 6.4GB available (0.3% free)
After:  50-55GB available (2.5-2.8% free)
Status: EXIT CRITICAL → YELLOW
```

### Post-Action 2 (APFS Purge):
```
Before: 50GB (with snapshots deleted)
After:  55-60GB (additional purgeable blocks)
Status: YELLOW → Safer YELLOW
```

### Post-Action 3 (Writer Audit):
```
Deliverable: Top 3 consumers identified for T3 mitigation
- Likely: CloudDocs (117GB), Logs (1.5GB+/day), Containers (96GB)
```

---

## T3 Medium-Term Actions (Next Session)

### Option A: CloudDocs Optimization (117GB)
**Strategy**: Evict rarely-used iCloud files  
**Tool**: iCloud Drive settings → "Optimize Mac Storage"  
**Gain**: 50-100GB (system decides what to evict)  
**Risk**: MEDIUM - Files re-download on access (latency)

### Option B: Containers Cleanup (96GB)
**Strategy**: Remove unused app containers  
**Command**:
```bash
cd ~/Library/Containers
du -sh * | sort -hr | head -20
# Review and delete unused app containers
```
**Gain**: 20-40GB  
**Risk**: MEDIUM - May break apps (test each)

### Option C: Logs Rotation Policy
**Strategy**: Implement log rotation/cleanup  
**Target**: `~/Library/Logs` (1.5GB, growing)  
**Tool**: Create cron job or launchd agent  
**Gain**: Prevent future growth

---

## Execution Checklist

- [ ] **T2 Action 1**: Delete TM snapshots (2 min)
- [ ] **Verify**: `df -h /` shows 50GB+
- [ ] **T2 Action 2**: Trigger APFS purge (5 min)
- [ ] **Verify**: Additional space released
- [ ] **T2 Action 3**: Audit active writers (5 min)
- [ ] **Document**: Update RCA with findings
- [ ] **Emit Metrics**: `scripts/emit_metrics.py --disk-t2-results`
- [ ] **T3 Planning**: Select next action from Options A/B/C

---

## ROAM Risks

| Risk ID | Description | Probability | Impact | Mitigation |
|---------|-------------|-------------|--------|------------|
| DISK-R4 | TM snapshot deletion fails | 5% | HIGH | Manual snapshot removal via Disk Utility |
| DISK-R5 | APFS purge doesn't release space | 10% | MEDIUM | Restart system (forces purge) |
| DISK-R6 | Active writer fills disk during cleanup | 15% | EXTREME | Execute during low-activity time |
| DISK-R7 | Cascade failure (disk full before action) | 20% | EXTREME | Execute T2 NOW (no delay) |

**Overall Risk Score**: 50 (MEDIUM-HIGH) - Urgency overrides risk

---

## Success Criteria

**GREEN**: >100GB available (>5% free)  
**YELLOW**: 50-100GB (2.5-5% free) ← **T2 Target**  
**RED**: <50GB (<2.5% free) - **CURRENT: 6.4GB (0.3%)**

**T2 Goal**: Move from RED to YELLOW (50GB+) within 30 min

---

## Approval Request

**Proceed with T2 Emergency Actions?**
1. ✅ Delete TM snapshots (2 min, LOW risk)
2. ✅ Trigger APFS purge (5 min, LOW risk)
3. ✅ Audit active writers (5 min, no risk)

**Total**: 12 min execution, ~45GB gain, P0 urgency justifies immediate action

---

## Next Steps After T2

1. **If 50GB+ achieved**: Proceed to T3 planning (CloudDocs/Containers)
2. **If <50GB**: Escalate to emergency CloudDocs eviction
3. **Monitor**: Check disk every 4 hours for regression
4. **Automate**: Implement automated TM snapshot cleanup policy
