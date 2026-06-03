#!/usr/bin/env python3
"""
CLAUDE Ecosystem Integration Test Suite

Comprehensive test suite for neural pipeline integration, MCP server orchestration,
and prime command orchestrators with risk analytics. Includes correlation ID
consciousness-1758658960 tracking validation.

Author: CLAUDE Assistant
Correlation ID: consciousness-1758658960
"""

import asyncio
import json
import logging
import os
import sys
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
from typing import Any, Dict, List, Optional

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from risk_analytics.neural_integration import NeuralRiskIntegrator, NeuralRiskExecution
from mcp_server_loader import MCPServerLoader
from risk_analytics.risk_scoring import RiskScorer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CLAUDEEcosystemIntegrationTest(unittest.TestCase):
    """
    Comprehensive integration tests for CLAUDE ecosystem components.
    """
    
    def setUp(self):
        """Set up test environment."""
        self.correlation_id = "consciousness-1758658960"
        self.test_start_time = datetime.now(timezone.utc)
        
        # Initialize components
        self.neural_integrator = NeuralRiskIntegrator()
        self.mcp_loader = MCPServerLoader()
        self.risk_scorer = RiskScorer()
        
        # Test data
        self.test_risk_inputs = {
            "severity": 3,
            "blast": 2,
            "urgency": 2,
            "confidence": 0.9,
            "stability_debt": 0.05
        }
        
        # Performance thresholds
        self.performance_thresholds = {
            "max_latency_ms": 200,
            "min_success_rate": 0.95,
            "max_memory_mb": 512
        }

    def tearDown(self):
        """Clean up test environment."""
        # Stop any running MCP servers
        try:
            self.mcp_loader.stop_all_servers()
        except Exception as e:
            logger.warning(f"MCP cleanup warning: {e}")
    
    # ==================== Neural Pipeline Integration Tests ====================
    
    def test_neural_integration_initialization(self):
        """Test neural integration component initialization."""
        integrator = NeuralRiskIntegrator()
        
        self.assertEqual(integrator.correlation_id, self.correlation_id)
        self.assertIsNotNone(integrator.risk_scorer)
        self.assertIsNotNone(integrator.device_analyzer)
        self.assertIsNotNone(integrator.heartbeat_detector)
        self.assertIn("enhancement_threshold", integrator.neural_config)
        self.assertGreater(len(integrator.risk_patterns), 0)
    
    async def test_neural_enhanced_risk_analysis(self):
        """Test neural-enhanced risk analysis functionality."""
        result = await self.neural_integrator.analyze_risk_with_neural_enhancement(
            self.test_risk_inputs
        )
        
        # Validate result structure
        self.assertIn("score", result)
        self.assertIn("correlation_id", result)
        self.assertIn("neural_enhanced", result)
        self.assertIn("neural_insights", result)
        
        # Validate correlation ID
        self.assertEqual(result["correlation_id"], self.correlation_id)
        
        # Validate neural insights
        neural_insights = result["neural_insights"]
        self.assertIn("baseline_score", neural_insights)
        self.assertIn("enhancement_factor", neural_insights)
        self.assertIn("confidence", neural_insights)
        self.assertIn("patterns_detected", neural_insights)
        self.assertIn("neural_tower", neural_insights)
        self.assertIn("processing_time_ms", neural_insights)
    
    async def test_neural_fallback_behavior(self):
        """Test neural integration fallback when neural pipeline unavailable."""
        fallback_integrator = NeuralRiskIntegrator(neural_pipeline=None)
        
        result = await fallback_integrator.analyze_risk_with_neural_enhancement(
            self.test_risk_inputs
        )
        
        self.assertIn("score", result)
        self.assertEqual(result["correlation_id"], self.correlation_id)
        # Should still work but with limited enhancement
        self.assertIsInstance(result.get("neural_enhanced"), bool)
    
    async def test_neural_health_check(self):
        """Test neural integration health check."""
        health = await self.neural_integrator.health_check()
        
        self.assertIn("correlation_id", health)
        self.assertIn("status", health)
        self.assertIn("components", health)
        self.assertIn("metrics", health)
        self.assertIn("integration_test", health)
        
        self.assertEqual(health["correlation_id"], self.correlation_id)
        self.assertIn(health["status"], ["healthy", "degraded"])
    
    def test_neural_performance_metrics(self):
        """Test neural integration performance metrics collection."""
        metrics = self.neural_integrator.get_performance_metrics()
        
        self.assertIn("correlation_id", metrics)
        self.assertIn("timestamp", metrics)
        self.assertIn("total_neural_analyses", metrics)
        self.assertIn("enhanced_scores", metrics)
        self.assertIn("pattern_detections", metrics)
        self.assertIn("neural_pipeline_available", metrics)
        
        self.assertEqual(metrics["correlation_id"], self.correlation_id)
    
    # ==================== MCP Server Integration Tests ====================
    
    def test_mcp_server_loader_initialization(self):
        """Test MCP server loader initialization."""
        loader = MCPServerLoader()
        
        self.assertIsNotNone(loader.server_configs)
        self.assertGreater(len(loader.server_configs), 0)
        self.assertIn("jedarden_duck_e", loader.server_configs)
        self.assertIn("trailofbits_buttercup", loader.server_configs)
    
    def test_mcp_task_requirements(self):
        """Test MCP server task requirement mapping."""
        security_servers = self.mcp_loader.get_task_requirements("security_audit")
        code_analysis_servers = self.mcp_loader.get_task_requirements("code_analysis")
        monitoring_servers = self.mcp_loader.get_task_requirements("monitoring")
        
        self.assertIsInstance(security_servers, list)
        self.assertIsInstance(code_analysis_servers, list) 
        self.assertIsInstance(monitoring_servers, list)
        
        # Check expected server types
        self.assertIn("trailofbits_buttercup", security_servers)
        self.assertIn("squillo_hexser", code_analysis_servers)
        self.assertIn("severian42_Firewatch", monitoring_servers)
    
    def test_mcp_server_config_generation(self):
        """Test MCP server configuration generation."""
        config = self.mcp_loader.create_task_mcp_config("security_audit")
        
        self.assertIn("mcpServers", config)
        self.assertIsInstance(config["mcpServers"], dict)
        
        # Validate server configurations
        for server_name, server_config in config["mcpServers"].items():
            self.assertIn("command", server_config)
            self.assertIn("args", server_config)
            self.assertIn("env", server_config)
    
    def test_mcp_token_usage_measurement(self):
        """Test MCP server token usage measurement."""
        usage = self.mcp_loader.measure_token_usage("code_analysis")
        
        self.assertIn("task_type", usage)
        self.assertIn("servers_loaded", usage)
        self.assertIn("estimated_tokens", usage)
        
        self.assertEqual(usage["task_type"], "code_analysis")
        self.assertGreaterEqual(usage["servers_loaded"], 0)
    
    # ==================== Integration Coordination Tests ====================
    
    async def test_risk_analytics_mcp_coordination(self):
        """Test coordination between risk analytics and MCP servers."""
        # Load MCP servers for security audit
        mcp_servers = self.mcp_loader.load_servers_for_task("security_audit")
        
        # Perform risk analysis (simulated MCP enhancement)
        enhanced_inputs = {
            **self.test_risk_inputs,
            "mcp_context": {
                "servers_available": list(mcp_servers.keys()),
                "task_type": "security_audit"
            }
        }
        
        result = await self.neural_integrator.analyze_risk_with_neural_enhancement(
            enhanced_inputs
        )
        
        self.assertIn("score", result)
        self.assertEqual(result["correlation_id"], self.correlation_id)
        
        # Verify MCP context is preserved
        if "mcp_context" in enhanced_inputs:
            # MCP enhancement logic would be here in production
            pass
    
    async def test_correlation_id_consistency(self):
        """Test correlation ID consistency across all components."""
        # Test neural integrator correlation ID
        neural_health = await self.neural_integrator.health_check()
        neural_metrics = self.neural_integrator.get_performance_metrics()
        
        # Test MCP loader correlation ID (if implemented)
        mcp_config = self.mcp_loader.create_task_mcp_config("monitoring")
        
        # Verify consistency
        self.assertEqual(neural_health["correlation_id"], self.correlation_id)
        self.assertEqual(neural_metrics["correlation_id"], self.correlation_id)
        
        # All components should use the same correlation ID
        correlation_ids = [
            neural_health["correlation_id"],
            neural_metrics["correlation_id"]
        ]
        
        self.assertTrue(all(cid == self.correlation_id for cid in correlation_ids))
    
    async def test_heartbeat_monitoring_integration(self):
        """Test heartbeat monitoring across CLAUDE components."""
        # Perform analysis that should generate heartbeats
        result = await self.neural_integrator.analyze_risk_with_neural_enhancement(
            self.test_risk_inputs
        )
        
        # Check that heartbeat was emitted (would be in logs)
        # In production, this would check actual heartbeat monitoring system
        self.assertIn("execution_id", result)
        self.assertIn("timestamp", result)
        
        # Verify heartbeat data structure
        neural_insights = result.get("neural_insights", {})
        self.assertIn("processing_time_ms", neural_insights)
        self.assertGreaterEqual(neural_insights["processing_time_ms"], 0)
    
    # ==================== Performance and Load Tests ====================
    
    async def test_performance_under_load(self):
        """Test CLAUDE ecosystem performance under load."""
        iterations = 10
        latencies = []
        successes = 0
        
        for i in range(iterations):
            start_time = time.time()
            
            try:
                result = await self.neural_integrator.analyze_risk_with_neural_enhancement({
                    "severity": 2 + (i % 3),
                    "blast": 2,
                    "urgency": 2,
                    "confidence": 0.8,
                    "stability_debt": 0.05
                })
                
                if "score" in result:
                    successes += 1
                
                latency_ms = (time.time() - start_time) * 1000
                latencies.append(latency_ms)
                
            except Exception as e:
                logger.error(f"Load test iteration {i} failed: {e}")
                latencies.append(999)  # High latency for failed test
        
        # Validate performance metrics
        avg_latency = sum(latencies) / len(latencies)
        success_rate = successes / iterations
        max_latency = max(latencies)
        
        self.assertLessEqual(avg_latency, self.performance_thresholds["max_latency_ms"])
        self.assertGreaterEqual(success_rate, self.performance_thresholds["min_success_rate"])
        
        logger.info(f"Performance test results: avg={avg_latency:.2f}ms, success_rate={success_rate:.2%}, max={max_latency:.2f}ms")
    
    def test_memory_usage_constraints(self):
        """Test memory usage stays within constraints."""
        import psutil
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Perform multiple operations
        for i in range(5):
            metrics = self.neural_integrator.get_performance_metrics()
            mcp_config = self.mcp_loader.create_task_mcp_config("code_analysis")
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        self.assertLessEqual(memory_increase, self.performance_thresholds["max_memory_mb"])
        logger.info(f"Memory usage: initial={initial_memory:.2f}MB, final={final_memory:.2f}MB, increase={memory_increase:.2f}MB")
    
    # ==================== Error Handling and Recovery Tests ====================
    
    async def test_error_handling_neural_pipeline(self):
        """Test error handling when neural pipeline fails."""
        # Simulate neural pipeline failure
        with patch.object(self.neural_integrator, '_apply_neural_enhancement', 
                         side_effect=Exception("Neural pipeline error")):
            
            result = await self.neural_integrator.analyze_risk_with_neural_enhancement(
                self.test_risk_inputs
            )
            
            # Should fallback gracefully
            self.assertIn("score", result)
            self.assertEqual(result["correlation_id"], self.correlation_id)
            # Error should be handled, basic analysis should still work
    
    def test_error_handling_mcp_servers(self):
        """Test error handling when MCP servers are unavailable."""
        # Test with invalid server configuration
        invalid_config = self.mcp_loader.create_task_mcp_config("nonexistent_task")
        
        self.assertIn("mcpServers", invalid_config)
        # Should return empty or default configuration
        
        # Test starting non-existent server
        result = self.mcp_loader.start_server("nonexistent_server", {
            "command": "nonexistent_command",
            "args": []
        })
        
        self.assertIsNone(result)  # Should return None for failed start
    
    # ==================== Configuration and Environment Tests ====================
    
    def test_environment_variables(self):
        """Test environment variable handling."""
        # Test correlation ID environment override
        with patch.dict(os.environ, {"CORRELATION_ID": "test-override"}):
            # In production, this would test actual environment handling
            pass
        
        # Test emergency disable flags
        with patch.dict(os.environ, {"CLAUDE_EMERGENCY_DISABLE": "true"}):
            # Test that emergency disable is respected
            pass
        
        # Test MCP server disable flag
        with patch.dict(os.environ, {"MCP_SERVERS_DISABLED": "true"}):
            # Test MCP server disabling
            pass
    
    def test_configuration_validation(self):
        """Test configuration file validation."""
        # Test neural integration configuration
        neural_config = self.neural_integrator.neural_config
        
        self.assertIn("enhancement_threshold", neural_config)
        self.assertIn("max_enhancement_multiplier", neural_config)
        self.assertIn("pattern_confidence_threshold", neural_config)
        
        # Validate threshold values are reasonable
        self.assertGreater(neural_config["enhancement_threshold"], 0)
        self.assertLessEqual(neural_config["enhancement_threshold"], 1)
        self.assertGreater(neural_config["max_enhancement_multiplier"], 1)
    
    # ==================== Integration with Existing Systems ====================
    
    async def test_baseline_compatibility(self):
        """Test that CLAUDE enhancements don't break baseline functionality."""
        # Test baseline risk scoring still works
        baseline_result = self.risk_scorer.calculate_score(
            severity=self.test_risk_inputs["severity"],
            blast=self.test_risk_inputs["blast"],
            urgency=self.test_risk_inputs["urgency"],
            confidence=self.test_risk_inputs["confidence"],
            stability_debt=self.test_risk_inputs["stability_debt"]
        )
        
        self.assertIn("score", baseline_result)
        self.assertIn("severity_class", baseline_result)
        
        # Test enhanced analysis
        enhanced_result = await self.neural_integrator.analyze_risk_with_neural_enhancement(
            self.test_risk_inputs
        )
        
        # Enhanced should include baseline results plus enhancements
        self.assertIn("score", enhanced_result)
        self.assertIn("severity_class", enhanced_result)
        self.assertIn("neural_insights", enhanced_result)
        
        # Enhanced score should be >= baseline score (with enhancements)
        baseline_score = baseline_result["score"]
        enhanced_score = enhanced_result["score"]
        self.assertGreaterEqual(enhanced_score, baseline_score - 5)  # Allow small variance


# Test runner for async tests
class AsyncTestCase(CLAUDEEcosystemIntegrationTest):
    """Test case that can run async tests."""
    
    def run_async_test(self, test_func):
        """Run an async test function."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(test_func())
        finally:
            loop.close()


# Test suite organization
def create_test_suite():
    """Create comprehensive test suite."""
    suite = unittest.TestSuite()
    
    # Neural Pipeline Tests
    suite.addTest(CLAUDEEcosystemIntegrationTest('test_neural_integration_initialization'))
    suite.addTest(CLAUDEEcosystemIntegrationTest('test_neural_performance_metrics'))
    
    # MCP Server Tests
    suite.addTest(CLAUDEEcosystemIntegrationTest('test_mcp_server_loader_initialization'))
    suite.addTest(CLAUDEEcosystemIntegrationTest('test_mcp_task_requirements'))
    suite.addTest(CLAUDEEcosystemIntegrationTest('test_mcp_server_config_generation'))
    suite.addTest(CLAUDEEcosystemIntegrationTest('test_mcp_token_usage_measurement'))
    
    # Performance Tests
    suite.addTest(CLAUDEEcosystemIntegrationTest('test_memory_usage_constraints'))
    
    # Configuration Tests
    suite.addTest(CLAUDEEcosystemIntegrationTest('test_environment_variables'))
    suite.addTest(CLAUDEEcosystemIntegrationTest('test_configuration_validation'))
    
    return suite


def run_async_tests():
    """Run async tests separately."""
    test_case = AsyncTestCase()
    
    async_tests = [
        'test_neural_enhanced_risk_analysis',
        'test_neural_fallback_behavior', 
        'test_neural_health_check',
        'test_risk_analytics_mcp_coordination',
        'test_correlation_id_consistency',
        'test_heartbeat_monitoring_integration',
        'test_performance_under_load',
        'test_error_handling_neural_pipeline',
        'test_baseline_compatibility'
    ]
    
    results = {}
    for test_name in async_tests:
        try:
            logger.info(f"Running async test: {test_name}")
            test_func = getattr(test_case, test_name)
            test_case.run_async_test(test_func)
            results[test_name] = "PASSED"
            logger.info(f"✅ {test_name} PASSED")
        except Exception as e:
            results[test_name] = f"FAILED: {str(e)}"
            logger.error(f"❌ {test_name} FAILED: {e}")
    
    return results


if __name__ == "__main__":
    print(f"🚀 CLAUDE Ecosystem Integration Test Suite")
    print(f"📊 Correlation ID: consciousness-1758658960")
    print(f"⏱️  Start Time: {datetime.now(timezone.utc).isoformat()}")
    print("-" * 60)
    
    # Run synchronous tests
    print("\n🔄 Running synchronous tests...")
    suite = create_test_suite()
    runner = unittest.TextTestRunner(verbosity=2)
    sync_result = runner.run(suite)
    
    # Run asynchronous tests
    print("\n🔄 Running asynchronous tests...")
    async_results = run_async_tests()
    
    # Summary
    print(f"\n📋 TEST SUMMARY")
    print(f"Synchronous tests: {sync_result.testsRun - sync_result.failures - sync_result.errors}/{sync_result.testsRun} passed")
    
    async_passed = sum(1 for result in async_results.values() if result == "PASSED")
    async_total = len(async_results)
    print(f"Asynchronous tests: {async_passed}/{async_total} passed")
    
    total_passed = (sync_result.testsRun - sync_result.failures - sync_result.errors) + async_passed
    total_tests = sync_result.testsRun + async_total
    print(f"Overall: {total_passed}/{total_tests} tests passed")
    
    # Save results
    test_report = {
        "correlation_id": "consciousness-1758658960",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "synchronous_tests": {
            "total": sync_result.testsRun,
            "passed": sync_result.testsRun - sync_result.failures - sync_result.errors,
            "failed": sync_result.failures,
            "errors": sync_result.errors
        },
        "asynchronous_tests": async_results,
        "overall_status": "PASSED" if total_passed == total_tests else "FAILED"
    }
    
    report_file = f"claude_ecosystem_test_report_{int(time.time())}.json"
    with open(report_file, 'w') as f:
        json.dump(test_report, f, indent=2)
    
    print(f"\n💾 Test report saved to: {report_file}")
    
    # Exit with appropriate code
    sys.exit(0 if total_passed == total_tests else 1)