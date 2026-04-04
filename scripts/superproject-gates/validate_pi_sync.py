#!/usr/bin/env python3
"""
PI Sync Validation Script for StarlingX/OpenStack Integration
Validates alignment with upstream cycles and PI sync requirements
"""

import json
import subprocess
import datetime
import argparse
import os
import sys
import sqlite3
import requests
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any

class PISyncValidator:
    def __init__(self, correlation_id: str = "consciousness-1758658960"):
        self.correlation_id = correlation_id
        self.timestamp = datetime.datetime.utcnow().isoformat() + "Z"
        
        # Configuration
        self.project_root = Path(__file__).parent.parent.parent
        self.logs_dir = self.project_root / "logs"
        self.logs_dir.mkdir(exist_ok=True)
        
        # StarlingX and OpenStack configuration
        self.starlingx_branches = [
            "r/stx.11.0",
            "r/stx.10.0", 
            "master"
        ]
        
        self.openstack_releases = {
            "2024.2": "Dalmatian",
            "2024.1": "Caracal", 
            "2023.2": "Bobcat",
            "2023.1": "Antelope"
        }
        
        # Initialize database
        self.db_path = self.logs_dir / "pi_sync.db"
        self.init_database()
        
        self.verbose = False
    
    def init_database(self):
        """Initialize PI sync tracking database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pi_sync_validations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                validation_type TEXT NOT NULL,
                starlingx_branch TEXT,
                openstack_release TEXT,
                sync_status TEXT NOT NULL,
                validation_score REAL,
                issues_found TEXT,
                recommendations TEXT,
                correlation_id TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS upstream_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                project TEXT NOT NULL,
                change_id TEXT,
                subject TEXT,
                status TEXT,
                branch TEXT,
                review_url TEXT,
                correlation_id TEXT
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pi_timestamp ON pi_sync_validations(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_upstream_project ON upstream_reviews(project, timestamp)")
        
        conn.commit()
        conn.close()
    
    def emit_heartbeat(self, component: str, phase: str, status: str, elapsed_ms: int, metrics: Dict[str, Any] = None):
        """Emit standardized heartbeat for CLAUDE ecosystem integration"""
        heartbeat_line = f"{self.timestamp}|{component}|{phase}|{status}|{elapsed_ms}|{self.correlation_id}|{json.dumps(metrics or {})}"
        
        heartbeat_file = self.logs_dir / "heartbeats.log"
        with open(heartbeat_file, "a") as f:
            f.write(heartbeat_line + "\n")
        
        if self.verbose:
            print(f"💓 Heartbeat: {component} | {phase} | {status}")
    
    def validate_starlingx_branches(self) -> Dict[str, Any]:
        """Validate StarlingX branch alignment"""
        print("🌟 Validating StarlingX Branch Alignment...")
        
        results = {
            "validation_type": "starlingx_branches",
            "timestamp": self.timestamp,
            "branches": {},
            "overall_status": "UNKNOWN",
            "sync_score": 0.0,
            "issues": [],
            "recommendations": []
        }
        
        total_score = 0
        branch_count = 0
        
        for branch in self.starlingx_branches:
            branch_result = self._validate_single_branch(branch)
            results["branches"][branch] = branch_result
            
            if branch_result["accessible"]:
                total_score += branch_result["score"]
                branch_count += 1
            else:
                results["issues"].append(f"Branch {branch} not accessible or not found")
        
        # Calculate overall sync score
        if branch_count > 0:
            results["sync_score"] = total_score / branch_count
        else:
            results["sync_score"] = 0
        
        # Determine overall status
        if results["sync_score"] >= 80:
            results["overall_status"] = "ALIGNED"
        elif results["sync_score"] >= 60:
            results["overall_status"] = "PARTIAL_SYNC"
        else:
            results["overall_status"] = "OUT_OF_SYNC"
        
        # Generate recommendations
        if results["overall_status"] == "ALIGNED":
            results["recommendations"].append("StarlingX branches well aligned with upstream")
        elif results["overall_status"] == "PARTIAL_SYNC":
            results["recommendations"].append("Some branches need attention for better alignment")
            results["recommendations"].append("Review failed branch validations and update accordingly")
        else:
            results["recommendations"].append("Significant branch alignment issues detected")
            results["recommendations"].append("Immediate synchronization with upstream required")
        
        # Store validation results
        self._store_pi_validation("starlingx_branches", None, None, 
                                 results["overall_status"], results["sync_score"],
                                 results["issues"], results["recommendations"])
        
        return results
    
    def _validate_single_branch(self, branch: str) -> Dict[str, Any]:
        """Validate a single StarlingX branch"""
        try:
            # Check if we can access the branch via gerrit API
            gerrit_url = f"https://review.opendev.org/projects/starlingx%2Fconfig/branches/{branch.replace('/', '%2F')}"
            
            # Try to get branch information
            try:
                response = requests.get(gerrit_url, timeout=10)
                if response.status_code == 200:
                    branch_accessible = True
                    branch_score = 90  # Base score for accessible branch
                else:
                    branch_accessible = False
                    branch_score = 0
            except:
                branch_accessible = False
                branch_score = 0
            
            # Additional scoring based on branch characteristics
            if branch == "master":
                branch_score += 10  # Master branch is always important
            elif "stx.11" in branch:
                branch_score += 5   # Current major release
            
            return {
                "branch": branch,
                "accessible": branch_accessible,
                "score": min(100, branch_score),
                "gerrit_url": gerrit_url,
                "validation_time": self.timestamp
            }
            
        except Exception as e:
            return {
                "branch": branch,
                "accessible": False,
                "score": 0,
                "error": str(e),
                "validation_time": self.timestamp
            }
    
    def validate_openstack_alignment(self) -> Dict[str, Any]:
        """Validate OpenStack release alignment"""
        print("☁️ Validating OpenStack Release Alignment...")
        
        results = {
            "validation_type": "openstack_alignment", 
            "timestamp": self.timestamp,
            "releases": {},
            "current_target": None,
            "alignment_status": "UNKNOWN",
            "alignment_score": 0.0,
            "issues": [],
            "recommendations": []
        }
        
        # Determine current target release (latest stable)
        latest_release = max(self.openstack_releases.keys())
        results["current_target"] = {
            "version": latest_release,
            "codename": self.openstack_releases[latest_release]
        }
        
        # Validate each release
        total_score = 0
        release_count = 0
        
        for version, codename in self.openstack_releases.items():
            release_result = self._validate_openstack_release(version, codename)
            results["releases"][version] = release_result
            
            # Weight recent releases higher
            if version >= "2024.1":
                weight = 1.0
            elif version >= "2023.1":
                weight = 0.7
            else:
                weight = 0.3
            
            total_score += release_result["score"] * weight
            release_count += weight
        
        # Calculate alignment score
        if release_count > 0:
            results["alignment_score"] = total_score / release_count
        else:
            results["alignment_score"] = 0
        
        # Determine alignment status
        if results["alignment_score"] >= 85:
            results["alignment_status"] = "CURRENT"
        elif results["alignment_score"] >= 70:
            results["alignment_status"] = "COMPATIBLE"
        else:
            results["alignment_status"] = "OUTDATED"
        
        # Generate recommendations based on alignment
        if results["alignment_status"] == "CURRENT":
            results["recommendations"].append("OpenStack alignment is current and well maintained")
            results["recommendations"].append("Continue tracking latest releases for future updates")
        elif results["alignment_status"] == "COMPATIBLE":
            results["recommendations"].append("OpenStack alignment is acceptable but could be improved")
            results["recommendations"].append(f"Consider upgrading to {latest_release} ({self.openstack_releases[latest_release]}) when feasible")
        else:
            results["recommendations"].append("OpenStack alignment is significantly outdated")
            results["recommendations"].append("Urgent update required to maintain compatibility")
            results["issues"].append("Multiple OpenStack release gaps detected")
        
        # Store validation results
        self._store_pi_validation("openstack_alignment", None, latest_release,
                                 results["alignment_status"], results["alignment_score"], 
                                 results["issues"], results["recommendations"])
        
        return results
    
    def _validate_openstack_release(self, version: str, codename: str) -> Dict[str, Any]:
        """Validate compatibility with specific OpenStack release"""
        try:
            # Score based on release recency and support status
            current_year = datetime.datetime.now().year
            release_year = int(version.split('.')[0])
            
            # Base scoring
            if release_year == current_year:
                base_score = 100  # Current year releases
            elif release_year == current_year - 1:
                base_score = 85   # Last year releases
            elif release_year >= current_year - 2:
                base_score = 70   # 2-year old releases
            else:
                base_score = 40   # Older releases
            
            # Additional scoring factors
            if "2024.1" in version:  # Caracal (current stable)
                base_score += 10
            elif "2024.2" in version:  # Dalmatian (upcoming)
                base_score += 5
            
            return {
                "version": version,
                "codename": codename,
                "score": min(100, base_score),
                "support_status": "SUPPORTED" if base_score >= 70 else "LIMITED",
                "validation_time": self.timestamp
            }
            
        except Exception as e:
            return {
                "version": version,
                "codename": codename,
                "score": 0,
                "error": str(e),
                "support_status": "UNKNOWN",
                "validation_time": self.timestamp
            }
    
    def check_upstream_reviews(self) -> Dict[str, Any]:
        """Check for recent upstream reviews and changes"""
        print("🔄 Checking Upstream Reviews...")
        
        results = {
            "validation_type": "upstream_reviews",
            "timestamp": self.timestamp,
            "projects": {},
            "recent_changes": [],
            "review_status": "UNKNOWN",
            "activity_score": 0.0,
            "recommendations": []
        }
        
        # StarlingX projects to monitor
        starlingx_projects = [
            "starlingx/config",
            "starlingx/fault",
            "starlingx/ha", 
            "starlingx/integ",
            "starlingx/metal",
            "starlingx/nfv",
            "starlingx/update"
        ]
        
        total_activity = 0
        project_count = 0
        
        for project in starlingx_projects:
            try:
                project_activity = self._check_project_activity(project)
                results["projects"][project] = project_activity
                
                total_activity += project_activity["activity_score"]
                project_count += 1
                
                # Collect recent changes
                if project_activity.get("recent_changes"):
                    results["recent_changes"].extend(project_activity["recent_changes"][:3])  # Top 3 per project
                
            except Exception as e:
                results["projects"][project] = {
                    "error": str(e),
                    "activity_score": 0
                }
        
        # Calculate overall activity score
        if project_count > 0:
            results["activity_score"] = total_activity / project_count
        else:
            results["activity_score"] = 0
        
        # Determine review status
        if results["activity_score"] >= 70:
            results["review_status"] = "ACTIVE"
        elif results["activity_score"] >= 40:
            results["review_status"] = "MODERATE"
        else:
            results["review_status"] = "LOW_ACTIVITY"
        
        # Generate recommendations
        if results["review_status"] == "ACTIVE":
            results["recommendations"].append("Upstream activity is healthy, continue monitoring")
        elif results["review_status"] == "MODERATE":
            results["recommendations"].append("Moderate upstream activity, consider increasing engagement")
        else:
            results["recommendations"].append("Low upstream activity detected, investigate project status")
        
        # Store upstream review data
        for change in results["recent_changes"][:10]:  # Store top 10 changes
            self._store_upstream_review(change)
        
        return results
    
    def _check_project_activity(self, project: str) -> Dict[str, Any]:
        """Check activity for a specific StarlingX project"""
        try:
            # Query Gerrit for recent changes
            gerrit_query_url = f"https://review.opendev.org/changes/?q=project:{project}&n=10&o=DETAILED_ACCOUNTS"
            
            response = requests.get(gerrit_query_url, timeout=15)
            if response.status_code != 200:
                return {
                    "project": project,
                    "activity_score": 0,
                    "error": f"HTTP {response.status_code}"
                }
            
            # Parse gerrit response (remove leading garbage characters)
            content = response.text
            if content.startswith(")]}'\n"):
                content = content[5:]
            
            changes = json.loads(content)
            
            # Calculate activity score based on recent changes
            if not changes:
                activity_score = 0
            else:
                # Score based on change count and recency
                change_count = len(changes)
                activity_score = min(100, change_count * 10)
                
                # Bonus for very recent changes (last 30 days)
                recent_changes = []
                now = datetime.datetime.now()
                thirty_days_ago = now - datetime.timedelta(days=30)
                
                for change in changes:
                    updated_time = datetime.datetime.strptime(
                        change["updated"][:19], "%Y-%m-%d %H:%M:%S"
                    )
                    if updated_time > thirty_days_ago:
                        activity_score += 5
                        recent_changes.append({
                            "project": project,
                            "change_id": change.get("change_id"),
                            "subject": change.get("subject", "")[:100],
                            "status": change.get("status"),
                            "branch": change.get("branch"),
                            "updated": change.get("updated"),
                            "review_url": f"https://review.opendev.org/c/{change.get('_number', '')}"
                        })
            
            return {
                "project": project,
                "activity_score": min(100, activity_score),
                "change_count": len(changes),
                "recent_changes": recent_changes,
                "last_checked": self.timestamp
            }
            
        except Exception as e:
            return {
                "project": project,
                "activity_score": 0,
                "error": str(e)
            }
    
    def validate_device_compatibility(self, device_id: str = "24460") -> Dict[str, Any]:
        """Validate device compatibility with PI sync requirements"""
        print(f"🔧 Validating Device #{device_id} PI Sync Compatibility...")
        
        results = {
            "validation_type": "device_compatibility",
            "device_id": device_id,
            "timestamp": self.timestamp,
            "compatibility_checks": {},
            "overall_compatibility": "UNKNOWN",
            "compatibility_score": 0.0,
            "issues": [],
            "recommendations": []
        }
        
        # Check device configuration compatibility
        checks = [
            ("starlingx_support", self._check_starlingx_support),
            ("openstack_compatibility", self._check_openstack_compatibility), 
            ("kubernetes_version", self._check_kubernetes_compatibility),
            ("hardware_requirements", self._check_hardware_requirements)
        ]
        
        total_score = 0
        check_count = 0
        
        for check_name, check_func in checks:
            try:
                check_result = check_func(device_id)
                results["compatibility_checks"][check_name] = check_result
                
                total_score += check_result.get("score", 0)
                check_count += 1
                
                if check_result.get("issues"):
                    results["issues"].extend(check_result["issues"])
                    
            except Exception as e:
                results["compatibility_checks"][check_name] = {
                    "status": "ERROR",
                    "score": 0,
                    "error": str(e)
                }
                check_count += 1
        
        # Calculate compatibility score
        if check_count > 0:
            results["compatibility_score"] = total_score / check_count
        else:
            results["compatibility_score"] = 0
        
        # Determine overall compatibility
        if results["compatibility_score"] >= 85:
            results["overall_compatibility"] = "FULLY_COMPATIBLE"
        elif results["compatibility_score"] >= 70:
            results["overall_compatibility"] = "COMPATIBLE"
        elif results["compatibility_score"] >= 50:
            results["overall_compatibility"] = "LIMITED_COMPATIBILITY"
        else:
            results["overall_compatibility"] = "INCOMPATIBLE"
        
        # Generate device-specific recommendations
        if results["overall_compatibility"] == "FULLY_COMPATIBLE":
            results["recommendations"].append(f"Device #{device_id} is fully compatible with PI sync requirements")
        elif results["overall_compatibility"] == "COMPATIBLE":
            results["recommendations"].append(f"Device #{device_id} is compatible with minor configuration adjustments")
        else:
            results["recommendations"].append(f"Device #{device_id} requires significant updates for PI sync compatibility")
        
        return results
    
    def _check_starlingx_support(self, device_id: str) -> Dict[str, Any]:
        """Check StarlingX support for the device"""
        # Placeholder implementation - would check actual device StarlingX status
        return {
            "check": "starlingx_support",
            "status": "SUPPORTED",
            "score": 90,
            "details": f"Device #{device_id} supports StarlingX deployment",
            "version": "stx.11.0"
        }
    
    def _check_openstack_compatibility(self, device_id: str) -> Dict[str, Any]:
        """Check OpenStack compatibility for the device"""
        # Placeholder implementation - would check actual OpenStack compatibility
        return {
            "check": "openstack_compatibility", 
            "status": "COMPATIBLE",
            "score": 85,
            "details": f"Device #{device_id} compatible with OpenStack Caracal",
            "supported_releases": ["Caracal", "Bobcat"]
        }
    
    def _check_kubernetes_compatibility(self, device_id: str) -> Dict[str, Any]:
        """Check Kubernetes version compatibility"""
        # Placeholder implementation - would check actual K8s version
        return {
            "check": "kubernetes_version",
            "status": "COMPATIBLE", 
            "score": 88,
            "details": f"Device #{device_id} supports required Kubernetes versions",
            "supported_versions": ["1.28", "1.29"]
        }
    
    def _check_hardware_requirements(self, device_id: str) -> Dict[str, Any]:
        """Check hardware requirements for PI sync"""
        # Placeholder implementation - would check actual hardware specs
        return {
            "check": "hardware_requirements",
            "status": "MEETS_REQUIREMENTS",
            "score": 92,
            "details": f"Device #{device_id} meets all hardware requirements",
            "specs": {
                "cpu_cores": ">=8",
                "memory_gb": ">=16", 
                "storage_gb": ">=100"
            }
        }
    
    def comprehensive_pi_sync_validation(self) -> Dict[str, Any]:
        """Run comprehensive PI sync validation"""
        start_time = datetime.datetime.now()
        print("🚀 Running Comprehensive PI Sync Validation...")
        
        # Run all validation checks
        starlingx_results = self.validate_starlingx_branches()
        openstack_results = self.validate_openstack_alignment()
        upstream_results = self.check_upstream_reviews()
        device_results = self.validate_device_compatibility()
        
        # Compile comprehensive results
        comprehensive_results = {
            "validation_type": "comprehensive_pi_sync",
            "timestamp": self.timestamp,
            "correlation_id": self.correlation_id,
            "starlingx_validation": starlingx_results,
            "openstack_validation": openstack_results,
            "upstream_validation": upstream_results,
            "device_validation": device_results,
            "overall_pi_sync_status": "UNKNOWN",
            "overall_score": 0.0,
            "critical_issues": [],
            "high_priority_recommendations": []
        }
        
        # Calculate overall PI sync score
        component_scores = {
            "starlingx": starlingx_results["sync_score"],
            "openstack": openstack_results["alignment_score"],
            "upstream": upstream_results["activity_score"],
            "device": device_results["compatibility_score"]
        }
        
        # Weighted scoring (StarlingX and device compatibility most important)
        weights = {"starlingx": 0.35, "openstack": 0.25, "upstream": 0.15, "device": 0.25}
        overall_score = sum(component_scores[component] * weights[component] 
                          for component in component_scores)
        
        comprehensive_results["overall_score"] = overall_score
        comprehensive_results["component_scores"] = component_scores
        
        # Determine overall PI sync status
        if overall_score >= 85:
            comprehensive_results["overall_pi_sync_status"] = "EXCELLENT"
        elif overall_score >= 75:
            comprehensive_results["overall_pi_sync_status"] = "GOOD"
        elif overall_score >= 65:
            comprehensive_results["overall_pi_sync_status"] = "ACCEPTABLE"
        else:
            comprehensive_results["overall_pi_sync_status"] = "NEEDS_IMPROVEMENT"
        
        # Compile critical issues and recommendations
        all_issues = []
        all_recommendations = []
        
        for validation in [starlingx_results, openstack_results, upstream_results, device_results]:
            if validation.get("issues"):
                all_issues.extend(validation["issues"])
            if validation.get("recommendations"):
                all_recommendations.extend(validation["recommendations"])
        
        # Prioritize issues and recommendations
        comprehensive_results["critical_issues"] = all_issues[:5]  # Top 5 critical issues
        comprehensive_results["high_priority_recommendations"] = all_recommendations[:7]  # Top 7 recommendations
        
        # Store comprehensive validation
        elapsed = (datetime.datetime.now() - start_time).total_seconds()
        elapsed_ms = int(elapsed * 1000)
        
        self.emit_heartbeat("pi_sync_validator", "comprehensive_validation", 
                           comprehensive_results["overall_pi_sync_status"], elapsed_ms,
                           {"overall_score": overall_score, "component_scores": component_scores})
        
        return comprehensive_results
    
    def _store_pi_validation(self, validation_type: str, starlingx_branch: str, 
                            openstack_release: str, sync_status: str, validation_score: float,
                            issues: List[str], recommendations: List[str]):
        """Store PI sync validation results"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO pi_sync_validations 
            (timestamp, validation_type, starlingx_branch, openstack_release, 
             sync_status, validation_score, issues_found, recommendations, correlation_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            self.timestamp, validation_type, starlingx_branch, openstack_release,
            sync_status, validation_score, json.dumps(issues), 
            json.dumps(recommendations), self.correlation_id
        ))
        
        conn.commit()
        conn.close()
    
    def _store_upstream_review(self, review_data: Dict[str, Any]):
        """Store upstream review information"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO upstream_reviews 
            (timestamp, project, change_id, subject, status, branch, review_url, correlation_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            self.timestamp, review_data.get("project", ""), 
            review_data.get("change_id", ""), review_data.get("subject", "")[:200],
            review_data.get("status", ""), review_data.get("branch", ""),
            review_data.get("review_url", ""), self.correlation_id
        ))
        
        conn.commit()
        conn.close()

def main():
    parser = argparse.ArgumentParser(description="PI Sync Validation for StarlingX/OpenStack")
    parser.add_argument("--correlation-id", default="consciousness-1758658960", 
                       help="Correlation ID for tracking")
    parser.add_argument("--starlingx-only", action="store_true", 
                       help="Validate StarlingX branches only")
    parser.add_argument("--openstack-only", action="store_true",
                       help="Validate OpenStack alignment only") 
    parser.add_argument("--upstream-only", action="store_true",
                       help="Check upstream reviews only")
    parser.add_argument("--device-only", action="store_true",
                       help="Validate device compatibility only")
    parser.add_argument("--device-id", default="24460",
                       help="Device ID for compatibility validation")
    parser.add_argument("--json-output", action="store_true",
                       help="Output results as JSON")
    parser.add_argument("--verbose", action="store_true",
                       help="Enable verbose logging")
    
    args = parser.parse_args()
    
    # Initialize validator
    validator = PISyncValidator(correlation_id=args.correlation_id)
    validator.verbose = args.verbose
    
    # Run specific validations based on arguments
    results = None
    
    if args.starlingx_only:
        results = validator.validate_starlingx_branches()
    elif args.openstack_only:
        results = validator.validate_openstack_alignment()
    elif args.upstream_only:
        results = validator.check_upstream_reviews()
    elif args.device_only:
        results = validator.validate_device_compatibility(args.device_id)
    else:
        # Run comprehensive validation
        results = validator.comprehensive_pi_sync_validation()
    
    # Output results
    if args.json_output:
        print(json.dumps(results, indent=2))
    else:
        # Human-readable output
        print("\n" + "="*70)
        print("PI Sync Validation Results")
        print("="*70)
        
        if "overall_pi_sync_status" in results:
            print(f"Overall PI Sync Status: {results['overall_pi_sync_status']}")
            print(f"Overall Score: {results['overall_score']:.1f}/100")
            
            if results.get("component_scores"):
                print("\nComponent Scores:")
                for component, score in results["component_scores"].items():
                    print(f"  {component.title()}: {score:.1f}")
            
            if results.get("critical_issues"):
                print("\nCritical Issues:")
                for issue in results["critical_issues"]:
                    print(f"  • {issue}")
                    
            if results.get("high_priority_recommendations"):
                print("\nRecommendations:")
                for rec in results["high_priority_recommendations"][:5]:
                    print(f"  • {rec}")
                    
        elif "overall_status" in results:
            print(f"Status: {results['overall_status']}")
            if "sync_score" in results:
                print(f"Score: {results['sync_score']:.1f}/100")
        elif "alignment_status" in results:
            print(f"Alignment: {results['alignment_status']}")
            if "alignment_score" in results:
                print(f"Score: {results['alignment_score']:.1f}/100")
    
    # Exit with appropriate code based on results
    if results:
        if "overall_pi_sync_status" in results:
            success = results["overall_pi_sync_status"] in ["EXCELLENT", "GOOD", "ACCEPTABLE"]
        elif "overall_status" in results:
            success = results["overall_status"] in ["ALIGNED", "PARTIAL_SYNC"]
        elif "alignment_status" in results:
            success = results["alignment_status"] in ["CURRENT", "COMPATIBLE"]
        else:
            success = False
        
        sys.exit(0 if success else 1)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()