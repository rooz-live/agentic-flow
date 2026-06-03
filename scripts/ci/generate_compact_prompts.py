#!/usr/bin/env python3
"""
Generate compact prompt templates per critical milestones.
- Reads optional spec JSON: docs/prompts/spec.json
- Writes N templates per milestone to an output directory
- Produces an index file (JSON + MD) with metadata

Usage:
  python3 scripts/ci/generate_compact_prompts.py \
    --out-dir docs/prompts/milestones \
    --count-per-milestone 10 \
    --max-words 300 \
    --optimize-order "speed,safety,readability,performance" \
    --correlation-id consciousness-1758658960
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
from typing import Dict, List

DEFAULT_MILESTONES = [
  "go_no_go", "go_live", "pi_sync", "risk_mitigation", "remediation",
  "calibration", "monitoring", "approval", "deployment", "rollback",
  "post_launch", "value_convergence", "entrainment", "attention_bridge"
]

DEFAULT_VALIDATION = {
  "go_no_go": "curl -s http://localhost:8080/api/admin/status | jq '.deployment_ready'",
  "go_live": "curl -s http://localhost:8080/api/metrics/p0_rate | jq '.current_rate < 5'",
  "pi_sync": "python3 scripts/ci/validate_pi_sync.py --update",
  "risk_mitigation": "./scripts/emergency_disable.sh --test-mode",
  "remediation": "./scripts/ci/local_promotion_gate.sh --validate",
  "calibration": "./scripts/ci/run_calibration_enhanced.sh --count 10 --neural --claude",
  "monitoring": "python3 scripts/ci/collect_metrics.py --format json --output docs/METRICS_BASELINE.json",
  "approval": "./scripts/approval/initiate_team_approval.sh || true",
  "deployment": "curl -X POST http://localhost:8080/api/admin/enable-gates -d '{""percentage"":1}'",
  "rollback": "./scripts/verify_gates_disabled.sh",
  "post_launch": "python3 scripts/collect_production_metrics.py || true",
  "value_convergence": "python3 scripts/measure_team_convergence.py --matrix --validate || true",
  "entrainment": "python3 scripts/validate_rhythm_sync.py --entrainment --frequency || true",
  "attention_bridge": "python3 scripts/tune_attention_mechanisms.py --validate --accuracy || true"
}

SPEC_PATH = Path("docs/prompts/spec.json")

SECTION_ORDER = [
  "Goal", "Inputs", "Constraints", "Deliverables", "Validation",
  "Authority", "Clarification", "DoD", "Priority"
]

def load_spec() -> Dict:
  if SPEC_PATH.exists():
    with open(SPEC_PATH, "r") as f:
      return json.load(f)
  # default spec
  return {
    "milestones": DEFAULT_MILESTONES,
    "trust": {
      "docs/BLOCKER_ANALYSIS.md": 0.95,
      "docs/BLOCKERS_RESOLVED.md": 0.95,
      "docs/MONITORING_SETUP.md": 0.9,
      "scripts/ci/collect_metrics.py": 0.9
    },
    "notes": "Auto-generated spec; edit docs/prompts/spec.json to customize."
  }


def kebab(s: str) -> str:
  return s.lower().replace(" ", "-").replace("_", "-")


def title_for(milestone: str) -> str:
  return {
    "go_no_go": "GO/NO-GO Decision",
    "go_live": "Go-Live Execution",
    "pi_sync": "PI Sync Validation",
    "risk_mitigation": "Risk Mitigation",
    "remediation": "Remediation Action",
    "calibration": "Calibration & Baseline",
    "monitoring": "Monitoring & Telemetry",
    "approval": "Team Approval",
    "deployment": "Deployment Rollout",
    "rollback": "Emergency Rollback",
    "post_launch": "Post-Launch Validation",
    "value_convergence": "Value Exchange Convergence",
    "entrainment": "Rhythmical Entrainment",
    "attention_bridge": "Attention & Intelligibility Bridge",
  }.get(milestone, milestone.replace("_", " ").title())


def render_template(milestone: str, idx: int, max_words: int, optimize_order: str, corr_id: str, trust: Dict[str, float]) -> str:
  now = dt.datetime.utcnow().isoformat() + "Z"
  goal = f"Achieve {title_for(milestone)} outcome #{idx} swiftly to unlock the next gate."
  inputs = ", ".join([f"{p} (trust:{t:.2f})" for p, t in trust.items()])
  constraints = (
    "Time: strict; Risk: minimized; Tools: bash, curl, python only; Do: validate and log; "
    "Don't: change prod configs without explicit approval."
  )
  deliverables = (
    "One markdown note (<300 words) + 1 command (<=120 chars) + 1 JSON snippet (<=512 bytes)."
  )
  validation = DEFAULT_VALIDATION.get(milestone, "echo VALIDATE && true")
  authority = (
    "May read and run non-destructive checks; may propose edits; MUST NOT deploy or alter prod without approval."
  )
  clarification = "Before you start, ask up to 3 questions if any constraints are unclear; otherwise proceed."
  dod = (
    "Outputs within limits; constraints respected; command/test included; rationale ties to constraints; risks/assumptions listed."
  )
  priority = f"Optimize for {optimize_order}."
  risks = "Open risks: env parity, missing credentials, tool availability. Assumptions: endpoints reachable, logs writable."

  body = [
    f"Goal: {goal}",
    f"Inputs: {inputs}",
    f"Constraints: {constraints}",
    f"Deliverables: {deliverables}",
    f"Validation: {validation}",
    f"Authority: {authority}",
    f"Clarification: {clarification}",
    f"DoD: {dod}",
    f"Priority: {priority}",
    f"Risks/Assumptions: {risks}",
    f"Correlation: {corr_id} | Template: {milestone}:{idx} | Generated: {now}",
  ]
  text = "\n".join(body)
  # rudimentary length guard
  words = text.split()
  if len(words) > max_words:
    text = " ".join(words[:max_words])
  return text + "\n"


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument("--out-dir", default="docs/prompts/milestones")
  ap.add_argument("--count-per-milestone", type=int, default=8)
  ap.add_argument("--max-words", type=int, default=300)
  ap.add_argument("--optimize-order", default="speed,safety,readability,performance")
  ap.add_argument("--correlation-id", default="consciousness-1758658960")
  args = ap.parse_args()

  spec = load_spec()
  milestones = spec.get("milestones", DEFAULT_MILESTONES)
  base_trust = spec.get("trust", {})
  priorities = spec.get("priorities", {})
  trust_overrides = spec.get("trust_overrides", {})

  out_dir = Path(args.out_dir)
  out_dir.mkdir(parents=True, exist_ok=True)

  index: List[Dict] = []

  for m in milestones:
    # merge trust: base + override per milestone
    merged_trust = dict(base_trust)
    if isinstance(trust_overrides, dict) and m in trust_overrides:
      merged_trust.update(trust_overrides[m])
    # priority per milestone (fallback to global arg)
    milestone_priority = priorities.get(m, args.optimize_order)

    for i in range(1, args.count_per_milestone + 1):
      fname = f"{kebab(m)}_{i:03d}.md"
      content = render_template(
        milestone=m,
        idx=i,
        max_words=args.max_words,
        optimize_order=milestone_priority,
        corr_id=args.correlation_id,
        trust=merged_trust,
      )
      with open(out_dir / fname, "w") as f:
        f.write(f"# {title_for(m)} — Template {i}\n\n")
        f.write(content)
      index.append({
        "milestone": m,
        "title": title_for(m),
        "template_number": i,
        "path": str(out_dir / fname),
      })

  # Write index files
  idx_json = out_dir.parent / "index.json"
  with open(idx_json, "w") as f:
    json.dump({
      "generated": dt.datetime.utcnow().isoformat() + "Z",
      "count": len(index),
      "optimize_order_default": args.optimize_order,
      "priorities": priorities,
      "correlation_id": args.correlation_id,
      "templates": index,
    }, f, indent=2)

  idx_md = out_dir.parent / "INDEX.md"
  with open(idx_md, "w") as f:
    f.write("# Compact Prompt Templates Index\n\n")
    f.write(f"Generated: {dt.datetime.utcnow().isoformat()}Z\n\n")
    f.write(f"Default optimize order: {args.optimize_order}\n\n")
    if priorities:
      f.write("Per-milestone priorities:\n\n")
      for k, v in priorities.items():
        f.write(f"- {k}: {v}\n")
      f.write("\n")
    for item in index:
      f.write(f"- [{item['title']} #{item['template_number']}]({item['path']})\n")

  print(f"Generated {len(index)} templates in {out_dir}")
  print(f"Index: {idx_json}")

if __name__ == "__main__":
  main()
