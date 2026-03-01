# Photos.app Export - Manual Fallback
**Issue**: AppleScript access denied (error -1723)  
**Root Cause**: Photos.app requires explicit permissions for AppleScript automation  
**Impact**: Semi-auto → manual fallback required for Trial #1

---

## ⚡ Quick Manual Export (15 min)

### Step 1: Open Photos.app
```bash
open -a Photos
```

### Step 2: Search for "mold" photos
1. Click search bar (⌘F)
2. Type: `mold` OR `HVAC` OR `water damage`
3. Select all relevant photos (⌘A)

### Step 3: Export with metadata
1. File → Export → Export Unmodified Original
2. Location: `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE/MOLD-PHOTOS/`
3. ✅ Check "Include: Location Information, Title, Keywords, EXIF"
4. Click "Export"

### Step 4: Convert HEIC → JPG (if needed)
```bash
cd ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE/MOLD-PHOTOS/

for f in *.HEIC; do
    sips -s format jpeg "$f" --out "${f%.HEIC}.jpg"
done
```

### Step 5: Verify EXIF timestamps
```bash
exiftool -DateTimeOriginal -CreateDate *.jpg | head -20
```

---

## 🔧 Fix AppleScript Permissions (Post-Trial)

### Enable Photos.app AppleScript Access
1. System Settings → Privacy & Security → Automation
2. Find Terminal (or your shell)
3. ✅ Enable "Photos"
4. Retry: `./scripts/export_mold_photos.sh`

---

## 📊 ROI Analysis: Semi-Auto vs Manual

| Method | Time | Complexity | Reliability | Status |
|--------|------|------------|-------------|--------|
| **Full-Auto** (AppleScript) | 1 min | HIGH | ❌ BLOCKED (permissions) | March 15+ |
| **Semi-Auto** (script) | 5 min | MEDIUM | ⚠️ PARTIAL (needs permissions) | TODAY |
| **Manual** (GUI export) | 15 min | LOW | ✅ WORKS | **USE NOW** |

**For Trial #1**: Use manual export (15 min). Fix permissions post-trial (March 11+).

---

## 🎯 Success Criteria

✅ Photos exported with EXIF metadata  
✅ HEIC → JPG conversion complete  
✅ Timestamps verified (June 2024 - February 2026 range)  
✅ Files saved to correct evidence folder  

**Next Step**: Generate timeline visual from photo timestamps
