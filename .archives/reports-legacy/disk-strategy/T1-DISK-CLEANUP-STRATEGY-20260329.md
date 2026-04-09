# T1 Disk Cleanup Strategy - Medium Risk Actions
**Date**: 2026-03-29 13:15 UTC  
**Current Status**: 42.5GB available (2.1% free) - CRITICAL  
**T0 Results**: 23.4GB freed (MobileSync 12GB + Downloads 11.4GB)  
**Target**: >100GB available (GREEN zone)

---

## T1 Quick Wins (~36GB, LOW RISK)

### Action 1: Clear Browser Caches (5GB)
**Risk**: LOW - All regenerable from web
```bash
# Firefox
rm -rf ~/Library/Caches/Firefox/*

# Chrome/Edge/Brave/Opera
rm -rf ~/Library/Caches/Microsoft\ Edge/*
rm -rf ~/Library/Caches/com.operasoftware.OperaGX/*
rm -rf ~/Library/Caches/com.brave.Browser/*
```
**Gain**: 5GB  
**Time**: 2 min

---

### Action 2: Clear NPM Cache (29GB)
**Risk**: LOW - Will re-download on next install
```bash
npm cache clean --force
```
**Gain**: 29GB  
**Time**: 1 min

---

### Action 3: Clear VSCode/Playwright (2GB)
**Risk**: LOW - Will re-download binaries
```bash
rm -rf ~/Library/Caches/com.microsoft.VSCode.ShipIt/*
rm -rf ~/Library/Caches/ms-playwright/*
```
**Gain**: 2GB  
**Time**: 1 min

---

**T1 Total**: 36GB freed → **78.5GB available (3.9% free)** - Still CRITICAL

---

## T2 Medium-Risk Actions (~80GB)

### Action 4: Clear CloudDocs Cache (117GB)
**Risk**: MEDIUM - iCloud will re-download on demand
**Strategy**: Evict non-recent files only
```bash
# Identify non-recent CloudDocs
find ~/Library/Application\ Support/CloudDocs -type f -atime +90

# OR trigger macOS purgeable space cleanup
# System will auto-purge when needed
```
**Gain**: 50-117GB (variable)  
**Time**: 30 min  
**Risk Mitigation**: macOS manages this automatically - let system purge

---

### Action 5: Archive Cursor Cache (43GB)
**Risk**: MEDIUM - Extensions/cache for Cursor editor
**Strategy**: Clear cache, keep settings
```bash
# Cursor cache (similar to VSCode)
rm -rf ~/Library/Application\ Support/Cursor/Cache/*
rm -rf ~/Library/Application\ Support/Cursor/CachedData/*
```
**Gain**: 15-20GB (keep settings)  
**Time**: 5 min

---

### Action 6: Archive VirtualBuddy VMs (22GB)
**Risk**: HIGH - VM images may be needed
**Strategy**: Move to external drive (Echo 13 SSD has 257GB free)
```bash
mv ~/Library/Application\ Support/VirtualBuddy /Volumes/Echo\ 13\ SSD/VirtualBuddy-Archive-20260329
ln -s /Volumes/Echo\ 13\ SSD/VirtualBuddy-Archive-20260329 ~/Library/Application\ Support/VirtualBuddy
```
**Gain**: 22GB  
**Time**: 10 min  
**Risk Mitigation**: Symlink maintains functionality

---

### Action 7: Audit MailMaven (42GB)
**Risk**: HIGH - Email data may be critical
**Strategy**: Check for attachments/cache only
```bash
du -sh ~/Library/Application\ Support/MailMaven/*
# Identify cache vs. data
```
**Gain**: TBD (likely 10-20GB from attachments)  
**Time**: 15 min

---

## T3 High-Risk Actions (Deferred)

### MobileSync: 92GB Remaining
**Status**: Already kept most recent backup (Mar 25)  
**Question**: Why still 92GB after 12GB deletion?
```bash
ls -lh ~/Library/Application\ Support/MobileSync/Backup/
# Expected: 1 device ~50GB, but showing 92GB?
```
**Action**: Investigate discrepancy before further cleanup

---

### Google Drive Cache: 28GB
**Risk**: MEDIUM - May contain unsync'd files  
**Strategy**: Verify cloud sync status first

---

## Execution Plan (T1 → T2)

### Phase 1: T1 Quick Wins (NOW, 10 min)
1. ✅ npm cache clean (29GB)
2. ✅ Browser caches (5GB)
3. ✅ VSCode/Playwright (2GB)
**Result**: 78.5GB available

---

### Phase 2: T2 Selective (Next 30 min)
4. ⏸️ Cursor cache (20GB) - User approval needed
5. ⏸️ VirtualBuddy → external (22GB) - User approval
6. ⏸️ MailMaven audit (10-20GB) - Needs investigation

**Result Target**: 120-140GB available (6-7% free) → EXIT CRITICAL

---

### Phase 3: T3 Deep Audit (Next session)
7. Documents deep dive (82GB)
8. MobileSync discrepancy resolution
9. CloudDocs purgeable optimization

---

## Risk Summary

| Action | Risk | Gain | Reversible? |
|--------|------|------|-------------|
| Browser caches | LOW | 5GB | ✅ Re-download |
| npm cache | LOW | 29GB | ✅ Re-install |
| VSCode/Playwright | LOW | 2GB | ✅ Re-download |
| Cursor cache | MEDIUM | 20GB | ✅ Re-download |
| VirtualBuddy → ext | MEDIUM | 22GB | ✅ Symlink restore |
| MailMaven | HIGH | 10-20GB | ❌ May lose data |
| MobileSync | HIGH | 0GB | ⚠️ Need investigation |

---

## Recommendations

**IMMEDIATE (T1)**:
- Execute Actions 1-3 (36GB, LOW risk)
- Gets to 78.5GB available

**NEXT (T2, with approval)**:
- Action 4: Cursor cache (user approval)
- Action 5: VirtualBuddy → external (user approval)
- Gets to 120GB+ available → EXIT CRITICAL

**DEFER (T3)**:
- MobileSync investigation (why 92GB after cleanup?)
- MailMaven audit (email data sensitivity)
- Documents deep dive (82GB)

---

## Approval Request

**Proceed with T1 Quick Wins (36GB)?**
- [x] npm cache clean --force (29GB)
- [x] Browser caches clear (5GB)
- [x] VSCode/Playwright (2GB)

**Total**: 36GB gain in 10 min, LOW risk, fully reversible

---

## Success Metrics

**GREEN**: >100GB available (>5% free)  
**YELLOW**: 50-100GB (2.5-5% free)  
**RED**: <50GB (<2.5% free) - CURRENT: 42.5GB

**T1 Target**: 78.5GB (YELLOW)  
**T2 Target**: 120GB (GREEN)  
**T3 Target**: 150GB+ (SAFE)
