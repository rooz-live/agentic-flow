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
