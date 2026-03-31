#!/usr/bin/env python3
"""
MTTR (Mean Time To Recovery) Tracker
Tracks incidents, calculates MTTR, and integrates with alerting
Target: MTTR < 15 minutes (900 seconds)
"""

import os
import json
import time
import sqlite3
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
import requests
from threading import Thread

# Configuration
PROMETHEUS_URL = os.environ.get('PROMETHEUS_URL', 'http://localhost:9090')
ALERTMANAGER_URL = os.environ.get('ALERTMANAGER_URL', 'http://localhost:9093')
DB_PATH = os.environ.get('MTTR_DB_PATH', '/data/mttr.db')
MTTR_TARGET_SECONDS = int(os.environ.get('TARGET_MTTR_SECONDS', '900'))
CHECK_INTERVAL = int(os.environ.get('CHECK_INTERVAL', '30'))

PLATFORMS = ['hostbill', 'wordpress', 'flarum', 'affiliate', 'trading']


@dataclass
class Incident:
    id: str
    platform: str
    severity: str
    started_at: str
    resolved_at: Optional[str]
    duration_seconds: Optional[float]
    alert_name: str
    description: str


@dataclass
class MTTRMetrics:
    platform: str
    mttr_last_24h: float
    mttr_last_7d: float
    mttr_last_30d: float
    incident_count_24h: int
    incident_count_7d: int
    sla_compliant: bool
    current_incident: Optional[Incident]


def init_database():
    """Initialize SQLite database for incident tracking."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            severity TEXT NOT NULL,
            started_at TEXT NOT NULL,
            resolved_at TEXT,
            duration_seconds REAL,
            alert_name TEXT,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_platform_started 
        ON incidents(platform, started_at)
    ''')
    
    conn.commit()
    conn.close()


def get_active_alerts() -> List[Dict]:
    """Get active alerts from Alertmanager."""
    try:
        response = requests.get(f"{ALERTMANAGER_URL}/api/v2/alerts", timeout=5)
        return response.json() if response.status_code == 200 else []
    except Exception as e:
        print(f"Alertmanager query error: {e}")
        return []


def check_platform_status(platform: str) -> bool:
    """Check if a platform is currently up."""
    try:
        response = requests.get(
            f"{PROMETHEUS_URL}/api/v1/query",
            params={'query': f'up{{job="{platform}"}}'},
            timeout=5
        )
        data = response.json()
        if data.get('status') == 'success' and data.get('data', {}).get('result'):
            return float(data['data']['result'][0]['value'][1]) == 1.0
    except Exception as e:
        print(f"Prometheus query error: {e}")
    return False


def start_incident(platform: str, alert_name: str, description: str) -> str:
    """Record start of a new incident."""
    incident_id = f"{platform}-{int(time.time())}"
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO incidents (id, platform, severity, started_at, alert_name, description)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (incident_id, platform, 'critical', datetime.utcnow().isoformat(), alert_name, description))
    
    conn.commit()
    conn.close()
    
    print(f"Incident started: {incident_id} for {platform}")
    return incident_id


def resolve_incident(platform: str) -> Optional[float]:
    """Mark active incident as resolved and return duration."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Find active incident
    cursor.execute('''
        SELECT id, started_at FROM incidents 
        WHERE platform = ? AND resolved_at IS NULL
        ORDER BY started_at DESC LIMIT 1
    ''', (platform,))
    
    result = cursor.fetchone()
    if result:
        incident_id, started_at = result
        resolved_at = datetime.utcnow()
        started = datetime.fromisoformat(started_at)
        duration = (resolved_at - started).total_seconds()
        
        cursor.execute('''
            UPDATE incidents 
            SET resolved_at = ?, duration_seconds = ?
            WHERE id = ?
        ''', (resolved_at.isoformat(), duration, incident_id))
        
        conn.commit()
        conn.close()
        
        print(f"Incident resolved: {incident_id} (duration: {duration:.1f}s)")
        return duration
    
    conn.close()
    return None


def calculate_mttr(platform: str, hours: int) -> float:
    """Calculate MTTR for platform over specified hours."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    since = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
    
    cursor.execute('''
        SELECT AVG(duration_seconds) FROM incidents
        WHERE platform = ? AND started_at >= ? AND duration_seconds IS NOT NULL
    ''', (platform, since))
    
    result = cursor.fetchone()[0]
    conn.close()
    
    return result if result else 0.0


def get_incident_count(platform: str, hours: int) -> int:
    """Get incident count for platform over specified hours."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    since = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
    
    cursor.execute('''
        SELECT COUNT(*) FROM incidents
        WHERE platform = ? AND started_at >= ?
    ''', (platform, since))
    
    result = cursor.fetchone()[0]
    conn.close()
    
    return result


def get_mttr_metrics(platform: str) -> MTTRMetrics:
    """Get comprehensive MTTR metrics for a platform."""
    mttr_24h = calculate_mttr(platform, 24)
    mttr_7d = calculate_mttr(platform, 24 * 7)
    mttr_30d = calculate_mttr(platform, 24 * 30)
    
    return MTTRMetrics(
        platform=platform,
        mttr_last_24h=round(mttr_24h, 2),
        mttr_last_7d=round(mttr_7d, 2),
        mttr_last_30d=round(mttr_30d, 2),
        incident_count_24h=get_incident_count(platform, 24),
        incident_count_7d=get_incident_count(platform, 24 * 7),
        sla_compliant=mttr_24h <= MTTR_TARGET_SECONDS if mttr_24h > 0 else True,
        current_incident=None
    )


def monitor_loop():
    """Main monitoring loop."""
    platform_status = {p: True for p in PLATFORMS}
    
    while True:
        for platform in PLATFORMS:
            current_status = check_platform_status(platform)
            previous_status = platform_status[platform]
            
            if previous_status and not current_status:
                # Platform went down - start incident
                start_incident(platform, 'PlatformDown', f'{platform} is not responding')
            
            elif not previous_status and current_status:
                # Platform came back up - resolve incident
                duration = resolve_incident(platform)
                if duration and duration > MTTR_TARGET_SECONDS:
                    print(f"⚠️ MTTR SLA BREACH: {platform} took {duration:.1f}s (target: {MTTR_TARGET_SECONDS}s)")
            
            platform_status[platform] = current_status
        
        time.sleep(CHECK_INTERVAL)


def main():
    init_database()
    print(f"MTTR Tracker started")
    print(f"Target MTTR: {MTTR_TARGET_SECONDS}s ({MTTR_TARGET_SECONDS/60:.1f} minutes)")
    print(f"Monitoring platforms: {PLATFORMS}")
    
    monitor_loop()


if __name__ == '__main__':
    main()

