#!/usr/bin/env python3
import os
import sys
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parent.parent.parent
    os.chdir(root)

    batch_dir = os.environ.get("BATCH", "src")
    max_depth = int(os.environ.get("MAX_DEPTH", "2"))

    report_dir = root / "reports"
    report_dir.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    report_path = report_dir / f"untracked-triage-{stamp}.csv"

    # Pre-cache git tracked files
    try:
        cmd = ["git", "ls-files"]
        tracked_output = subprocess.check_output(cmd, text=True)
        tracked_files = set(tracked_output.splitlines())
    except subprocess.CalledProcessError as e:
        print(f"Error running git ls-files: {e}", file=sys.stderr)
        sys.exit(1)

    tracked_basenames = {Path(f).name for f in tracked_files}

    # Walk directory
    results = []
    count = 0

    # We walk only paths under batch_dir up to max_depth
    target_path = Path(batch_dir)
    if not target_path.exists():
        print(f"Directory {batch_dir} does not exist", file=sys.stderr)
        sys.exit(1)

    # Walk with depth limit
    base_depth = len(target_path.parts)

    for r, dirs, files in os.walk(target_path):
        rel_path = Path(r)
        current_depth = len(rel_path.parts) - base_depth
        if current_depth >= max_depth:
            # Prevent going deeper
            dirs.clear()

        for file in files:
            file_path = rel_path / file
            file_str = str(file_path)

            # Skip checking if already tracked
            if file_str in tracked_files:
                results.append((file_str, "INDEX", "already_tracked"))
                continue

            base = file_path.name
            is_gen = (
                base.endswith(".pyc")
                or base == "__pycache__"
                or "node_modules" in file_str
            )
            if is_gen:
                results.append((file_str, "ARCHIVE", "generated_or_vendor"))
                continue

            if base in tracked_basenames:
                results.append((file_str, "SHIM", "possible_duplicate"))
                continue

            # Pattern matching for candidate add
            candidates = [
                "tests/",
                "src/billing/",
                "src/identity/",
                "src/methods/",
                "scripts/dod-gate.sh",
                "code/tooling/",
            ]
            if any(file_str.startswith(p) for p in candidates):
                results.append((file_str, "INDEX", "candidate_for_git_add"))
            else:
                results.append((file_str, "ARCHIVE", "defer_or_gitignore"))

            count += 1
            if count >= 500:
                break
        if count >= 500:
            break

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("path,classification,reason\n")
        for path, classification, reason in results:
            f.write(f"{path},{classification},{reason}\n")

    print(f"Wrote {report_path} ({len(results)} paths sampled)")
    print(f"Run: awk -F, '$2==\"INDEX\"' {report_path} | head")


if __name__ == "__main__":
    main()
