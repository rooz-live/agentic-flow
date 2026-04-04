#!/usr/bin/env python3
"""
Pre-Tool WSJF Enrichment Hook
==============================
Called before tool execution to enrich context with WSJF data
from previous episodes or backlog.

Hook Interface:
    Input: context dict with task/ceremony info
    Output: enhanced context with WSJF predictions
"""

import json
import sys
import sqlite3
from pathlib import Path
from typing import Optional, Dict


def get_historical_wsjf(circle: str, ceremony: str, db_path: str) -> Optional[Dict]:
    """
    Query AgentDB for historical WSJF data for this circle/ceremony.
    
    Args:
        circle: Circle name
        ceremony: Ceremony name
        db_path: Path to agentdb.db
    
    Returns:
        Dict with avg WSJF stats or None
    """
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Query for recent episodes
        query = """
        SELECT 
            AVG(CAST(json_extract(metadata, '$.wsjf_context.wsjf') AS REAL)) as avg_wsjf,
            AVG(CAST(json_extract(metadata, '$.wsjf_context.confidence') AS REAL)) as avg_confidence,
            COUNT(*) as episode_count
        FROM episodes
        WHERE json_extract(metadata, '$.primary_circle') = ?
          AND json_extract(metadata, '$.ceremony') = ?
          AND json_extract(metadata, '$.wsjf_context.wsjf') IS NOT NULL
        LIMIT 100
        """
        
        cursor.execute(query, (circle, ceremony))
        row = cursor.fetchone()
        
        conn.close()
        
        if row and row[0] is not None:
            return {
                'avg_wsjf': round(row[0], 2),
                'avg_confidence': round(row[1], 2),
                'episode_count': row[2]
            }
        
        return None
        
    except Exception as e:
        print(f"Warning: Could not query historical WSJF: {e}", file=sys.stderr)
        return None


def hook(context: dict) -> dict:
    """
    Enrich context with WSJF predictions from history.
    
    Args:
        context: Pre-execution context with keys:
            - primary_circle: str
            - ceremony: str
            - (other keys preserved)
    
    Returns:
        Enhanced context with 'wsjf_prediction' field
    """
    circle = context.get('primary_circle', 'orchestrator')
    ceremony = context.get('ceremony', 'standup')
    
    # Try to get historical WSJF
    project_root = Path(__file__).parent.parent.parent
    db_path = project_root / 'agentdb.db'
    
    if db_path.exists():
        historical = get_historical_wsjf(circle, ceremony, str(db_path))
        
        if historical:
            context['wsjf_prediction'] = historical
            context['wsjf_enriched'] = True
        else:
            context['wsjf_prediction'] = {
                'avg_wsjf': 5.0,
                'avg_confidence': 0.50,
                'episode_count': 0,
                'note': 'No historical data, using defaults'
            }
            context['wsjf_enriched'] = False
    else:
        context['wsjf_enriched'] = False
    
    return context


def main():
    """CLI interface for testing"""
    if len(sys.argv) > 1:
        context = json.loads(sys.argv[1])
    else:
        context = json.load(sys.stdin)
    
    result = hook(context)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
