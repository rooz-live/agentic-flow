#!/usr/bin/env python3
"""
CI/CD Promotion Gate Log Aggregator

Aggregates gate failure logs from CI runs into centralized log file.
"""

import os
import sys
import json
import glob
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def setup_log_directory():
    """Ensure log directory exists."""
    log_dir = os.path.join(os.path.dirname(__file__), '../../logs')
    os.makedirs(log_dir, exist_ok=True)
    return log_dir

def aggregate_ci_logs(log_dir):
    """Aggregate logs from CI artifacts and runs."""
    log_file = os.path.join(log_dir, 'promotion_gate.log')

    # Find CI log files (adjust patterns based on actual CI setup)
    log_patterns = [
        'ci/logs/*.log',
        'logs/ci/*.log',
        '.github/workflows/logs/*.log',
        'artifacts/**/*.log'
    ]

    aggregated_entries = []

    for pattern in log_patterns:
        pattern_path = os.path.join(os.path.dirname(__file__), '../../', pattern)
        for log_path in glob.glob(pattern_path, recursive=True):
            try:
                with open(log_path, 'r') as f:
                    for line in f:
                        if 'gate' in line.lower() and ('fail' in line.lower() or 'error' in line.lower()):
                            entry = {
                                'timestamp': datetime.utcnow().isoformat(),
                                'source': log_path,
                                'level': 'ERROR' if 'error' in line.lower() else 'WARN',
                                'message': line.strip(),
                                'type': 'gate_failure'
                            }
                            aggregated_entries.append(entry)
            except Exception as e:
                logger.warning(f"Error reading log file {log_path}: {e}")

    # Also check for JSON artifacts
    artifact_patterns = [
        'artifacts/**/*.json',
        'ci/artifacts/*.json'
    ]

    for pattern in artifact_patterns:
        pattern_path = os.path.join(os.path.dirname(__file__), '../../', pattern)
        for json_path in glob.glob(pattern_path, recursive=True):
            try:
                with open(json_path, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, dict) and 'gate_failures' in data:
                        for failure in data['gate_failures']:
                            entry = {
                                'timestamp': failure.get('timestamp', datetime.utcnow().isoformat()),
                                'source': json_path,
                                'level': 'ERROR',
                                'message': json.dumps(failure),
                                'type': 'gate_failure'
                            }
                            aggregated_entries.append(entry)
            except Exception as e:
                logger.warning(f"Error reading JSON artifact {json_path}: {e}")

    # Write aggregated logs
    if aggregated_entries:
        with open(log_file, 'a') as f:
            for entry in aggregated_entries:
                f.write(json.dumps(entry) + '\n')
        logger.info(f"Aggregated {len(aggregated_entries)} log entries to {log_file}")
    else:
        logger.info("No gate failure logs found to aggregate")

    return len(aggregated_entries)

def rotate_logs(log_dir, max_size_mb=10):
    """Rotate log file if it exceeds max size."""
    log_file = os.path.join(log_dir, 'promotion_gate.log')

    if os.path.exists(log_file):
        size_mb = os.path.getsize(log_file) / (1024 * 1024)
        if size_mb > max_size_mb:
            # Rotate log
            backup_file = f"{log_file}.{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.bak"
            os.rename(log_file, backup_file)
            logger.info(f"Rotated log file to {backup_file}")

            # Keep only last 5 backups
            backups = sorted(glob.glob(f"{log_file}.*.bak"))
            if len(backups) > 5:
                for old_backup in backups[:-5]:
                    os.remove(old_backup)
                    logger.info(f"Removed old backup {old_backup}")

def generate_log_summary(log_dir):
    """Generate summary of recent gate failures."""
    log_file = os.path.join(log_dir, 'promotion_gate.log')
    summary_file = os.path.join(log_dir, 'promotion_gate_summary.json')

    if not os.path.exists(log_file):
        logger.info("No log file found for summary generation")
        return

    summary = {
        'generated_at': datetime.utcnow().isoformat(),
        'total_failures': 0,
        'failures_by_hour': {},
        'failures_by_type': {},
        'recent_failures': []
    }

    try:
        with open(log_file, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    summary['total_failures'] += 1

                    # Count by hour
                    hour = entry['timestamp'][:13]  # YYYY-MM-DDTHH
                    summary['failures_by_hour'][hour] = summary['failures_by_hour'].get(hour, 0) + 1

                    # Count by type/level
                    level = entry.get('level', 'UNKNOWN')
                    summary['failures_by_type'][level] = summary['failures_by_type'].get(level, 0) + 1

                    # Keep recent failures (last 10)
                    if len(summary['recent_failures']) < 10:
                        summary['recent_failures'].append(entry)

                except json.JSONDecodeError:
                    continue

        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)

        logger.info(f"Generated log summary with {summary['total_failures']} failures")

    except Exception as e:
        logger.error(f"Error generating log summary: {e}")

def main():
    """Main function to aggregate logs."""
    log_dir = setup_log_directory()

    # Aggregate logs
    entries_count = aggregate_ci_logs(log_dir)

    # Rotate if necessary
    rotate_logs(log_dir)

    # Generate summary
    generate_log_summary(log_dir)

    logger.info(f"Log aggregation completed. Processed {entries_count} entries.")

if __name__ == '__main__':
    main()
