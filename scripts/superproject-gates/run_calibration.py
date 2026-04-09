#!/usr/bin/env python3
"""
Risk Analytics Calibration Test Runner
=====================================

Orchestrates calibration testing across multiple recent PRs to validate
the accuracy and false positive rates of risk analytics gates.

Usage:
    python run_calibration.py --repo owner/name --count 10
    python run_calibration.py --auto-select --target-fp-rate 2.0
    python run_calibration.py --specific-prs 123,456,789 --validate-existing
"""

import json
import argparse
import logging
import asyncio
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
import tempfile
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CalibrationRunner:
    """Manages calibration testing workflow"""
    
    def __init__(self, repo: str, github_token: str = None):
        self.repo = repo
        self.github_token = github_token or os.getenv('GITHUB_TOKEN')
        self.metrics_script = Path(__file__).parent / "collect_metrics.py"
        
        # Calibration configuration
        self.target_false_positive_rate = 2.0  # 2% max
        self.target_accuracy = {
            "P0": 98.0,  # 98% minimum for critical
            "P1": 95.0,  # 95% minimum for high
            "P2": 92.0,  # 92% minimum for medium
            "P3": 88.0   # 88% minimum for low
        }
        
    async def get_recent_merged_prs(self, count: int = 10, days: int = 30) -> List[int]:
        """Get recent merged PRs for calibration testing"""
        logger.info(f"Fetching {count} recent merged PRs from {self.repo}")
        
        # Use GitHub CLI if available, otherwise fall back to API
        try:
            cmd = [
                "gh", "pr", "list",
                "--repo", self.repo,
                "--state", "merged",
                "--limit", str(count),
                "--json", "number,title,mergedAt",
                "--search", f"merged:>{(datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')}"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            prs_data = json.loads(result.stdout)
            
            pr_numbers = [pr['number'] for pr in prs_data]
            logger.info(f"Found {len(pr_numbers)} recent merged PRs: {pr_numbers}")
            
            return pr_numbers
            
        except (subprocess.CalledProcessError, json.JSONDecodeError, FileNotFoundError) as e:
            logger.warning(f"GitHub CLI failed, falling back to manual selection: {e}")
            
            # Fallback: suggest manual PR selection
            print("\n⚠️ Could not automatically fetch PRs. Please specify PR numbers manually:")
            print("Example: python run_calibration.py --specific-prs 123,456,789,012,345")
            return []

    async def run_calibration_test(self, pr_numbers: List[int]) -> Dict[str, Any]:
        """Execute calibration test on specified PRs"""
        logger.info(f"Running calibration test on PRs: {pr_numbers}")
        
        if not pr_numbers:
            raise ValueError("No PR numbers provided for calibration")
        
        # Prepare temporary files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as baseline_file:
            baseline_path = baseline_file.name
        
        try:
            # Step 1: Collect baseline metrics
            logger.info("Step 1: Collecting baseline metrics...")
            cmd = [
                sys.executable, str(self.metrics_script),
                "--repo", self.repo,
                "--days", "30",
                "--output", baseline_path
            ]
            
            if self.github_token:
                env = os.environ.copy()
                env['GITHUB_TOKEN'] = self.github_token
            else:
                env = None
            
            result = subprocess.run(cmd, capture_output=True, text=True, env=env)
            if result.returncode != 0:
                logger.error(f"Baseline collection failed: {result.stderr}")
                raise RuntimeError(f"Metrics collection failed: {result.stderr}")
            
            # Step 2: Run calibration analysis
            logger.info("Step 2: Running calibration analysis...")
            pr_list = ",".join(map(str, pr_numbers))
            cmd = [
                sys.executable, str(self.metrics_script),
                "--repo", self.repo,
                "--calibration",
                "--prs", pr_list,
                "--days", "30"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, env=env)
            if result.returncode != 0:
                logger.error(f"Calibration analysis failed: {result.stderr}")
                raise RuntimeError(f"Calibration failed: {result.stderr}")
            
            # Parse calibration output
            calibration_output = result.stdout
            logger.info("Calibration analysis completed")
            
            # Step 3: Validate results
            validation_results = self._validate_calibration_results(calibration_output)
            
            return {
                "pr_numbers": pr_numbers,
                "calibration_output": calibration_output,
                "validation": validation_results,
                "baseline_file": baseline_path,
                "timestamp": datetime.now().isoformat()
            }
            
        finally:
            # Cleanup temporary files
            try:
                os.unlink(baseline_path)
            except:
                pass

    def _validate_calibration_results(self, output: str) -> Dict[str, Any]:
        """Parse and validate calibration results against targets"""
        logger.info("Validating calibration results against targets")
        
        validation = {
            "status": "UNKNOWN",
            "false_positive_rate": None,
            "accuracy_validation": {},
            "recommendations": [],
            "pass_criteria": {
                "false_positive_rate_ok": False,
                "p0_accuracy_ok": False,
                "p1_accuracy_ok": False,
                "overall_performance_ok": False
            }
        }
        
        try:
            # Parse output for key metrics
            lines = output.split('\n')
            
            for line in lines:
                if "False Positive Rate:" in line:
                    fp_rate_str = line.split(':')[1].strip().replace('%', '')
                    validation["false_positive_rate"] = float(fp_rate_str)
                    validation["pass_criteria"]["false_positive_rate_ok"] = float(fp_rate_str) <= self.target_false_positive_rate
                
                # Parse accuracy by risk level
                if line.strip().startswith(('P0:', 'P1:', 'P2:', 'P3:')):
                    parts = line.strip().split(':')
                    if len(parts) == 2:
                        level = parts[0].strip()
                        accuracy_str = parts[1].strip().replace('%', '')
                        accuracy = float(accuracy_str)
                        
                        validation["accuracy_validation"][level] = {
                            "measured": accuracy,
                            "target": self.target_accuracy.get(level, 0),
                            "passes": accuracy >= self.target_accuracy.get(level, 0)
                        }
                        
                        if level == "P0":
                            validation["pass_criteria"]["p0_accuracy_ok"] = accuracy >= self.target_accuracy["P0"]
                        elif level == "P1":
                            validation["pass_criteria"]["p1_accuracy_ok"] = accuracy >= self.target_accuracy["P1"]
            
            # Overall assessment
            criteria = validation["pass_criteria"]
            validation["pass_criteria"]["overall_performance_ok"] = (
                criteria["false_positive_rate_ok"] and
                criteria["p0_accuracy_ok"] and
                criteria["p1_accuracy_ok"]
            )
            
            if validation["pass_criteria"]["overall_performance_ok"]:
                validation["status"] = "PASS"
            elif validation["false_positive_rate"] and validation["false_positive_rate"] <= 5.0:  # Relaxed threshold
                validation["status"] = "CONDITIONAL_PASS"
                validation["recommendations"].append("Consider additional tuning to meet strict targets")
            else:
                validation["status"] = "FAIL"
            
            # Generate specific recommendations
            if validation["false_positive_rate"] and validation["false_positive_rate"] > self.target_false_positive_rate:
                validation["recommendations"].append(
                    f"False positive rate ({validation['false_positive_rate']:.1f}%) exceeds target ({self.target_false_positive_rate}%) - review risk scoring thresholds"
                )
            
            for level, data in validation["accuracy_validation"].items():
                if not data["passes"]:
                    validation["recommendations"].append(
                        f"{level} accuracy ({data['measured']:.1f}%) below target ({data['target']:.1f}%) - improve {level} detection algorithms"
                    )
            
            if not validation["recommendations"]:
                validation["recommendations"].append("All metrics meet or exceed targets - ready for production")
                
        except Exception as e:
            logger.error(f"Failed to parse calibration results: {e}")
            validation["status"] = "ERROR"
            validation["recommendations"].append(f"Failed to parse results: {e}")
        
        return validation

    def generate_calibration_report(self, results: Dict[str, Any], output_file: str = None):
        """Generate comprehensive calibration report"""
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"calibration_report_{timestamp}.md"
        
        report_content = f"""# Risk Analytics Calibration Report

**Generated**: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}  
**Repository**: {self.repo}  
**Test PRs**: {', '.join(map(str, results['pr_numbers']))}

## Executive Summary

**Overall Status**: {results['validation']['status']}

### Key Metrics
- **False Positive Rate**: {results['validation'].get('false_positive_rate', 'N/A')}%
- **Target FP Rate**: {self.target_false_positive_rate}%

### Pass/Fail Criteria
"""
        
        criteria = results['validation']['pass_criteria']
        for criterion, passed in criteria.items():
            status_emoji = "✅" if passed else "❌"
            formatted_name = criterion.replace('_', ' ').title()
            report_content += f"- {status_emoji} **{formatted_name}**: {'PASS' if passed else 'FAIL'}\n"
        
        report_content += "\n## Accuracy by Risk Level\n\n"
        
        accuracy_data = results['validation'].get('accuracy_validation', {})
        if accuracy_data:
            report_content += "| Risk Level | Measured | Target | Status |\n"
            report_content += "|------------|----------|--------|---------|\n"
            
            for level in ['P0', 'P1', 'P2', 'P3']:
                if level in accuracy_data:
                    data = accuracy_data[level]
                    status = "✅ PASS" if data['passes'] else "❌ FAIL"
                    report_content += f"| {level} | {data['measured']:.1f}% | {data['target']:.1f}% | {status} |\n"
        
        report_content += "\n## Recommendations\n\n"
        
        recommendations = results['validation'].get('recommendations', [])
        for i, rec in enumerate(recommendations, 1):
            report_content += f"{i}. {rec}\n"
        
        report_content += "\n## Raw Calibration Output\n\n```\n"
        report_content += results.get('calibration_output', 'No output captured')
        report_content += "\n```\n"
        
        report_content += f"""
## Next Steps

Based on the calibration results:

"""
        
        if results['validation']['status'] == 'PASS':
            report_content += """
✅ **Ready for Production Deployment**
- All metrics meet target thresholds
- Proceed with phased rollout as planned
- Continue monitoring during initial deployment
"""
        elif results['validation']['status'] == 'CONDITIONAL_PASS':
            report_content += """
⚠️ **Conditional Approval - Monitor Closely**
- Metrics are acceptable but not optimal
- Proceed with enhanced monitoring
- Plan for threshold adjustments based on production data
"""
        else:
            report_content += """
❌ **Not Ready for Production**
- Critical metrics do not meet minimum thresholds
- Address recommendations before deployment
- Re-run calibration after improvements
"""
        
        report_content += f"""
## Configuration

**Target Thresholds**:
- False Positive Rate: ≤ {self.target_false_positive_rate}%
- P0 Accuracy: ≥ {self.target_accuracy['P0']}%
- P1 Accuracy: ≥ {self.target_accuracy['P1']}%
- P2 Accuracy: ≥ {self.target_accuracy['P2']}%
- P3 Accuracy: ≥ {self.target_accuracy['P3']}%

---
*Report generated by Risk Analytics Calibration Runner*
"""
        
        with open(output_file, 'w') as f:
            f.write(report_content)
        
        logger.info(f"Calibration report saved to: {output_file}")
        print(f"\n📄 Detailed report saved to: {output_file}")
        
        return output_file

    def print_summary(self, results: Dict[str, Any]):
        """Print calibration summary to console"""
        validation = results['validation']
        
        print(f"\n🎯 CALIBRATION TEST SUMMARY")
        print("=" * 50)
        print(f"Repository: {self.repo}")
        print(f"Test PRs: {', '.join(map(str, results['pr_numbers']))}")
        print(f"Overall Status: {validation['status']}")
        
        # Status indicator
        status_emoji = {
            "PASS": "✅",
            "CONDITIONAL_PASS": "⚠️",
            "FAIL": "❌",
            "ERROR": "💥"
        }.get(validation['status'], "❓")
        
        print(f"\n{status_emoji} Status: {validation['status']}")
        
        if validation.get('false_positive_rate') is not None:
            fp_rate = validation['false_positive_rate']
            fp_status = "✅" if fp_rate <= self.target_false_positive_rate else "❌"
            print(f"{fp_status} False Positive Rate: {fp_rate:.1f}% (target: ≤{self.target_false_positive_rate}%)")
        
        accuracy_data = validation.get('accuracy_validation', {})
        if accuracy_data:
            print(f"\nAccuracy Results:")
            for level in ['P0', 'P1', 'P2', 'P3']:
                if level in accuracy_data:
                    data = accuracy_data[level]
                    status_emoji = "✅" if data['passes'] else "❌"
                    print(f"  {status_emoji} {level}: {data['measured']:.1f}% (target: ≥{data['target']:.1f}%)")
        
        recommendations = validation.get('recommendations', [])
        if recommendations:
            print(f"\nRecommendations:")
            for rec in recommendations:
                print(f"  • {rec}")


async def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description="Risk Analytics Calibration Test Runner")
    parser.add_argument("--repo", required=True, help="GitHub repository (owner/name)")
    parser.add_argument("--count", type=int, default=10, help="Number of recent PRs to test")
    parser.add_argument("--days", type=int, default=30, help="Look back days for PR selection")
    parser.add_argument("--specific-prs", help="Comma-separated list of specific PR numbers")
    parser.add_argument("--auto-select", action="store_true", help="Auto-select recent merged PRs")
    parser.add_argument("--target-fp-rate", type=float, default=2.0, help="Target false positive rate (%)")
    parser.add_argument("--report-file", help="Output file for detailed report")
    parser.add_argument("--validate-existing", action="store_true", help="Validate existing risk analytics")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize calibration runner
    runner = CalibrationRunner(args.repo)
    if args.target_fp_rate:
        runner.target_false_positive_rate = args.target_fp_rate
    
    try:
        # Determine PR numbers to test
        pr_numbers = []
        
        if args.specific_prs:
            pr_numbers = [int(pr.strip()) for pr in args.specific_prs.split(",")]
            logger.info(f"Using specific PRs: {pr_numbers}")
            
        elif args.auto_select:
            pr_numbers = await runner.get_recent_merged_prs(args.count, args.days)
            if not pr_numbers:
                print("\n❌ Could not auto-select PRs. Please use --specific-prs instead.")
                sys.exit(1)
        else:
            print("Error: Must specify either --specific-prs or --auto-select")
            sys.exit(1)
        
        # Run calibration test
        logger.info("Starting calibration test execution...")
        results = await runner.run_calibration_test(pr_numbers)
        
        # Display results
        runner.print_summary(results)
        
        # Generate detailed report
        report_file = runner.generate_calibration_report(results, args.report_file)
        
        # Exit with appropriate code
        status = results['validation']['status']
        if status == "PASS":
            print(f"\n🎉 Calibration PASSED - Ready for deployment!")
            sys.exit(0)
        elif status == "CONDITIONAL_PASS":
            print(f"\n⚠️ Calibration conditionally passed - proceed with caution")
            sys.exit(0)
        else:
            print(f"\n❌ Calibration FAILED - address issues before deployment")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Calibration test failed: {e}")
        print(f"\n💥 Calibration test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())