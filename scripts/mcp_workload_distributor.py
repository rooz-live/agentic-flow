#!/usr/bin/env python3
"""
MCP Integration for Workload Distribution
Integrates with Supabase and GitHub to track and automate workload redistribution
"""

import json
import os
import sys
import subprocess
from datetime import datetime
from typing import Dict, List, Any, Optional

class MCPWorkloadDistributor:
    """Handles MCP integration for workload distribution tracking and automation."""
    
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.github_token = os.environ.get("GITHUB_TOKEN")
        self.github_repo = os.environ.get("GITHUB_REPO", "agentic-flow")
        self.github_owner = os.environ.get("GITHUB_OWNER", "your-org")
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_ANON_KEY")
    
    def store_redistribution_history(self, plan: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Store redistribution plan in Supabase database."""
        if not self.supabase_url or not self.supabase_key:
            print("⚠️  Supabase credentials not configured, skipping database storage")
            return None
        
        try:
            # Create redistribution record
            record = {
                "timestamp": datetime.utcnow().isoformat(),
                "total_events": plan.get("total_events", 0),
                "patterns_moved": plan.get("total_patterns_to_move", 0),
                "overloaded_circles": list(plan.get("overloaded", {}).keys()),
                "underutilized_circles": list(plan.get("underutilized", {}).keys()),
                "redistributions": plan.get("redistributions", []),
                "status": "planned"
            }
            
            # Use supabase-mcp-server to store the record
            cmd = [
                "python3", "-c", f"""
import json
import os
from supabase import create_client, Client

url = "{self.supabase_url}"
key = "{self.supabase_key}"
supabase: Client = create_client(url, key)

data = {json.dumps(record)}
result = supabase.table('workload_redistributions').insert(data).execute()
print(json.dumps(result.data[0] if result.data else {{}}))
"""
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
            if result.returncode == 0:
                stored = json.loads(result.stdout)
                print(f"✅ Stored redistribution record: {stored.get('id')}")
                return stored
            else:
                print(f"❌ Failed to store in Supabase: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"❌ Error storing to Supabase: {str(e)}")
            return None
    
    def create_github_issue(self, plan: Dict[str, Any], record_id: Optional[str] = None) -> Optional[str]:
        """Create GitHub issue for significant redistribution events."""
        if not self.github_token:
            print("⚠️  GitHub token not configured, skipping issue creation")
            return None
        
        # Check if this is a significant event (>100 patterns or >2 circles involved)
        total_patterns = plan.get("total_patterns_to_move", 0)
        num_redistributions = len(plan.get("redistributions", []))
        
        if total_patterns < 100 and num_redistributions < 2:
            print("ℹ️  Redistribution below threshold, not creating GitHub issue")
            return None
        
        try:
            # Create issue title and body
            title = f"Workload Redistribution Required - {total_patterns} patterns to move"
            
            body = f"""## Workload Imbalance Detected

**Timestamp**: {datetime.utcnow().isoformat()}
**Record ID**: {record_id or 'N/A'}
**Total Events**: {plan.get('total_events', 0)}
**Patterns to Redistribute**: {total_patterns}

### Overloaded Circles
"""
            
            for circle, info in plan.get("overloaded", {}).items():
                body += f"- **{circle}**: {info.get('current', 0)} events (capacity: {info.get('capacity', 0)})\n"
            
            body += "\n### Planned Redistributions\n"
            
            for redistribution in plan.get("redistributions", []):
                body += f"- Move {redistribution.get('patterns_to_move', 0)} patterns from `{redistribution.get('from_circle')}` to `{redistribution.get('to_circle')}`\n"
            
            body += f"""
### Next Steps
1. Review the redistribution plan
2. Run `./scripts/af balance-workload` to execute
3. Monitor telemetry after redistribution

### Automation
This issue was created automatically by the workload distribution system when imbalance exceeded 60% threshold.
"""
            
            # Use github-mcp-server to create issue
            cmd = [
                "python3", "-c", f"""
import json
from github import Github

g = Github("{self.github_token}")
repo = g.get_repo("{self.github_owner}/{self.github_repo}")

issue = repo.create_issue(
    title="{title}",
    body='''{body}''',
    labels=["workload-distribution", "automation"]
)

print(issue.html_url)
"""
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
            if result.returncode == 0:
                issue_url = result.stdout.strip()
                print(f"✅ Created GitHub issue: {issue_url}")
                return issue_url
            else:
                print(f"❌ Failed to create GitHub issue: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating GitHub issue: {str(e)}")
            return None
    
    def execute_with_mcp_tracking(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """Execute workload redistribution with MCP tracking."""
        result = {
            "plan": plan,
            "mcp_tracking": {
                "supabase_record": None,
                "github_issue": None,
                "executed_at": datetime.utcnow().isoformat()
            }
        }
        
        # Store in Supabase
        stored = self.store_redistribution_history(plan)
        if stored:
            result["mcp_tracking"]["supabase_record"] = stored.get("id")
        
        # Create GitHub issue if significant
        issue_url = self.create_github_issue(plan, result["mcp_tracking"]["supabase_record"])
        if issue_url:
            result["mcp_tracking"]["github_issue"] = issue_url
        
        # Execute the actual redistribution
        print("\n🔄 Executing workload redistribution...")
        
        # Update status in Supabase if we have a record
        if result["mcp_tracking"]["supabase_record"]:
            try:
                cmd = [
                    "python3", "-c", f"""
import json
from supabase import create_client, Client

url = "{self.supabase_url}"
key = "{self.supabase_key}"
supabase: Client = create_client(url, key)

supabase.table('workload_redistributions').update({{"status": "executed"}}).eq("id", {result["mcp_tracking"]["supabase_record"]}).execute()
"""
                ]
                subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
            except:
                pass  # Non-critical
        
        return result

def main():
    """Main function for MCP-enabled workload distribution."""
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Load redistribution plan from workload_balancer.py
    sys.path.insert(0, os.path.join(project_root, 'scripts'))
    from workload_balancer import analyze_imbalance, generate_redistribution_plan
    
    metrics_file = os.path.join(project_root, '.goalie', 'pattern_metrics.jsonl')
    
    if not os.path.exists(metrics_file):
        print("❌ Metrics file not found")
        sys.exit(1)
    
    # Analyze current imbalance
    imbalance = analyze_imbalance(metrics_file)
    
    # Check if redistribution is needed (>60% in one circle)
    threshold = 0.6
    total_events = imbalance.get('total_events', 0)
    needs_redistribution = False
    
    for circle, info in imbalance.get('overloaded', {}).items():
        if info.get('current', 0) / total_events > threshold:
            needs_redistribution = True
            break
    
    if not needs_redistribution:
        print("✅ Workload is balanced, no redistribution needed")
        return
    
    # Generate redistribution plan
    plan = generate_redistribution_plan(imbalance)
    
    # Execute with MCP tracking
    distributor = MCPWorkloadDistributor(project_root)
    result = distributor.execute_with_mcp_tracking(plan)
    
    # Save results
    results_file = os.path.join(project_root, '.goalie', 'mcp_workload_distribution.json')
    with open(results_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\n✅ MCP-enabled workload distribution complete")
    print(f"📊 Results saved to: {results_file}")
    
    if result["mcp_tracking"]["github_issue"]:
        print(f"🐙 Issue: {result['mcp_tracking']['github_issue']}")
    
    if result["mcp_tracking"]["supabase_record"]:
        print(f"💾 Record: {result['mcp_tracking']['supabase_record']}")

if __name__ == "__main__":
    main()
