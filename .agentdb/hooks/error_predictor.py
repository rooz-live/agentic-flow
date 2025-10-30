#!/usr/bin/env python3
"""
Error Pattern Recognition Hook
Foundation Tier: Predicts and classifies command errors
"""

import sqlite3
import json
from typing import Dict, List, Optional

class ErrorPredictor:
    def __init__(self, db_path: str = '.agentdb/agentdb.sqlite'):
        self.db_path = db_path
    
    def pre_command(self, command: str, context: Dict) -> Dict:
        """Risk score based on historical error patterns"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Query risk dimension
            cursor.execute("""
                SELECT metric_value, trend
                FROM lao_learning_progress
                WHERE dimension = 'risk'
                ORDER BY created_at DESC
                LIMIT 20
            """)
            
            results = cursor.fetchall()
            conn.close()
            
            if results:
                # Calculate risk score
                avg_risk = sum(r[0] for r in results) / len(results)
                high_risk_count = sum(1 for r in results if r[0] > 0.7)
                
                return {
                    'risk_score': avg_risk,
                    'high_risk_probability': high_risk_count / len(results),
                    'recommendation': 'proceed_with_caution' if avg_risk > 0.6 else 'safe',
                    'sample_count': len(results)
                }
            else:
                return {
                    'risk_score': 0.5,
                    'recommendation': 'insufficient_data',
                    'sample_count': 0
                }
                
        except Exception as e:
            return {'error': str(e), 'risk_score': 0.5}
    
    def post_command(self, command: str, error: Optional[Exception], context: Dict) -> Dict:
        """Classify error type and update patterns"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if error:
                error_type = type(error).__name__
                risk_value = 0.9
                trend = 'degrading'
            else:
                error_type = 'success'
                risk_value = 0.1
                trend = 'improving'
            
            # Record outcome
            cursor.execute("""
                INSERT INTO lao_learning_progress
                (dimension, metric_name, metric_value, sample_count, trend, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            """, (
                'risk',
                f'command_outcome_{error_type}',
                risk_value,
                1,
                trend
            ))
            
            conn.commit()
            conn.close()
            
            return {
                'error_type': error_type,
                'classified': True,
                'risk_value': risk_value
            }
            
        except Exception as e:
            return {'error': str(e), 'classified': False}

# Singleton instance
error_predictor = ErrorPredictor()

def pre_command(command: str, context: Dict = None) -> Dict:
    return error_predictor.pre_command(command, context or {})

def post_command(command: str, error: Optional[Exception], context: Dict = None) -> Dict:
    return error_predictor.post_command(command, error, context or {})
