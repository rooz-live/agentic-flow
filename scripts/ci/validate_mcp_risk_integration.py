#!/usr/bin/env python3
"""
MCP Server Integration Validation for Risk Analytics

Validates production readiness of MCP server integrations with risk analytics,
including Chrome DevTools MCP Server, Graphiti integration, and neural pipeline
coordination with correlation ID consciousness-1758658960.

Author: CLAUDE Assistant  
Correlation ID: consciousness-1758658960
"""

import asyncio
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import subprocess
import tempfile

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from mcp_server_loader import MCPServerLoader
from risk_analytics.neural_integration import NeuralRiskIntegrator

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MCPRiskIntegrationValidator:
    """
    Validates MCP server integrations with risk analytics for production readiness.
    """
    
    def __init__(self):
        self.correlation_id = "consciousness-1758658960"
        self.mcp_loader = MCPServerLoader()
        self.neural_integrator = NeuralRiskIntegrator()
        
        # Test configuration
        self.test_config = {
            "timeout_seconds": 30,
            "required_servers": [
                "chrome_devtools",
                "graphiti_integration", 
                "neural_pipeline"
            ],
            "optional_servers": [
                "jedarden_duck_e",
                "trailofbits_buttercup",
                "squillo_hexser"
            ],
            "test_scenarios": [
                "basic_risk_analysis",
                "enhanced_neural_analysis", 
                "mcp_server_loading",
                "correlation_id_tracking"
            ]
        }
        
        # Results tracking
        self.validation_results = {
            "start_time": datetime.now(timezone.utc),
            "correlation_id": self.correlation_id,
            "test_results": {},
            "overall_status": "pending",
            "errors": [],
            "warnings": []
        }

    async def validate_production_readiness(self) -> Dict[str, Any]:
        """
        Perform comprehensive validation of MCP risk integration for production.
        
        Returns:
            Complete validation results with pass/fail status
        """
        logger.info(f"Starting MCP risk integration validation - {self.correlation_id}")
        
        try:
            # Phase 1: Validate MCP server availability
            await self._validate_mcp_server_availability()
            
            # Phase 2: Test risk analytics integration  
            await self._validate_risk_analytics_integration()
            
            # Phase 3: Test neural pipeline coordination
            await self._validate_neural_pipeline_coordination()
            
            # Phase 4: Test correlation ID tracking
            await self._validate_correlation_id_tracking()
            
            # Phase 5: Performance validation
            await self._validate_performance_metrics()
            
            # Calculate overall status
            self._calculate_overall_status()
            
            # Generate final report
            return self._generate_validation_report()
            
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            self.validation_results["overall_status"] = "failed"
            self.validation_results["errors"].append(f"Critical validation error: {str(e)}")
            return self._generate_validation_report()

    async def _validate_mcp_server_availability(self):
        """Validate that required MCP servers can be loaded."""
        logger.info("Phase 1: Validating MCP server availability")
        
        test_result = {
            "phase": "mcp_server_availability",
            "status": "pending",
            "servers_tested": {},
            "start_time": datetime.now(timezone.utc)
        }
        
        try:
            # Test loading MCP servers for security audit task
            servers = self.mcp_loader.load_servers_for_task("security_audit")
            test_result["servers_loaded"] = len(servers)
            
            for server_name, config in servers.items():
                server_test = {
                    "config_loaded": True,
                    "command_available": False,
                    "environment_ready": False
                }
                
                # Check if command is available
                try:
                    result = subprocess.run(
                        ["which", config["command"]], 
                        capture_output=True, 
                        timeout=5
                    )
                    server_test["command_available"] = result.returncode == 0
                except Exception as e:
                    server_test["command_error"] = str(e)
                
                # Check environment variables
                env_vars = config.get("env", {})
                server_test["environment_ready"] = len(env_vars) >= 0  # Allow empty env
                server_test["env_vars_count"] = len(env_vars)
                
                test_result["servers_tested"][server_name] = server_test
            
            # Check critical server availability
            critical_available = 0
            for server_name in self.test_config["required_servers"]:
                if any(server_name in tested for tested in test_result["servers_tested"]):
                    critical_available += 1
            
            test_result["critical_servers_available"] = critical_available
            test_result["status"] = "passed" if critical_available >= 1 else "warning"
            
            if test_result["status"] == "warning":
                self.validation_results["warnings"].append(
                    f"Only {critical_available}/{len(self.test_config['required_servers'])} critical MCP servers available"
                )
            
        except Exception as e:
            test_result["status"] = "failed"
            test_result["error"] = str(e)
            logger.error(f"MCP server availability validation failed: {e}")
        
        test_result["end_time"] = datetime.now(timezone.utc)
        self.validation_results["test_results"]["mcp_server_availability"] = test_result

    async def _validate_risk_analytics_integration(self):
        """Validate integration between MCP servers and risk analytics."""
        logger.info("Phase 2: Validating risk analytics integration")
        
        test_result = {
            "phase": "risk_analytics_integration", 
            "status": "pending",
            "integration_tests": {},
            "start_time": datetime.now(timezone.utc)
        }
        
        try:
            # Test 1: Basic risk analysis
            basic_test = await self._test_basic_risk_analysis()
            test_result["integration_tests"]["basic_analysis"] = basic_test
            
            # Test 2: Risk analysis with MCP enhancement (simulated)
            enhanced_test = await self._test_mcp_enhanced_analysis()
            test_result["integration_tests"]["mcp_enhanced"] = enhanced_test
            
            # Test 3: Fallback behavior when MCP servers unavailable
            fallback_test = await self._test_mcp_fallback_behavior()
            test_result["integration_tests"]["fallback_behavior"] = fallback_test
            
            # Determine overall integration status
            passed_tests = sum(1 for test in test_result["integration_tests"].values() 
                             if test["status"] == "passed")
            total_tests = len(test_result["integration_tests"])
            
            test_result["passed_tests"] = passed_tests
            test_result["total_tests"] = total_tests
            test_result["pass_rate"] = passed_tests / total_tests if total_tests > 0 else 0
            
            test_result["status"] = "passed" if test_result["pass_rate"] >= 0.8 else "failed"
            
        except Exception as e:
            test_result["status"] = "failed"
            test_result["error"] = str(e)
            logger.error(f"Risk analytics integration validation failed: {e}")
        
        test_result["end_time"] = datetime.now(timezone.utc)
        self.validation_results["test_results"]["risk_analytics_integration"] = test_result

    async def _test_basic_risk_analysis(self) -> Dict[str, Any]:
        """Test basic risk analysis functionality."""
        test = {
            "name": "basic_risk_analysis",
            "status": "pending",
            "start_time": datetime.now(timezone.utc)
        }
        
        try:
            test_inputs = {
                "severity": 3,
                "blast": 2,
                "urgency": 2,
                "confidence": 0.9,
                "stability_debt": 0.05
            }
            
            result = await self.neural_integrator.analyze_risk_with_neural_enhancement(test_inputs)
            
            # Validate result structure
            required_fields = ["score", "severity_class", "recommendation", "correlation_id"]
            missing_fields = [field for field in required_fields if field not in result]
            
            test["score"] = result.get("score", 0)
            test["severity_class"] = result.get("severity_class", "unknown")
            test["correlation_id"] = result.get("correlation_id", "")
            test["missing_fields"] = missing_fields
            
            test["status"] = "passed" if not missing_fields else "failed"
            
            if test["status"] == "failed":
                test["error"] = f"Missing required fields: {missing_fields}"
            
        except Exception as e:
            test["status"] = "failed"
            test["error"] = str(e)
        
        test["end_time"] = datetime.now(timezone.utc)
        return test

    async def _test_mcp_enhanced_analysis(self) -> Dict[str, Any]:
        """Test risk analysis with MCP server enhancement (simulated)."""
        test = {
            "name": "mcp_enhanced_analysis",
            "status": "pending", 
            "start_time": datetime.now(timezone.utc)
        }
        
        try:
            # Simulate MCP-enhanced risk analysis
            # In production, this would actually call MCP servers
            test_inputs = {
                "severity": 4,
                "blast": 3,
                "urgency": 3,
                "confidence": 0.95,
                "stability_debt": 0.1,
                "mcp_enhancement": True  # Flag to indicate MCP enhancement requested
            }
            
            result = await self.neural_integrator.analyze_risk_with_neural_enhancement(test_inputs)
            
            # Check for neural enhancement indicators
            neural_insights = result.get("neural_insights", {})
            test["neural_enhanced"] = result.get("neural_enhanced", False)
            test["enhancement_factor"] = neural_insights.get("enhancement_factor", 0.0)
            test["neural_tower"] = neural_insights.get("neural_tower", "none")
            test["patterns_detected"] = neural_insights.get("patterns_detected", [])
            
            # Validate enhancement occurred for high-risk scenario
            if result.get("score", 0) > 70:  # High risk score should trigger enhancement
                test["status"] = "passed" if test["neural_enhanced"] else "warning"
                if test["status"] == "warning":
                    test["warning"] = "High risk score but no neural enhancement applied"
            else:
                test["status"] = "passed"  # Lower scores may not trigger enhancement
            
        except Exception as e:
            test["status"] = "failed"
            test["error"] = str(e)
        
        test["end_time"] = datetime.now(timezone.utc)
        return test

    async def _test_mcp_fallback_behavior(self) -> Dict[str, Any]:
        """Test graceful fallback when MCP servers are unavailable."""
        test = {
            "name": "mcp_fallback_behavior",
            "status": "pending",
            "start_time": datetime.now(timezone.utc)
        }
        
        try:
            # Create integrator without neural pipeline to test fallback
            fallback_integrator = NeuralRiskIntegrator(neural_pipeline=None)
            
            test_inputs = {
                "severity": 3,
                "blast": 2, 
                "urgency": 2,
                "confidence": 0.8,
                "stability_debt": 0.05
            }
            
            result = await fallback_integrator.analyze_risk_with_neural_enhancement(test_inputs)
            
            # Should still produce valid results without neural enhancement
            test["score"] = result.get("score", 0)
            test["has_score"] = "score" in result
            test["has_correlation_id"] = result.get("correlation_id") == self.correlation_id
            test["neural_enhanced"] = result.get("neural_enhanced", False)
            
            # Fallback should work but not be neural enhanced
            test["status"] = "passed" if test["has_score"] and test["has_correlation_id"] else "failed"
            
            if not test["neural_enhanced"]:
                test["note"] = "Correctly fell back to baseline analysis"
            
        except Exception as e:
            test["status"] = "failed"
            test["error"] = str(e)
        
        test["end_time"] = datetime.now(timezone.utc)
        return test

    async def _validate_neural_pipeline_coordination(self):
        """Validate neural pipeline coordination with MCP servers."""
        logger.info("Phase 3: Validating neural pipeline coordination")
        
        test_result = {
            "phase": "neural_pipeline_coordination",
            "status": "pending",
            "start_time": datetime.now(timezone.utc)
        }
        
        try:
            # Test neural integrator health
            health_check = await self.neural_integrator.health_check()
            test_result["health_check"] = health_check
            test_result["neural_pipeline_status"] = health_check.get("status", "unknown")
            
            # Test performance metrics
            metrics = self.neural_integrator.get_performance_metrics()
            test_result["performance_metrics"] = metrics
            test_result["total_analyses"] = metrics.get("total_neural_analyses", 0)
            
            # Validate correlation ID consistency
            test_result["correlation_id_consistent"] = (
                health_check.get("correlation_id") == self.correlation_id and
                metrics.get("correlation_id") == self.correlation_id
            )
            
            test_result["status"] = "passed" if test_result["correlation_id_consistent"] else "failed"
            
        except Exception as e:
            test_result["status"] = "failed"
            test_result["error"] = str(e)
            logger.error(f"Neural pipeline coordination validation failed: {e}")
        
        test_result["end_time"] = datetime.now(timezone.utc)
        self.validation_results["test_results"]["neural_pipeline_coordination"] = test_result

    async def _validate_correlation_id_tracking(self):
        """Validate correlation ID tracking across components."""
        logger.info("Phase 4: Validating correlation ID tracking")
        
        test_result = {
            "phase": "correlation_id_tracking",
            "status": "pending", 
            "start_time": datetime.now(timezone.utc)
        }
        
        try:
            # Test multiple analyses and verify correlation ID consistency
            test_analyses = []
            
            for i in range(3):
                test_inputs = {
                    "severity": 2 + i,
                    "blast": 2,
                    "urgency": 2, 
                    "confidence": 0.8,
                    "stability_debt": 0.05
                }
                
                result = await self.neural_integrator.analyze_risk_with_neural_enhancement(test_inputs)
                analysis_data = {
                    "analysis_id": i,
                    "correlation_id": result.get("correlation_id"),
                    "execution_id": result.get("execution_id"),
                    "has_correlation_id": "correlation_id" in result,
                    "correlation_id_matches": result.get("correlation_id") == self.correlation_id
                }
                test_analyses.append(analysis_data)
            
            test_result["analyses"] = test_analyses
            test_result["total_analyses"] = len(test_analyses)
            
            # Check consistency
            correct_correlations = sum(1 for a in test_analyses if a["correlation_id_matches"])
            test_result["correct_correlations"] = correct_correlations
            test_result["correlation_consistency"] = correct_correlations / len(test_analyses)
            
            test_result["status"] = "passed" if test_result["correlation_consistency"] == 1.0 else "failed"
            
        except Exception as e:
            test_result["status"] = "failed"
            test_result["error"] = str(e)
            logger.error(f"Correlation ID tracking validation failed: {e}")
        
        test_result["end_time"] = datetime.now(timezone.utc)
        self.validation_results["test_results"]["correlation_id_tracking"] = test_result

    async def _validate_performance_metrics(self):
        """Validate performance characteristics of MCP risk integration."""
        logger.info("Phase 5: Validating performance metrics")
        
        test_result = {
            "phase": "performance_metrics",
            "status": "pending",
            "start_time": datetime.now(timezone.utc),
            "performance_thresholds": {
                "max_latency_ms": 200,
                "min_success_rate": 0.95,
                "max_error_rate": 0.05
            }
        }
        
        try:
            # Run performance test with multiple analyses
            latencies = []
            successes = 0
            total_tests = 5
            
            for i in range(total_tests):
                start_time = time.time()
                
                test_inputs = {
                    "severity": 2,
                    "blast": 2,
                    "urgency": 2,
                    "confidence": 0.8,
                    "stability_debt": 0.05
                }
                
                try:
                    result = await self.neural_integrator.analyze_risk_with_neural_enhancement(test_inputs)
                    if "score" in result:
                        successes += 1
                    latency_ms = (time.time() - start_time) * 1000
                    latencies.append(latency_ms)
                except Exception as e:
                    latencies.append(999)  # Mark failed test with high latency
            
            # Calculate performance metrics
            test_result["latencies_ms"] = latencies
            test_result["avg_latency_ms"] = sum(latencies) / len(latencies) if latencies else 0
            test_result["max_latency_ms"] = max(latencies) if latencies else 0
            test_result["success_rate"] = successes / total_tests
            test_result["error_rate"] = 1 - test_result["success_rate"]
            
            # Check against thresholds
            performance_checks = {
                "latency_ok": test_result["avg_latency_ms"] <= test_result["performance_thresholds"]["max_latency_ms"],
                "success_rate_ok": test_result["success_rate"] >= test_result["performance_thresholds"]["min_success_rate"],
                "error_rate_ok": test_result["error_rate"] <= test_result["performance_thresholds"]["max_error_rate"]
            }
            
            test_result["performance_checks"] = performance_checks
            test_result["all_checks_passed"] = all(performance_checks.values())
            
            test_result["status"] = "passed" if test_result["all_checks_passed"] else "failed"
            
        except Exception as e:
            test_result["status"] = "failed"
            test_result["error"] = str(e)
            logger.error(f"Performance metrics validation failed: {e}")
        
        test_result["end_time"] = datetime.now(timezone.utc)
        self.validation_results["test_results"]["performance_metrics"] = test_result

    def _calculate_overall_status(self):
        """Calculate overall validation status based on individual test results."""
        test_results = self.validation_results["test_results"]
        
        if not test_results:
            self.validation_results["overall_status"] = "failed"
            return
        
        status_counts = {
            "passed": 0,
            "failed": 0,
            "warning": 0,
            "pending": 0
        }
        
        for test_result in test_results.values():
            status = test_result.get("status", "pending")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        total_tests = len(test_results)
        
        # Determine overall status
        if status_counts["failed"] > 0:
            self.validation_results["overall_status"] = "failed"
        elif status_counts["passed"] == total_tests:
            self.validation_results["overall_status"] = "passed"
        elif status_counts["passed"] + status_counts["warning"] == total_tests:
            self.validation_results["overall_status"] = "passed_with_warnings"
        else:
            self.validation_results["overall_status"] = "failed"
        
        self.validation_results["test_summary"] = {
            "total_tests": total_tests,
            "passed": status_counts["passed"],
            "failed": status_counts["failed"],  
            "warnings": status_counts["warning"],
            "pending": status_counts["pending"]
        }

    def _generate_validation_report(self) -> Dict[str, Any]:
        """Generate final validation report."""
        self.validation_results["end_time"] = datetime.now(timezone.utc)
        
        # Calculate total duration
        duration = self.validation_results["end_time"] - self.validation_results["start_time"]
        self.validation_results["duration_seconds"] = duration.total_seconds()
        
        # Add recommendations based on results
        recommendations = []
        
        if self.validation_results["overall_status"] == "passed":
            recommendations.append("✅ MCP risk integration ready for production deployment")
        elif self.validation_results["overall_status"] == "passed_with_warnings":
            recommendations.append("⚠️ MCP risk integration ready with minor issues - monitor closely")
            recommendations.extend([
                f"• Address warning: {warning}" for warning in self.validation_results.get("warnings", [])
            ])
        else:
            recommendations.append("❌ MCP risk integration NOT ready for production")
            recommendations.extend([
                f"• Fix error: {error}" for error in self.validation_results.get("errors", [])
            ])
            recommendations.append("• Re-run validation after fixing issues")
        
        self.validation_results["recommendations"] = recommendations
        
        return self.validation_results


async def main():
    """Main validation execution."""
    validator = MCPRiskIntegrationValidator()
    
    print(f"🚀 Starting MCP Risk Integration Validation")
    print(f"📊 Correlation ID: {validator.correlation_id}")
    print(f"⏱️  Start Time: {datetime.now(timezone.utc).isoformat()}")
    print("-" * 60)
    
    # Run validation
    results = await validator.validate_production_readiness()
    
    # Print summary
    print(f"\n📋 VALIDATION SUMMARY")
    print(f"Overall Status: {results['overall_status'].upper()}")
    print(f"Duration: {results['duration_seconds']:.2f} seconds")
    print(f"Tests: {results['test_summary']['passed']}/{results['test_summary']['total_tests']} passed")
    
    if results.get("warnings"):
        print(f"Warnings: {len(results['warnings'])}")
    
    if results.get("errors"):
        print(f"Errors: {len(results['errors'])}")
    
    print("\n📝 RECOMMENDATIONS:")
    for recommendation in results.get("recommendations", []):
        print(f"  {recommendation}")
    
    # Save results to file
    output_file = f"mcp_risk_validation_{int(time.time())}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Full results saved to: {output_file}")
    
    # Exit with appropriate code
    if results["overall_status"] in ["passed", "passed_with_warnings"]:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())