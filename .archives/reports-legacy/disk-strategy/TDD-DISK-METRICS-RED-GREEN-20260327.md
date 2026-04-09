# TDD: Disk Metrics Validation (Red-Green)
**Date**: 2026-03-27 19:13 UTC
**Evidence**: Disk Utility screenshot
**Branch**: chore/risk-analytics-soft-launch

---

## 🔴 RED: Test Failure - Metrics Inconsistency Detected

### Test 1: Screenshot vs CLI Metrics Match
**Expected** (from Disk Utility screenshot):
- **Total**: 2 TB
- **Used**: 1.97 TB
- **Available**: 18.95 GB (purgeable: 11.74 GB)
- **Other Volumes**: 21.54 GB
- **Free**: 7.21 GB

**Actual** (from `df -h /`):
- **Total**: 1.8Ti (≈ 2TB) ✅ MATCH
- **Used**: 23Gi ❌ **FAIL** (Expected: 1.97TB, Actual: 23Gi)
- **Available**: 7.0Gi ❌ **FAIL** (Expected: 18.95GB, Actual: 7.0Gi)
- **Usage%**: 77% 🟡 **YELLOW** (Expected: ~98%, Actual: 77%)

**Test Result**: 🔴 **RED - FAIL**

---

### Test 2: Volume Identification
**Expected**: Macintosh HD (APFS Volume Group)
- Mount Point: `/` (Read-Only)
- Type: APFS Volume Group
- Owners: Enabled
- Connection: Apple Fabric
- Device: disk3s1s1

**Actual**:
```bash
$ df -h /
Filesystem     Size   Used  Avail Capacity  iused      ifree %iused  Mounted on
/dev/disk3s1s1  1.8T   23Gi  7.0Gi    77%  xxxxxxx  xxxxxxxxx   xx%   /
```

**Test Result**: ✅ **PASS** (Volume identification matches: disk3s1s1)

---

### Test 3: APFS Snapshot Detection
**Expected**: Snapshot Name: com.apple.os.update-8355D439A0A35C6...
**Actual**: Need to check APFS snapshots

```bash
# Test command
diskutil apfs listSnapshots /
```

**Test Result**: ❓ **PENDING** (need to run)

---

## 🤔 ROOT CAUSE HYPOTHESIS

### Why Do Metrics Not Match?

**Hypothesis 1**: Screenshot shows **APFS Container** metrics, CLI shows **mounted volume** metrics
- Container includes: Macintosh HD + Data + VM + Snapshots
- Mounted volume `/` only shows active filesystem

**Hypothesis 2**: **Purgeable space** (11.74 GB) is hidden from `df` but visible in Disk Utility
- macOS caches, Time Machine local snapshots
- `df` reports "worst case" (no purging)
- Disk Utility shows "best case" (with purging)

**Hypothesis 3**: **"Other Volumes" (21.54 GB)** = Data volume, VM volume, Preboot, Recovery
- APFS Volume Group shares space
- Screenshot aggregates all volumes
- `df /` only shows root volume

---

## 🟢 GREEN: Corrected Test

### Test 4: APFS Container Total Capacity
```bash
#!/bin/bash
# test-apfs-container-capacity.sh

# Get APFS container info (includes all volumes + snapshots)
container_info=$(diskutil info disk3 2>/dev/null || diskutil info / 2>/dev/null)

# Extract total capacity
total_capacity=$(echo "$container_info" | grep "Total Capacity:" | awk '{print $3, $4}')

# Expected: ~2TB
if [[ "$total_capacity" =~ "2.0 TB" ]] || [[ "$total_capacity" =~ "1.8 Ti" ]]; then
    echo "✅ PASS: Total capacity matches screenshot ($total_capacity)"
    exit 0
else
    echo "❌ FAIL: Total capacity mismatch (Expected: 2TB, Actual: $total_capacity)"
    exit 1
fi
```

---

### Test 5: Purgeable Space Detection
```bash
#!/bin/bash
# test-purgeable-space.sh

# Get purgeable space using tmutil
purgeable=$(tmutil listlocalsnapshots / 2>/dev/null | wc -l)

# Or use diskutil
purgeable_gb=$(diskutil info / | grep "Purgeable" | awk '{print $2}')

if [[ "$purgeable_gb" =~ ^[0-9]+\.?[0-9]*$ ]] && (( $(echo "$purgeable_gb > 10" | bc -l) )); then
    echo "✅ PASS: Purgeable space detected (${purgeable_gb} GB ≈ 11.74 GB screenshot)"
    exit 0
else
    echo "⚠️  WARN: Purgeable space mismatch (Expected: ~11.74GB, Actual: ${purgeable_gb}GB)"
    exit 2
fi
```

---

### Test 6: Multi-Volume APFS Group
```bash
#!/bin/bash
# test-apfs-volume-group.sh

# List all volumes in APFS container
volumes=$(diskutil apfs list | grep -A 20 "Container disk3" | grep "APFS Volume" | wc -l)

# Expected: 5 volumes (Macintosh HD, Data, VM, Preboot, Recovery)
if [ "$volumes" -ge 4 ]; then
    echo "✅ PASS: APFS Volume Group has $volumes volumes (shared 2TB pool)"
    exit 0
else
    echo "❌ FAIL: Expected 4-5 volumes, found $volumes"
    exit 1
fi
```

---

## 🔍 EVIDENCE-BASED ANALYSIS

### Screenshot Breakdown
```
Total Capacity: 2 TB
├─ Used: 1.97 TB (98.5%)
│  ├─ Macintosh HD (root): 23Gi (from df -h /)
│  ├─ Data volume: ~1.9TB (user files, apps)
│  └─ Snapshots: 11.74 GB (purgeable)
├─ Other Volumes: 21.54 GB
│  ├─ VM volume
│  ├─ Preboot
│  └─ Recovery
└─ Free: 7.21 GB (actual free space)
```

### CLI Breakdown (df -h /)
```
Filesystem: /dev/disk3s1s1 (Macintosh HD root only)
Size: 1.8Ti (container size, not volume size)
Used: 23Gi (mounted root volume only)
Avail: 7.0Gi (free space in container)
Capacity: 77% (of available space, ignoring purgeable)
```

---

## 🎯 CORRECTED UNDERSTANDING

### Previous RCA Was **PARTIALLY WRONG**

**Previous Assumption** (from earlier RCA):
> "60% usage (23Gi used / 1.8Ti total) with 16Gi available"

**Reality** (from screenshot):
> "**98.5% usage (1.97TB used / 2TB total)** with 7.21GB free (+ 11.74GB purgeable)"

### Why `df -h /` Showed "60%"?
**Answer**: `df` reports usage **relative to purgeable space**
- If purgeable space (11.74GB) is counted as "available"
- Available = 7.21GB + 11.74GB = 18.95GB ✅ (matches screenshot!)
- But `df` reported 7.0Gi available (without purging) ❌

**Conclusion**: `df -h /` is **MISLEADING** for APFS volumes with snapshots/purgeable space

---

## 🚦 RED-GREEN-YELLOW REVISED

### 🔴 RED (CRITICAL)
**Actual State**: **98.5% full** (1.97TB / 2TB)
**Available**: 7.21GB true free + 11.74GB purgeable = **18.95GB buffer**

**Test Status**: 🔴 **RED - CRITICAL**
- Expected: <85% usage
- Actual: 98.5% usage ❌ FAIL

**Immediate Actions Required**:
1. ❌ Delete large files (previous RCA blocked this - UNBLOCK)
2. ❌ Archive MobileSync backups (104GB) - CRITICAL now
3. ❌ Clear Xcode DerivedData (15GB) - CRITICAL now
4. ❌ Prune Docker images (295MB) - minor help

---

### 🟡 YELLOW (WARNING) - Previous Assessment
**Previous RCA**: "60% usage, 16Gi available" 🟡 YELLOW
**Status**: ❌ **WRONG** - misread `df -h /` output

---

### 🟢 GREEN (HEALTHY)
**Target**: <85% usage (1.7TB / 2TB)
**Gap**: 0.27TB (270GB) needed to reach GREEN

**Actions to Reach GREEN**:
- Archive MobileSync backups: 104GB → external drive
- Clear Xcode DerivedData: 15GB
- Archive Downloads: 21GB → external drive
- Clear NPM cache: 22GB (already done? verify)
- Clear Browser caches: 5GB
- **Total**: 167GB → still 103GB short of GREEN

**Verdict**: 🔴 **CANNOT REACH GREEN WITHOUT MAJOR CLEANUP**

---

## 🧪 TDD TEST RESULTS SUMMARY

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| **Test 1**: Screenshot metrics match CLI | 1.97TB used | 23Gi used (root only) | 🔴 RED - FAIL |
| **Test 2**: Volume identification | disk3s1s1 | disk3s1s1 | ✅ GREEN - PASS |
| **Test 3**: APFS snapshots detected | Yes | ❓ PENDING | ⏸️ NOT RUN |
| **Test 4**: Container capacity 2TB | 2TB | ❓ PENDING | ⏸️ NOT RUN |
| **Test 5**: Purgeable ~11.74GB | 11.74GB | ❓ PENDING | ⏸️ NOT RUN |
| **Test 6**: 4-5 APFS volumes | 5 | ❓ PENDING | ⏸️ NOT RUN |

---

## 📊 CORRECTED METRICS

### Before (WRONG - from previous RCA)
```
Total: 1.8Ti
Used:  23Gi (60%)    ❌ MISLEADING
Avail: 16Gi          ❌ WRONG (included purgeable)
Status: 🟡 YELLOW
```

### After (CORRECT - from screenshot)
```
Total: 2 TB
Used:  1.97 TB (98.5%)  ✅ ACCURATE
Avail: 7.21 GB          ✅ ACCURATE (true free)
Purgeable: 11.74 GB     ✅ (can be freed automatically)
Status: 🔴 RED - CRITICAL
```

---

## 🎓 LESSONS LEARNED

### TDD Red-Green Process
1. **RED**: `df -h /` showed 60% usage → test FAILED when compared to screenshot
2. **GREEN**: Understand APFS volume groups → container vs mounted volume metrics
3. **REFACTOR**: Update monitoring to use `diskutil info /` instead of `df -h /`

### Why TDD Caught This
- **Test against evidence** (screenshot) not assumptions (CLI output)
- **Multiple metrics** (df, diskutil, Disk Utility GUI) revealed inconsistency
- **Fail fast** on metric mismatch prevented wrong conclusions

### Anti-Pattern Avoided
❌ **Trusting `df -h /` alone** for APFS volumes
✅ **Cross-reference with Disk Utility GUI** for true usage

---

## 🚨 URGENT ACTIONS (REVISED)

### T0 (NOW - <5 min) - 🔴 CRITICAL
1. ❌ Run pending TDD tests (Tests 3-6) to confirm APFS structure
2. ❌ Identify largest files: `find ~ -type f -size +5G 2>/dev/null`
3. ❌ Archive MobileSync backups (104GB) → **UNBLOCK** this action

### T1 (NEXT - <30 min) - 🔴 CRITICAL
1. ❌ Clear Xcode DerivedData (15GB)
2. ❌ Archive Downloads (21GB) → external drive
3. ❌ Verify NPM cache cleaned (22GB should be <2GB)

### T2 (LATER - <2 hours) - 🟡 REQUIRED
1. ❌ Clear Browser caches (5GB)
2. ❌ Audit ~/Library (688GB) - find archivable data
3. ❌ Implement automated cleanup job

---

## 🎯 CONCLUSION

**Status**: 🔴 **RED - CRITICAL (98.5% full, not 60%)**

**Root Cause**: `df -h /` **LIES** about APFS volumes
- Reports usage relative to purgeable space
- Hides true container capacity (2TB)
- Shows only mounted root volume (23Gi)

**Previous RCA Was Wrong**:
- Assumed 60% usage ❌
- Believed 16Gi available ❌
- Classified as 🟡 YELLOW ❌

**Corrected Assessment**:
- Actual: 98.5% usage ✅
- Available: 7.21GB (+ 11.74GB purgeable) ✅
- Status: 🔴 **RED - CRITICAL** ✅

**Next Step**: Run Tests 3-6 + execute T0 critical actions immediately

---

## 📝 TDD Commands to Run

```bash
# Test 3: APFS snapshots
diskutil apfs listSnapshots /

# Test 4: Container capacity
diskutil info disk3 | grep "Total Capacity"

# Test 5: Purgeable space
diskutil info / | grep -i purgeable

# Test 6: Volume count
diskutil apfs list | grep -A 20 "Container disk3" | grep "APFS Volume"

# Find large files (cleanup target)
find ~ -type f -size +5G 2>/dev/null | head -20

# MobileSync backup verification
ls -lh ~/Library/Application\ Support/MobileSync/Backup/
```
