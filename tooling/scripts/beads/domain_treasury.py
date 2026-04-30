#!/usr/bin/env python3
"""
Domain A: Autonomous Finance (The Treasury)
Responsibility: Exclusively manages the SQLite OPEX ledger and generates 
the economic_modifier tensor constraint, publishing it to the Event Bus.
"""
import time
import os
import sqlite3
import datetime
import ddd_event_bus

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
BUDGET_DB_PATH = os.path.join(ROOT_DIR, '.goalie', 'budget_logs', 'budget_tracking.db')

def get_opex_state():
    if not os.path.exists(BUDGET_DB_PATH):
        return 100.0, 0.0
    try:
        conn = sqlite3.connect(BUDGET_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT allocated_amount, spent_amount FROM budgets WHERE type = 'opex' ORDER BY created_at DESC LIMIT 1")
        row = cur.fetchone()
        conn.close()
        if row:
            return float(row[0]), float(row[1])
    except Exception as e:
        print(f"--> [WARNING] Treasury OPEX Fetch Failed: {e}")
    return 100.0, 0.0

def start_treasury_loop():
    print("--> 🏛️  DOMAIN A: Autonomous Finance (Treasury) Online.")
    print("--> 📡 Emitting continuous Economic Demand limits to Event Bus...")
    try:
        while True:
            allocated_opex, spent_opex = get_opex_state()
            budget_utilization = (spent_opex / allocated_opex) if allocated_opex > 0 else 0
            
            # The mathematical economic constraint
            economic_modifier = 1.0 + (budget_utilization * 2.5)
            
            payload = {
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "allocated": allocated_opex,
                "spent": spent_opex,
                "utilization": round(budget_utilization, 4),
                "economic_modifier": round(economic_modifier, 4)
            }
            
            ddd_event_bus.publish("TREASURY", "FinanceLimitEvent", payload)
            
            # Treasury ticks slower than high-frequency telemetry
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n--> 🏛️  Treasury Context halted.")

if __name__ == "__main__":
    start_treasury_loop()
