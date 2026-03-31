#!/usr/bin/env bash
set -euo pipefail
SPEC_DIR="aisp/specs"
if [[ ! -d "$SPEC_DIR" ]]; then
  echo "No specs found at $SPEC_DIR" >&2
  exit 1
fi
status=0
for f in "$SPEC_DIR"/*.aisp; do
  [[ -e "$f" ]] || continue
  total=$(wc -w < "$f" | tr -d ' ')
  amb=$(grep -Eoi '\b(maybe|should|possibly|approximately|kinda|sort of|some|soon|later)\b' "$f" | wc -l | tr -d ' ')
  total=${total:-0}; amb=${amb:-0}
  if [[ "$total" -eq 0 ]]; then
    rate=0
  else
    rate=$(awk -v a="$amb" -v t="$total" 'BEGIN{printf "%.4f", (a/t)}')
  fi
  printf "%-28s  words:%5d  ambiguous:%3d  rate:%0.4f\n" "$(basename "$f")" "$total" "$amb" "$rate"
  # Fail if ambiguity rate > 0.02 (2%)
  awk -v r="$rate" 'BEGIN{exit (r>0.02?1:0)}' || { echo "✗ Ambiguity too high (>2%) in $f"; status=2; }
  # Basic well-formedness: ensure key blocks exist
  if ! grep -qE '^SPEC:' "$f"; then echo "✗ Missing SPEC: header in $f"; status=2; fi
  if ! grep -qE '^EVIDENCE:' "$f"; then echo "✗ Missing EVIDENCE: block in $f"; status=2; fi
  if ! grep -qE '^CONTRACT:' "$f"; then echo "✗ Missing CONTRACT: block in $f"; status=2; fi
  echo "—"
done
exit "$status"
