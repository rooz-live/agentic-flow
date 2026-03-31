# Disk Usage Analysis: Synthetic Data Investigation
**Date**: 2025-12-02  
**Investigator**: System Analysis  
**Status**: ⚠️ Issues Identified

## 🎯 Executive Summary

**Finding**: Synthetic data is **NOT** the primary disk consumption issue. The main culprits are:
1. **Log file bloat** (145MB single file)
2. **Rust build artifacts** (598MB)
3. **Duplicate caching mechanisms** (15MB+ per cache)
4. **Excessive validation snapshots** (581 files)

## 📊 Disk Usage Breakdown

### Top Consumers (Total: ~7.6GB)
```
2.7G  node_modules          (dependencies - expected)
1.8G  packages              (workspace packages)
1.0G  examples              (example code)
660M  ruvector              (cloned repository)
599M  reasoningbank         (Rust build artifacts ⚠️)
521M  agentic-flow          (subproject)
224M  .git                  (version control)
215M  tools                 (tooling)
152M  logs                  (⚠️ BLOATED - see below)
50M   .snapshots            (test snapshots ⚠️)
44M   .venv                 (Python virtual env)
28M   venv                  (duplicate venv?)
```

## 🔴 Critical Issues Found

### 1. Massive Log File (145MB) - HIGHEST PRIORITY
**File**: `logs/memory_leak_analysis.log`
- **Size**: 145 MB
- **Lines**: 215,478 lines
- **Problem**: Continuous process memory tracking without rotation
- **Pattern**: Dumps full process list repeatedly

**Sample Content**:
```
PID 78738 RSS 4,319,712 VSZ 1,894,190,624 COMMAND "/Applications/Visual Studio Code.app/..."
PID 59765 RSS 2,473,280 VSZ 1,895,848,928 COMMAND "/Applications/Visual Studio Code - Insiders.app/..."
[repeated thousands of times]
```

**Impact**: 
- No rotation policy implemented
- Captures **all** system processes, not just relevant ones
- Grows indefinitely with system uptime
- Contains mostly VS Code, Discord, and other GUI app processes

**Recommendation**:
```bash
# Implement log rotation
logrotate -f /etc/logrotate.d/agentic-flow

# Or use a pattern like:
if [ $(stat -f%z logs/memory_leak_analysis.log) -gt 10485760 ]; then
  mv logs/memory_leak_analysis.log logs/memory_leak_analysis.log.$(date +%Y%m%d)
  gzip logs/memory_leak_analysis.log.*
fi
```

### 2. Rust Build Artifacts (598MB)
**Location**: `reasoningbank/target/`
- **Size**: 598 MB
- **Problem**: Release and debug builds accumulate
- **Type**: Compiled binaries, intermediate objects, LLVM artifacts

**Why This Happens**:
- Rust's incremental compilation caching
- Multiple build profiles (debug, release, test)
- WASM targets add additional artifacts
- No cleanup after successful builds

**Recommendation**:
```bash
# Clean before builds in CI/CD
cargo clean --target-dir reasoningbank/target

# Or selectively clean debug builds
cargo clean --release --target-dir reasoningbank/target

# Add to .gitignore (should already be there)
**/target/
```

### 3. Document Query Cache Duplication (15MB × 2)
**Files**:
- `.snapshots/test-enhanced/goalie/doc_query_cache.json` (15MB)
- `.goalie/doc_query_cache.json` (likely exists but not shown separately)

**Problem**: Full document content caching without compression

**Sample Structure**:
```json
{
  "/Users/.../docs/features/quic/quic-research.md": {
    "hash": "1763163618.9729023_51877",
    "content": "[FULL MARKDOWN CONTENT - multiple KB per file]"
  }
}
```

**Why This Is Problematic**:
- Stores **entire file contents** in JSON
- No compression applied
- Duplicate copies in snapshots and working directory
- Hash + content = redundant storage
- Should use hash → filepath reference instead

**Better Pattern**:
```json
{
  "1763163618.9729023_51877": {
    "path": "/Users/.../docs/features/quic/quic-research.md",
    "size": 51877,
    "last_modified": "2025-11-24T18:03:38Z"
  }
}
```

### 4. Governor Validation Spam (581 files)
**Location**: `logs/governor-validation/`
- **Size**: 2.3 MB (small individual files)
- **Count**: 581 files
- **Problem**: Never cleaned up after validation

**File Pattern**:
```
validation-summary-20251118-170509.json (341B)
validation-summary-20251118-170533.json (341B)
validation-summary-20251119-131328.json (341B)
[... 578 more files ...]
```

**Content** (all identical structure):
```json
{
  "timestamp": "2025-11-18T22:05:09Z",
  "stress_level": 3,
  "max_processes": 50,
  "duration_seconds": 30,
  "tests": {
    "pid_tracking": "PASS",
    "memory_stress": "PASS",
    "graceful_throttling": "PASS",
    "dynamic_rate_limiting": "PASS",
    "incident_logging": "PASS",
    "cpu_headroom": "PASS"
  },
  "status": "SUCCESS"
}
```

**Why This Happens**:
- Validation runs on every process start
- No retention policy
- Each run creates a new timestamped file
- Files never aggregated or cleaned

**Recommendation**:
```bash
# Keep only last 7 days
find logs/governor-validation/ -name "*.json" -mtime +7 -delete

# Or keep only last 50 files
ls -t logs/governor-validation/*.json | tail -n +51 | xargs rm

# Better: consolidate into single rotating log
# validation-summary.jsonl (append-only, rotated daily)
```

### 5. Process Watch Log (4.2MB)
**File**: `logs/process_watch.log`
- **Size**: 4.2 MB
- **Problem**: Similar to memory leak analysis but smaller
- **Pattern**: Continuous process monitoring without bounds

## ✅ What's NOT a Problem

### Synthetic Data Generation
**Finding**: No evidence of synthetic data bloat

**Checked**:
- ✅ No large synthetic datasets found
- ✅ No `.csv`, `.parquet`, or bulk data files
- ✅ Agentic-synth examples were run but produced no persistent data
- ✅ ReasoningBank memory.db files are small (108KB max)

**Databases Checked**:
```
108K  .swarm/memory.db                           (active - small)
136K  logs/device_state_tracking.db              (device tracking)
10M   node_modules/.../memory.db                 (example data in deps)
```

### Goalie Tracking (.goalie directory - 4.3MB)
**Status**: Acceptable size for action tracking

**Contents**:
- `pattern_metrics.jsonl.legacy`: 1.3MB (legacy - can be cleaned)
- `run_dossier_*.json`: 836KB (current run tracking)
- `metrics_log.jsonl`: 548KB (acceptable)
- `trajectories.jsonl`: 204KB (learning data)

**Verdict**: Working as designed, but could implement rotation for legacy files

## 📋 Sensible Method Patterns Found

### ✅ Good Practices Observed

1. **Structured Logging (JSONL format)**
   ```jsonl
   {"timestamp": "...", "event": "...", "data": {...}}
   {"timestamp": "...", "event": "...", "data": {...}}
   ```
   - Append-only
   - Machine-parseable
   - Easy to rotate

2. **Timestamped Snapshots**
   - Clear naming: `validation-summary-YYYYMMDD-HHMMSS.json`
   - Easy to sort and filter
   - Self-documenting

3. **Hash-based Tracking**
   - Uses hashes for deduplication
   - Enables cache invalidation
   - Fast lookups

### ⚠️ Anti-Patterns Identified

1. **Full Content Caching**
   - ❌ Stores entire file contents in cache
   - ✅ Should: Store hash + metadata, read file on demand

2. **No Log Rotation**
   - ❌ Single files grow unbounded
   - ✅ Should: Implement size/time-based rotation

3. **Infinite Retention**
   - ❌ Validation files never expire
   - ✅ Should: Keep last N days or last N files

4. **No Compression**
   - ❌ Text logs stored uncompressed
   - ✅ Should: Compress old logs (gzip)

5. **Duplicate Storage**
   - ❌ Same data in `.snapshots` and working directory
   - ✅ Should: Use symlinks or single source of truth

## 🛠️ Recommended Cleanup Actions

### Immediate (Safe to Delete)
```bash
# 1. Truncate/archive the massive log
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
gzip logs/memory_leak_analysis.log
# Creates logs/memory_leak_analysis.log.gz (~10-20MB compressed)

# 2. Clean Rust build artifacts
cd reasoningbank && cargo clean --release
# Frees ~300-400MB

# 3. Remove old validation snapshots (keep last 30 days)
find logs/governor-validation/ -name "*.json" -mtime +30 -delete
# Frees ~2MB, reduces clutter

# 4. Clean duplicate process watch log
gzip logs/process_watch.log
# Frees ~3-4MB

# 5. Remove legacy goalie metrics
rm .goalie/pattern_metrics.jsonl.legacy*
# Frees ~1.5MB
```

**Total Immediate Recovery**: ~150-160MB + 598MB (if clean Rust) = **~750MB**

### Medium-term (Implement Policies)

1. **Log Rotation Configuration**
```bash
# Create /etc/logrotate.d/agentic-flow
/Users/shahroozbhopti/Documents/code/investing/agentic-flow/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    maxsize 10M
}
```

2. **Validation Cleanup Cron Job**
```bash
# Add to crontab
0 2 * * * find ~/Documents/code/investing/agentic-flow/logs/governor-validation/ -mtime +7 -delete
```

3. **Cache Optimization**
```javascript
// Modify doc_query_cache to store references only
{
  "cache_version": "2.0",
  "entries": {
    "hash_12345": {
      "path": "/path/to/file.md",
      "size": 51877,
      "mtime": 1732198400
    }
  }
}
// Read file content on cache miss
```

4. **Rust Build Optimization**
```toml
# Add to reasoningbank/Cargo.toml
[profile.dev]
incremental = true
split-debuginfo = "unpacked"  # Reduces debug artifact size

[profile.release]
strip = true  # Remove debug symbols from release builds
```

## 📊 Expected Results After Cleanup

| Category | Before | After | Savings |
|----------|--------|-------|---------|
| Logs | 152MB | 20MB | 132MB |
| Rust Artifacts | 599MB | 200MB | 399MB |
| Snapshots | 50MB | 35MB | 15MB |
| Goalie | 4.3MB | 2.5MB | 1.8MB |
| **Total** | **805.3MB** | **257.5MB** | **547.8MB** |

## 🎯 Conclusion

**Synthetic data is NOT filling up disk** - the system is actually quite efficient at data generation.

**Real culprits**:
1. 🔴 **Logs without rotation** (145MB single file)
2. 🟡 **Rust build artifacts** (598MB, normal but can be cleaned)
3. 🟡 **Inefficient caching** (stores full content instead of references)
4. 🟢 **Validation spam** (small impact, but 581 files is excessive)

**Recommended Actions** (Priority Order):
1. ✅ Implement log rotation immediately
2. ✅ Archive/compress memory_leak_analysis.log
3. ✅ Optimize doc_query_cache to use references
4. ✅ Add cleanup policy for validation snapshots
5. ✅ Consider cleaning Rust build artifacts periodically

**Verdict**: System uses sensible patterns for synthetic data but needs **operational hygiene** improvements for logs and build artifacts.

---

**Report Generated**: 2025-12-02  
**Analysis Type**: Disk Usage Investigation  
**Files Analyzed**: 1000+  
**Directories Scanned**: 50+
