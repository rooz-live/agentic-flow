#!/usr/bin/env bash
set -euo pipefail

# Credential Propagation: Write Real API Keys to .env Files
#
# Purpose: Find real API keys from environment and propagate to .env files
# Activates: validators, swarms, MCP servers requiring credentials

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_ENV="$PROJECT_ROOT/.env"
TARGET_ENVS=(
  "$PROJECT_ROOT/.env"
  "$PROJECT_ROOT/scripts/.env"
  "$PROJECT_ROOT/../../agentic-flow-core/.env"
  "$PROJECT_ROOT/../../../config/.env"
)

echo "🔑 Credential Propagation: Real API Keys → .env Files"
echo "   Source: $SOURCE_ENV"
echo ""

# Verify source .env has real keys
if [ ! -f "$SOURCE_ENV" ]; then
  echo "❌ Source .env not found: $SOURCE_ENV"
  exit 1
fi

# Extract real keys (not placeholders)
ANTHROPIC_KEY=$(grep "^ANTHROPIC_API_KEY=" "$SOURCE_ENV" | cut -d'=' -f2- | tr -d '"' || echo "")
OPENAI_KEY=$(grep "^OPENAI_API_KEY=" "$SOURCE_ENV" | cut -d'=' -f2- | tr -d '"' || echo "")
AWS_ACCESS=$(grep "^AWS_ACCESS_KEY_ID=" "$SOURCE_ENV" | cut -d'=' -f2- | tr -d '"' || echo "")
AWS_SECRET=$(grep "^AWS_SECRET_ACCESS_KEY=" "$SOURCE_ENV" | cut -d'=' -f2- | tr -d '"' || echo "")
HIVELOCITY_KEY=$(grep "^HIVELOCITY_API_KEY=" "$SOURCE_ENV" | cut -d'=' -f2- | tr -d '"' || echo "")

# Additional LLM/API keys for email synthesis
GROQ_KEY=$(grep "^GROQ_API_KEY=" "$SOURCE_ENV" | cut -d'=' -f2- | tr -d '"' || echo "")
COHERE_KEY=$(grep "^COHERE_API_KEY=" "$SOURCE_ENV" | cut -d'=' -f2- | tr -d '"' || echo "")
PERPLEXITY_KEY=$(grep "^PERPLEXITY_API_KEY=" "$SOURCE_ENV" | cut -d'=' -f2- | tr -d '"' || echo "")

# Validate keys are not placeholders
is_real_key() {
  local key="$1"
  [[ -n "$key" ]] && [[ "$key" != *"placeholder"* ]] && [[ "$key" != *"your-"* ]] && [[ "$key" != *"FIXME"* ]]
}

echo "📊 Key Status:"
if is_real_key "$ANTHROPIC_KEY"; then
  echo "   ✅ ANTHROPIC_API_KEY: REAL (${#ANTHROPIC_KEY} chars)"
else
  echo "   ❌ ANTHROPIC_API_KEY: PLACEHOLDER or missing"
fi

if is_real_key "$OPENAI_KEY"; then
  echo "   ✅ OPENAI_API_KEY: REAL (${#OPENAI_KEY} chars)"
else
  echo "   ❌ OPENAI_API_KEY: PLACEHOLDER or missing"
fi

if is_real_key "$GROQ_KEY"; then
  echo "   ✅ GROQ_API_KEY: REAL (${#GROQ_KEY} chars)"
else
  echo "   ❌ GROQ_API_KEY: PLACEHOLDER or missing"
fi

if is_real_key "$COHERE_KEY"; then
  echo "   ✅ COHERE_API_KEY: REAL (${#COHERE_KEY} chars)"
else
  echo "   ❌ COHERE_API_KEY: PLACEHOLDER or missing"
fi

if is_real_key "$PERPLEXITY_KEY"; then
  echo "   ✅ PERPLEXITY_API_KEY: REAL (${#PERPLEXITY_KEY} chars)"
else
  echo "   ❌ PERPLEXITY_API_KEY: PLACEHOLDER or missing"
fi

if is_real_key "$AWS_ACCESS"; then
  echo "   ✅ AWS_ACCESS_KEY_ID: REAL"
else
  echo "   ❌ AWS_ACCESS_KEY_ID: PLACEHOLDER or missing"
fi

if is_real_key "$AWS_SECRET"; then
  echo "   ✅ AWS_SECRET_ACCESS_KEY: REAL"
else
  echo "   ❌ AWS_SECRET_ACCESS_KEY: PLACEHOLDER or missing"
fi

if is_real_key "$HIVELOCITY_KEY"; then
  echo "   ✅ HIVELOCITY_API_KEY: REAL"
else
  echo "   ❌ HIVELOCITY_API_KEY: PLACEHOLDER or missing"
fi

echo ""
echo "🚀 Propagating to target .env files..."

for target in "${TARGET_ENVS[@]}"; do
  # Create directory if doesn't exist
  mkdir -p "$(dirname "$target")"
  
  # Create .env if doesn't exist
  if [ ! -f "$target" ]; then
    touch "$target"
    echo "   📝 Created: $target"
  fi
  
  # Update keys (preserve other vars)
  if is_real_key "$ANTHROPIC_KEY"; then
    sed -i.bak "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$ANTHROPIC_KEY|" "$target" 2>/dev/null || \
      echo "ANTHROPIC_API_KEY=$ANTHROPIC_KEY" >> "$target"
  fi
  
  if is_real_key "$OPENAI_KEY"; then
    sed -i.bak "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" "$target" 2>/dev/null || \
      echo "OPENAI_API_KEY=$OPENAI_KEY" >> "$target"
  fi
  
  if is_real_key "$GROQ_KEY"; then
    sed -i.bak "s|^GROQ_API_KEY=.*|GROQ_API_KEY=$GROQ_KEY|" "$target" 2>/dev/null || \
      echo "GROQ_API_KEY=$GROQ_KEY" >> "$target"
  fi
  
  if is_real_key "$COHERE_KEY"; then
    sed -i.bak "s|^COHERE_API_KEY=.*|COHERE_API_KEY=$COHERE_KEY|" "$target" 2>/dev/null || \
      echo "COHERE_API_KEY=$COHERE_KEY" >> "$target"
  fi
  
  if is_real_key "$PERPLEXITY_KEY"; then
    sed -i.bak "s|^PERPLEXITY_API_KEY=.*|PERPLEXITY_API_KEY=$PERPLEXITY_KEY|" "$target" 2>/dev/null || \
      echo "PERPLEXITY_API_KEY=$PERPLEXITY_KEY" >> "$target"
  fi
  
  if is_real_key "$AWS_ACCESS"; then
    sed -i.bak "s|^AWS_ACCESS_KEY_ID=.*|AWS_ACCESS_KEY_ID=$AWS_ACCESS|" "$target" 2>/dev/null || \
      echo "AWS_ACCESS_KEY_ID=$AWS_ACCESS" >> "$target"
  fi
  
  if is_real_key "$AWS_SECRET"; then
    sed -i.bak "s|^AWS_SECRET_ACCESS_KEY=.*|AWS_SECRET_ACCESS_KEY=$AWS_SECRET|" "$target" 2>/dev/null || \
      echo "AWS_SECRET_ACCESS_KEY=$AWS_SECRET" >> "$target"
  fi
  
  if is_real_key "$HIVELOCITY_KEY"; then
    sed -i.bak "s|^HIVELOCITY_API_KEY=.*|HIVELOCITY_API_KEY=$HIVELOCITY_KEY|" "$target" 2>/dev/null || \
      echo "HIVELOCITY_API_KEY=$HIVELOCITY_KEY" >> "$target"
  fi
  
  # Remove backup files
  rm -f "${target}.bak"
  
  echo "   ✅ Updated: $target"
done

echo ""
echo "✨ Propagation complete!"
echo "   Validators, swarms, and MCP servers can now use real credentials."
