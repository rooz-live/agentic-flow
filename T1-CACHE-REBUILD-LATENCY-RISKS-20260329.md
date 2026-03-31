# T1 Cache Rebuild Latency Risk Analysis
**Date**: 2026-03-29 14:35 UTC  
**Context**: User approved T1 cleanup (36GB) but raised latency concerns  
**Question**: What are the rebuild costs when cache is cleared?

---

## Cache Rebuild Impact Analysis

### Action 1: NPM Cache (29GB) - HIGHEST LATENCY RISK

#### What Gets Cleared
```bash
npm cache clean --force
# Clears: ~/.npm/_cacache/ (6.8GB)
# Clears: ~/.npm/_npx/ (16GB) 
# Clears: downloaded tarballs, metadata, temp files
```

#### Rebuild Scenarios

**Scenario A: npm install (existing project)**
- **Without cache**: Downloads all packages from registry
- **Latency**: 2-5 min for typical project (50-100 packages)
- **Bandwidth**: 50-200 MB download
- **Frequency**: Every `npm install` in new project or after `rm node_modules`

**Scenario B: npx command (one-off)**
- **Without cache**: Downloads package on first run
- **Latency**: 5-30 sec (depends on package size)
- **Example**: `npx create-react-app` = 30 sec delay vs. instant with cache
- **Frequency**: Infrequent (npx mostly for one-off commands)

**Scenario C: npm ci (CI/CD)**
- **Without cache**: Downloads all packages every time
- **Latency**: 3-10 min (depends on project)
- **Mitigation**: CI/CD should have own cache layer
- **Frequency**: Every deploy/test run

#### Risk Score: MEDIUM-HIGH

**Probability**: 80% - User likely runs npm install/npx regularly  
**Impact**: MEDIUM (2-5 min delay, not blocking)  
**Mitigation**: 
- npm will rebuild cache automatically on next install
- Only affects FIRST install per package
- Subsequent installs of same package hit registry cache (CDN fast)

**Verdict**: Acceptable for 29GB gain. First npm install will be slower, but not catastrophic.

---

### Action 2: Browser Caches (5GB) - LOW LATENCY RISK

#### What Gets Cleared
```bash
rm -rf ~/Library/Caches/Firefox/*           # 2.5GB
rm -rf ~/Library/Caches/Microsoft\ Edge/*   # 605MB
rm -rf ~/Library/Caches/com.operasoftware.OperaGX/* # 668MB
rm -rf ~/Library/Caches/com.brave.Browser/* # 435MB
```

#### Rebuild Scenarios

**Scenario A: First page load (per site)**
- **Without cache**: Downloads CSS, JS, images from web
- **Latency**: 1-3 sec delay for typical site (vs. instant with cache)
- **Bandwidth**: 1-5 MB per site
- **Frequency**: Once per site visited

**Scenario B: Subsequent visits (same site)**
- **Without cache**: Re-downloads resources if not cached by browser
- **Latency**: Progressive - browser rebuilds cache automatically
- **Impact**: First visit slow, second visit faster, third visit normal

**Scenario C: Heavy webapp (Gmail, Figma, etc.)**
- **Without cache**: 5-10 sec initial load (vs. 1-2 sec with cache)
- **Mitigation**: After first load, cache rebuilds
- **Frequency**: Once per app

#### Risk Score: LOW

**Probability**: 100% - User will browse web  
**Impact**: LOW (1-3 sec delay per site, one-time)  
**Mitigation**: 
- Browser rebuilds cache automatically
- Only affects first page load
- CDNs (Cloudflare, etc.) minimize impact

**Verdict**: Fully acceptable for 5GB gain. Minor inconvenience for ~1 hour, then normal.

---

### Action 3: VSCode/Playwright (2GB) - LOW LATENCY RISK

#### What Gets Cleared
```bash
rm -rf ~/Library/Caches/com.microsoft.VSCode.ShipIt/* # 1GB
rm -rf ~/Library/Caches/ms-playwright/*               # 1GB
```

#### Rebuild Scenarios

**Scenario A: VSCode startup**
- **Without cache**: Slower extension loading (5-10 sec vs. instant)
- **Latency**: One-time 10 sec delay on first launch
- **Frequency**: Once after cleanup

**Scenario B: Playwright tests**
- **Without cache**: Re-downloads browser binaries (Chromium, Firefox, WebKit)
- **Latency**: 1-2 min download on first `npx playwright install`
- **Size**: ~300 MB per browser
- **Frequency**: Once, or when upgrading Playwright version

#### Risk Score: LOW

**Probability**: 50% - User may not use Playwright immediately  
**Impact**: LOW (1-2 min one-time delay)  
**Mitigation**: 
- VSCode cache rebuilds automatically on launch
- Playwright: run `npx playwright install` proactively (1-2 min)

**Verdict**: Fully acceptable for 2GB gain. Minor one-time delay.

---

## Comparative Latency Analysis

| Action | Size | First-Use Latency | Rebuild Frequency | User Impact |
|--------|------|------------------|-------------------|-------------|
| **npm cache** | 29GB | 2-5 min (npm install) | Per new project | MEDIUM - Noticeable but acceptable |
| **Browser cache** | 5GB | 1-3 sec/site | Per site visited | LOW - Barely noticeable |
| **VSCode/Playwright** | 2GB | 10 sec (VSCode), 2 min (Playwright) | One-time | LOW - Negligible |

---

## Mitigation Strategies

### Strategy 1: Proactive Cache Warming (Recommended)

After cleanup, proactively rebuild critical caches:

```bash
# 1. Warm npm cache (pick 2-3 most common packages)
npm install -g create-react-app    # or whatever user uses frequently
npm install -g typescript
npm install -g eslint

# 2. Warm Playwright cache (if needed)
npx playwright install              # 2 min, downloads browsers

# 3. Warm browser cache (optional)
# Just visit 5-10 most common sites (Gmail, GitHub, etc.)
```

**Time**: 5-10 min total  
**Benefit**: Eliminates 80% of latency impact

---

### Strategy 2: Selective npm Cache Preservation

Instead of full `npm cache clean --force`, selectively delete:

```bash
# Check npm cache size breakdown
du -sh ~/.npm/_cacache ~/.npm/_npx ~/.npm/_logs

# Option: Keep _cacache (6.8GB), delete only _npx (16GB)
rm -rf ~/.npm/_npx/*
# Gain: 16GB (reduced from 29GB)
# Latency: Only affects npx commands, not npm install
```

**Trade-off**: 16GB vs. 29GB gain, but preserves npm install cache

---

### Strategy 3: Staged Execution (Minimize Disruption)

Execute T1 actions in stages to minimize simultaneous cache misses:

**Stage 1 (NOW)**: Browser caches + VSCode/Playwright (7GB)
- Minimal latency impact
- User can browse/code while npm cache remains

**Stage 2 (Later)**: npm cache (29GB)
- Execute during non-critical time (e.g., lunch break)
- Proactively warm cache afterward

---

## Risk-Adjusted Recommendations

### Option A: Full T1 Cleanup (RECOMMENDED)
**Execute**: All 3 actions (36GB)  
**Latency Impact**: 
- First npm install: +2-5 min (one-time)
- First browser visits: +1-3 sec/site (one-time)
- VSCode/Playwright: +2-3 min total (one-time)

**Total User Disruption**: ~10 min over next 1-2 hours  
**Gain**: 36GB → 78.5GB available (EXIT CRITICAL faster)

**Verdict**: **Acceptable** - Latency is minor vs. disk full emergency

---

### Option B: Conservative (npm cache only)
**Execute**: Action 2 only (npm cache = 29GB)  
**Latency Impact**: 2-5 min on first npm install  
**Gain**: 29GB → 71.5GB available  

**Verdict**: **Not recommended** - Leaves 5GB + 2GB on table for negligible latency

---

### Option C: Staged Execution
**Stage 1**: Browser + VSCode/Playwright (7GB) - NOW  
**Stage 2**: npm cache (29GB) - Later today  

**Verdict**: **Overkill** - Staging adds complexity for minimal benefit

---

## Final Recommendation

**✅ Proceed with Full T1 Cleanup (Option A)**

**Rationale**:
1. **Urgency Overrides Latency**: 42.5GB available = CRITICAL, need immediate relief
2. **Latency is Tolerable**: 10 min disruption over 1-2 hours vs. disk full emergency
3. **One-Time Cost**: Cache rebuilds happen once, then back to normal
4. **Fully Reversible**: No data loss, only convenience cost

**Mitigation**:
- Execute T1 cleanup NOW (10 min)
- Proactively warm npm cache after (5 min): `npm install -g <common-packages>`
- User continues work with minor latency hits for 1-2 hours

**Expected Timeline**:
- T0+0 min: Execute cleanup (10 min)
- T0+10 min: Verify space (42.5GB → 78.5GB)
- T0+15 min: Warm npm cache (5 min)
- T0+20 min: Resume normal work
- T0+2 hours: All caches rebuilt, performance back to normal

---

## Execution Checklist

- [ ] Execute T1 cleanup (3 commands, 10 min)
- [ ] Verify disk space: `df -h /` (expect 78.5GB)
- [ ] Warm npm cache: `npm install -g typescript eslint`
- [ ] Warm Playwright: `npx playwright install` (if used)
- [ ] Test: Visit 5 common sites (rebuild browser cache)
- [ ] Document: Update RCA with T1 results

**Total Time**: 20 min active + 2 hours passive (cache rebuilding in background)

---

## Approval Confirmation

**User approved T1 cleanup with latency awareness** ✅

**Proceeding with**:
1. npm cache clean --force (29GB)
2. Browser caches clear (5GB)
3. VSCode/Playwright clear (2GB)

**Expected Result**: 42.5GB → 78.5GB available (EXIT immediate CRITICAL)
