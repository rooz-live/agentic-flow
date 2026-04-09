#!/usr/bin/env python3
"""
Test Pattern Analysis Tools
Comprehensive tests for pattern analysis system
"""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Dict, List, Any

# Add the agentic directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent / "agentic"))

class TestPatternAnalysis(unittest.TestCase):
    """Test pattern analysis functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_data_dir = tempfile.mkdtemp()
        self.test_events = self._create_test_events()
        self.test_metrics_file = Path(self.test_data_dir) / "pattern_metrics.jsonl"
        
        # Write test data to file
        with open(self.test_metrics_file, 'w') as f:
            for event in self.test_events:
                f.write(json.dumps(event) + '\n')
    
        # Set environment variable for tests
        os.environ["PROJECT_ROOT"] = str(Path(self.test_data_dir).parent)
    
    def tearDown(self):
        """Clean up test environment"""
        import shutil
        shutil.rmtree(self.test_data_dir)
    
    def _create_test_events(self) -> List[Dict[str, Any]]:
        """Create test events for pattern analysis"""
        return [
            {
                "timestamp": "2025-12-13T10:00:00Z",
                "pattern": "code-fix-proposal",
                "circle": "analyst",
                "depth": 2,
                "status": "failed",
                "tags": ["bug", "security"],
                "economic": {
                    "wsjf_score": 12.5,
                    "cost_of_delay": 15.0
                },
                "error_message": "timeout during execution"
            },
            {
                "timestamp": "2025-12-13T11:00:00Z",
                "pattern": "code-fix-proposal",
                "circle": "assessor",
                "depth": 3,
                "status": "completed",
                "tags": ["performance"],
                "economic": {
                    "wsjf_score": 8.0,
                    "cost_of_delay": 5.0
                }
            },
            {
                "timestamp": "2025-12-13T12:00:00Z",
                "pattern": "code-fix-proposal",
                "circle": "analyst",
                "depth": 4,
                "status": "failed",
                "tags": ["ui", "complex"],
                "economic": {
                    "wsjf_score": 18.0,
                    "cost_of_delay": 25.0
                },
                "error_message": "permission denied"
            },
            {
                "timestamp": "2025-12-13T14:00:00Z",
                "pattern": "feature-enhancement",
                "circle": "innovator",
                "depth": 1,
                "status": "completed",
                "tags": ["enhancement"],
                "economic": {
                    "wsjf_score": 6.0,
                    "cost_of_delay": 3.0
                }
            },
            {
                "timestamp": "2025-12-13T15:00:00Z",
                "pattern": "bug-fix",
                "circle": "testing",
                "depth": 2,
                "status": "failed",
                "tags": ["test", "bug"],
                "economic": {
                    "wsjf_score": 10.0,
                    "cost_of_delay": 8.0
                },
                "error_message": "test failure"
            }
        ]
    
    def test_pattern_analysis_basic(self):
        """Test basic pattern analysis functionality"""
        from pattern_analysis import main as pattern_analysis_main
        
        # Mock arguments
        test_args = [
            "--pattern", "code-fix-proposal",
            "--input-file", str(self.test_metrics_file),
            "--json"
        ]
        
        # Capture output
        import io
        from contextlib import redirect_stdout
        
        with redirect_stdout(io.StringIO()) as f:
            try:
                pattern_analysis_main(test_args)
                output = f.getvalue()
                result = json.loads(output)
                
                # Verify basic structure
                self.assertIn("analysis_timestamp", result)
                self.assertIn("pattern_analyzed", result)
                self.assertEqual(result["pattern_analyzed"], "code-fix-proposal")
                self.assertIn("total_events_analyzed", result)
                self.assertGreater(result["total_events_analyzed"], 0)
                
                # Check code fix analysis
                self.assertIn("code_fix_analysis", result)
                code_fix = result["code_fix_analysis"]
                
                if "error" not in code_fix:
                    self.assertIn("total_code_fixes", code_fix)
                    self.assertIn("failed_fixes", code_fix)
                    self.assertIn("failure_rate", code_fix)
                    self.assertGreaterEqual(code_fix["total_code_fixes"], 4)
                    self.assertGreaterEqual(code_fix["failed_fixes"], 3)
                    self.assertGreater(code_fix["failure_rate"], 0)
            except SystemExit:
                pass
    
    def test_root_cause_analysis(self):
        """Test root cause analysis functionality"""
        from root_cause_analyzer import main as rca_main
        
        # Test 5 Whys analysis
        test_args = [
            "--pattern", "code-fix-proposal",
            "--input-file", str(self.test_metrics_file),
            "--method", "5whys",
            "--event-id", "test-event-1",
            "--json"
        ]
        
        import io
        from contextlib import redirect_stdout
        
        with redirect_stdout(io.StringIO()) as f:
            try:
                rca_main(test_args)
                output = f.getvalue()
                result = json.loads(output)
                
                # Verify 5 Whys structure
                self.assertIn("five_whys_analysis", result)
                five_whys = result["five_whys_analysis"]
                
                self.assertIn("problem_statement", five_whys)
                self.assertIn("whys", five_whys)
                self.assertEqual(len(five_whys["whys"]), 5)
                
                for i, why in enumerate(five_whys["whys"], 1):
                    self.assertIn("question", why)
                    self.assertIn("answer", why)
                    self.assertIn("category", why)
                    self.assertIn(f"question_{i}", why)
                    self.assertIn(f"answer_{i}", why)
                    self.assertIn(f"category_{i}", why)
            except SystemExit:
                pass
    
    def test_failure_tracking(self):
        """Test failure tracking functionality"""
        from failure_tracker import main as tracker_main
        
        test_args = [
            "--pattern", "code-fix-proposal",
            "--input-file", str(self.test_metrics_file),
            "--hours", "24",
            "--alerts",
            "--json"
        ]
        
        import io
        from contextlib import redirect_stdout
        
        with redirect_stdout(io.StringIO()) as f:
            try:
                tracker_main(test_args)
                output = f.getvalue()
                result = json.loads(output)
                
                # Verify failure tracking structure
                self.assertIn("failure_rates", result)
                self.assertIn("failure_patterns", result)
                
                failure_rates = result["failure_rates"]
                self.assertIn("current_failure_rate", failure_rates)
                self.assertIn("trend", failure_rates)
                
                # Check for alerts
                if "failure_alerts" in result:
                    alerts = result["failure_alerts"]
                    self.assertIn("alerts", alerts)
                    self.assertIn("summary", alerts)
            except SystemExit:
                pass
    
    def test_pattern_filtering(self):
        """Test pattern filtering functionality"""
        from pattern_metrics_filter import main as filter_main
        
        test_args = [
            "--pattern", "code-fix-proposal",
            "--input-file", str(self.test_metrics_file),
            "--patterns", "code-fix-proposal,bug-fix",
            "--circles", "analyst,assessor",
            "--min-wsjf", "10.0",
            "--analyze",
            "--json"
        ]
        
        import io
        from contextlib import redirect_stdout
        
        with redirect_stdout(io.StringIO()) as f:
            try:
                filter_main(test_args)
                output = f.getvalue()
                result = json.loads(output)
                
                # Verify filtering structure
                self.assertIn("total_filtered_events", result)
                self.assertIn("filters_applied", result)
                self.assertIn("analysis", result)
                
                filters = result["filters_applied"]
                self.assertEqual(filters["patterns"], ["code-fix-proposal,bug-fix"])
                self.assertEqual(filters["circles"], ["analyst,assessor"])
                self.assertEqual(filters["economic"]["min_wsjf"], 10.0)
            except SystemExit:
                pass
    
    def test_remediation_recommendations(self):
        """Test remediation recommendation functionality"""
        from remediation_recommender import main as remediation_main
        
        test_args = [
            "--pattern", "code-fix-proposal",
            "--input-file", str(self.test_metrics_file),
            "--implementation-plan",
            "--json"
        ]
        
        import io
        from contextlib import redirect_stdout
        
        with redirect_stdout(io.StringIO()) as f:
            try:
                remediation_main(test_args)
                output = f.getvalue()
                result = json.loads(output)
                
                # Verify remediation structure
                self.assertIn("remediation_recommendations", result)
                self.assertIn("process_improvements", result)
                self.assertIn("implementation_plan", result)
                
                # Check for recommendations
                recommendations = result["remediation_recommendations"]
                self.assertGreater(len(recommendations), 0)
                
                # Check implementation plan
                plan = result["implementation_plan"]
                if plan:
                    self.assertIn("implementation_phases", plan)
                    self.assertIn("resource_requirements", plan)
            except SystemExit:
                pass
    
    def test_integration_workflow(self):
        """Test complete integration workflow"""
        # This test simulates the complete workflow
        # from pattern to analysis to recommendations
        
        # Test basic analysis
        self.test_pattern_analysis_basic()
        
        # Test root cause analysis for failures
        self.test_root_cause_analysis()
        
        # Test failure tracking
        self.test_failure_tracking()
        
        # Test filtering
        self.test_pattern_filtering()
        
        # Test remediation recommendations
        self.test_remediation_recommendations()

if __name__ == "__main__":
    unittest.main()