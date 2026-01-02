#!/usr/bin/env python3

# Simple script to fix the import issue in cmd_pattern_stats_enhanced.py

with open('cmd_pattern_stats_enhanced.py', 'r') as f:
    content = f.read()
    
# Replace the problematic import line
fixed_content = content.replace(
    'from priority.wsjf_adjuster import WSJFAdjuster',
    '# Use local fallback implementation'
)

with open('cmd_pattern_stats_enhanced.py', 'w') as f:
    f.write(fixed_content)

print("Fixed import issue in cmd_pattern_stats_enhanced.py")