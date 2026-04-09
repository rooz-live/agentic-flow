#!/usr/bin/env python3
"""
Evidence Trail Management System
Comprehensive evidence collection, validation, and trail management across all functional circles
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, asdict
from enum import Enum

class EvidenceType(Enum):
    GOVERNANCE_DECISION = "governance_decision"
    HEALTH_CHECK = "health_check"
    VALIDATION = "validation"
    PERFORMANCE_BASELINE = "performance_baseline"
    REGRESSION = "regression"
    PRODUCTION_CYCLE = "production_cycle"
    PATTERN_METRIC = "pattern_metric"
    SYSTEM_METRIC = "system_metric"

class EvidenceStatus(Enum):
    PENDING = "pending"
    VALIDATED = "validated"
    INVALID = "invalid"
    EXPIRED = "expired"

@dataclass
class EvidenceEntry:
    """Evidence entry with metadata"""
    id: str
    type: EvidenceType
    circle: str
    gate: str
    timestamp: datetime
    data: Dict[str, Any]
    dependencies: List[str]
    status: EvidenceStatus
    validation_rules: Dict[str, Any]
    freshness_threshold: int  # seconds
    integrity_hash: Optional[str] = None

@dataclass
class EvidenceTrail:
    """Complete evidence trail for a governance decision"""
    decision_id: str
    circles: List[str]
    evidence_chain: List[EvidenceEntry]
    completeness_score: float
    validation_status: str
    created_at: datetime
    last_updated: datetime

class EvidenceTrailManager:
    """Manages comprehensive evidence trails across all functional circles"""

    def __init__(self, project_root: Optional[str] = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.goalie_dir = self.project_root / ".goalie"
        self.config_file = self.goalie_dir / "evidence_trail_config.json"

        # Evidence storage
        self.evidence_dir = self.goalie_dir / "evidence_trails"
        self.trails_file = self.evidence_dir / "evidence_trails.jsonl"
        self.entries_file = self.evidence_dir / "evidence_entries.jsonl"

        # Ensure directories exist
        self.evidence_dir.mkdir(exist_ok=True)

        # Load configuration
        self.config = self._load_config()

        # Circle definitions
        self.functional_circles = [
            "analyst", "assessor", "innovator", "intuitive", "orchestrator", "seeker"
        ]

    def _load_config(self) -> Dict[str, Any]:
        """Load evidence trail configuration"""
        default_config = {
            "evidence_types": {
                "governance_decision": {
                    "required_circles": ["analyst", "assessor", "orchestrator"],
                    "freshness_threshold": 3600,  # 1 hour
                    "validation_rules": {
                        "completeness_check": True,
                        "cross_circle_validation": True
                    }
                },
                "health_check": {
                    "required_circles": ["all"],
                    "freshness_threshold": 300,  # 5 minutes
                    "validation_rules": {
                        "health_status_check": True,
                        "metric_validation": True
                    }
                },
                "validation": {
                    "required_circles": ["assessor"],
                    "freshness_threshold": 1800,  # 30 minutes
                    "validation_rules": {
                        "result_validation": True
                    }
                }
            },
            "trail_requirements": {
                "min_completeness_score": 0.8,
                "max_evidence_age_days": 30,
                "cross_circle_dependencies": True
            }
        }

        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    loaded_config = json.load(f)
                    default_config.update(loaded_config)
            except json.JSONDecodeError:
                print(f"Warning: Invalid config file {self.config_file}, using defaults")

        return default_config

    def collect_evidence(self, evidence_type: str, circle: str, gate: str,
                        data: Dict[str, Any], dependencies: Optional[List[str]] = None) -> str:
        """Collect and store evidence entry"""
        evidence_id = f"{evidence_type}_{circle}_{gate}_{int(time.time())}"

        # Get validation rules for this evidence type
        type_config = self.config.get("evidence_types", {}).get(evidence_type, {})
        freshness_threshold = type_config.get("freshness_threshold", 3600)
        validation_rules = type_config.get("validation_rules", {})

        # Create evidence entry
        entry = EvidenceEntry(
            id=evidence_id,
            type=EvidenceType(evidence_type),
            circle=circle,
            gate=gate,
            timestamp=datetime.utcnow(),
            data=data,
            dependencies=dependencies or [],
            status=EvidenceStatus.PENDING,
            validation_rules=validation_rules,
            freshness_threshold=freshness_threshold
        )

        # Store evidence entry
        self._store_evidence_entry(entry)

        # Emit evidence integration event
        self._emit_evidence_integration(evidence_type, data, circle, gate)

        return evidence_id

    def validate_evidence_trail(self, decision_id: str) -> Dict[str, Any]:
        """Validate completeness and integrity of evidence trail"""
        trail = self._get_evidence_trail(decision_id)
        if not trail:
            return {"valid": False, "error": "Evidence trail not found"}

        validation_results = {
            "decision_id": decision_id,
            "overall_valid": True,
            "completeness_score": 0.0,
            "issues": [],
            "circle_coverage": {},
            "freshness_check": {},
            "integrity_check": {}
        }

        # Check circle coverage
        required_circles = set()
        for entry in trail.evidence_chain:
            type_config = self.config.get("evidence_types", {}).get(entry.type.value, {})
            req_circles = type_config.get("required_circles", [])
            if "all" in req_circles:
                required_circles.update(self.functional_circles)
            else:
                required_circles.update(req_circles)

        present_circles = set(entry.circle for entry in trail.evidence_chain)
        missing_circles = required_circles - present_circles

        validation_results["circle_coverage"] = {
            "required": list(required_circles),
            "present": list(present_circles),
            "missing": list(missing_circles),
            "coverage_percentage": len(present_circles) / len(required_circles) if required_circles else 1.0
        }

        if missing_circles:
            validation_results["issues"].append(f"Missing evidence from circles: {', '.join(missing_circles)}")
            validation_results["overall_valid"] = False

        # Check evidence freshness
        now = datetime.utcnow()
        expired_entries = []

        for entry in trail.evidence_chain:
            age_seconds = (now - entry.timestamp).total_seconds()
            if age_seconds > entry.freshness_threshold:
                expired_entries.append(entry.id)
                validation_results["issues"].append(f"Evidence {entry.id} is stale (age: {age_seconds}s, threshold: {entry.freshness_threshold}s)")

        validation_results["freshness_check"] = {
            "expired_entries": expired_entries,
            "fresh_percentage": (len(trail.evidence_chain) - len(expired_entries)) / len(trail.evidence_chain) if trail.evidence_chain else 1.0
        }

        if expired_entries:
            validation_results["overall_valid"] = False

        # Check evidence integrity (simplified hash check)
        integrity_issues = []
        for entry in trail.evidence_chain:
            if not self._validate_evidence_integrity(entry):
                integrity_issues.append(entry.id)
                validation_results["issues"].append(f"Evidence {entry.id} integrity check failed")

        validation_results["integrity_check"] = {
            "compromised_entries": integrity_issues,
            "integrity_percentage": (len(trail.evidence_chain) - len(integrity_issues)) / len(trail.evidence_chain) if trail.evidence_chain else 1.0
        }

        if integrity_issues:
            validation_results["overall_valid"] = False

        # Calculate completeness score
        coverage_weight = 0.4
        freshness_weight = 0.3
        integrity_weight = 0.3

        completeness_score = (
            validation_results["circle_coverage"]["coverage_percentage"] * coverage_weight +
            validation_results["freshness_check"]["fresh_percentage"] * freshness_weight +
            validation_results["integrity_check"]["integrity_percentage"] * integrity_weight
        )

        validation_results["completeness_score"] = completeness_score

        # Update trail status
        trail.completeness_score = completeness_score
        trail.validation_status = "valid" if validation_results["overall_valid"] else "invalid"
        trail.last_updated = datetime.utcnow()
        self._store_evidence_trail(trail)

        return validation_results

    def get_evidence_trail_status(self, decision_id: str) -> Dict[str, Any]:
        """Get current status of evidence trail"""
        trail = self._get_evidence_trail(decision_id)
        if not trail:
            return {"error": "Evidence trail not found"}

        return {
            "decision_id": decision_id,
            "completeness_score": trail.completeness_score,
            "validation_status": trail.validation_status,
            "evidence_count": len(trail.evidence_chain),
            "circles_covered": list(set(entry.circle for entry in trail.evidence_chain)),
            "last_updated": trail.last_updated.isoformat(),
            "created_at": trail.created_at.isoformat()
        }

    def get_recent_evidence(self, circle: Optional[str] = None,
                          evidence_type: Optional[str] = None,
                          limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent evidence entries"""
        entries = []

        try:
            with open(self.entries_file, 'r') as f:
                lines = f.readlines()
                for line in reversed(lines):
                    line = line.strip()
                    if line:
                        try:
                            entry_data = json.loads(line)
                            entry = self._deserialize_evidence_entry(entry_data)

                            # Apply filters
                            if circle and entry.circle != circle:
                                continue
                            if evidence_type and entry.type.value != evidence_type:
                                continue

                            entries.append(asdict(entry))
                            if len(entries) >= limit:
                                break
                        except json.JSONDecodeError:
                            continue
        except IOError:
            pass

        return entries

    def cleanup_expired_evidence(self, max_age_days: int = 30) -> int:
        """Clean up expired evidence entries"""
        cutoff_date = datetime.utcnow() - timedelta(days=max_age_days)
        removed_count = 0

        # Read all entries
        entries = []
        try:
            with open(self.entries_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            entry_data = json.loads(line)
                            entry = self._deserialize_evidence_entry(entry_data)
                            if entry.timestamp > cutoff_date:
                                entries.append(line)
                            else:
                                removed_count += 1
                        except json.JSONDecodeError:
                            entries.append(line)  # Keep malformed lines
        except IOError:
            pass

        # Write back non-expired entries
        with open(self.entries_file, 'w') as f:
            for entry in entries:
                f.write(entry + '\n')

        return removed_count

    def _store_evidence_entry(self, entry: EvidenceEntry) -> None:
        """Store evidence entry to file"""
        entry_data = asdict(entry)
        entry_data["type"] = entry.type.value
        entry_data["status"] = entry.status.value
        entry_data["timestamp"] = entry.timestamp.isoformat()

        with open(self.entries_file, 'a') as f:
            f.write(json.dumps(entry_data) + '\n')

    def _store_evidence_trail(self, trail: EvidenceTrail) -> None:
        """Store evidence trail to file"""
        trail_data = {
            "decision_id": trail.decision_id,
            "circles": trail.circles,
            "evidence_chain": [asdict(entry) for entry in trail.evidence_chain],
            "completeness_score": trail.completeness_score,
            "validation_status": trail.validation_status,
            "created_at": trail.created_at.isoformat(),
            "last_updated": trail.last_updated.isoformat()
        }

        # Update existing trail or append new one
        trails = []
        try:
            with open(self.trails_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            existing_trail = json.loads(line)
                            if existing_trail["decision_id"] != trail.decision_id:
                                trails.append(line)
                        except json.JSONDecodeError:
                            trails.append(line)
        except IOError:
            pass

        # Add current trail
        trails.append(json.dumps(trail_data))

        # Write back all trails
        with open(self.trails_file, 'w') as f:
            for trail_line in trails:
                f.write(trail_line + '\n')

    def _get_evidence_trail(self, decision_id: str) -> Optional[EvidenceTrail]:
        """Get evidence trail by decision ID"""
        try:
            with open(self.trails_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            trail_data = json.loads(line)
                            if trail_data["decision_id"] == decision_id:
                                return self._deserialize_evidence_trail(trail_data)
                        except json.JSONDecodeError:
                            continue
        except IOError:
            pass

        return None

    def _deserialize_evidence_entry(self, data: Dict[str, Any]) -> EvidenceEntry:
        """Deserialize evidence entry from dict"""
        return EvidenceEntry(
            id=data["id"],
            type=EvidenceType(data["type"]),
            circle=data["circle"],
            gate=data["gate"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            data=data["data"],
            dependencies=data["dependencies"],
            status=EvidenceStatus(data["status"]),
            validation_rules=data["validation_rules"],
            freshness_threshold=data["freshness_threshold"],
            integrity_hash=data.get("integrity_hash")
        )

    def _deserialize_evidence_trail(self, data: Dict[str, Any]) -> EvidenceTrail:
        """Deserialize evidence trail from dict"""
        return EvidenceTrail(
            decision_id=data["decision_id"],
            circles=data["circles"],
            evidence_chain=[self._deserialize_evidence_entry(e) for e in data["evidence_chain"]],
            completeness_score=data["completeness_score"],
            validation_status=data["validation_status"],
            created_at=datetime.fromisoformat(data["created_at"]),
            last_updated=datetime.fromisoformat(data["last_updated"])
        )

    def _validate_evidence_integrity(self, entry: EvidenceEntry) -> bool:
        """Validate evidence integrity (simplified)"""
        # In a real implementation, this would check cryptographic signatures
        # For now, just check if required fields are present
        required_fields = ["id", "type", "circle", "gate", "timestamp", "data"]
        return all(field in asdict(entry) for field in required_fields)

    def _emit_evidence_integration(self, evidence_type: str, data: Dict[str, Any],
                                 circle: str, gate: str) -> None:
        """Emit evidence to the evidence integration system"""
        try:
            # Import here to avoid circular imports
            sys.path.insert(0, str(self.project_root / "scripts"))
            from evidence_integration import EvidenceIntegration

            integration = EvidenceIntegration(str(self.project_root))
            integration.emit_evidence(evidence_type, data, circle=circle, gate=gate)
        except ImportError:
            # Evidence integration not available, continue silently
            pass

def main():
    """CLI interface for evidence trail management"""
    if len(sys.argv) < 2:
        print("Usage: evidence_trail_manager.py <command> [options]")
        print("Commands: collect-evidence, validate-trail, trail-status, get-evidence, cleanup")
        sys.exit(1)

    command = sys.argv[1]
    manager = EvidenceTrailManager()

    if command == "collect-evidence":
        if len(sys.argv) < 6:
            print("Usage: evidence_trail_manager.py collect-evidence <type> <circle> <gate> <data_json>")
            sys.exit(1)

        evidence_type = sys.argv[2]
        circle = sys.argv[3]
        gate = sys.argv[4]
        try:
            data = json.loads(sys.argv[5])
        except json.JSONDecodeError:
            print("Invalid JSON data")
            sys.exit(1)

        evidence_id = manager.collect_evidence(evidence_type, circle, gate, data)
        print(f"Evidence collected: {evidence_id}")

    elif command == "validate-trail":
        if len(sys.argv) < 3:
            print("Usage: evidence_trail_manager.py validate-trail <decision_id>")
            sys.exit(1)

        decision_id = sys.argv[2]
        result = manager.validate_evidence_trail(decision_id)
        print(json.dumps(result, indent=2))

    elif command == "trail-status":
        if len(sys.argv) < 3:
            print("Usage: evidence_trail_manager.py trail-status <decision_id>")
            sys.exit(1)

        decision_id = sys.argv[2]
        status = manager.get_evidence_trail_status(decision_id)
        print(json.dumps(status, indent=2))

    elif command == "get-evidence":
        circle = None
        evidence_type = None
        limit = 10

        # Parse optional arguments
        for i, arg in enumerate(sys.argv[2:]):
            if arg == "--circle" and i + 1 < len(sys.argv) - 2:
                circle = sys.argv[i + 3]
            elif arg == "--type" and i + 1 < len(sys.argv) - 2:
                evidence_type = sys.argv[i + 3]
            elif arg == "--limit" and i + 1 < len(sys.argv) - 2:
                try:
                    limit = int(sys.argv[i + 3])
                except ValueError:
                    pass

        evidence = manager.get_recent_evidence(circle, evidence_type, limit)
        print(json.dumps(evidence, indent=2))

    elif command == "cleanup":
        max_age = 30
        for i, arg in enumerate(sys.argv[2:]):
            if arg == "--max-age-days" and i + 1 < len(sys.argv) - 2:
                try:
                    max_age = int(sys.argv[i + 3])
                except ValueError:
                    pass

        removed = manager.cleanup_expired_evidence(max_age)
        print(f"Cleaned up {removed} expired evidence entries")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()