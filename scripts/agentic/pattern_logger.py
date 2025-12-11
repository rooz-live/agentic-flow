import os
import json
import datetime
import uuid
import subprocess
import sys

# Use env var for root if set, else relative to CWD
PROJECT_ROOT = os.environ.get("PROJECT_ROOT", ".")
GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")
METRICS_FILE = os.path.join(GOALIE_DIR, "pattern_metrics.jsonl")
HELPER_PATH = os.path.join(PROJECT_ROOT, "scripts", "agentic", "pattern_logging_helper.py")

class PatternLogger:
    def __init__(self, run_id=None, mode="advisory"):
        self.run_id = run_id or os.environ.get("AF_RUN_ID", str(uuid.uuid4()))
        self.mode = mode
        self._ensure_dir()

    def _ensure_dir(self):
        if not os.path.exists(GOALIE_DIR):
            os.makedirs(GOALIE_DIR, exist_ok=True)
    
    def _enrich_economics(self, pattern, circle, depth, mode, data):
        """
        Enrich economics via Python helper with fallback to zero
        """
        # If already provided, use it
        if "economic" in data and data["economic"].get("cod") and data["economic"].get("wsjf_score"):
            return data["economic"]
        
        # Build pattern state from data
        pattern_state = {}
        if pattern == "safe-degrade":
            pattern_state["safe_degrade"] = {
                "triggers": data.get("trigger_count", 1 if data.get("trigger") else 0)
            }
        elif pattern == "iteration-budget" or pattern == "iteration_budget":
            pattern_state["iteration_budget"] = {
                "requested": data.get("requested", 1),
                "enforced": data.get("enforced", 1)
            }
        elif pattern == "guardrail-lock" or pattern == "guardrail_lock":
            pattern_state["guardrail_lock"] = {
                "enforced": 1 if data.get("enforced") or data.get("action") == "enforce" else 0
            }
        elif pattern == "observability-first" or pattern == "observability_first":
            pattern_state["observability_first"] = {
                "metrics_written": data.get("metrics_written", 1),
                "missing_signals": data.get("missing_signals", 0)
            }
        elif pattern == "preflight_check":
            pattern_state["preflight_check"] = {
                "passed": data.get("status") == "passed"
            }
        
        # Try helper
        try:
            result = subprocess.run(
                [sys.executable, HELPER_PATH,
                 "--pattern", pattern,
                 "--circle", circle,
                 "--depth", str(depth),
                 "--mode", mode,
                 "--pattern-state", json.dumps(pattern_state),
                 "--economic-only"],
                timeout=0.2,
                capture_output=True,
                text=True
            )
            if result.returncode == 0 and result.stdout:
                econ = json.loads(result.stdout.strip())
                # Map cod -> cost_of_delay for schema compat
                return {
                    "wsjf_score": econ.get("wsjf_score", 0),
                    "cost_of_delay": econ.get("cod", 0),
                    "job_duration": 1,
                    "user_business_value": econ.get("wsjf_score", 0) * 0.5  # Approx
                }
        except Exception:
            pass
        
        # Fallback
        return {
            "wsjf_score": 0.0,
            "cost_of_delay": 0.0,
            "job_duration": 1,
            "user_business_value": 0.0
        }

    def log(self, pattern_name, data, mode_override=None, circle=None, depth=None):
        """
        Logs a pattern event to the metrics file with full schema compliance.
        pattern_name: str (e.g., 'safe_degrade', 'guardrail_lock')
        data: dict (event specific details)
        circle: str (optional, defaults to 'orchestrator')
        depth: int (optional, defaults to 0)
        """
        # Get run context from environment or defaults
        run_kind = os.environ.get("AF_RUN_KIND", "prod-cycle")
        
        # Schema-compliant event structure
        resolved_circle = circle or data.get("circle", "orchestrator")
        resolved_depth = depth or data.get("depth", 0)
        resolved_mode = mode_override or self.mode
        
        # Enrich economics
        economic = self._enrich_economics(pattern_name, resolved_circle, resolved_depth, resolved_mode, data)
        
        entry = {
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "pattern": pattern_name,
            "circle": resolved_circle,
            "depth": resolved_depth,
            "run_kind": run_kind,
            "gate": data.get("gate", "health"),
            "tags": data.get("tags", []),
            "economic": economic,
            "action_completed": data.get("action_completed", True),
            "mode": resolved_mode,
            "run_id": self.run_id,
            "data": data
        }
        
        try:
            with open(METRICS_FILE, "a") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception as e:
            print(f"[WARN] Failed to write pattern log: {e}")

    def log_safe_degrade(self, trigger, action, details=None):
        self.log("safe_degrade", {
            "trigger": trigger,
            "action": action,
            "details": details or {}
        })

    def log_guardrail(self, check, result, action):
        self.log("guardrail_lock", {
            "check": check,
            "result": result,
            "action": action
        })

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Log pattern events to Goalie metrics")
    parser.add_argument("pattern", help="Pattern name (e.g., observability_first)")
    parser.add_argument("--data", help="JSON string data", default="{}")
    parser.add_argument("--mode", help="Mode (advisory/mutate)", default="advisory")
    
    args = parser.parse_args()
    
    try:
        data = json.loads(args.data)
    except json.JSONDecodeError:
        data = {"raw": args.data}
        
    logger = PatternLogger(mode=args.mode)
    logger.log(args.pattern, data)
    print(f"Logged pattern: {args.pattern}")
