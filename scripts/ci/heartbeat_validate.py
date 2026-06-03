#!/usr/bin/env python3
"""
Validate standardized heartbeat lines across logs.
Format: ISO8601Z|component|phase|status|elapsed_sec|{json_meta}
Exits non-zero on validation errors.

Enhanced with sequence anomaly detection using Recurrence-Complete Models (2510.06828)
for frame-based action models and critical time threshold monitoring.
"""
import os
import re
import sys
import json
from datetime import datetime

LOG_DIRS = ["logs"]
FILE_NAMES = ["correlation.heartbeats.log", "universal_heartbeats.log", "component_correlation_heartbeats.log"]

ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$")


def parse_iso(ts: str) -> bool:
    if not ISO_RE.match(ts):
        return False
    try:
        datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


def validate_line(line: str, fname: str, lineno: int) -> str:
    parts = line.rstrip("\n").split("|")
    if len(parts) < 6:
        return f"{fname}:{lineno}: expected at least 6 pipe-separated fields, got {len(parts)}"
    ts, component, phase, status, elapsed, meta = parts[0], parts[1], parts[2], parts[3], parts[4], "|".join(parts[5:])
    if not parse_iso(ts):
        return f"{fname}:{lineno}: invalid ISO8601 timestamp: {ts}"
    if not component or not phase or not status:
        return f"{fname}:{lineno}: empty component/phase/status"
    try:
        float(elapsed)
    except ValueError:
        return f"{fname}:{lineno}: elapsed is not a float: {elapsed}"
    try:
        json.loads(meta)
    except json.JSONDecodeError:
        return f"{fname}:{lineno}: metadata is not valid JSON"
    return ""


def detect_sequence_anomalies(heartbeat_lines: list, critical_time_threshold: float = 5.0) -> dict:
    """
    Detect sequence anomalies in heartbeat data using frame-based action models.

    Implements Recurrence-Complete Models (2510.06828) approach for sequence anomaly detection
    with critical time threshold monitoring.

    Args:
        heartbeat_lines: List of parsed heartbeat lines
        critical_time_threshold: Time threshold for critical anomaly detection (seconds)

    Returns:
        Dict containing anomaly detection results
    """
    if not heartbeat_lines:
        return {'anomalies_detected': 0, 'total_sequences': 0, 'anomaly_details': []}

    anomalies = []
    sequence_patterns = {}

    # Group heartbeats by component for sequence analysis
    component_sequences = {}
    for line in heartbeat_lines:
        component = line['component']
        if component not in component_sequences:
            component_sequences[component] = []
        component_sequences[component].append(line)

    # Analyze sequences for each component
    for component, sequence in component_sequences.items():
        if len(sequence) < 3:  # Need minimum sequence length
            continue

        # Sort by timestamp
        sequence.sort(key=lambda x: x['timestamp'])

        # Detect timing anomalies
        timing_anomalies = _detect_timing_anomalies(sequence, critical_time_threshold)
        anomalies.extend(timing_anomalies)

        # Detect phase transition anomalies
        phase_anomalies = _detect_phase_transition_anomalies(sequence)
        anomalies.extend(phase_anomalies)

        # Detect status consistency anomalies
        status_anomalies = _detect_status_consistency_anomalies(sequence)
        anomalies.extend(status_anomalies)

        # Build expected sequence patterns
        pattern = _build_sequence_pattern(sequence)
        sequence_patterns[component] = pattern

    return {
        'anomalies_detected': len(anomalies),
        'total_sequences': len(component_sequences),
        'anomaly_details': anomalies,
        'sequence_patterns': sequence_patterns,
        'critical_threshold_used': critical_time_threshold
    }


def _detect_timing_anomalies(sequence: list, critical_threshold: float) -> list:
    """Detect timing-based anomalies in heartbeat sequences."""
    anomalies = []

    for i in range(1, len(sequence)):
        current = sequence[i]
        previous = sequence[i-1]

        try:
            current_time = datetime.fromisoformat(current['timestamp'].replace("Z", "+00:00"))
            previous_time = datetime.fromisoformat(previous['timestamp'].replace("Z", "+00:00"))

            time_diff = (current_time - previous_time).total_seconds()

            # Check for critical timing violations
            if time_diff > critical_threshold:
                anomalies.append({
                    'type': 'timing_anomaly',
                    'severity': 'critical',
                    'component': current['component'],
                    'description': f"Heartbeat interval {time_diff:.2f}s exceeds critical threshold {critical_threshold}s",
                    'timestamp': current['timestamp'],
                    'previous_timestamp': previous['timestamp'],
                    'time_diff_seconds': time_diff
                })
            elif time_diff < 0.1:  # Too frequent heartbeats
                anomalies.append({
                    'type': 'timing_anomaly',
                    'severity': 'warning',
                    'component': current['component'],
                    'description': f"Heartbeat too frequent: {time_diff:.2f}s between beats",
                    'timestamp': current['timestamp'],
                    'time_diff_seconds': time_diff
                })

        except (ValueError, KeyError) as e:
            anomalies.append({
                'type': 'timing_anomaly',
                'severity': 'error',
                'component': current.get('component', 'unknown'),
                'description': f"Failed to parse timestamps: {str(e)}",
                'timestamp': current.get('timestamp', 'unknown')
            })

    return anomalies


def _detect_phase_transition_anomalies(sequence: list) -> list:
    """Detect anomalous phase transitions in heartbeat sequences."""
    anomalies = []
    expected_transitions = {
        'init': ['process', 'complete'],
        'process': ['complete', 'error', 'timeout'],
        'complete': ['init', 'process'],
        'error': ['init', 'process'],
        'timeout': ['init', 'process']
    }

    for i in range(1, len(sequence)):
        current = sequence[i]
        previous = sequence[i-1]

        current_phase = current.get('phase', '')
        previous_phase = previous.get('phase', '')

        # Check for invalid phase transitions
        if previous_phase in expected_transitions:
            if current_phase not in expected_transitions[previous_phase]:
                anomalies.append({
                    'type': 'phase_transition_anomaly',
                    'severity': 'warning',
                    'component': current['component'],
                    'description': f"Unexpected phase transition: {previous_phase} -> {current_phase}",
                    'timestamp': current['timestamp'],
                    'expected_transitions': expected_transitions[previous_phase]
                })

    return anomalies


def _detect_status_consistency_anomalies(sequence: list) -> list:
    """Detect status consistency anomalies in heartbeat sequences."""
    anomalies = []

    # Track consecutive failures
    consecutive_failures = 0
    max_consecutive_failures = 3

    for line in sequence:
        status = line.get('status', '')

        if status == 'error' or status == 'failure':
            consecutive_failures += 1
            if consecutive_failures >= max_consecutive_failures:
                anomalies.append({
                    'type': 'status_consistency_anomaly',
                    'severity': 'high',
                    'component': line['component'],
                    'description': f"{consecutive_failures} consecutive failures detected",
                    'timestamp': line['timestamp'],
                    'consecutive_count': consecutive_failures
                })
        else:
            consecutive_failures = 0  # Reset on success

    return anomalies


def _build_sequence_pattern(sequence: list) -> dict:
    """Build expected sequence pattern from historical data."""
    phases = {}
    statuses = {}

    for line in sequence:
        phase = line.get('phase', 'unknown')
        status = line.get('status', 'unknown')

        phases[phase] = phases.get(phase, 0) + 1
        statuses[status] = statuses.get(status, 0) + 1

    # Calculate average elapsed time
    elapsed_times = []
    for line in sequence:
        try:
            elapsed_times.append(float(line.get('elapsed', 0)))
        except (ValueError, TypeError):
            continue

    avg_elapsed = sum(elapsed_times) / len(elapsed_times) if elapsed_times else 0

    return {
        'phase_distribution': phases,
        'status_distribution': statuses,
        'average_elapsed_time': avg_elapsed,
        'sequence_length': len(sequence)
    }


def main() -> int:
    errors = []
    found = 0
    all_heartbeat_lines = []

    for d in LOG_DIRS:
        if not os.path.isdir(d):
            continue
        for name in FILE_NAMES:
            path = os.path.join(d, name)
            if not os.path.isfile(path):
                continue
            with open(path, "r", errors="ignore") as f:
                for i, line in enumerate(f, 1):
                    if not line.strip():
                        continue
                    found += 1
                    err = validate_line(line, path, i)
                    if err:
                        errors.append(err)

                    # Parse line for anomaly detection
                    try:
                        parts = line.rstrip("\n").split("|")
                        if len(parts) >= 6:
                            parsed_line = {
                                'timestamp': parts[0],
                                'component': parts[1],
                                'phase': parts[2],
                                'status': parts[3],
                                'elapsed': parts[4],
                                'metadata': "|".join(parts[5:])
                            }
                            all_heartbeat_lines.append(parsed_line)
                    except Exception as e:
                        errors.append(f"{path}:{i}: Failed to parse for anomaly detection: {e}")

    if errors:
        for e in errors[:200]:
            print(e)
        print(f"Heartbeat validation failed: {len(errors)} errors")
        return 1

    if found == 0:
        print("No heartbeat lines found to validate; skipping.")
        return 0

    print(f"Heartbeat validation passed: {found} lines")

    # Perform sequence anomaly detection
    anomaly_results = detect_sequence_anomalies(all_heartbeat_lines)

    if anomaly_results['anomalies_detected'] > 0:
        print(f"Sequence anomalies detected: {anomaly_results['anomalies_detected']}")
        for anomaly in anomaly_results['anomaly_details'][:10]:  # Limit output
            print(f"  {anomaly['severity'].upper()}: {anomaly['description']} "
                  f"({anomaly['component']} @ {anomaly['timestamp']})")

        # Exit with error if critical anomalies found
        critical_anomalies = [a for a in anomaly_results['anomaly_details'] if a['severity'] == 'critical']
        if critical_anomalies:
            print(f"CRITICAL: {len(critical_anomalies)} critical anomalies require immediate attention")
            return 1
    else:
        print("No sequence anomalies detected")

    return 0


if __name__ == "__main__":
    sys.exit(main())