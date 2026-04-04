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
