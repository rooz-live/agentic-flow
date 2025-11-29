#!/usr/bin/env python3
"""
multi_repo_analyzer.py - Multi-repository WSJF priority analyzer

Analyzes multiple repositories to identify:
- WSJF priorities across codebases
- Dependency graphs (imports, cross-repo references)
- Technical debt hotspots
- Test coverage gaps
- Blocker analysis

Usage:
    # Analyze top 5 repos
    python3 scripts/multi_repo_analyzer.py --top 5
    
    # Analyze specific repos
    python3 scripts/multi_repo_analyzer.py --repos agentic-flow lionagi-qe-fleet risk-analytics
    
    # Generate dependency graph
    python3 scripts/multi_repo_analyzer.py --top 5 --generate-graph
    
    # Output to JSON
    python3 scripts/multi_repo_analyzer.py --top 5 --output analysis.json
"""

import os
import sys
import json
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple

class MultiRepoAnalyzer:
    def __init__(self, base_dir="/Users/shahroozbhopti/Documents/code"):
        self.base_dir = Path(base_dir)
        self.repos = []
        self.analysis = {}
    
    def discover_repos(self) -> List[Path]:
        """Discover git repositories in base directory"""
        repos = []
        for item in self.base_dir.iterdir():
            if item.is_dir() and (item / ".git").exists():
                repos.append(item)
        return sorted(repos)
    
    def calculate_repo_wsjf(self, repo_path: Path) -> Dict:
        """Calculate WSJF priority for a repository"""
        
        # Check for WSJF indicators
        wsjf_files = [
            repo_path / ".goalie" / "CONSOLIDATED_ACTIONS.yaml",
            repo_path / "docs" / "INCREMENTAL_RELENTLESS_EXECUTION_STATUS.md",
            repo_path / "docs" / "QUICK_WINS.md"
        ]
        
        has_wsjf = any(f.exists() for f in wsjf_files)
        
        # Count Python/TypeScript/JavaScript files
        code_files = list(repo_path.rglob("*.py")) + list(repo_path.rglob("*.ts")) + list(repo_path.rglob("*.js"))
        code_count = len([f for f in code_files if ".git" not in str(f) and "node_modules" not in str(f)])
        
        # Check for tests
        test_files = list(repo_path.rglob("test_*.py")) + list(repo_path.rglob("*.test.ts")) + list(repo_path.rglob("*.test.js"))
        test_count = len([f for f in test_files if ".git" not in str(f) and "node_modules" not in str(f)])
        
        # Check for recent activity (git log)
        try:
            import subprocess
            result = subprocess.run(
                ["git", "-C", str(repo_path), "log", "--since=30.days.ago", "--oneline"],
                capture_output=True,
                text=True,
                timeout=5
            )
            recent_commits = len(result.stdout.strip().split('\n')) if result.stdout.strip() else 0
        except:
            recent_commits = 0
        
        # Calculate scores
        user_value = min(10, recent_commits // 2)  # More recent commits = higher value
        time_criticality = 10 if has_wsjf else 5  # WSJF docs indicate active prioritization
        risk_reduction = min(10, test_count // 10)  # More tests = better risk coverage
        job_size = min(10, code_count // 100)  # More code = larger job size
        
        wsjf_score = (user_value + time_criticality + risk_reduction) / max(1, job_size)
        
        return {
            "repo": repo_path.name,
            "wsjf_score": round(wsjf_score, 2),
            "user_value": user_value,
            "time_criticality": time_criticality,
            "risk_reduction": risk_reduction,
            "job_size": job_size,
            "code_files": code_count,
            "test_files": test_count,
            "recent_commits": recent_commits,
            "has_wsjf_docs": has_wsjf
        }
    
    def analyze_dependencies(self, repo_path: Path) -> Dict:
        """Analyze repository dependencies"""
        
        dependencies = {
            "python": set(),
            "npm": set(),
            "local_imports": []
        }
        
        # Check requirements.txt
        req_file = repo_path / "requirements.txt"
        if req_file.exists():
            with open(req_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        # Extract package name (before ==, >=, etc.)
                        pkg = line.split('==')[0].split('>=')[0].split('<=')[0].strip()
                        dependencies["python"].add(pkg)
        
        # Check package.json
        pkg_file = repo_path / "package.json"
        if pkg_file.exists():
            try:
                with open(pkg_file) as f:
                    data = json.load(f)
                    for dep_type in ['dependencies', 'devDependencies']:
                        if dep_type in data:
                            dependencies["npm"].update(data[dep_type].keys())
            except:
                pass
        
        # Scan for local imports (Python)
        for py_file in repo_path.rglob("*.py"):
            if ".git" in str(py_file) or "node_modules" in str(py_file):
                continue
            
            try:
                with open(py_file) as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith('from ') or line.startswith('import '):
                            dependencies["local_imports"].append({
                                "file": str(py_file.relative_to(repo_path)),
                                "import": line
                            })
            except:
                pass
        
        return {
            "python_packages": sorted(list(dependencies["python"])),
            "npm_packages": sorted(list(dependencies["npm"])),
            "local_import_count": len(dependencies["local_imports"])
        }
    
    def analyze_blockers(self, repo_path: Path) -> List[Dict]:
        """Identify blockers in repository"""
        
        blockers = []
        
        # Check BLOCKER files
        blocker_files = [
            repo_path / "docs" / "BLOCKER_ANALYSIS.md",
            repo_path / "docs" / "BLOCKERS_RESOLVED.md"
        ]
        
        for blocker_file in blocker_files:
            if blocker_file.exists():
                blockers.append({
                    "file": blocker_file.name,
                    "status": "documented"
                })
        
        # Check for TODO/FIXME/BLOCKER comments
        todo_count = 0
        fixme_count = 0
        blocker_count = 0
        
        for code_file in list(repo_path.rglob("*.py"))[:100]:  # Sample first 100 files
            if ".git" in str(code_file):
                continue
            
            try:
                with open(code_file) as f:
                    content = f.read()
                    todo_count += content.count("TODO")
                    fixme_count += content.count("FIXME")
                    blocker_count += content.count("BLOCKER")
            except:
                pass
        
        return {
            "blocker_docs": blockers,
            "todo_comments": todo_count,
            "fixme_comments": fixme_count,
            "blocker_comments": blocker_count
        }
    
    def analyze_repos(self, repo_list: List[str] = None, top_n: int = None):
        """Analyze multiple repositories"""
        
        all_repos = self.discover_repos()
        
        if repo_list:
            # Filter to specified repos
            repos_to_analyze = [r for r in all_repos if r.name in repo_list]
        elif top_n:
            # Analyze all first, then take top N by WSJF
            quick_scores = [(r, self.calculate_repo_wsjf(r)["wsjf_score"]) for r in all_repos]
            quick_scores.sort(key=lambda x: x[1], reverse=True)
            repos_to_analyze = [r[0] for r in quick_scores[:top_n]]
        else:
            repos_to_analyze = all_repos
        
        print(f"🔍 Analyzing {len(repos_to_analyze)} repositories...")
        
        for repo in repos_to_analyze:
            print(f"  📁 {repo.name}...")
            
            wsjf = self.calculate_repo_wsjf(repo)
            deps = self.analyze_dependencies(repo)
            blockers = self.analyze_blockers(repo)
            
            self.analysis[repo.name] = {
                "wsjf": wsjf,
                "dependencies": deps,
                "blockers": blockers
            }
        
        print("✅ Analysis complete\n")
    
    def generate_report(self) -> str:
        """Generate analysis report"""
        
        lines = ["# Multi-Repository WSJF Analysis", ""]
        
        # Sort repos by WSJF score
        sorted_repos = sorted(
            self.analysis.items(),
            key=lambda x: x[1]["wsjf"]["wsjf_score"],
            reverse=True
        )
        
        lines.append("## WSJF Priority Ranking")
        lines.append("")
        lines.append("| Rank | Repository | WSJF | Code Files | Tests | Recent Commits |")
        lines.append("|------|------------|------|------------|-------|----------------|")
        
        for idx, (repo_name, data) in enumerate(sorted_repos, 1):
            wsjf = data["wsjf"]
            lines.append(
                f"| {idx} | {repo_name} | {wsjf['wsjf_score']} | "
                f"{wsjf['code_files']} | {wsjf['test_files']} | {wsjf['recent_commits']} |"
            )
        
        lines.append("")
        lines.append("## Dependency Summary")
        lines.append("")
        
        # Aggregate dependencies
        all_python = set()
        all_npm = set()
        
        for repo_name, data in self.analysis.items():
            deps = data["dependencies"]
            all_python.update(deps["python_packages"])
            all_npm.update(deps["npm_packages"])
        
        lines.append(f"- **Total Python Packages**: {len(all_python)}")
        lines.append(f"- **Total NPM Packages**: {len(all_npm)}")
        lines.append("")
        
        # Common dependencies
        python_freq = defaultdict(int)
        npm_freq = defaultdict(int)
        
        for repo_name, data in self.analysis.items():
            for pkg in data["dependencies"]["python_packages"]:
                python_freq[pkg] += 1
            for pkg in data["dependencies"]["npm_packages"]:
                npm_freq[pkg] += 1
        
        top_python = sorted(python_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        top_npm = sorted(npm_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        
        if top_python:
            lines.append("### Top Python Dependencies")
            for pkg, count in top_python:
                lines.append(f"- `{pkg}` ({count} repos)")
            lines.append("")
        
        if top_npm:
            lines.append("### Top NPM Dependencies")
            for pkg, count in top_npm:
                lines.append(f"- `{pkg}` ({count} repos)")
            lines.append("")
        
        lines.append("## Blocker Analysis")
        lines.append("")
        
        total_todos = sum(d["blockers"]["todo_comments"] for d in self.analysis.values())
        total_fixmes = sum(d["blockers"]["fixme_comments"] for d in self.analysis.values())
        total_blockers = sum(d["blockers"]["blocker_comments"] for d in self.analysis.values())
        
        lines.append(f"- **TODO Comments**: {total_todos}")
        lines.append(f"- **FIXME Comments**: {total_fixmes}")
        lines.append(f"- **BLOCKER Comments**: {total_blockers}")
        lines.append("")
        
        return "\n".join(lines)
    
    def save_json(self, output_path: str):
        """Save analysis to JSON"""
        with open(output_path, 'w') as f:
            json.dump(self.analysis, f, indent=2)
        print(f"✅ Analysis saved to {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Multi-repository WSJF analyzer")
    parser.add_argument('--repos', nargs='+', help='Specific repositories to analyze')
    parser.add_argument('--top', type=int, help='Analyze top N repositories by WSJF')
    parser.add_argument('--output', help='Output JSON file path')
    parser.add_argument('--base-dir', default="/Users/shahroozbhopti/Documents/code", help='Base directory containing repositories')
    
    args = parser.parse_args()
    
    analyzer = MultiRepoAnalyzer(base_dir=args.base_dir)
    analyzer.analyze_repos(repo_list=args.repos, top_n=args.top)
    
    # Generate report
    report = analyzer.generate_report()
    print(report)
    
    # Save JSON if requested
    if args.output:
        analyzer.save_json(args.output)

if __name__ == "__main__":
    main()
