
import sys
import os
import time

# Add scripts dir to path
sys.path.append(os.path.join(os.getcwd(), "scripts"))
from agentic.pattern_logger import PatternLogger

def verify_enhanced_logging():
    print("🚀 Verifying Enhanced PatternLogger...")
    
    logger = PatternLogger(
        mode="test", 
        run_id=f"verify-{int(time.time())}", 
        tenant_id="test-tenant",
        tenant_platform="agentic-flow-core"
    )
    
    # 1. Verify Backtest Logging
    print("  Testing log_backtest_result...")
    logger.log_backtest_result(
        strategy_name="mean_reversion_v1",
        start_date="2024-01-01",
        end_date="2024-03-31",
        pnl=15000.50,
        sharpe_ratio=2.1,
        max_drawdown=-0.15,
        iteration=5
    )
    
    # 2. Verify Integration Event Logging (Symfony/Oro)
    print("  Testing log_integration_event (Symfony/Oro)...")
    logger.log_integration_event(
        platform="symfony-oro",
        event_type="customer_sync",
        external_id="CUST-999",
        status="success",
        details={"sync_time_ms": 120, "fields_updated": ["email", "status"]}
    )
    
    # 3. Verify Integration Event Logging (OpenStack/StarlingX)
    print("  Testing log_integration_event (StarlingX)...")
    logger.log_integration_event(
        platform="starlingx",
        event_type="host_provision",
        external_id="controller-0",
        status="in_progress",
        details={"region": "us-east-1", "profile": "latency-sensitive"}
    )
    
    print("✅ Verification calls complete. Checking log file...")
    
    log_file = ".goalie/pattern_metrics.jsonl"
    if os.path.exists(log_file):
        with open(log_file, 'r') as f:
            lines = f.readlines()
            last_3 = lines[-3:]
            for line in last_3:
                print(f"    📄 {line.strip()[:100]}...")
    else:
        print("❌ Log file not found!")

if __name__ == "__main__":
    verify_enhanced_logging()
