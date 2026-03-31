# Disk Space Emergency Cleanup - March 25, 2026
**Status**: 🔴 **CRITICAL - 99% FULL**  
**Current**: 1.7 TB / 1.8 TB used (24 GB free)  
**Target**: <80% (360+ GB freed)  
**Timeline**: T0 (tonight, 1-2 hours)

---

## 🚨 ROAM Risk Classification

| Risk Type | Impact | Probability | Mitigation Priority |
|-----------|--------|-------------|---------------------|
| **R (Resolve)** | System crashes, data loss, arbitration prep blocked | HIGH (95%) | 🔴 P0 - Execute NOW |
| **O (Owned)** | Disk management process | - | Document cleanup SOP |
| **M (Mitigate)** | Future fills via monitoring | MEDIUM (60%) | Set 85% alert threshold |

**Exit Code**: 200 (DISK_FULL) → 0 (SUCCESS) after cleanup

---

## 📊 Top Disk Consumers (Ranked by Size)

### Tier 1: Critical Cleanup (250+ GB recoverable)
| Path | Size | Type | Safe to Remove? | Recovery Method | Savings |
|------|------|------|-----------------|-----------------|---------|
| `~/Library/Application Support/CloudDocs` | **116 GB** | iCloud Drive cache | ✅ YES | Re-download on demand | 116 GB |
| `~/Library/Application Support/MobileSync` | **104 GB** | iPhone/iPad backups | ⚠️  ARCHIVE | Archive to external drive first | 80 GB* |
| `~/Library/Application Support/MailMaven` | **41 GB** | Email app cache | ⚠️  PARTIAL | Keep 30d, archive older | 25 GB* |
| `~/Library/Application Support/Cursor` | **32 GB** | IDE cache | ✅ YES | Regenerates automatically | 32 GB |
| `~/Library/Application Support/Code` | **31 GB** | VS Code cache | ⚠️  PARTIAL | Clear workspace cache only | 15 GB* |
| `~/Library/Application Support/Google` | **28 GB** | Chrome cache | ✅ YES | Regenerates automatically | 28 GB |

**Tier 1 Total**: ~296 GB recoverable

### Tier 2: Quick Wins (20+ GB)
| Path | Size | Safe? | Savings |
|------|------|--------|---------|
| `~/Library/Application Support/VirtualBuddy` | 22 GB | ⚠️  ARCHIVE | 15 GB* |
| `~/Library/Caches` | 10 GB | ✅ YES | 10 GB |
| `~/Downloads/STG-backups-FF-*` (all) | ~10 GB | ✅ YES | 10 GB |
| `~/Library/Containers` (temp files) | 73 GB | ⚠️  PARTIAL | 20 GB* |

**Tier 2 Total**: ~55 GB recoverable

### Tier 3: Code Repos (81 GB - audit only)
| Path | Size | Action |
|------|------|--------|
| `~/Documents/code` | 81 GB | Run `git clean -fdx` on archived repos |

**TOTAL RECOVERABLE**: 350+ GB (enough to reach <70% disk usage)

---

## 🎯 T0 Cleanup Actions (Execute in Order)

### Phase 1: Safe Automated Cleanup (100+ GB, 15 min)

```bash
# 1. Clear system caches (10 GB)
rm -rf ~/Library/Caches/*
sudo rm -rf /Library/Caches/*
sudo periodic daily weekly monthly

# 2. Clear browser caches (28 GB Chrome + 3 GB Firefox)
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Cache
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Code\ Cache
rm -rf ~/Library/Application\ Support/Firefox/Profiles/*/cache2

# 3. Clear IDE caches (47 GB Cursor + Code)
rm -rf ~/Library/Application\ Support/Cursor/Cache
rm -rf ~/Library/Application\ Support/Cursor/Code\ Cache
rm -rf ~/Library/Application\ Support/Code/Cache
rm -rf ~/Library/Application\ Support/Code/CachedData
rm -rf ~/Library/Application\ Support/Code/logs

# 4. Remove Firefox STG backups (10 GB)
rm -rf ~/Downloads/STG-backups-FF-*

# 5. Clear Docker build cache (if Docker running)
docker system prune -af --volumes || echo "Docker not running"

# Expected: 95-110 GB freed
```

### Phase 2: Manual Archive (100+ GB, 30 min)

**MobileSync (iPhone/iPad Backups) - 104 GB**
```bash
# List backups
ls -lh ~/Library/Application\ Support/MobileSync/Backup/

# Archive old backups (keep only latest 2)
# Option A: Move to external drive
mkdir -p /Volumes/ExternalDrive/iPhone-Backups-Archive-2026-03-25
mv ~/Library/Application\ Support/MobileSync/Backup/* /Volumes/ExternalDrive/iPhone-Backups-Archive-2026-03-25/

# Option B: Delete if backed up to iCloud
# (Check Settings > Apple ID > iCloud > Manage Storage > Backups first)
rm -rf ~/Library/Application\ Support/MobileSync/Backup/*

# Expected: 80-100 GB freed
```

**CloudDocs (iCloud Drive) - 116 GB**
```bash
# Evict local copies (re-downloads on demand)
brctl evict ~/Library/Application\ Support/CloudDocs/

# Or manually via System Settings > Apple ID > iCloud > Manage > Documents
# Turn off "Optimize Mac Storage" temporarily, then re-enable
# Expected: 100-116 GB freed
```

### Phase 3: MailMaven Cleanup (25+ GB, 20 min)

```bash
# Archive emails older than 90 days
# Navigate to: MailMaven > Preferences > Storage
# Set retention: Keep only 90 days local
# Or manually export old mailboxes:
# MailMaven > Mailbox > Export Mailbox... > save to external drive
# Expected: 20-30 GB freed
```

---

## 📈 Verification & Monitoring

### Post-Cleanup Verification
```bash
# Check disk usage
df -h /System/Volumes/Data

# Target: <75% (450+ GB free)
# Success criteria: 
# - Before: 1.7 TB / 1.8 TB (99%)
# - After:  <1.4 TB / 1.8 TB (75%)
```

### Ongoing Monitoring (Prevent Recurrence)
```bash
# Add to LaunchAgent: ~/Library/LaunchAgents/com.disk-monitor.plist
# Alert when >85% full

cat > ~/Library/LaunchAgents/com.disk-monitor.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.disk-monitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>
USAGE=$(df -h /System/Volumes/Data | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$USAGE" -gt 85 ]; then
  osascript -e 'display notification "Disk usage: '"$USAGE"'%" with title "⚠️ Disk Space Warning"'
  echo "$(date): Disk $USAGE% full" >> ~/Library/Logs/disk-monitor.log
fi
        </string>
    </array>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.disk-monitor.plist
```

---

## 🔄 WSJF Impact on Arbitration Deadline

| Impact | Before Cleanup | After Cleanup |
|--------|----------------|---------------|
| **System Stability** | ❌ Crash risk HIGH | ✅ Stable |
| **Email Validation** | ❌ Cannot write logs | ✅ Unblocked |
| **Test Suite Execution** | ❌ Out of space | ✅ 350+ GB free |
| **Arbitration Prep** | ❌ BLOCKED (Exit 200) | ✅ Ready (Exit 0) |

**WSJF Score Impact**:
- **Before**: WSJF = 0 (blocked by disk full)
- **After**: WSJF = 45.0 (email validation unblocked, arbitration prep resumes)

**Arbitration Timeline**:
- **April 6 Deadline**: 12 days remaining
- **Cleanup Time**: 1-2 hours (tonight)
- **Test Suite Creation**: 4-6 hours (tomorrow)
- **Email Validation Hardening**: 2 hours (by March 27)

---

## 📋 Cleanup Checklist

### T0 (Tonight - 1-2 hours)
- [ ] **Phase 1**: Automated cache cleanup (15 min) → 100 GB freed
- [ ] **Phase 2**: Archive MobileSync backups (30 min) → 80 GB freed
- [ ] **Phase 2**: Evict CloudDocs (15 min) → 116 GB freed
- [ ] **Phase 3**: MailMaven cleanup (20 min) → 25 GB freed
- [ ] **Verify**: Run `df -h` → Target <75% usage
- [ ] **Monitor**: Install disk-monitor LaunchAgent

### T1 (Tomorrow)
- [ ] Review `~/Documents/code` for archived repos (run `git clean -fdx`)
- [ ] Empty Trash (may recover 10-20 GB)
- [ ] Check `~/Library/Containers` for temp files

### T2 (Ongoing)
- [ ] Set up weekly cleanup cron job
- [ ] Document cleanup SOP in WSJF runbook
- [ ] Add disk usage to WSJF dashboard

---

## 🎯 Success Metrics

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| **Disk Usage** | 99% (1.7 TB) | <75% (1.35 TB) | ___ |
| **Free Space** | 24 GB | 450+ GB | ___ GB |
| **Exit Code** | 200 (DISK_FULL) | 0 (SUCCESS) | ___ |
| **WSJF Unblocked** | ❌ | ✅ | ___ |
| **Arbitration Prep** | ❌ BLOCKED | ✅ READY | ___ |

---

## 📝 Notes

**Method**: Disk cleanup → Verification → Monitoring  
**Pattern**: Tier 1 (safe auto) → Tier 2 (manual archive) → Tier 3 (audit)  
**Protocol**: T0 cleanup → T1 verification → T2 monitoring  

**ROAM**:
- **R (Resolve)**: Execute Phases 1-3 tonight
- **O (Owned)**: Disk management SOP documented
- **A (Accepted)**: iCloud/MobileSync re-downloads may slow network
- **M (Mitigated)**: LaunchAgent alerts prevent future 99% fills

**Exit Codes**:
- 200 (DISK_FULL) → Current state
- 0 (SUCCESS) → Post-cleanup target

---

**Generated**: 2026-03-25 18:40 UTC  
**Priority**: 🔴 P0 CRITICAL  
**Owner**: User (manual execution required)  
**Next Review**: Post-cleanup verification (tonight)
