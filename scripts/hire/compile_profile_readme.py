#!/usr/bin/env python3
"""
compile_profile_readme.py — Compile EPA ledger metrics into profile_readme.md

Parses .goalie/earnings_ledger.jsonl and updates profile_readme.md with
a formatted table of latest and cumulative earnings.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEDGER = ROOT / ".goalie" / "earnings_ledger.jsonl"
README = ROOT / "profile_readme.md"


def main() -> int:
    if not LEDGER.is_file():
        print("❌ Earnings ledger not found at", LEDGER, file=sys.stderr)
        return 1

    # 1. Parse ledger to compute cumulative and latest EPA metrics
    cumulative = {
        "agent": 0.0,
        "engine": 0.0,
        "engineer": 0.0,
        "ingenuity": 0.0,
        "total_earnings": 0.0,
    }
    latest = {
        "agent": 0.0,
        "engine": 0.0,
        "engineer": 0.0,
        "ingenuity": 0.0,
        "total_earnings": 0.0,
    }
    latest_ts = "unknown"
    latest_commit = "unknown"

    with LEDGER.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            earnings = entry.get("earnings", {})
            if not earnings:
                continue

            # Accumulate
            cumulative["agent"] += earnings.get("agent", 0.0)
            cumulative["engine"] += earnings.get("engine", 0.0)
            cumulative["engineer"] += earnings.get("engineer", 0.0)
            cumulative["ingenuity"] += earnings.get("ingenuity", 0.0)
            cumulative["total_earnings"] += earnings.get("total_earnings", 0.0)

            # Store latest
            latest = earnings
            latest_ts = entry.get("timestamp", "unknown")
            latest_commit = entry.get("commit", "unknown")

    # Round cumulative values
    for k in cumulative:
        cumulative[k] = round(cumulative[k], 2)

    # 2. Build the markdown section
    c_agent = cumulative["agent"]
    c_engine = cumulative["engine"]
    c_engineer = cumulative["engineer"]
    c_ingenuity = cumulative["ingenuity"]
    c_total = cumulative["total_earnings"]

    l_agent = latest.get("agent", 0.0)
    l_engine = latest.get("engine", 0.0)
    l_engineer = latest.get("engineer", 0.0)
    l_ingenuity = latest.get("ingenuity", 0.0)
    l_total = latest.get("total_earnings", 0.0)

    cmt = latest_commit[:8] if latest_commit else "none"

    section_lines = [
        "## 📊 Earning's Per Agent (EPA) Ledger",
        "",
        "| Metric / Vector | Latest Value | Cumulative Total |",
        "| :--- | :---: | :---: |",
        f"| 🤖 **Agent** | `{l_agent}` | `{c_agent}` |",
        f"| ⚙️ **Engine** | `{l_engine}` | `{c_engine}` |",
        f"| 🛠️ **Engineer** | `{l_engineer}` | `{c_engineer}` |",
        f"| 💡 **Ingenuity** | `{l_ingenuity}` | `{c_ingenuity}` |",
        f"| 💰 **Total Earnings** | **`{l_total}`** | **`{c_total}`** |",
        "",
        f"> **Last Verified Cycle**: `{latest_ts}` | **Commit**: `{cmt}`",
        "",
    ]
    section_text = "\n".join(section_lines)

    # 3. Read profile_readme.md and update or append
    if not README.is_file():
        print("❌ profile_readme.md not found at", README, file=sys.stderr)
        return 1

    readme_content = README.read_text(encoding="utf-8")

    # Match existing section:
    # from '## 📊 Earning's Per Agent' to the next '##' or '---' or EOF
    header_pattern = r"## 📊 Earning's Per Agent \(EPA\) Ledger"
    match = re.search(header_pattern, readme_content)

    if match:
        # Replace the existing section
        print("🔄 Updating existing EPA section in profile_readme.md")
        # Find next section separator: '## ' or '---'
        start_idx = match.start()
        remaining = readme_content[start_idx:]
        next_sec = re.search(r"(\n## |\n---)", remaining[1:])
        if next_sec:
            end_idx = start_idx + 1 + next_sec.start()
            new_content = (
                readme_content[:start_idx]
                + section_text
                + readme_content[end_idx:]
            )
        else:
            new_content = readme_content[:start_idx] + section_text
    else:
        # Insert before contact section if found
        contact_pattern = r"(## 📫 Contact & Collaboration)"
        contact_match = re.search(contact_pattern, readme_content)
        if contact_match:
            print(
                "➕ Inserting EPA section before Contact section "
                "in profile_readme.md"
            )
            insert_idx = contact_match.start()
            new_content = (
                readme_content[:insert_idx]
                + section_text
                + "---\n\n"
                + readme_content[insert_idx:]
            )
        else:
            print("➕ Appending EPA section to the end of profile_readme.md")
            new_content = (
                readme_content.rstrip() + "\n\n---\n\n" + section_text
            )

    README.write_text(new_content, encoding="utf-8")
    print(f"✅ Successfully compiled EPA ledger values to {README}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
