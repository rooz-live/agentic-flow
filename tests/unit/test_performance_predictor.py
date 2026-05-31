"""
Unit tests for performance predictor functionality
"""

import unittest
import tempfile
import json
import os
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import sys

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.monitor_token_usage import TokenUsageMonitor


class TestPerformancePredictor(unittest.TestCase):
    """Test cases for performance prediction functionality"""

    def setUp(self):
        """Set up test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.monitor = TokenUsageMonitor()

    def tearDown(self):
        """Clean up test environment"""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_get_current_usage_stats(self):
        """Test getting current token usage statistics"""
        stats = self.monitor.get_current_usage_stats()

        # Verify structure
        self.assertIn('timestamp', stats)
        self.assertIn('correlation_id', stats)
        self.assertIn('total_tokens_used', stats)
        self.assertIn('efficiency_score', stats)
        self.assertIn('breakdown', stats)

        # Verify data types
        self.assertIsInstance(stats['total_tokens_used'], int)
        self.assertIsInstance(stats['efficiency_score'], float)
        self.assertIsInstance(stats['breakdown'], dict)

        # Verify efficiency score is within bounds
        self.assertGreaterEqual(stats['efficiency_score'], 0.0)
        self.assertLessEqual(stats['efficiency_score'], 1.0)

    def test_analyze_waste_sources(self):
        """Test waste source analysis"""
        # Test with high static memory usage
        high_static_stats = {
            'breakdown': {
                'static_memory': {'percentage': 0.25}  # Above 15% threshold
            },
            'efficiency_score': 0.6,  # Below 75% threshold
            'waste_percentage': 0.15  # Above 10% threshold
        }

        waste_sources = self.monitor.analyze_waste_sources(high_static_stats)

        self.assertIn('High static memory usage: 25.0% of tokens', waste_sources)
        self.assertIn('Low overall efficiency: 60.0% (target: >75%)', waste_sources)
        self.assertIn('Token waste exceeds threshold: 15.0% > 10.0%', waste_sources)

    def test_enforce_budget(self):
        """Test token budget enforcement"""
        # Test within budget
        self.assertTrue(self.monitor.enforce_budget(5000))

        # Test over budget
        self.assertFalse(self.monitor.enforce_budget(15000))

    def test_monitor_dynamic_context_loading(self):
        """Test dynamic context loading metrics"""
        metrics = self.monitor.monitor_dynamic_context_loading()

        # Verify structure
        required_keys = [
            'context_chunks_loaded', 'average_chunk_size', 'loading_efficiency',
            'cache_hit_rate', 'memory_pressure', 'context_relevance_score'
        ]

        for key in required_keys:
            self.assertIn(key, metrics)
            self.assertIsInstance(metrics[key], (int, float))

        # Verify ranges
        self.assertGreaterEqual(metrics['loading_efficiency'], 0.0)
        self.assertLessEqual(metrics['loading_efficiency'], 1.0)
        self.assertGreaterEqual(metrics['cache_hit_rate'], 0.0)
        self.assertLessEqual(metrics['cache_hit_rate'], 1.0)

    def test_track_neural_pipeline_efficiency(self):
        """Test neural pipeline efficiency tracking"""
        neural_metrics = self.monitor.track_neural_pipeline_efficiency()

        # Verify structure
        required_keys = [
            'pipeline_operations', 'tokens_per_inference', 'model_accuracy',
            'inference_time_avg', 'memory_efficiency', 'overall_efficiency'
        ]

        for key in required_keys:
            self.assertIn(key, neural_metrics)
            if key == 'overall_efficiency':
                self.assertIsInstance(neural_metrics[key], float)

        # Verify accuracy is within bounds
        self.assertGreaterEqual(neural_metrics['model_accuracy'], 0.0)
        self.assertLessEqual(neural_metrics['model_accuracy'], 1.0)

        # Verify overall efficiency calculation
        expected_efficiency = (
            neural_metrics['memory_efficiency'] * 0.4 +
            neural_metrics['model_accuracy'] * 0.3 +
            max(0, (1.0 - neural_metrics['inference_time_avg'] / 2.0)) * 0.3
        )
        self.assertAlmostEqual(neural_metrics['overall_efficiency'], expected_efficiency, places=2)

    def test_generate_optimization_report(self):
        """Test comprehensive optimization report generation"""
        report = self.monitor.generate_optimization_report()

        # Verify structure
        required_keys = [
            'timestamp', 'correlation_id', 'efficiency_score', 'waste_percentage',
            'budget_compliance', 'waste_sources', 'recommendations',
            'dynamic_context_metrics', 'neural_pipeline_metrics', 'optimization_metrics'
        ]

        for key in required_keys:
            self.assertIn(key, report)

        # Verify status determination
        self.assertIn(report['status'], ['OPTIMIZED', 'ACCEPTABLE', 'NEEDS_OPTIMIZATION'])

        # Verify metrics structure
        self.assertIn('target_efficiency', report['optimization_metrics'])
        self.assertIn('current_efficiency', report['optimization_metrics'])
        self.assertIn('budget_per_op', report['optimization_metrics'])

    def test_generate_recommendations(self):
        """Test recommendation generation"""
        # Test with optimization needed
        low_efficiency_stats = {
            'efficiency_score': 0.6,
            'waste_percentage': 0.15,
            'breakdown': {
                'context_loading': {'percentage': 0.45},
                'mcp_server_ops': {'percentage': 0.3},
                'static_memory': {'percentage': 0.2}
            }
        }

        waste_sources = self.monitor.analyze_waste_sources(low_efficiency_stats)
        recommendations = self.monitor.generate_recommendations(low_efficiency_stats, waste_sources)

        # Should include specific recommendations
        self.assertIn('Implement dynamic context loading to reduce static memory usage', recommendations)
        self.assertIn('Optimize context loading queries - use targeted retrieval instead of broad scans', recommendations)
        self.assertIn('Reduce CLAUDE.md and always-loaded MCP server context', recommendations)
        self.assertIn('Reduce token waste below 10.0% threshold', recommendations)
        self.assertIn('Optimize MCP server operations - implement task-specific loading', recommendations)


class TestErrorPreventer(unittest.TestCase):
    """Test cases for error prevention functionality"""

    def setUp(self):
        """Set up test environment"""
        self.temp_dir = tempfile.mkdtemp()

        # Mock context for testing
        self.mock_context = {
            'gitState': {'hasChanges': False, 'branch': 'main'},
            'memory': {'heapUsed': 50 * 1024 * 1024},  # 50MB
            'recentFiles': ['test.py', 'config.json']
        }

    def tearDown(self):
        """Clean up test environment"""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_analyze_command_risk_low_risk(self):
        """Test low-risk command analysis"""
        from scripts.monitor_token_usage import TokenUsageMonitor

        monitor = TokenUsageMonitor()
        risk_analysis = monitor._analyze_command_risk('git status', [], self.mock_context)

        self.assertEqual(risk_analysis['riskLevel'], 'low')
        self.assertLess(risk_analysis['riskScore'], 25)

    def test_analyze_command_risk_high_risk(self):
        """Test high-risk command analysis"""
        from scripts.monitor_token_usage import TokenUsageMonitor

        monitor = TokenUsageMonitor()
        risk_analysis = monitor._analyze_command_risk('rm -rf /', [], self.mock_context)

        self.assertEqual(risk_analysis['riskLevel'], 'high')
        self.assertGreaterEqual(risk_analysis['riskScore'], 50)
        self.assertIn('Destructive operation detected', risk_analysis['potentialIssues'])


if __name__ == '__main__':
    # Create test suite
    unittest.main(verbosity=2)