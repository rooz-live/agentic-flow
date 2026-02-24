#!/usr/bin/env python3
"""
Human-in-the-Loop OSINT for MAA Pattern Analysis
Guides the user through collecting and structuring open-source intelligence.
"""

import json
from datetime import datetime
from pathlib import Path

def input_prompt(prompt, default=None):
    """Helper for user input with default."""
    if default:
        user_in = input(f"{prompt} [{default}]: ").strip()
        return user_in if user_in else default
    return input(f"{prompt}: ").strip()

def collect_case_data():
    print("\n--- NEW CASE ENTRY ---")
    case = {}
    case['id'] = input_prompt("Case ID/Reference (e.g., 26CV...)")
    case['jurisdiction'] = input_prompt("Jurisdiction (e.g., Mecklenburg County)")
    case['plaintiff'] = input_prompt("Plaintiff (e.g., MAA, Post Apartment Homes)")
    case['defendant'] = input_prompt("Defendant Name (Initials optional for privacy)")
    case['issue_type'] = input_prompt("Issue Type (e.g., Mold, Eviction, Security Deposit)")
    case['outcome'] = input_prompt("Outcome (e.g., Settled, Dismissed, Judgment)")
    case['url'] = input_prompt("Source URL (optional)")
    return case

def collect_review_data():
    print("\n--- NEW TENANT REVIEW ENTRY ---")
    review = {}
    review['property'] = input_prompt("Property Name")
    review['platform'] = input_prompt("Platform (Google/Yelp/Apartments.com)")
    review['date'] = input_prompt("Review Date (YYYY-MM-DD)")
    review['rating'] = input_prompt("Rating (1-5)")
    review['issue'] = input_prompt("Core Issue (e.g., ignored maintenance, mold)")
    review['text_snippet'] = input_prompt("Key text snippet")
    return review

def main():
    print("=== MAA SYSTEMIC PATTERN ANALYSIS (HITL OSINT) ===")
    print("This tool helps build the 'Systemic Indifference' report by aggregating manual findings.")

    data = {
        "timestamp": datetime.now().isoformat(),
        "cases": [],
        "reviews": [],
        "corporate_officers": []
    }

    while True:
        print("\nOPTIONS:")
        print("1. Add Case Law/Litigation Finding")
        print("2. Add Tenant Review/Complaint")
        print("3. Finish and Generate Report")

        choice = input("Select option (1-3): ").strip()

        if choice == '1':
            data['cases'].append(collect_case_data())
        elif choice == '2':
            data['reviews'].append(collect_review_data())
        elif choice == '3':
            break
        else:
            print("Invalid option.")

    # Generate Report
    if not data['cases'] and not data['reviews']:
        print("No data collected. Exiting.")
        return

    output_file = f"MAA_OSINT_REPORT_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"

    with open(output_file, "w") as f:
        f.write(f"# MAA Systemic Pattern Analysis - Generated via HITL OSINT\n")
        f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")

        f.write("## 1. Litigation Patterns\n")
        if data['cases']:
            for case in data['cases']:
                f.write(f"- **{case['id']}** ({case['jurisdiction']}): {case['plaintiff']} v. {case['defendant']}\n")
                f.write(f"  - Issue: {case['issue_type']}\n")
                f.write(f"  - Outcome: {case['outcome']}\n")
                if case['url']: f.write(f"  - Ref: {case['url']}\n")
                f.write("\n")
        else:
            f.write("No case data collected.\n")

        f.write("\n## 2. Tenant Reviews (Pattern of Practice)\n")
        if data['reviews']:
            for review in data['reviews']:
                f.write(f"- **{review['property']}** ({review['platform']}, {review['date']}) - {review['rating']}/5\n")
                f.write(f"  - Issue: {review['issue']}\n")
                f.write(f"  - Quote: \"{review['text_snippet']}\"\n")
                f.write("\n")
        else:
            f.write("No review data collected.\n")

    print(f"\nReport generated: {output_file}")
    print("Review this file and append relevant findings to your SYSTEMIC-INDIFFERENCE-REPORT.md")

if __name__ == "__main__":
    main()
