#!/usr/bin/env python3
"""
Domain-Driven Design (DDD) - SQLite Zero-Latency Event Bus
Provides strict physical decoupling for pub/sub boundaries.
"""
import sqlite3
import os
import json
import time

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
DB_PATH = os.path.join(ROOT_DIR, '.goalie', 'event_bus.db')

def init_bus():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS domain_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL,
            event_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            timestamp REAL NOT NULL
        )
    ''')
    # Keep the bus lean (latest 1000 events)
    cur.execute('''
        CREATE TRIGGER IF NOT EXISTS truncate_events 
        AFTER INSERT ON domain_events
        BEGIN
            DELETE FROM domain_events WHERE id <= (NEW.id - 1000);
        END;
    ''')
    conn.commit()
    conn.close()

def publish(domain: str, event_type: str, payload: dict):
    conn = sqlite3.connect(DB_PATH, timeout=5.0)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO domain_events (domain, event_type, payload, timestamp) VALUES (?, ?, ?, ?)",
        (domain, event_type, json.dumps(payload), time.time())
    )
    conn.commit()
    conn.close()

def get_latest_event(event_type: str):
    try:
        conn = sqlite3.connect(DB_PATH, timeout=5.0)
        cur = conn.cursor()
        cur.execute(
            "SELECT payload FROM domain_events WHERE event_type = ? ORDER BY id DESC LIMIT 1",
            (event_type,)
        )
        row = cur.fetchone()
        conn.close()
        if row:
            return json.loads(row[0])
    except Exception:
        pass
    return None

if __name__ == "__main__":
    init_bus()
    print("--> 🛡️  DDD SQLite Event Bus Initialized at physical boundary.")
