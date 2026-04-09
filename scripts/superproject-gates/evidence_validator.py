#!/usr/bin/env python3
"""
Evidence Validator
Validates evidence completeness, integrity, and freshness
"""

import json
import os
import sys
import hashlib
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict

@dataclass
class ValidationResult:
    """Result of evidence validation"""
    evidence_id: str
    is_valid: bool
    checks_passed: List[str]
    checks_failed: List[str]
    integrity_score: float
    completeness_score: float
    freshness_score: float
    overall_score: float
    issues: List[str]
    recommendations: List[str]

@dataclass
class EvidenceValidationReport:
    """Complete validation report for evidence set"""
    timestamp: datetime
    total_evidence: int
    valid_evidence: int
    invalid_evidence: int
    validation_results: List[ValidationResult]
    summary: Dict[str, Any]

class EvidenceValidator:
    """Validates evidence for completeness, integrity, and freshness"""

    def __init__(self, project_root: Optional[str] = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.goalie_dir = self.project_root / ".goalie"
        self.evidence_dir = self.goalie_dir / "evidence_trails"

        # Validation thresholds
        self.freshness_threshold_hours = 24
        self.completeness_threshold = 0.8
        self.integrity_threshold = 0.9

    def validate_evidence_batch(self, evidence_ids: List[str]) -> EvidenceValidationReport:
        """Validate a batch of evidence entries"""
        validation_results = []

        for evidence_id in evidence_ids:
            result = self.validate_evidence(evidence_id)
            validation_results.append(result)

        # Generate summary
        total = len(validation_results)
        valid = sum(1 for r in validation_results if r.is_valid)
        invalid = total - valid

        summary = {
            "total_evidence": total,
            "valid_evidence": valid,
            "invalid_evidence": invalid,
            "validation_rate": valid / total if total > 0 else 0,
            "average_integrity_score": sum(r.integrity_score for r in validation_results) / total if total > 0 else 0,
            "average_completeness_score": sum(r.completeness_score for r in validation_results) / total if total > 0 else 0,
            "average_freshness_score": sum(r.freshness_score for r in validation_results) / total if total > 0 else 0,
            "average_overall_score": sum(r.overall_score for r in validation_results) / total if total > 0 else 0
        }

        return EvidenceValidationReport(
            timestamp=datetime.utcnow(),
            total_evidence=total,
            valid_evidence=valid,
            invalid_evidence=invalid,
            validation_results=validation_results,
            summary=summary
        )

    def validate_evidence(self, evidence_id: str) -> ValidationResult:
        """Validate a single evidence entry"""
        # Find evidence entry
        evidence_data = self._find_evidence_entry(evidence_id)

        if not evidence_data:
            return ValidationResult(
                evidence_id=evidence_id,
                is_valid=False,
                checks_passed=[],
                checks_failed=["evidence_not_found"],
                integrity_score=0.0,
                completeness_score=0.0,
                freshness_score=0.0,
                overall_score=0.0,
                issues=["Evidence entry not found"],
                recommendations=["Verify evidence ID and storage location"]
            )

        # Perform validation checks
        checks_passed = []
        checks_failed = []
        issues = []
        recommendations = []

        # 1. Completeness check
        completeness_score, completeness_issues = self._check_completeness(evidence_data)
        if completeness_score >= self.completeness_threshold:
            checks_passed.append("completeness")
        else:
            checks_failed.append("completeness")
            issues.extend(completeness_issues)
            recommendations.append("Add missing required fields to evidence")

        # 2. Integrity check
        integrity_score, integrity_issues = self._check_integrity(evidence_data)
        if integrity_score >= self.integrity_threshold:
            checks_passed.append("integrity")
        else:
            checks_failed.append("integrity")
            issues.extend(integrity_issues)
            recommendations.append("Verify evidence source and regenerate if compromised")

        # 3. Freshness check
        freshness_score, freshness_issues = self._check_freshness(evidence_data)
        if freshness_score >= 0.8:  # 80% freshness threshold
            checks_passed.append("freshness")
        else:
            checks_failed.append("freshness")
            issues.extend(freshness_issues)
            recommendations.append("Update evidence with current data")

        # Calculate overall score
        overall_score = (completeness_score + integrity_score + freshness_score) / 3

        # Determine validity
        is_valid = len(checks_failed) == 0

        return ValidationResult(
            evidence_id=evidence_id,
            is_valid=is_valid,
            checks_passed=checks_passed,
            checks_failed=checks_failed,
            integrity_score=integrity_score,
            completeness_score=completeness_score,
            freshness_score=freshness_score,
            overall_score=overall_score,
            issues=issues,
            recommendations=recommendations
        )

    def validate_evidence_trail(self, decision_id: str) -> ValidationResult:
        """Validate an entire evidence trail for a decision"""
        # Find evidence trail
        trail_data = self._find_evidence_trail(decision_id)

        if not trail_data:
            return ValidationResult(
                evidence_id=f"trail_{decision_id}",
                is_valid=False,
                checks_passed=[],
                checks_failed=["trail_not_found"],
                integrity_score=0.0,
                completeness_score=0.0,
                freshness_score=0.0,
                overall_score=0.0,
                issues=["Evidence trail not found"],
                recommendations=["Verify decision ID and trail storage"]
            )

        # Validate all evidence in the trail
        evidence_ids = [entry["id"] for entry in trail_data.get("evidence_chain", [])]
        batch_report = self.validate_evidence_batch(evidence_ids)

        # Aggregate trail validation
        checks_passed = []
        checks_failed = []
        issues = []
        recommendations = []

        # Check trail completeness (all required circles represented)
        trail_completeness = self._check_trail_completeness(trail_data)
        if trail_completeness >= self.completeness_threshold:
            checks_passed.append("trail_completeness")
        else:
            checks_failed.append("trail_completeness")
            issues.append("Evidence trail missing required circle coverage")
            recommendations.append("Collect evidence from all required functional circles")

        # Check trail integrity (no conflicting evidence)
        trail_integrity = self._check_trail_integrity(trail_data)
        if trail_integrity >= self.integrity_threshold:
            checks_passed.append("trail_integrity")
        else:
            checks_failed.append("trail_integrity")
            issues.append("Evidence trail contains integrity issues")
            recommendations.append("Review and resolve conflicting evidence")

        # Check trail freshness
        trail_freshness = self._check_trail_freshness(trail_data)
        if trail_freshness >= 0.8:
            checks_passed.append("trail_freshness")
        else:
            checks_failed.append("trail_freshness")
            issues.append("Evidence trail contains stale evidence")
            recommendations.append("Update trail with current evidence")

        # Use batch report scores
        integrity_score = batch_report.summary["average_integrity_score"]
        completeness_score = batch_report.summary["average_completeness_score"]
        freshness_score = batch_report.summary["average_freshness_score"]

        # Adjust for trail-level checks
        integrity_score = (integrity_score + trail_integrity) / 2
        completeness_score = (completeness_score + trail_completeness) / 2
        freshness_score = (freshness_score + trail_freshness) / 2

        overall_score = (completeness_score + integrity_score + freshness_score) / 3
        is_valid = len(checks_failed) == 0

        return ValidationResult(
            evidence_id=f"trail_{decision_id}",
            is_valid=is_valid,
            checks_passed=checks_passed,
            checks_failed=checks_failed,
            integrity_score=integrity_score,
            completeness_score=completeness_score,
            freshness_score=freshness_score,
            overall_score=overall_score,
            issues=issues,
            recommendations=recommendations
        )

    def _find_evidence_entry(self, evidence_id: str) -> Optional[Dict[str, Any]]:
        """Find evidence entry by ID"""
        entries_file = self.evidence_dir / "evidence_entries.jsonl"

        try:
            with open(entries_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            entry = json.loads(line)
                            if entry.get("id") == evidence_id:
                                return entry
                        except json.JSONDecodeError:
                            continue
        except IOError:
            pass

        return None

    def _find_evidence_trail(self, decision_id: str) -> Optional[Dict[str, Any]]:
        """Find evidence trail by decision ID"""
        trails_file = self.evidence_dir / "evidence_trails.jsonl"

        try:
            with open(trails_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            trail = json.loads(line)
                            if trail.get("decision_id") == decision_id:
                                return trail
                        except json.JSONDecodeError:
                            continue
        except IOError:
            pass

        return None

    def _check_completeness(self, evidence_data: Dict[str, Any]) -> Tuple[float, List[str]]:
        """Check evidence completeness"""
        issues = []
        score = 1.0

        # Required fields for all evidence
        required_fields = ["id", "type", "circle", "gate", "timestamp", "data"]
        missing_fields = [field for field in required_fields if field not in evidence_data]

        if missing_fields:
            issues.append(f"Missing required fields: {', '.join(missing_fields)}")
            score -= len(missing_fields) * 0.2

        # Type-specific required fields
        evidence_type = evidence_data.get("type", "")
        type_requirements = {
            "governance_decision": ["data", "circle"],
            "health_check": ["data", "circle"],
            "validation": ["data", "circle"],
            "performance_baseline": ["data"],
            "regression": ["data", "circle"],
            "production_cycle": ["data", "circle"],
            "pattern_metric": ["data", "circle"],
            "system_metric": ["data"]
        }

        required_for_type = type_requirements.get(evidence_type, [])
        missing_type_fields = []
        for field in required_for_type:
            if field not in evidence_data:
                missing_type_fields.append(field)
            elif not evidence_data[field]:
                missing_type_fields.append(field)

        if missing_type_fields:
            issues.append(f"Missing type-specific fields for {evidence_type}: {', '.join(missing_type_fields)}")
            score -= len(missing_type_fields) * 0.15

        return max(0.0, score), issues

    def _check_integrity(self, evidence_data: Dict[str, Any]) -> Tuple[float, List[str]]:
        """Check evidence integrity"""
        issues = []
        score = 1.0

        # Check timestamp validity
        timestamp_str = evidence_data.get("timestamp")
        if timestamp_str:
            try:
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                now = datetime.utcnow()

                # Check if timestamp is not in the future
                if timestamp > now + timedelta(minutes=5):  # Allow 5 minute clock skew
                    issues.append("Evidence timestamp is in the future")
                    score -= 0.3

                # Check if timestamp is not too old (more than 90 days)
                if timestamp < now - timedelta(days=90):
                    issues.append("Evidence timestamp is too old")
                    score -= 0.2

            except ValueError:
                issues.append("Invalid timestamp format")
                score -= 0.4
        else:
            issues.append("Missing timestamp")
            score -= 0.4

        # Check data integrity (basic structure validation)
        data = evidence_data.get("data", {})
        if not isinstance(data, dict):
            issues.append("Evidence data is not a valid object")
            score -= 0.3

        # Check for known integrity markers
        integrity_hash = evidence_data.get("integrity_hash")
        if integrity_hash:
            # Verify hash if present
            data_str = json.dumps(data, sort_keys=True)
            calculated_hash = hashlib.sha256(data_str.encode()).hexdigest()
            if calculated_hash != integrity_hash:
                issues.append("Evidence integrity hash mismatch")
                score -= 0.5

        return max(0.0, score), issues

    def _check_freshness(self, evidence_data: Dict[str, Any]) -> Tuple[float, List[str]]:
        """Check evidence freshness"""
        issues = []
        score = 1.0

        timestamp_str = evidence_data.get("timestamp")
        if timestamp_str:
            try:
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                now = datetime.utcnow()
                age_hours = (now - timestamp).total_seconds() / 3600

                # Calculate freshness score (1.0 for fresh, 0.0 for stale)
                if age_hours <= 1:
                    score = 1.0
                elif age_hours <= self.freshness_threshold_hours:
                    # Linear decay from 1 hour to threshold
                    score = 1.0 - (age_hours - 1) / (self.freshness_threshold_hours - 1)
                else:
                    score = 0.0
                    issues.append(f"Evidence is stale (age: {age_hours:.1f} hours)")

            except ValueError:
                issues.append("Invalid timestamp for freshness check")
                score = 0.0
        else:
            issues.append("Missing timestamp for freshness check")
            score = 0.0

        return max(0.0, score), issues

    def _check_trail_completeness(self, trail_data: Dict[str, Any]) -> float:
        """Check evidence trail completeness"""
        evidence_chain = trail_data.get("evidence_chain", [])
        circles_covered = set()

        for entry in evidence_chain:
            circle = entry.get("circle")
            if circle:
                circles_covered.add(circle)

        # Required circles for governance decisions
        required_circles = {"analyst", "assessor", "orchestrator"}

        coverage = len(circles_covered & required_circles) / len(required_circles)
        return coverage

    def _check_trail_integrity(self, trail_data: Dict[str, Any]) -> float:
        """Check evidence trail integrity"""
        evidence_chain = trail_data.get("evidence_chain", [])

        if not evidence_chain:
            return 0.0

        # Check for chronological order
        timestamps = []
        for entry in evidence_chain:
            timestamp_str = entry.get("timestamp")
            if timestamp_str:
                try:
                    ts = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    timestamps.append(ts)
                except ValueError:
                    continue

        # Check if timestamps are in reasonable order (within 1 hour of each other)
        if len(timestamps) > 1:
            min_ts = min(timestamps)
            max_ts = max(timestamps)
            time_span = (max_ts - min_ts).total_seconds() / 3600  # hours

            if time_span > 1:  # More than 1 hour span
                return 0.8  # Slight penalty
            else:
                return 1.0
        else:
            return 0.9  # Minor penalty for single entry

    def _check_trail_freshness(self, trail_data: Dict[str, Any]) -> float:
        """Check evidence trail freshness"""
        last_updated_str = trail_data.get("last_updated")
        if last_updated_str:
            try:
                last_updated = datetime.fromisoformat(last_updated_str)
                now = datetime.utcnow()
                age_hours = (now - last_updated).total_seconds() / 3600

                # Similar freshness calculation as individual evidence
                if age_hours <= 1:
                    return 1.0
                elif age_hours <= self.freshness_threshold_hours:
                    return 1.0 - (age_hours - 1) / (self.freshness_threshold_hours - 1)
                else:
                    return 0.0
            except ValueError:
                return 0.0
        else:
            return 0.0

def main():
    """CLI interface for evidence validation"""
    if len(sys.argv) < 3:
        print("Usage: evidence_validator.py <command> <target> [options]")
        print("Commands: validate-evidence, validate-trail, validate-batch")
        sys.exit(1)

    command = sys.argv[1]
    target = sys.argv[2]
    validator = EvidenceValidator()

    if command == "validate-evidence":
        result = validator.validate_evidence(target)
        print(json.dumps(asdict(result), indent=2))

    elif command == "validate-trail":
        result = validator.validate_evidence_trail(target)
        print(json.dumps(asdict(result), indent=2))

    elif command == "validate-batch":
        # Parse evidence IDs from arguments or file
        evidence_ids = sys.argv[2:]

        if len(evidence_ids) == 1 and evidence_ids[0].endswith('.json'):
            # Load from file
            try:
                with open(evidence_ids[0], 'r') as f:
                    evidence_ids = json.load(f)
            except (IOError, json.JSONDecodeError):
                print("Error loading evidence IDs from file")
                sys.exit(1)

        report = validator.validate_evidence_batch(evidence_ids)
        result = {
            "timestamp": report.timestamp.isoformat(),
            "summary": report.summary,
            "results": [asdict(r) for r in report.validation_results]
        }
        print(json.dumps(result, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()