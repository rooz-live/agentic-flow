# API Key Rotation Checklist

**Created**: 2025-11-30  
**Status**: URGENT - Exposed keys in prompt must be rotated

## 🚨 Keys to Rotate Immediately

### 1. OpenAI API Key
- **Status**: ❌ INVALID (401: Incorrect API key)
- **Action**: Generate new at https://platform.openai.com/api-keys
- **Test**: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`
- **Blockers**: BLOCKER-005

### 2. OpenRouter API Key
- **Status**: ❌ INVALID (401: User not found)
- **Action**: Generate new at https://openrouter.ai/keys
- **Test**: `curl https://openrouter.ai/api/v1/models -H "Authorization: Bearer $OPENROUTER_API_KEY"`
- **Blockers**: BLOCKER-004, PM-02

### 3. GitHub PAT (EXPOSED in prompt)
- **Status**: ⚠️ EXPOSED - Must rotate
- **Action**: Revoke `ghp_****` at https://github.com/settings/tokens
- **Generate**: New token with scopes: repo, read:org, workflow
- **Test**: `gh auth status`

### 4. Anthropic API Key (EXPOSED in prompt)
- **Status**: ⚠️ EXPOSED - Consider rotation
- **Action**: If exposed in logs/commits, rotate at https://console.anthropic.com/
- **Test**: `curl https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY"`

### 5. Hugging Face Token (EXPOSED in prompt)
- **Status**: ⚠️ EXPOSED - Consider rotation
- **Action**: Rotate at https://huggingface.co/settings/tokens
- **Test**: `huggingface-cli whoami`

---

## ✅ Secure Storage Pattern

### Do NOT store keys in:
- ❌ Prompt history files
- ❌ Shell rc files (~/.bashrc, ~/.zshrc)
- ❌ Git-tracked files
- ❌ Slack/Discord messages

### DO store keys in:
- ✅ `~/.env` (git ignored, chmod 600)
- ✅ Passbolt CLI: `passbolt get <resource-id>`
- ✅ 1Password CLI: `op read "op://vault/item/field"`
- ✅ AWS Secrets Manager (for production)

---

## 🔧 Implementation

### 1. Create `.env` file (NEVER COMMIT)
```bash
# ~/.env or ~/Documents/code/.env
export OPENAI_API_KEY="sk-proj-NEW_KEY_HERE"
export OPENROUTER_API_KEY="sk-or-v1-NEW_KEY_HERE"
export ANTHROPIC_API_KEY="sk-ant-NEW_KEY_HERE"
export GITHUB_TOKEN="ghp_NEW_PAT_HERE"
export HUGGINGFACE_API_KEY="hf_NEW_KEY_HERE"

# Stripe (already using test keys - OK for now)
export STRIPE_TEST_SECRET_KEY="sk_test_2wPMWmzr3bEXzPEv4K9x1jLd00mb1SIPJT"
export STRIPE_TEST_PUBLIC_KEY="pk_test_0VP4TIfGV9J8mmD6duzAkFxh00hCNBlV73"
```

### 2. Load keys securely
```bash
# In ~/.bashrc or ~/.zshrc
if [ -f ~/Documents/code/.env ]; then
    source ~/Documents/code/.env
fi
```

### 3. Verify .gitignore
```bash
echo ".env" >> .gitignore
echo "*.env" >> .gitignore
git add .gitignore
git commit -m "security: ensure .env files never committed"
```

---

## 📊 Validation Tests

Run after key rotation:

```bash
# Test OpenAI
curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[0].id'
# Expected: "gpt-4" or similar

# Test OpenRouter
curl -s https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | jq '.[0].id'
# Expected: Model list

# Test Anthropic
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"test"}]}' \
  | jq '.content[0].text'
# Expected: Response text

# Test GitHub
gh auth status
# Expected: "Logged in to github.com account <username>"

# Test Hugging Face
huggingface-cli whoami
# Expected: Username
```

---

## 🎯 Resolution Criteria

- [ ] All 5 keys rotated and stored in `~/.env`
- [ ] Validation tests pass
- [ ] Old keys revoked at provider dashboards
- [ ] BLOCKER-004 & BLOCKER-005 marked RESOLVED
- [ ] PM-02 unblocked (agentic-synth data generation works)
- [ ] No keys in shell history: `history | grep -E "(OPENAI|ANTHROPIC|GITHUB_TOKEN)"`

---

## 📝 Next Steps

After keys are rotated:
1. Test agentic-synth: `npx @ruvector/agentic-synth generate --count 10`
2. Update ROAM_TRACKER.yaml: Mark BLOCKER-004/005 as RESOLVED
3. Run security audit: `./scripts/agentic/security_audit.sh`

---

**Owner**: orchestrator_circle  
**Estimated Time**: 30 minutes  
**Priority**: P0 (CRITICAL)
