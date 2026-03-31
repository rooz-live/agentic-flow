#!/usr/bin/env python3
"""
Import calibration samples into AgentDB for learning
"""

import json
import sys
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

AGENTDB_PATH = Path(".agentdb/agentdb.sqlite")

def connect_agentdb():
    """Connect to AgentDB database"""
    if not AGENTDB_PATH.exists():
        print(f"Error: AgentDB not found at {AGENTDB_PATH}", file=sys.stderr)
        print("Initialize with: npx agentdb init ./agentdb.db --preset medium", file=sys.stderr)
        return None
    
    return sqlite3.connect(str(AGENTDB_PATH))

def import_samples(samples_file: str):
    """Import calibration samples to AgentDB"""
    
    # Load samples
    samples_path = Path(samples_file)
    if not samples_path.exists():
        print(f"Error: Samples file not found: {samples_file}", file=sys.stderr)
        return False
    
    with open(samples_path) as f:
        samples = json.load(f)
    
    if not isinstance(samples, list):
        print("Error: Samples must be a JSON array", file=sys.stderr)
        return False
    
    print(f"Loading {len(samples)} samples from {samples_file}")
    
    # Connect to AgentDB
    conn = connect_agentdb()
    if not conn:
        return False
    
    cursor = conn.cursor()
    
    # Import each sample as an episode
    imported_count = 0
    for sample in samples:
        try:
            # Extract sample data (handle both calibration and generic sample formats)
            sample_id = sample.get("sample_id", sample.get("commit_hash", "unknown"))
            timestamp = sample.get("timestamp", datetime.now(timezone.utc).isoformat())
            risk_score = sample.get("risk_score", sample.get("enhanced_risk_score", 0))
            confidence = sample.get("confidence", sample.get("claude_confidence", 0.0))
            
            # Create episode data
            episode_data = {
                "sample_id": sample_id,
                "risk_score": risk_score,
                "confidence": confidence,
                "source": sample.get("source", "calibration"),
                "neural_processed": sample.get("neural_processed", False),
                "claude_enhanced": sample.get("claude_enhanced", False)
            }
            
            # Calculate reward based on confidence and risk score
            # High confidence + appropriate risk detection = high reward
            reward = confidence * (1.0 if risk_score > 70 else 0.8)
            
            # Insert into learning_events table (matching AgentDB schema)
            cursor.execute("""
                INSERT INTO learning_events (
                    agent_id,
                    event_type,
                    context,
                    verdict,
                    confidence,
                    beam_tags,
                    command,
                    args,
                    exit_code,
                    duration_ms
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "calibration-agent",  # agent_id
                "risk_analysis",  # event_type
                json.dumps({"commit_hash": sample_id, "risk_score": risk_score}),  # context
                json.dumps({"risk_level": sample.get("risk_level", "HIGH")}),  # verdict
                confidence / 100.0 if confidence > 1 else confidence,  # confidence (normalize to 0-1)
                json.dumps(["calibration", "neural" if sample.get("neural_score", 0) > 0 else "standard"]),  # beam_tags
                "git commit analysis",  # command
                json.dumps(episode_data),  # args
                0,  # exit_code (success)
                None  # duration_ms
            ))
            
            imported_count += 1
            
            if imported_count % 100 == 0:
                print(f"  Imported {imported_count}/{len(samples)} samples...")
                conn.commit()
        
        except Exception as e:
            print(f"Warning: Failed to import sample {sample_id}: {e}", file=sys.stderr)
            continue
    
    # Final commit
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"✓ Successfully imported {imported_count}/{len(samples)} samples to AgentDB")
    return True

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ['-h', '--help']:
        print("Usage: python3 import_calibration_to_agentdb.py <samples_file.json>", file=sys.stderr)
        print("\nImport calibration samples into AgentDB for learning", file=sys.stderr)
        print("\nArguments:", file=sys.stderr)
        print("  <samples_file.json>  Path to JSON file containing calibration samples", file=sys.stderr)
        sys.exit(0 if len(sys.argv) > 1 else 1)
    
    samples_file = sys.argv[1]
    
    if not import_samples(samples_file):
        sys.exit(1)
    
    print("Import complete!")

if __name__ == "__main__":
    main()
