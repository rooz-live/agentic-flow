#!/usr/bin/env python3
"""
Unified Validation + Backup Integration System
Integrates valid*.sh scripts with backup/capacity comparison
Tracks all validation iterations, edits, and formats
"""

import os
import json
import hashlib
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Paths
EMAILS_DIR = Path("/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/02-EMAILS")
VALIDATED_DIR = EMAILS_DIR / "validated"
SENT_DIR = EMAILS_DIR / "sent"
DRAFTS_DIR = EMAILS_DIR / "drafts"
META_DIR = EMAILS_DIR / ".meta"
TRACKING_FILE = META_DIR / "email-lifecycle-tracking.json"

# Validation scripts to integrate
VALIDATION_SCRIPTS = [
    "validate-email-pre-send.sh",
    "email-gate-lean.sh", 
    "validate-email.sh",
    "email-hitl-gate.sh",
    "validator-13-ultra-scanner.sh"
]

class EmailLifecycleTracker:
    """Tracks complete lifecycle of each email with WSJF prioritization"""
    
    def __init__(self):
        self.tracking_data = self._load_tracking_data()
        META_DIR.mkdir(parents=True, exist_ok=True)
    
    def _load_tracking_data(self) -> Dict:
        if TRACKING_FILE.exists():
            return json.loads(TRACKING_FILE.read_text())
        return {"emails": {}, "last_updated": datetime.now().isoformat()}
    
    def _save_tracking_data(self):
        self.tracking_data["last_updated"] = datetime.now().isoformat()
        TRACKING_FILE.write_text(json.dumps(self.tracking_data, indent=2))
    
    def compute_sha256(self, filepath: Path) -> str:
        """Compute SHA256 hash for duplicate detection"""
        sha256_hash = hashlib.sha256()
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def detect_duplicates(self) -> List[Tuple[str, List[str]]]:
        """Detect duplicate emails across directories"""
        hashes = {}
        for dir_path in [VALIDATED_DIR, SENT_DIR, DRAFTS_DIR]:
            if not dir_path.exists():
                continue
            for eml_file in dir_path.glob("*.eml"):
                file_hash = self.compute_sha256(eml_file)
                if file_hash in hashes:
                    hashes[file_hash].append(str(eml_file))
                else:
                    hashes[file_hash] = [str(eml_file)]
        
        duplicates = [(h, paths) for h, paths in hashes.items() if len(paths) > 1]
        return duplicates
    
    def run_validation_with_tracking(self, email_path: Path, script_name: str) -> Dict:
        """Run validation script and track iteration"""
        script_path = f"./scripts/validators/{script_name}"
        
        start_time = datetime.now()
        
        # Run validation
        try:
            result = subprocess.run(
                [script_path, "--file", str(email_path)],
                capture_output=True,
                text=True,
                timeout=30
            )
            exit_code = result.returncode
            output = result.stdout + result.stderr
        except Exception as e:
            exit_code = -1
            output = str(e)
        
        end_time = datetime.now()
        duration_ms = (end_time - start_time).total_seconds() * 1000
        
        # Parse validation results
        issues = []
        score = 0
        
        if "PLACEHOLDER" in output.upper():
            issues.append("Placeholder detected")
        if "Pro Se" not in output and "pro se" not in output.lower():
            issues.append("Missing Pro Se signature")
        if "N.C.G.S" not in output:
            issues.append("No legal citations")
        
        # Extract score if present
        for line in output.split("\n"):
            if "Score:" in line or "score:" in line:
                try:
                    score = int(line.split(":")[1].strip().split("/")[0])
                except:
                    pass
        
        iteration_data = {
            "timestamp": start_time.isoformat(),
            "script": script_name,
            "exit_code": exit_code,
            "duration_ms": round(duration_ms, 2),
            "issues": issues,
            "score": score if score > 0 else (100 if exit_code == 0 else 0),
            "output_preview": output[:500] if output else "",
            "file_hash": self.compute_sha256(email_path)
        }
        
        return iteration_data
    
    def track_email_edit(self, email_path: Path, editor: str, changes: str):
        """Track an edit to an email"""
        email_name = email_path.name
        
        if email_name not in self.tracking_data["emails"]:
            self.tracking_data["emails"][email_name] = {
                "created": datetime.now().isoformat(),
                "iterations": [],
                "edits": [],
                "formats": [],
                "story_arc": {},
                "wsjf_score": None
            }
        
        edit_data = {
            "timestamp": datetime.now().isoformat(),
            "editor": editor,
            "changes": changes,
            "file_hash": self.compute_sha256(email_path),
            "file_size": email_path.stat().st_size
        }
        
        self.tracking_data["emails"][email_name]["edits"].append(edit_data)
        self._save_tracking_data()
    
    def track_format_upgrade(self, email_path: Path, from_format: str, to_format: str, 
                            elements_added: List[str], styles_applied: List[str]):
        """Track formatting/design upgrades"""
        email_name = email_path.name
        
        if email_name not in self.tracking_data["emails"]:
            self.tracking_data["emails"][email_name] = {
                "created": datetime.now().isoformat(),
                "iterations": [],
                "edits": [],
                "formats": [],
                "story_arc": {},
                "wsjf_score": None
            }
        
        format_data = {
            "timestamp": datetime.now().isoformat(),
            "from_format": from_format,
            "to_format": to_format,
            "elements_added": elements_added,
            "styles_applied": styles_applied,
            "version": len(self.tracking_data["emails"][email_name]["formats"]) + 1
        }
        
        self.tracking_data["emails"][email_name]["formats"].append(format_data)
        self._save_tracking_data()
    
    def compute_wsjf_score(self, email_path: Path, bv: int, tc: int, rr: int, job_size: int) -> float:
        """Compute WSJF score for email prioritization"""
        wsjf_score = (bv + tc + rr) / job_size if job_size > 0 else 0
        
        email_name = email_path.name
        if email_name not in self.tracking_data["emails"]:
            self.tracking_data["emails"][email_name] = {
                "created": datetime.now().isoformat(),
                "iterations": [],
                "edits": [],
                "formats": [],
                "story_arc": {},
                "wsjf_score": None
            }
        
        self.tracking_data["emails"][email_name]["wsjf_score"] = {
            "bv": bv,
            "tc": tc, 
            "rr": rr,
            "job_size": job_size,
            "score": round(wsjf_score, 2),
            "priority": "NOW" if wsjf_score >= 50 else "NEXT" if wsjf_score >= 20 else "LATER"
        }
        self._save_tracking_data()
        return wsjf_score
    
    def track_story_arc(self, email_path: Path, components: Dict[str, bool]):
        """Track story arc completeness for narrative structure"""
        email_name = email_path.name
        
        if email_name not in self.tracking_data["emails"]:
            self.tracking_data["emails"][email_name] = {
                "created": datetime.now().isoformat(),
                "iterations": [],
                "edits": [],
                "formats": [],
                "story_arc": {},
                "wsjf_score": None
            }
        
        total_components = len(components)
        present_components = sum(1 for v in components.values() if v)
        completeness = (present_components / total_components * 100) if total_components > 0 else 0
        
        self.tracking_data["emails"][email_name]["story_arc"] = {
            "components": components,
            "completeness_score": round(completeness, 1),
            "timestamp": datetime.now().isoformat()
        }
        self._save_tracking_data()
    
    def get_email_summary(self, email_name: str) -> Dict:
        """Get complete summary of email lifecycle"""
        if email_name not in self.tracking_data["emails"]:
            return {"error": "Email not tracked"}
        
        data = self.tracking_data["emails"][email_name]
        
        return {
            "email": email_name,
            "total_iterations": len(data.get("iterations", [])),
            "total_edits": len(data.get("edits", [])),
            "format_versions": len(data.get("formats", [])),
            "current_format": data.get("formats", [{}])[-1].get("to_format", "unknown"),
            "wsjf": data.get("wsjf_score", {}),
            "story_arc_completeness": data.get("story_arc", {}).get("completeness_score", 0),
            "last_updated": data.get("edits", [{}])[-1].get("timestamp", "unknown")
        }
    
    def get_priority_queue(self) -> List[Tuple[str, float, str]]:
        """Get emails sorted by WSJF score"""
        queue = []
        for email_name, data in self.tracking_data["emails"].items():
            wsjf = data.get("wsjf_score", {})
            if wsjf:
                queue.append((
                    email_name,
                    wsjf.get("score", 0),
                    wsjf.get("priority", "LATER")
                ))
        
        queue.sort(key=lambda x: x[1], reverse=True)
        return queue


def main():
    tracker = EmailLifecycleTracker()
    
    # Example: Track validation iterations
    print("=== Email Lifecycle Tracking System ===")
    print()
    
    # Detect duplicates
    print("🔍 Detecting duplicates...")
    duplicates = tracker.detect_duplicates()
    if duplicates:
        print(f"  Found {len(duplicates)} duplicate sets")
        for h, paths in duplicates[:3]:
            print(f"    - {len(paths)} files with hash {h[:16]}...")
    else:
        print("  No duplicates found")
    
    print()
    print("📊 Email priority queue (WSJF):")
    queue = tracker.get_priority_queue()
    for email, score, priority in queue[:5]:
        print(f"  [{priority}] {email}: {score}")
    
    print()
    print("✅ Tracking system ready")
    print(f"   Data stored in: {TRACKING_FILE}")


if __name__ == "__main__":
    main()
