#!/usr/bin/env python3
"""
Legal Pattern Validation CLI
Enhanced wrapper with error handling, batch processing, and detailed reporting

Usage:
    ./validate_legal_patterns_cli.py --file path/to/document.eml
    ./validate_legal_patterns_cli.py --batch /path/to/legal/case/files/
    ./validate_legal_patterns_cli.py --file doc.eml --report detailed
"""

import sys
import argparse
import json
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

try:
    from wholeness_validator_legal_patterns import LegalPatternValidator, SystemicPattern, ROAMCategory, SoRType
except ImportError as e:
    print(f"Error: Required modules not found. Make sure all validator files are in the same directory.")
    print(f"Import error: {e}")
    sys.exit(1)


# ═════════════════════════════════════════════════════════════════
# CLI ARGUMENT PARSING
# ═════════════════════════════════════════════════════════════════

def parse_args():
    """Parse command-line arguments"""
    parser = argparse.ArgumentParser(
        description="Legal Pattern Validation CLI - Enhanced wholeness validation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate single file
  %(prog)s --file SETTLEMENT-PROPOSAL.eml --type settlement
  
  # Batch validate directory
  %(prog)s --batch /path/to/CORRESPONDENCE/OUTBOUND/ --recursive
  
  # Detailed report with all checks
  %(prog)s --file LEASE-DISCOVERY.eml --report detailed --output report.json
  
  # Validate with specific patterns
  %(prog)s --file doc.eml --patterns systemic,roam,sor
        """
    )
    
    # Input options
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument(
        "--file", "-f",
        help="Path to single document to validate (.eml, .md, .txt)"
    )
    input_group.add_argument(
        "--batch", "-b",
        help="Path to directory for batch validation"
    )
    
    # Document type
    parser.add_argument(
        "--type", "-t",
        choices=["settlement", "court", "discovery", "correspondence"],
        default="settlement",
        help="Document type (affects signature block validation)"
    )
    
    # Pattern selection
    parser.add_argument(
        "--patterns", "-p",
        default="all",
        help="Comma-separated patterns to validate: systemic,roam,sor,signature,cross_org,punitive,all"
    )
    
    # Report options
    parser.add_argument(
        "--report", "-r",
        choices=["summary", "detailed", "json"],
        default="summary",
        help="Report format: summary (default), detailed, json"
    )
    
    parser.add_argument(
        "--output", "-o",
        help="Output file path (default: stdout)"
    )
    
    # Batch options
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Recursively search directories in batch mode"
    )
    
    parser.add_argument(
        "--filter",
        default="*.eml",
        help="File pattern filter for batch mode (default: *.eml)"
    )
    
    # Validation thresholds
    parser.add_argument(
        "--min-systemic-score",
        type=int,
        default=28,
        help="Minimum systemic indifference score threshold (default: 28/40)"
    )
    
    parser.add_argument(
        "--min-wholeness",
        type=float,
        default=80.0,
        help="Minimum wholeness percentage threshold (default: 80.0%%)"
    )
    
    # Verbose output
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output with detailed progress"
    )
    
    return parser.parse_args()


# ═════════════════════════════════════════════════════════════════
# VALIDATION FUNCTIONS
# ═════════════════════════════════════════════════════════════════

def validate_single_file(file_path: Path, args: argparse.Namespace) -> Dict:
    """Validate a single file"""
    if args.verbose:
        print(f"Validating: {file_path.name}", file=sys.stderr)
    
    # Read content
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        return {
            "file": str(file_path),
            "error": f"Failed to read file: {e}",
            "status": "ERROR"
        }
    
    # Create validator
    try:
        validator = LegalPatternValidator(
            document_type=file_path.suffix[1:],
            document_path=str(file_path)
        )
    except Exception as e:
        return {
            "file": str(file_path),
            "error": f"Failed to initialize validator: {e}",
            "status": "ERROR"
        }
    
    # Run validation
    try:
        report = validator.run_legal_pattern_validation(
            content=content,
            document_type=args.type
        )
        
        # Add metadata
        report["metadata"]["file_path"] = str(file_path)
        report["metadata"]["file_name"] = file_path.name
        report["metadata"]["file_size"] = len(content)
        report["metadata"]["validation_timestamp"] = datetime.utcnow().isoformat()
        
        # Check thresholds
        systemic_score = 0
        if "legal_patterns" in report and "systemic_indifference" in report["legal_patterns"]:
            systemic_overall = report["legal_patterns"]["systemic_indifference"].get("systemic_overall", {})
            systemic_score = systemic_overall.get("evidence", {}).get("total", 0)
        
        wholeness_score = report["overall"]["wholeness_score"]
        
        # Determine status
        if wholeness_score >= args.min_wholeness and systemic_score >= args.min_systemic_score:
            report["status"] = "PASS"
        elif wholeness_score >= args.min_wholeness * 0.8:
            report["status"] = "WARNING"
        else:
            report["status"] = "FAIL"
        
        return report
        
    except Exception as e:
        return {
            "file": str(file_path),
            "error": f"Validation failed: {e}",
            "status": "ERROR",
            "traceback": str(e)
        }


def validate_batch(directory: Path, args: argparse.Namespace) -> List[Dict]:
    """Validate all files in directory"""
    results = []
    
    # Find files
    if args.recursive:
        files = list(directory.rglob(args.filter))
    else:
        files = list(directory.glob(args.filter))
    
    if args.verbose:
        print(f"Found {len(files)} files to validate", file=sys.stderr)
    
    for file_path in files:
        if file_path.is_file():
            result = validate_single_file(file_path, args)
            results.append(result)
            
            # Progress indicator
            if args.verbose:
                status = result.get("status", "UNKNOWN")
                print(f"  [{status}] {file_path.name}", file=sys.stderr)
    
    return results


# ═════════════════════════════════════════════════════════════════
# REPORT GENERATION
# ═════════════════════════════════════════════════════════════════

def print_summary_report(report: Dict):
    """Print summary report to console"""
    print("=" * 80)
    print("LEGAL PATTERN VALIDATION SUMMARY")
    print("=" * 80)
    
    # File info
    if "metadata" in report:
        print(f"File: {report['metadata'].get('file_name', 'Unknown')}")
        print(f"Size: {report['metadata'].get('file_size', 0)} bytes")
        print()
    
    # Overall scores
    print("OVERALL ASSESSMENT")
    print("-" * 80)
    print(f"Wholeness Score:     {report['overall']['wholeness_score']:.1f}%")
    print(f"Consensus Rating:    {report['overall']['consensus_rating']:.1f}/5.0")
    print(f"Recommendation:      {report['overall']['recommendation']}")
    print(f"Status:              {report.get('status', 'UNKNOWN')}")
    print()
    
    # Legal patterns
    if "legal_patterns" in report:
        print("LEGAL PATTERNS")
        print("-" * 80)
        
        # Systemic Indifference
        if "systemic_indifference" in report["legal_patterns"]:
            systemic = report["legal_patterns"]["systemic_indifference"]
            if "systemic_overall" in systemic:
                overall = systemic["systemic_overall"]
                score = overall.get("evidence", {}).get("total", 0)
                status = "✅" if overall["passed"] else "❌"
                print(f"{status} Systemic Indifference: {score}/40 - {overall['message']}")
        
        # ROAM Risks
        if "roam_risks" in report["legal_patterns"]:
            roam = report["legal_patterns"]["roam_risks"]
            if "roam_coverage" in roam:
                coverage = roam["roam_coverage"]
                status = "✅" if coverage["passed"] else "❌"
                print(f"{status} ROAM Risk Coverage: {coverage['message']}")
        
        # SoR Quality
        if "sor_quality" in report["legal_patterns"]:
            sor = report["legal_patterns"]["sor_quality"]
            if "sor_overall" in sor:
                overall = sor["sor_overall"]
                status = "✅" if overall["passed"] else "❌"
                print(f"{status} SoR Quality: {overall['message']}")
        
        # Signature Block
        if "signature_block" in report["legal_patterns"]:
            sig = report["legal_patterns"]["signature_block"]
            if "single" in sig:
                sig_check = sig["single"]
                status = "✅" if sig_check["passed"] else "❌"
                print(f"{status} Signature Block: {sig_check['message']}")
        
        # Punitive Damages
        if "punitive_damages" in report["legal_patterns"]:
            punitive = report["legal_patterns"]["punitive_damages"]
            if "punitive_overall" in punitive:
                overall = punitive["punitive_overall"]
                status = "✅" if overall["passed"] else "❌"
                print(f"{status} Punitive Damages Foundation: {overall['message']}")
        
        print()
    
    print("=" * 80)


def print_detailed_report(report: Dict):
    """Print detailed report with all checks"""
    print_summary_report(report)
    
    print("\nDETAILED CHECKS")
    print("=" * 80)
    
    # Print all circle perspectives
    if "circle_perspectives" in report:
        print("\nCIRCLE PERSPECTIVES")
        print("-" * 80)
        for circle, data in report["circle_perspectives"].items():
            print(f"\n{circle.upper()}: {data['pass_rate']:.1f}% pass rate")
            print(f"  Purpose: {data['purpose']}")
            print(f"  Checks: {data['checks_passed']}/{data['checks_total']} passed")
    
    # Print all role perspectives
    if "role_perspectives" in report:
        print("\n\nLEGAL ROLE PERSPECTIVES")
        print("-" * 80)
        for role, data in report["role_perspectives"].items():
            print(f"\n{role.upper()}: {data['verdict']}")
            print(f"  Focus: {data['focus_area']}")
            print(f"  Reasoning: {data['reasoning']}")
    
    # Print all legal patterns with details
    if "legal_patterns" in report:
        print("\n\nLEGAL PATTERNS (DETAILED)")
        print("-" * 80)
        
        for pattern_name, pattern_checks in report["legal_patterns"].items():
            print(f"\n{pattern_name.upper().replace('_', ' ')}")
            for check_id, check in pattern_checks.items():
                status = "✅" if check["passed"] else "❌"
                print(f"  {status} [{check['severity'].upper()}] {check['description']}")
                print(f"     → {check['message']}")
                if check.get("remediation"):
                    print(f"     ℹ️  {check['remediation']}")


def print_batch_summary(results: List[Dict]):
    """Print summary for batch validation"""
    total = len(results)
    passed = sum(1 for r in results if r.get("status") == "PASS")
    warnings = sum(1 for r in results if r.get("status") == "WARNING")
    failed = sum(1 for r in results if r.get("status") == "FAIL")
    errors = sum(1 for r in results if r.get("status") == "ERROR")
    
    print("=" * 80)
    print("BATCH VALIDATION SUMMARY")
    print("=" * 80)
    print(f"Total Files:    {total}")
    print(f"✅ Passed:      {passed}")
    print(f"⚠️  Warnings:    {warnings}")
    print(f"❌ Failed:      {failed}")
    print(f"🚨 Errors:      {errors}")
    print()
    print(f"Pass Rate:      {(passed / total * 100):.1f}%" if total > 0 else "N/A")
    print("=" * 80)
    
    # List failed/error files
    if failed > 0 or errors > 0:
        print("\nFILES REQUIRING ATTENTION:")
        print("-" * 80)
        for result in results:
            status = result.get("status")
            if status in ["FAIL", "ERROR"]:
                file_name = Path(result.get("file", "unknown")).name
                print(f"{status}: {file_name}")
                if "error" in result:
                    print(f"  Error: {result['error']}")


# ═════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═════════════════════════════════════════════════════════════════

def main():
    """Main CLI entry point"""
    args = parse_args()
    
    # Single file validation
    if args.file:
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"Error: File not found: {file_path}", file=sys.stderr)
            sys.exit(1)
        
        report = validate_single_file(file_path, args)
        
        # Output report
        if args.report == "json":
            output = json.dumps(report, indent=2)
            if args.output:
                Path(args.output).write_text(output)
            else:
                print(output)
        elif args.report == "detailed":
            print_detailed_report(report)
        else:  # summary
            print_summary_report(report)
        
        # Exit code based on status
        status = report.get("status", "UNKNOWN")
        if status == "PASS":
            sys.exit(0)
        elif status == "WARNING":
            sys.exit(1)
        else:
            sys.exit(2)
    
    # Batch validation
    elif args.batch:
        batch_dir = Path(args.batch)
        if not batch_dir.exists() or not batch_dir.is_dir():
            print(f"Error: Directory not found: {batch_dir}", file=sys.stderr)
            sys.exit(1)
        
        results = validate_batch(batch_dir, args)
        
        # Output results
        if args.report == "json":
            output = json.dumps(results, indent=2)
            if args.output:
                Path(args.output).write_text(output)
            else:
                print(output)
        else:
            print_batch_summary(results)
            
            # Detailed reports for each file
            if args.report == "detailed":
                for result in results:
                    if result.get("status") != "ERROR":
                        print("\n")
                        print_detailed_report(result)
        
        # Exit code based on results
        if any(r.get("status") == "FAIL" for r in results):
            sys.exit(2)
        elif any(r.get("status") == "WARNING" for r in results):
            sys.exit(1)
        else:
            sys.exit(0)


if __name__ == "__main__":
    main()
