# Dashboard Consolidation Plan: 92 → 5 Files

**Current State**: 92 WSJF dashboard files  
**Target State**: 5 essential files  
**Reduction**: 87 files (95% reduction)  
**Timeline**: T1 (30 minutes)

## Files to KEEP (5 files)

### 1. Current Production Dashboard
- **File**: `WSJF-LIVE-v3-ENHANCED.html` (most recent, enhanced features)
- **Purpose**: Primary production dashboard
- **Action**: Rename to `WSJF-LIVE.html` (canonical name)

### 2. Backup Dashboard  
- **File**: `WSJF-LIVE-V3.html` (stable V3 version)
- **Purpose**: Fallback if enhanced version has issues
- **Action**: Keep as `WSJF-LIVE-V3-BACKUP.html`

### 3. Legacy Reference
- **File**: `WSJF-LIVE-V2.html` (V2 reference)
- **Purpose**: Capability reference for missing V3 features
- **Action**: Keep as `WSJF-LIVE-V2-REFERENCE.html`

### 4. Today's Snapshot
- **File**: `WSJF-LIVE-20260308-154250.html` (today's timestamped version)
- **Purpose**: Point-in-time snapshot for legal record
- **Action**: Keep as `WSJF-LIVE-SNAPSHOT-20260308.html`

### 5. Interactive Version
- **File**: `WSJF-LIVE-V4-INTERACTIVE.html` (if exists, or create symlink)
- **Purpose**: Interactive features for dynamic updates
- **Action**: Verify exists or create from best interactive version

## Files to ARCHIVE (87 files)

### Archive Strategy
1. **Create archive directory**: `00-DASHBOARD/archived-dashboards-20260308/`
2. **Move old files**: All WSJF files except the 5 keepers
3. **Compress archive**: `tar -czf wsjf-dashboards-archive-20260308.tar.gz archived-dashboards-20260308/`
4. **Verify capability preservation**: Test that all unique functions are preserved in kept files

### Archive Categories
- **Dated snapshots**: `WSJF-LIVE-20260305-*`, `WSJF-LIVE-20260306-*`, etc.
- **Version iterations**: `WSJF-LIVE-V1-*`, `WSJF-LIVE-V2-BACKUP-*`, etc.
- **Experimental versions**: `WSJF-LIVE-EXPERIMENTAL-*`, `WSJF-LIVE-TEST-*`
- **Duplicate backups**: Multiple copies of same version

## Capability Preservation Check

### Critical Functions to Verify
- **runVibeThinker**: Ensure preserved in kept files
- **toggleTribunal**: Verify functionality exists
- **WSJF calculation**: Core scoring algorithm
- **Navigation links**: Cross-dashboard navigation
- **Data persistence**: Local storage functionality

### Verification Process
1. **Function inventory**: `grep -r "function\|runVibeThinker\|toggleTribunal" kept-files/`
2. **Capability matrix**: Document which file has which features
3. **Test functionality**: Verify all critical functions work in kept files
4. **Recovery plan**: Document how to restore from archive if needed

## Implementation Commands

```bash
# 1. Create archive directory
mkdir -p ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/archived-dashboards-20260308/

# 2. Move files to archive (keep 5 essential)
cd ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/
find . -name "*WSJF*" -not -name "WSJF-LIVE-v3-ENHANCED.html" \
                     -not -name "WSJF-LIVE-V3.html" \
                     -not -name "WSJF-LIVE-V2.html" \
                     -not -name "WSJF-LIVE-20260308-154250.html" \
                     -not -name "WSJF-LIVE-V4-INTERACTIVE.html" \
                     -exec mv {} archived-dashboards-20260308/ \;

# 3. Rename kept files to canonical names
mv WSJF-LIVE-v3-ENHANCED.html WSJF-LIVE.html
mv WSJF-LIVE-V3.html WSJF-LIVE-V3-BACKUP.html
mv WSJF-LIVE-V2.html WSJF-LIVE-V2-REFERENCE.html
mv WSJF-LIVE-20260308-154250.html WSJF-LIVE-SNAPSHOT-20260308.html

# 4. Create compressed archive
tar -czf wsjf-dashboards-archive-20260308.tar.gz archived-dashboards-20260308/

# 5. Verify final count
ls -la *WSJF* | wc -l  # Should show 5 files
```

## Success Criteria
- [ ] File count reduced from 92 to 5
- [ ] All critical functions preserved
- [ ] Archive created with compression
- [ ] Navigation still works between kept files
- [ ] Space savings achieved (estimate: 80%+ reduction)
- [ ] Capability recovery documented

## Rollback Plan
If consolidation causes issues:
1. Extract archive: `tar -xzf wsjf-dashboards-archive-20260308.tar.gz`
2. Restore files: `mv archived-dashboards-20260308/* ./`
3. Verify functionality restored
4. Document what went wrong for future attempts
