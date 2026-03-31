# Discord Credentials - Quick Reference

**Your Application**: ID `1439047600132198550` ✅

---

## Credential Locations Map

### 1. APPLICATION_ID ✅ OBTAINED
**Page**: General Information (you're already here)  
**Location**: Top of page  
**Your Value**: `1439047600132198550`

```
┌─────────────────────────────────────────────┐
│ General Information                         │
├─────────────────────────────────────────────┤
│                                             │
│ APPLICATION ID          [Copy]              │
│ 1439047600132198550     ←── HERE           │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 2. PUBLIC_KEY ⚠️ NEEDED
**Page**: Same page (General Information) - scroll down  
**Location**: About halfway down the page

```
┌─────────────────────────────────────────────┐
│ General Information                         │
├─────────────────────────────────────────────┤
│                                             │
│ [Scroll down past App Icon, Description]   │
│                                             │
│ PUBLIC KEY             [Copy]               │
│ a1b2c3d4e5f6...        ←── COPY THIS       │
│ (64 hex characters)                         │
│                                             │
└─────────────────────────────────────────────┘
```

**What to look for**: 
- Section labeled "PUBLIC KEY"
- 64 character string (lowercase hex)
- Has a blue "Copy" button next to it

---

### 3. BOT_TOKEN ⚠️ NEEDED
**Page**: Bot (left sidebar)  
**Location**: Top of Bot page

```
┌─────────────────────────────────────────────┐
│ Left Sidebar:                               │
│ > General Information                       │
│ > Bot          ←── CLICK HERE               │
│ > OAuth2                                    │
│ > URL Generator                             │
└─────────────────────────────────────────────┘

After clicking "Bot":

┌─────────────────────────────────────────────┐
│ Bot                                         │
├─────────────────────────────────────────────┤
│                                             │
│ TOKEN                                       │
│ [Reset Token]  [Copy]  ←── CLICK "Copy"   │
│                                             │
│ If token hidden: Click "Reset Token" first │
│ Then click "Copy"                           │
│                                             │
└─────────────────────────────────────────────┘
```

⚠️ **CRITICAL**: Token shown only ONCE after reset. Copy immediately!

---

## Step-by-Step: Get Public Key & Bot Token

### Get PUBLIC_KEY (30 seconds)

1. You're on General Information page already (where you got Application ID)
2. **Scroll down** - don't click anything yet
3. Look for section labeled "PUBLIC KEY"
4. Click blue **"Copy"** button
5. Paste into secure note (64 hex chars)

### Get BOT_TOKEN (2 minutes)

1. **Left sidebar** → Click **"Bot"**
2. If no bot exists: Click **"Add Bot"** → Confirm "Yes, do it!"
3. In "TOKEN" section at top of page:
   - Click **"Reset Token"**
   - Confirm the reset
   - Immediately click **"Copy"** (token shows only once)
4. Paste into secure note (59+ chars)

---

## Where to Input These Credentials

### Option 1: Store in .env file (RECOMMENDED)

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Create config file from template
cp config/discord_production.env.template config/.env.production

# Edit the file
nano config/.env.production
# or
code config/.env.production
```

**Fill in these lines**:
```bash
DISCORD_APPLICATION_ID=1439047600132198550
DISCORD_PUBLIC_KEY=<paste_your_64_char_key_here>
DISCORD_BOT_TOKEN=<paste_your_59plus_char_token_here>
```

### Option 2: Export as environment variables (TESTING)

```bash
# Temporary - for testing only
export DISCORD_APPLICATION_ID="1439047600132198550"
export DISCORD_PUBLIC_KEY="your_64_char_hex_key"
export DISCORD_BOT_TOKEN="your_59plus_char_token"
```

---

## Validate Your Credentials

### Quick Test (recommended)
```bash
# Load from file
source config/.env.production

# Run audit script
python3 scripts/ci/audit_security_credentials.py --check-env-only
```

**Expected Output**:
```
✅ Valid (100% confidence): Standard 18-digit snowflake (current)
✅ Valid (100% confidence): Hex-encoded 32-byte key
✅ Valid (100% confidence): Modern bot token format (59 chars)

Critical blockers: 0 (down from 5)
```

---

## Common Issues

### "I can't find PUBLIC_KEY"
- Make sure you're on **General Information** page
- Scroll down past app icon and description
- It's above "Interactions Endpoint URL" section
- Look for exactly "PUBLIC KEY" label (not "Public Key")

### "Bot page says 'Add Bot'"
- That's normal for new applications
- Click **"Add Bot"** → Confirm
- Bot will be created
- Token section will appear at top

### "Token is hidden/not showing"
- Click **"Reset Token"** button
- Confirm the reset popup
- New token will display temporarily
- **Copy immediately** - won't be shown again

### "I copied the wrong thing"
- **APPLICATION_ID**: Exactly 18 digits (your value: `1439047600132198550` ✅)
- **PUBLIC_KEY**: Exactly 64 characters, all lowercase hex (a-f, 0-9)
- **BOT_TOKEN**: 59+ characters, has dots (.) separating parts

---

## Security Checklist

- [ ] All 3 credentials copied to secure location
- [ ] Saved in `config/.env.production` (NOT `.env` - use production template)
- [ ] File `.gitignore` includes `config/.env*` (prevents git commit)
- [ ] Token not shared in chat/email
- [ ] Audit script shows 100% confidence for all 3

---

## Next Steps After Getting Credentials

### Immediate (5 min)
```bash
# 1. Store credentials
nano config/.env.production  # Add your 3 values

# 2. Validate
source config/.env.production
python3 scripts/ci/audit_security_credentials.py --check-env-only

# 3. Check blockers resolved
jq '.blockers_summary' logs/security_audit.json
```

### Expected Result
- **Before**: 5 critical blockers
- **After**: 0 critical blockers
- **Unblocked**: DISCORD-1, DISCORD-2, EARNINGS-1, ALERTS-1

---

## Visual Summary

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Discord Developer Portal                                  │
│  https://discord.com/developers/applications              │
│                                                            │
│  Your Application: 1439047600132198550                    │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ General Information                              │    │
│  ├──────────────────────────────────────────────────┤    │
│  │                                                  │    │
│  │ 1️⃣ APPLICATION_ID: 1439047600132198550 ✅       │    │
│  │                                                  │    │
│  │ [scroll down]                                    │    │
│  │                                                  │    │
│  │ 2️⃣ PUBLIC_KEY: [Copy] ← Click here             │    │
│  │    (64 char hex string)                          │    │
│  │                                                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Left Sidebar → Bot                               │    │
│  ├──────────────────────────────────────────────────┤    │
│  │                                                  │    │
│  │ 3️⃣ TOKEN: [Reset Token] [Copy]                  │    │
│  │    Click Reset, then Copy immediately            │    │
│  │    (59+ chars with dots)                         │    │
│  │                                                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

**Status**: You have 1/3 credentials. Get PUBLIC_KEY next (same page, scroll down).
