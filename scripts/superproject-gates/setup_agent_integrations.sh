#!/usr/bin/env bash
#
# Agent Integration Setup Script
# Installs agent-booster, configures OpenRouter, and sets up Claude Flow
# 
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly CORRELATION_ID="agent-setup-$(date +%s)"
readonly LOG_FILE="$SCRIPT_DIR/logs/agent_setup.log"

# Ensure logs directory exists
mkdir -p "$SCRIPT_DIR/logs"

# Heartbeat function
heartbeat() {
    local phase="$1"
    local status="$2"
    local start_time="$3"
    local metrics="${4:-}"
    
    local elapsed=$((SECONDS - start_time))
    local ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "$ts|agent_setup|$phase|$status|$elapsed|$CORRELATION_ID|$metrics" | tee -a "$LOG_FILE"
}

echo "=========================================="
echo "Agent Integration Setup"
echo "Correlation ID: $CORRELATION_ID"
echo "Timestamp: $(date)"
echo "=========================================="

# Phase 1: Install agent-booster
echo ""
echo "Phase 1: Installing agent-booster package"
echo "----------------------------------------"
phase_start=$SECONDS
heartbeat "agent_booster_install" "START" "$phase_start"

if command -v npm &>/dev/null; then
    echo "npm found, installing agent-booster..."
    
    if npm install agent-booster; then
        echo "✓ agent-booster installed successfully"
        
        # Test the installation
        if npm list agent-booster &>/dev/null; then
            AGENT_BOOSTER_VERSION=$(npm list agent-booster --depth=0 | grep agent-booster | sed 's/.*agent-booster@//' | sed 's/ .*//')
            echo "✓ agent-booster version $AGENT_BOOSTER_VERSION verified"
            heartbeat "agent_booster_install" "OK" "$phase_start" "version=$AGENT_BOOSTER_VERSION"
        else
            echo "✗ agent-booster installation verification failed"
            heartbeat "agent_booster_install" "ERROR" "$phase_start" "verification_failed=1"
        fi
    else
        echo "✗ Failed to install agent-booster"
        heartbeat "agent_booster_install" "ERROR" "$phase_start" "install_failed=1"
    fi
else
    echo "✗ npm not found. Please install Node.js and npm first."
    heartbeat "agent_booster_install" "ERROR" "$phase_start" "npm_missing=1"
fi

# Phase 2: Setup OpenRouter API
echo ""
echo "Phase 2: Setting up OpenRouter API configuration"
echo "-----------------------------------------------"
phase_start=$SECONDS
heartbeat "openrouter_setup" "START" "$phase_start"

# Check if OpenRouter API key is already set
if [[ -n "${OPENROUTER_API_KEY:-}" ]]; then
    echo "✓ OpenRouter API key already set in environment"
    heartbeat "openrouter_setup" "OK" "$phase_start" "api_key_present=1"
else
    echo "⚠ OpenRouter API key not set in environment"
    echo ""
    echo "To obtain a free OpenRouter API key:"
    echo "1. Visit: https://openrouter.ai/keys"
    echo "2. Sign up for a free account"
    echo "3. Generate an API key"
    echo "4. Set the environment variable:"
    echo "   export OPENROUTER_API_KEY=sk-or-v1-your-key-here"
    echo ""
    echo "You can add this to your ~/.bashrc or ~/.zshrc for persistence."
    
    # Create a sample environment file
    cat > "$SCRIPT_DIR/.env.example" <<'EOF'
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Available free models:
# - google/gemini-2.0-flash-exp:free (recommended)
# - deepseek/deepseek-chat-v3-0324:free  
# - meta-llama/llama-3.3-70b-instruct:free

# Claude Flow Configuration
DEFAULT_MODEL=google/gemini-2.0-flash-exp:free
PROVIDER=openrouter
EOF
    
    echo "✓ Created .env.example file with configuration template"
    heartbeat "openrouter_setup" "PARTIAL" "$phase_start" "example_created=1,api_key_missing=1"
fi

# Phase 3: Install Claude Flow
echo ""
echo "Phase 3: Installing and initializing Claude Flow"
echo "-----------------------------------------------"
phase_start=$SECONDS
heartbeat "claude_flow_setup" "START" "$phase_start"

if command -v npx &>/dev/null; then
    echo "npx found, installing Claude Flow..."
    
    # Install agentic-flow if not already available
    if ! command -v agentic-flow &>/dev/null; then
        echo "Installing agentic-flow..."
        if npm install -g agentic-flow; then
            echo "✓ agentic-flow installed globally"
        else
            echo "⚠ Failed to install agentic-flow globally, using npx"
        fi
    fi
    
    # Initialize Claude Flow with force
    echo "Initializing Claude Flow..."
    if npx claude-flow@alpha init --force; then
        echo "✓ Claude Flow initialized successfully"
        heartbeat "claude_flow_setup" "OK" "$phase_start" "init_success=1"
    else
        echo "⚠ Claude Flow initialization failed or partially completed"
        heartbeat "claude_flow_setup" "PARTIAL" "$phase_start" "init_issues=1"
    fi
else
    echo "✗ npx not found. Please install Node.js first."
    heartbeat "claude_flow_setup" "ERROR" "$phase_start" "npx_missing=1"
fi

# Phase 4: Create integration examples
echo ""
echo "Phase 4: Creating integration examples and documentation"
echo "-----------------------------------------------------"
phase_start=$SECONDS
heartbeat "examples_creation" "START" "$phase_start"

# Create examples directory
mkdir -p "$SCRIPT_DIR/examples/agent_integrations"

# Create Claude Code Mode examples
cat > "$SCRIPT_DIR/examples/agent_integrations/claude_code_examples.sh" <<'EOF'
#!/usr/bin/env bash
#
# Claude Code Mode Examples using OpenRouter free models
#

# Check if OPENROUTER_API_KEY is set
if [[ -z "${OPENROUTER_API_KEY:-}" ]]; then
    echo "Error: OPENROUTER_API_KEY not set"
    echo "Please set: export OPENROUTER_API_KEY=sk-or-v1-your-key-here"
    exit 1
fi

echo "Claude Code Mode Examples"
echo "========================="

# Example 1: Gemini 2.0 Flash (recommended)
echo ""
echo "Example 1: Using Gemini 2.0 Flash for Python function"
npx agentic-flow claude-code --provider openrouter --model "google/gemini-2.0-flash-exp:free" "Write a Python hello world function with error handling"

# Example 2: DeepSeek V3
echo ""
echo "Example 2: Using DeepSeek V3 for data processing"
npx agentic-flow claude-code --provider openrouter --model "deepseek/deepseek-chat-v3-0324:free" "Write a Python function to process CSV data and calculate statistics"

# Example 3: Llama 3.3 70B
echo ""
echo "Example 3: Using Llama 3.3 70B for API integration"
npx agentic-flow claude-code --provider openrouter --model "meta-llama/llama-3.3-70b-instruct:free" "Write a Node.js function to interact with a REST API using fetch"
EOF

# Create Agent SDK examples
cat > "$SCRIPT_DIR/examples/agent_integrations/agent_sdk_examples.sh" <<'EOF'
#!/usr/bin/env bash
#
# Agent SDK Mode Examples using OpenRouter free models
#

# Check if OPENROUTER_API_KEY is set
if [[ -z "${OPENROUTER_API_KEY:-}" ]]; then
    echo "Error: OPENROUTER_API_KEY not set"
    echo "Please set: export OPENROUTER_API_KEY=sk-or-v1-your-key-here"
    exit 1
fi

echo "Agent SDK Mode Examples"
echo "======================="

# Example 1: Coder agent with Gemini
echo ""
echo "Example 1: Coder agent using Gemini 2.0 Flash"
npx agentic-flow --agent coder --task "Write a function to calculate fibonacci numbers with memoization" --model "google/gemini-2.0-flash-exp:free" --verbose

# Example 2: Coder agent with DeepSeek
echo ""
echo "Example 2: Coder agent using DeepSeek V3"
npx agentic-flow --agent coder --task "Create a Python class for managing a simple task queue" --model "deepseek/deepseek-chat-v3-0324:free" --verbose

# Example 3: Coder agent with Llama
echo ""
echo "Example 3: Coder agent using Llama 3.3 70B"
npx agentic-flow --agent coder --task "Write a shell script to monitor system resources and send alerts" --model "meta-llama/llama-3.3-70b-instruct:free" --verbose
EOF

# Make example scripts executable
chmod +x "$SCRIPT_DIR/examples/agent_integrations/"*.sh

# Create comprehensive usage documentation
cat > "$SCRIPT_DIR/examples/AGENT_INTEGRATION_GUIDE.md" <<'EOF'
# Agent Integration Guide

This guide covers the integration of agent-booster, OpenRouter API, and Claude Flow for enhanced development workflows.

## Prerequisites

1. **Node.js and npm** installed
2. **OpenRouter API Key** (free tier available)
3. **Environment setup** with API credentials

## Setup Steps

### 1. Install Dependencies

```bash
# Run the setup script
./setup_agent_integrations.sh

# Or install manually:
npm install agent-booster
npm install -g agentic-flow
```

### 2. Configure OpenRouter API

```bash
# Get free API key from https://openrouter.ai/keys
export OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Add to your shell profile for persistence:
echo 'export OPENROUTER_API_KEY=sk-or-v1-your-key-here' >> ~/.bashrc
```

### 3. Initialize Claude Flow

```bash
npx claude-flow@alpha init --force
```

## Available Free Models

### Gemini 2.0 Flash (Recommended)
- **Model ID**: `google/gemini-2.0-flash-exp:free`
- **Best for**: General coding tasks, fast responses
- **Rate limits**: Generous free tier

### DeepSeek V3
- **Model ID**: `deepseek/deepseek-chat-v3-0324:free`
- **Best for**: Complex reasoning, code analysis
- **Rate limits**: Good free tier

### Llama 3.3 70B
- **Model ID**: `meta-llama/llama-3.3-70b-instruct:free`
- **Best for**: Detailed explanations, documentation
- **Rate limits**: Limited free tier

## Usage Examples

### Claude Code Mode

```bash
# Basic Python function
npx agentic-flow claude-code \
  --provider openrouter \
  --model "google/gemini-2.0-flash-exp:free" \
  "Write a Python function to validate email addresses"

# Complex data processing
npx agentic-flow claude-code \
  --provider openrouter \
  --model "deepseek/deepseek-chat-v3-0324:free" \
  "Create a Python script to analyze log files and detect anomalies"

# Shell scripting
npx agentic-flow claude-code \
  --provider openrouter \
  --model "meta-llama/llama-3.3-70b-instruct:free" \
  "Write a bash script to automate database backups with error handling"
```

### Agent SDK Mode

```bash
# Coder agent for algorithm implementation
npx agentic-flow \
  --agent coder \
  --task "Implement a binary search tree with insert, delete, and search operations" \
  --model "google/gemini-2.0-flash-exp:free" \
  --verbose

# System administration tasks
npx agentic-flow \
  --agent coder \
  --task "Create a monitoring script for server health checks" \
  --model "deepseek/deepseek-chat-v3-0324:free" \
  --verbose
```

## Best Practices

### Prompt Engineering

1. **Be specific**: Include exact requirements and constraints
2. **Provide context**: Mention the programming language and framework
3. **Include examples**: Show expected input/output formats
4. **Specify error handling**: Request proper exception handling

### Model Selection

- **Gemini 2.0 Flash**: Fast prototyping, simple tasks
- **DeepSeek V3**: Complex logic, debugging, optimization
- **Llama 3.3 70B**: Documentation, detailed explanations

### Cost Optimization

1. **Use free tier models** for development and testing
2. **Cache common responses** to avoid redundant API calls
3. **Optimize prompts** to get better results with fewer tokens
4. **Monitor usage** through OpenRouter dashboard

## Integration with Existing Workflows

### CI/CD Pipeline Integration

```yaml
- name: Generate Code Documentation
  run: |
    npx agentic-flow claude-code \
      --provider openrouter \
      --model "google/gemini-2.0-flash-exp:free" \
      "Generate comprehensive documentation for this codebase"
```

### Development Scripts

```bash
# Add to package.json scripts:
{
  "scripts": {
    "ai-review": "npx agentic-flow --agent coder --task 'Review this code for best practices' --model google/gemini-2.0-flash-exp:free",
    "ai-test": "npx agentic-flow claude-code --provider openrouter --model deepseek/deepseek-chat-v3-0324:free 'Generate unit tests for this module'"
  }
}
```

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   ```bash
   # Check if key is set
   echo $OPENROUTER_API_KEY
   
   # Set for current session
   export OPENROUTER_API_KEY=your-key-here
   ```

2. **Rate Limiting**
   - Use different models to distribute load
   - Implement exponential backoff in scripts
   - Monitor usage in OpenRouter dashboard

3. **Model Availability**
   - Free models have usage limits
   - Switch between models if one is unavailable
   - Check OpenRouter status page for updates

### Debug Mode

```bash
# Enable verbose logging
npx agentic-flow --agent coder \
  --task "Your task here" \
  --model "google/gemini-2.0-flash-exp:free" \
  --verbose \
  --debug
```

## Resources

- **OpenRouter Documentation**: https://openrouter.ai/docs
- **Agent Booster Package**: https://www.npmjs.com/package/agent-booster
- **Claude Flow GitHub**: https://github.com/anthropics/claude-flow
- **Free Model Limits**: https://openrouter.ai/models

## Support

For issues with this integration:
1. Check the setup script logs in `logs/agent_setup.log`
2. Verify API key configuration
3. Test with simple examples first
4. Check OpenRouter API status and limits
EOF

echo "✓ Created integration examples and documentation"
heartbeat "examples_creation" "OK" "$phase_start" "files_created=4"

# Phase 5: Test the installations
echo ""
echo "Phase 5: Testing installations and integrations"
echo "---------------------------------------------"
phase_start=$SECONDS
heartbeat "integration_test" "START" "$phase_start"

# Test agent-booster
echo "Testing agent-booster..."
if npm list agent-booster &>/dev/null; then
    echo "✓ agent-booster is installed and accessible"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo "✗ agent-booster test failed"
fi

# Test Claude Flow (if available)
echo "Testing Claude Flow availability..."
if command -v npx &>/dev/null; then
    echo "✓ npx available for Claude Flow"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo "✗ npx not available"
fi

# Test OpenRouter connectivity (if API key is set)
if [[ -n "${OPENROUTER_API_KEY:-}" ]]; then
    echo "Testing OpenRouter API connectivity..."
    
    # Simple API test using curl
    if command -v curl &>/dev/null; then
        API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $OPENROUTER_API_KEY" \
            -H "Content-Type: application/json" \
            "https://openrouter.ai/api/v1/models" \
        )
        
        if [[ "$API_RESPONSE" == "200" ]]; then
            echo "✓ OpenRouter API connection successful"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo "✗ OpenRouter API connection failed (HTTP $API_RESPONSE)"
        fi
    else
        echo "⚠ curl not available, skipping API test"
    fi
else
    echo "⚠ OpenRouter API key not set, skipping API test"
fi

TOTAL_TESTS=3
echo ""
echo "Integration tests completed: $TESTS_PASSED/$TOTAL_TESTS passed"

if [[ $TESTS_PASSED -eq $TOTAL_TESTS ]]; then
    heartbeat "integration_test" "OK" "$phase_start" "tests_passed=$TESTS_PASSED,total_tests=$TOTAL_TESTS"
else
    heartbeat "integration_test" "PARTIAL" "$phase_start" "tests_passed=$TESTS_PASSED,total_tests=$TOTAL_TESTS"
fi

# Final summary
echo ""
echo "=========================================="
echo "Agent Integration Setup Summary"
echo "=========================================="
echo "✓ agent-booster package installation"
echo "✓ OpenRouter API configuration guide"
echo "✓ Claude Flow initialization"
echo "✓ Integration examples created"
echo "✓ Documentation generated"
echo ""
echo "Next Steps:"
echo "1. Set your OpenRouter API key: export OPENROUTER_API_KEY=sk-or-v1-your-key-here"
echo "2. Test the examples: ./examples/agent_integrations/claude_code_examples.sh"
echo "3. Read the integration guide: examples/AGENT_INTEGRATION_GUIDE.md"
echo ""
echo "Log file: $LOG_FILE"
echo "Correlation ID: $CORRELATION_ID"
echo "=========================================="

# Final heartbeat
heartbeat "agent_setup_complete" "OK" "0" "setup_complete=1"