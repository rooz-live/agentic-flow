# Discord Credential Setup Guide

**Purpose**: Obtain 3 credentials to unblock DISCORD-1, DISCORD-2, EARNINGS-1, ALERTS-1

**Time Required**: ~10 minutes  
**Prerequisites**: Discord account

---

## Step 1: Create Discord Application (5 min)

### 1.1 Access Developer Portal
```bash
# Open in browser:
open "https://discord.com/developers/applications"
```

### 1.2 Create New Application
1. Click **"New Application"** button (top right)
2. Enter name: `Agentic Flow Trading Bot` (or your preferred name)
3. Accept Terms of Service
4. Click **"Create"**

### 1.3 Get APPLICATION_ID ✅
**Location**: General Information page (default view)

- **Format**: 18-digit number (Discord snowflake)
- **Example**: `123456789012345678`
- **Where**: Listed as "Application ID" near the top
- **Action**: Click "Copy" button → Save to secure notes

```bash
# Expected format validation:
# ^\d{18}$
```

---

## Step 2: Get PUBLIC_KEY (2 min)

### 2.1 Still on General Information Page
**Location**: Scroll down to "Public Key" section

- **Format**: 64 character hexadecimal string
- **Example**: `a1b2c3d4e5f6...` (64 chars)
- **Action**: Click "Copy" button → Save to secure notes

```bash
# Expected format validation:
# ^[a-f0-9]{64}$
```

**Security Note**: This is PUBLIC - safe to use client-side, used to verify Discord signatures.

---

## Step 3: Create Bot & Get BOT_TOKEN (3 min)

### 3.1 Navigate to Bot Settings
1. Left sidebar → Click **"Bot"**
2. Click **"Add Bot"** button
3. Confirm: "Yes, do it!"

### 3.2 Configure Bot Permissions
**Required Settings**:
- ✅ **PUBLIC BOT**: OFF (recommended - restrict to your servers)
- ✅ **REQUIRES OAUTH2 CODE GRANT**: OFF
- ✅ **MESSAGE CONTENT INTENT**: ON (required for commands)
- ✅ **SERVER MEMBERS INTENT**: OFF (not needed)
- ✅ **PRESENCE INTENT**: OFF (not needed)

### 3.3 Get BOT_TOKEN ✅
**Location**: Token section (top of Bot page)

- **Format**: 59-72 character alphanumeric string with hyphens
- **Example**: `MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQr...` (59+ chars)
- **Action**: Click **"Reset Token"** → Confirm → Click "Copy"

```bash
# Expected format validation:
# ^[A-Za-z0-9_-]{59}$ (modern format)
# OR
# ^[MN][A-Za-z0-9_-]{23}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}$ (structured)
```

**⚠️ CRITICAL**: 
- Token shown ONCE - save immediately
- If lost, must reset (invalidates old token)
- NEVER commit to git or share publicly

---

## Step 4: Configure OAuth2 (Optional - for invite link)

### 4.1 Generate Bot Invite URL
1. Left sidebar → **"OAuth2"** → **"URL Generator"**
2. **Scopes**: Select `bot` and `applications.commands`
3. **Bot Permissions**: Select:
   - Send Messages
   - Embed Links
   - Read Message History
   - Use Slash Commands
4. Copy generated URL at bottom

### 4.2 Invite Bot to Your Server
```bash
# Use generated URL format:
# https://discord.com/api/oauth2/authorize?client_id=YOUR_APPLICATION_ID&permissions=274878024704&scope=bot%20applications.commands
```

---

## Step 5: Store Credentials Securely

### 5.1 Create Production Environment File
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
cp config/discord_production.env.template config/.env.production
```

### 5.2 Edit Configuration
```bash
# Open in secure editor (not shared terminal)
nano config/.env.production
# OR
code config/.env.production
```

### 5.3 Populate Values
```bash
# Discord Application Configuration
DISCORD_APPLICATION_ID=123456789012345678
DISCORD_PUBLIC_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWx

# Optional: Guild ID for faster command testing
DISCORD_GUILD_ID=987654321098765432
```

### 5.4 Verify .gitignore Protection
```bash
# Ensure config/.env.production is ignored
grep "config/.env" .gitignore
# Should return: config/.env*
```

---

## Step 6: Validate Credentials

### 6.1 Run Security Audit
```bash
# Set environment variables temporarily for validation
export DISCORD_APPLICATION_ID="your_18_digit_id"
export DISCORD_PUBLIC_KEY="your_64_char_hex_key"
export DISCORD_BOT_TOKEN="your_59plus_char_token"

# Run audit
python3 scripts/ci/audit_security_credentials.py --check-env-only
```

**Expected Output**:
```
✅ Valid (100% confidence): Standard 18-digit snowflake (current)
✅ Valid (100% confidence): Hex-encoded 32-byte key
✅ Valid (100% confidence): Modern bot token format (59 chars)
```

### 6.2 Test Bot Connection
```bash
# Test basic bot connectivity
curl -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
     https://discord.com/api/v10/users/@me
```

**Expected Response**:
```json
{
  "id": "123456789012345678",
  "username": "Agentic Flow Trading Bot",
  "bot": true,
  ...
}
```

---

## Troubleshooting

### Token Shows as Invalid
**Cause**: Token copied incorrectly or has whitespace  
**Fix**: Reset token in Discord Developer Portal, copy again carefully

### Bot Can't See Messages
**Cause**: MESSAGE_CONTENT_INTENT not enabled  
**Fix**: Bot page → Privileged Gateway Intents → Enable MESSAGE_CONTENT_INTENT

### Commands Not Registering
**Cause**: Bot not invited with `applications.commands` scope  
**Fix**: Regenerate invite URL with correct scopes, re-invite bot

### Application ID Format Error
**Cause**: Not exactly 18 digits  
**Fix**: Verify copied from correct field (not User ID or other ID)

---

## Security Checklist

- [ ] BOT_TOKEN stored in `.env.production` (NOT committed)
- [ ] `.gitignore` includes `config/.env*` pattern
- [ ] Token not shared in chat/email/logs
- [ ] Public bot toggle OFF (if restricting access)
- [ ] Only required intents enabled
- [ ] Audit script shows 100% confidence for all 3 credentials

---

## Next Steps

Once credentials validated:

1. **Cloudflare Setup** (see alternative options if risky)
2. **Deploy Bot**: `./scripts/deploy_discord_bot.sh validate`
3. **Test Commands**: `/portfolio`, `/earnings`, `/alert`
4. **Monitor**: Check logs for rate limits or errors

---

**Status**: Ready to proceed to Cloudflare alternatives analysis
