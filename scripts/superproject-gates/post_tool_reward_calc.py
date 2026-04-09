#!/usr/bin/env python3
"""
Post-Tool Reward Calculation Hook
==================================
Called after tool execution to calculate granular rewards
based on success, WSJF confidence, and latency.

Hook Interface:
    Input: context dict with execution results
    Output: enhanced context with calculated reward
"""

import json
import sys
import subprocess
from pathlib import Path


def hook(context: dict) -> dict:
    """
    Calculate reward from execution context.
    
    Args:
        context: Execution context with keys:
            - success: bool or int (1/0)
            - wsjf_context: dict with confidence
            - latency_ms: float
            - (other keys preserved)
    
    Returns:
        Enhanced context with 'reward' field
    """
    # Extract inputs
    success = int(context.get('success', 1))
    wsjf_context = context.get('wsjf_context', {})
    wsjf_confidence = float(wsjf_context.get('confidence', 0.50))
    latency_ms = float(context.get('latency_ms', 1000.0))
    
    # Calculate reward using subprocess
    calculator_path = Path(__file__).parent.parent / 'reward-calculator.py'
    
    try:
        result = subprocess.run([
            'python3',
            str(calculator_path),
            '--success', str(success),
            '--wsjf-confidence', str(wsjf_confidence),
            '--latency-ms', str(latency_ms),
            '--breakdown'
        ], capture_output=True, text=True, timeout=5)
        
        if result.returncode == 0:
            breakdown = json.loads(result.stdout)
            reward = breakdown['reward']
            context['reward'] = reward
            context['reward_breakdown'] = breakdown
        else:
            # Fallback calculation
            reward = max(0.60, min(1.00, wsjf_confidence))
            context['reward'] = reward
            context['reward_breakdown'] = {'note': 'fallback calculation'}
    except Exception as e:
        # Fallback on error
        reward = 0.80
        context['reward'] = reward
        context['reward_breakdown'] = {'error': str(e)}
    
    return context


def main():
    """CLI interface for testing"""
    if len(sys.argv) > 1:
        # Read context from JSON argument
        context = json.loads(sys.argv[1])
    else:
        # Read from stdin
        context = json.load(sys.stdin)
    
    # Apply hook
    result = hook(context)
    
    # Output result
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
