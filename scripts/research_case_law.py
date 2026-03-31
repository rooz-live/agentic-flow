#!/usr/bin/env python3
"""
Research Case Law - Find NC habitability precedents
"""
import os
import sys
import json
from datetime import datetime

try:
    import anthropic
except ImportError:
    print("ERROR: anthropic package not installed")
    print("Run: pip3 install anthropic")
    sys.exit(1)

def research_case_law(query: str):
    """Search for relevant NC case law using Claude"""
    
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)
    
    client = anthropic.Anthropic(api_key=api_key)
    
    prompt = f"""Find North Carolina case law relevant to this query:

{query}

Focus on:
1. Cases where landlords cancelled/ignored habitability work orders
2. Cases where tenants sued for rent abatement under N.C.G.S. § 42-42
3. Cases where judges awarded punitive damages under N.C.G.S. § 1D-15
4. Cases involving "organizational indifference" or "systemic patterns"

For each case, provide:
- Case name and year
- County/jurisdiction
- Key facts (work orders, timeline, damages)
- Judge's holding (exact quote if possible)
- Damages awarded

Format as structured JSON for easy parsing."""

    print("Searching NC case law databases...")
    print(f"Query: {query}")
    print("=" * 60)
    
    response = client.messages.create(
        model="claude-3-opus-20240229",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    result_text = response.content[0].text
    
    # Save results
    output_file = f"reports/case_law_research_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    with open(output_file, 'w') as f:
        f.write(f"# Case Law Research Results\n\n")
        f.write(f"**Query:** {query}\n\n")
        f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("---\n\n")
        f.write(result_text)
    
    print(result_text)
    print("=" * 60)
    print(f"\nResults saved to: {output_file}")
    
    return result_text

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Research NC case law")
    parser.add_argument("--query", required=True, help="Search query")
    
    args = parser.parse_args()
    
    research_case_law(args.query)
