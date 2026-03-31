#!/usr/bin/env python3
"""
Pre-Indexed Legal Research Search
Automates keyword search across the local legal repository.
"""

import argparse
from pathlib import Path

def search_files(directory: Path, query: str, extensions: list[str]) -> list[str]:
    results = []
    if not directory.exists():
        return [f"Error: Directory {directory} not found."]

    for file_path in directory.rglob("*"):
        if file_path.suffix.lower() in extensions:
            try:
                content = file_path.read_text(errors='ignore')
                if query.lower() in content.lower():
                    results.append(f"Match in {file_path.name}: {file_path}")
            except Exception:
                continue
    return results

def main():
    parser = argparse.ArgumentParser(description="Search local legal research repository.")
    parser.add_argument("--query", type=str, required=True, help="Search term")
    parser.add_argument("--dir", type=str, default="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL", help="Base directory")

    args = parser.parse_args()

    print(f"Searching for '{args.query}' in {args.dir}...")

    hits = search_files(Path(args.dir), args.query, ['.md', '.txt', '.eml', '.json'])

    if hits:
        print(f"\nFound {len(hits)} matches:")
        for hit in hits:
            print(hit)
    else:
        print("No matches found.")

if __name__ == "__main__":
    main()
