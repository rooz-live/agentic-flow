# API Key Acquisition Guide

**Purpose**: Step-by-step instructions for obtaining API keys to resolve Phase 1 blockers  
**Last Updated**: 2025-12-01  
**Related File**: `config/.env.unified`

---

## 📋 Blocker Resolution Checklist

| Blocker | Service | Status | Priority |
|---------|---------|--------|----------|
| BLOCKER-004 | OpenRouter API | ⏳ Pending | P0 - Critical |
| BLOCKER-005 | OpenAI API | ⏳ Pending | P0 - Critical |
| BLOCKER-007 | StarlingX Infrastructure | ⏳ Pending | P0 - Critical |

---

## 🔑 BLOCKER-004: OpenRouter API Key

**Purpose**: Multi-model gateway for cost-effective LLM access (99% cost savings vs direct Claude)

### Step-by-Step Instructions

1. **Navigate to OpenRouter**
   ```
   https://openrouter.ai/keys
   ```

2. **Create Account or Sign In**
   - Use GitHub, Google, or email authentication
   - Verify email if required

3. **Create API Key**
   - Click "Create API Key" button
   - Name it: `agentic-flow-production`
   - Copy the key immediately (shown only once)

4. **Key Format**
   ```
   sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

5. **Update Configuration**
   ```bash
   # Edit config/.env.unified
   OPENROUTER_API_KEY=sk-or-v1-YOUR_ACTUAL_KEY_HERE
   ```

6. **Validate Connectivity**
   ```bash
   curl -s -H "Authorization: Bearer YOUR_KEY" \
     https://openrouter.ai/api/v1/models | head -20
   ```

7. **Expected Response**
   - HTTP 200 with JSON list of available models
   - If 401 error: Key is invalid or expired

### Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/expired key | Regenerate key |
| 403 Forbidden | Insufficient credits | Add credits to account |
| 429 Rate Limited | Too many requests | Wait and retry |

---

## 🔑 BLOCKER-005: OpenAI API Key

**Purpose**: GPT model access for fallback chain and embeddings

### Step-by-Step Instructions

1. **Navigate to OpenAI Platform**
   ```
   https://platform.openai.com/api-keys
   ```

2. **Create Account or Sign In**
   - Use email or Google authentication
   - Complete phone verification if required

3. **Create API Key**
   - Click "Create new secret key"
   - Name it: `agentic-flow-production`
   - Copy the key immediately (shown only once)

4. **Key Format**
   ```
   sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   # or legacy format:
   sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

5. **Update Configuration**
   ```bash
   # Edit config/.env.unified
   OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE
   ```

6. **Validate Connectivity**
   ```bash
   curl -s -H "Authorization: Bearer YOUR_KEY" \
     https://api.openai.com/v1/models | head -20
   ```

7. **Expected Response**
   - HTTP 200 with JSON list of available models
   - If 401 error: Key is invalid or expired

### Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/expired key | Regenerate key |
| 429 Rate Limited | Quota exceeded | Check usage limits |
| 500 Server Error | OpenAI outage | Check status.openai.com |

---

## 🖥️ BLOCKER-007: StarlingX IP Address

**Purpose**: Production database deployment and HostBill installation

### Step-by-Step Instructions

1. **Contact Infrastructure Team**
   - Request IP address for: `stx-aio-0.corp.interface.tag.ooo`
   - Specify port requirement: 2222 (SSH)

2. **Once IP is Obtained, Choose Resolution Approach**

---

### Approach A: /etc/hosts Modification (Recommended)

**Pros**: System-wide resolution, works for all applications  
**Cons**: Requires sudo privileges

```bash
# Replace <IP_ADDRESS> with actual IP
echo "<IP_ADDRESS> stx-aio-0.corp.interface.tag.ooo" | sudo tee -a /etc/hosts

# Verify
ping -c 1 stx-aio-0.corp.interface.tag.ooo
```

---

### Approach B: SSH Config (No sudo required)

**Pros**: No sudo needed, portable  
**Cons**: Only affects SSH connections

```bash
# Add to ~/.ssh/config
cat >> ~/.ssh/config << 'EOF'

Host stx-aio-0
    HostName <IP_ADDRESS>
    User root
    Port 2222
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF

# Connect using alias
ssh stx-aio-0
```

---

### Approach C: Environment Variable Override

**Pros**: Application-level, most portable  
**Cons**: Requires code changes

```bash
# Edit config/.env.unified
STX_IP_ADDRESS=<ACTUAL_IP_ADDRESS>

# Application code checks STX_IP_ADDRESS before hostname resolution
```

---

### Validate Connectivity

```bash
# Test SSH connectivity
ssh -p 2222 root@<IP_ADDRESS> "hostname && uname -a"

# Expected: Returns hostname and system info
```

