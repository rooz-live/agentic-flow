#!/usr/bin/env python3
"""
Context-Aware File Edit Learning Hook
Foundation Tier: Optimizes file editing patterns
"""

import sqlite3
import json
from pathlib import Path
from typing import Dict, List

class EditOptimizer:
    def __init__(self, db_path: str = '.agentdb/agentdb.sqlite'):
        self.db_path = db_path
        self.edit_context = {}
    
    def pre_edit(self, file_path: str, context: Dict) -> Dict:
        """Analyze file context and load patterns"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Query causality dimension for edit patterns
            cursor.execute("""
                SELECT metric_value, trend
                FROM lao_learning_progress
                WHERE dimension = 'causality'
                ORDER BY created_at DESC
                LIMIT 15
            """)
            
            results = cursor.fetchall()
            conn.close()
            
            if results:
                avg_confidence = sum(r[0] for r in results) / len(results)
                
                # Store for post-edit comparison
                self.edit_context[file_path] = {
                    'pre_edit_confidence': avg_confidence,
                    'sample_count': len(results)
                }
                
                return {
                    'edit_confidence': avg_confidence,
                    'suggested_approach': 'incremental' if avg_confidence > 0.7 else 'careful',
                    'similar_edits': len(results)
                }
            else:
                return {
                    'edit_confidence': 0.5,
                    'suggested_approach': 'careful',
                    'similar_edits': 0
                }
                
        except Exception as e:
            return {'error': str(e), 'edit_confidence': 0.5}
    
    def post_edit(self, file_path: str, success: bool, context: Dict) -> Dict:
        """Validate and record edit outcome"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Calculate outcome confidence
            confidence = 0.9 if success else 0.3
            trend = 'improving' if success else 'degrading'
            
            cursor.execute("""
                INSERT INTO lao_learning_progress
                (dimension, metric_name, metric_value, sample_count, trend, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            """, (
                'causality',
                'edit_success_confidence',
                confidence,
                1,
                trend
            ))
            
            conn.commit()
            conn.close()
            
            # Clean up context
            self.edit_context.pop(file_path, None)
            
            return {
                'success': success,
                'confidence': confidence,
                'recorded': True
            }
            
        except Exception as e:
            return {'error': str(e), 'recorded': False}

# Singleton instance
edit_optimizer = EditOptimizer()

def pre_edit(file_path: str, context: Dict = None) -> Dict:
    return edit_optimizer.pre_edit(file_path, context or {})

def post_edit(file_path: str, success: bool, context: Dict = None) -> Dict:
    return edit_optimizer.post_edit(file_path, success, context or {})
