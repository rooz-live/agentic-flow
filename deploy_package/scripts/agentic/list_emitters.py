#!/usr/bin/env python3
"""List available evidence emitters and graduation thresholds"""
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
config_path = PROJECT_ROOT / "config" / "evidence_config.json"

if not config_path.exists():
    print(f"Error: {config_path} not found", file=sys.stderr)
    sys.exit(1)

with open(config_path) as f:
    config = json.load(f)

print('\n📊 Available Emitters:')
for name, cfg in config['emitters'].items():
    status = '✅ enabled' if cfg['enabled'] else '❌ disabled'
    default = ' (default)' if cfg.get('default', False) else ''
    phase = cfg['integration']['phase']
    timeout = cfg['timeout_sec']
    print(f'   {name}: {status}{default}')
    print(f'      Phase: {phase} | Timeout: {timeout}s')

print(f'\n🎯 Graduation Thresholds:')
for k, v in config['graduation_thresholds'].items():
    print(f'   {k}: {v}')
