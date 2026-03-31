#!/bin/bash
set -e

# Fix the llm-observatory.ts file
cat > /tmp/llm-observatory-fix.txt << 'EOF'
  /**
   * Get observability stats
   */
  getStats() {
    const spans = Array.from(this.spans.values());
    return {
      totalSpans: spans.length,
      runningSpans: spans.filter(s => s.status === 'running').length,
      successSpans: spans.filter(s => s.status === 'success').length,
      errorSpans: spans.filter(s => s.status === 'error').length,
      avgLatency: spans
        .filter(s => s.endTime)
        .reduce((sum, s) => sum + (s.endTime! - s.startTime), 0) / spans.length || 0,
    };
  }

  /**
   * Trace local LLM operations
   */
  traceLocalLLM<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    return this.trackInference(operation, fn);
  }
}

// Singleton instance
let observability: LLMObservability | null = null;

export function initializeLLMObservability(config?: Partial<LLMObservabilityConfig>): LLMObservability {
  if (!observability) {
    observability = new LLMObservability(config);
  }
  return observability;
}

export function getLLMObservability(): LLMObservability {
  if (!observability) {
    observability = new LLMObservability();
  }
  return observability;
}
EOF

# Find the line with getStats and remove everything after it
sed -i.bak '/^  \/\*\*$/,/^}$/{ /^  \/\*\*$/,/^  getStats/!d; }' src/observability/llm-observatory.ts 2>/dev/null || true

# Better approach: remove the incorrectly inserted lines
sed -i.bak '167,169d' src/observability/llm-observatory.ts

# Add the method properly inside the class before the closing brace
# Find the getStats method end and add traceLocalLLM after it
LINE=$(grep -n "^  getStats" src/observability/llm-observatory.ts | tail -1 | cut -d: -f1)
if [ ! -z "$LINE" ]; then
  # Add 13 lines to get past the getStats method
  INSERT_LINE=$((LINE + 13))
  sed -i.bak "${INSERT_LINE}a\\
\\
  /**\\
   * Trace local LLM operations\\
   */\\
  traceLocalLLM<T>(operation: string, fn: () => Promise<T>): Promise<T> {\\
    return this.trackInference(operation, fn);\\
  }
" src/observability/llm-observatory.ts
fi

rm -f src/observability/llm-observatory.ts.bak

echo "✅ Fixed llm-observatory.ts"
