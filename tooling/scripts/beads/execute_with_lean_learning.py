import os
import sqlite3
import datetime
import json
import uuid

class BuildMeasureLearnCycle:
    def __init__(self, domain="SOVEREIGNTY_EVAL", db_path=None):
        self.domain = domain
        if db_path is None:
            # Point to the actual OPEX SQLite database
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
            self.db_path = os.path.join(root_dir, '.goalie', 'budget_logs', 'budget_tracking.db')
        else:
            self.db_path = db_path
            
        self._ensure_table_exists()

    def _ensure_table_exists(self):
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            # Ensure the OPEX database has an inference ledger table
            cur.execute('''
                CREATE TABLE IF NOT EXISTS qe_inference_ledger (
                    id TEXT PRIMARY KEY,
                    domain TEXT,
                    status TEXT,
                    ttfb_ms REAL,
                    tensor_hash TEXT,
                    roam_category TEXT,
                    created_at TIMESTAMP
                )
            ''')
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[Lean Learning] Warning: Could not initialize ledger - {e}")

    def log_execution(self, status, ttfb_ms=0.0, tensor_hash="UNKNOWN", roam_category="RESOLVED"):
        try:
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            record_id = str(uuid.uuid4())
            timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            cur.execute('''
                INSERT INTO qe_inference_ledger (id, domain, status, ttfb_ms, tensor_hash, roam_category, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (record_id, self.domain, status, float(ttfb_ms), tensor_hash, roam_category, timestamp))
            
            conn.commit()
            conn.close()
            print(f"[{self.domain}] Inference tensor {tensor_hash} mathematically logged to OPEX SQLite Ledger.")
            return record_id
        except Exception as e:
            print(f"[{self.domain}] Warning: Could not log to ledger - {e}")
            return None

if __name__ == "__main__":
    # Test execution boundary
    learner = BuildMeasureLearnCycle(domain="TEST_GATE")
    learner.log_execution("PASS", 12.5, "test_tensor_hash", "VERIFIED")
