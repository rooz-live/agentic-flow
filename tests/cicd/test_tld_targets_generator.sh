#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
python3 scripts/metrics/generate_tld_targets.py --check
test -f tests/e2e/tld-targets.generated.json
python3 -c "
import json
from pathlib import Path
d=json.loads(Path('tests/e2e/tld-targets.generated.json').read_text())
assert d['schema']=='tld_targets.generated.v1'
assert len(d['targets'])>=18
for t in d['targets']:
    assert t.get('tld') and t.get('titlePattern')
"
echo "PASS tld_targets_generator"
