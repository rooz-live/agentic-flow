#!/usr/bin/env python3
"""
Import calibration samples into AgentDB for learning
"""

import json
import sys
import sqlite3
from pathlib import Path
from datetime import datetime

AGENTDB_PATH = Path("./agentdb.db")

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
            # Extract sample data
            sample_id = sample.get("sample_id", 0)
            timestamp = sample.get("timestamp", datetime.now(datetime.UTC).isoformat())
            risk_score = sample.get("risk_score", 0)
            confidence = sample.get("confidence", 0.0)
            
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
            
            # Insert into episodes table (matching AgentDB schema)
            cursor.execute("""
                INSERT INTO episodes (
                    session_id,
                    task,
                    input,
                    output,
                    critique,
                    reward,
                    success,
                    latency_ms,
                    tokens_used,
                    tags,
                    metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "calibration",  # session_id
                "risk_analysis",  # task
                json.dumps({"sample_id": sample_id}),  # input
                json.dumps({"risk_score": risk_score, "confidence": confidence}),  # output
                json.dumps(episode_data),  # critique
                reward,
                1,  # success
                None,  # latency_ms
                None,  # tokens_used
                json.dumps(["calibration", "neural" if sample.get("neural_processed") else "standard"]),  # tags
                json.dumps(episode_data)  # metadata
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
    if len(sys.argv) < 2:
        print("Usage: python3 import_calibration_to_agentdb.py <samples_file.json>", file=sys.stderr)
        sys.exit(1)
    
    samples_file = sys.argv[1]
    
    if not import_samples(samples_file):
        sys.exit(1)
    
    print("Import complete!")

if __name__ == "__main__":
    main()
