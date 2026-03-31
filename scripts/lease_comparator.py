#!/usr/bin/env python3
"""
Lease Comparator
Compares the text content of two PDF files to identify differences.
Usage: python3 lease_comparator.py --file1 path/to/lease1.pdf --file2 path/to/lease2.pdf
"""

import argparse
import sys
from pathlib import Path
from typing import List, Tuple
import difflib

try:
    from pypdf import PdfReader
except ImportError:
    print("Error: pypdf is not installed. Please run 'pip install pypdf'")
    sys.exit(1)

def extract_text_from_pdf(pdf_path: Path) -> List[str]:
    """Extracts text from a PDF file, returning a list of strings (one per page)."""
    text_content = []
    try:
        reader = PdfReader(pdf_path)
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_content.append(text)
            else:
                text_content.append("[Empty Page or Image-only]")
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        sys.exit(1)
    return text_content

def compare_texts(text1: List[str], text2: List[str]) -> str:
    """Compares two lists of text strings and returns a diff report."""
    report = []

    # Compare page counts
    if len(text1) != len(text2):
        report.append(f"WARNING: Page count mismatch! File 1: {len(text1)}, File 2: {len(text2)}")
    else:
        report.append(f"Page count match: {len(text1)} pages.")

    report.append("-" * 40)

    # Convert to single strings for full text diff (or line by line)
    # We'll do a line-by-line diff of the combined text for granularity
    full_text1 = "\n".join(text1).splitlines()
    full_text2 = "\n".join(text2).splitlines()

    diff = difflib.unified_diff(
        full_text1,
        full_text2,
        fromfile='File 1',
        tofile='File 2',
        lineterm=''
    )

    diff_lines = list(diff)
    if not diff_lines:
        report.append("No text differences found.")
    else:
        report.append("Differences found:")
        # Limit output for console readability
        count = 0
        for line in diff_lines:
            if count < 100: # Limit to first 100 lines of diff to avoid flooding
                report.append(line)
            count += 1
        if count >= 100:
            report.append(f"... and {count - 100} more lines.")

    return "\n".join(report)

def main():
    parser = argparse.ArgumentParser(description="Compare two PDF lease agreements.")
    parser.add_argument("--file1", type=str, required=True, help="Path to the first PDF file")
    parser.add_argument("--file2", type=str, required=True, help="Path to the second PDF file")
    parser.add_argument("--output", type=str, help="Output file for the diff report")

    args = parser.parse_args()

    path1 = Path(args.file1)
    path2 = Path(args.file2)

    if not path1.exists():
        print(f"Error: File not found: {path1}")
        sys.exit(1)
    if not path2.exists():
        print(f"Error: File not found: {path2}")
        sys.exit(1)

    print(f"Comparing:")
    print(f"  File 1: {path1}")
    print(f"  File 2: {path2}")

    text1 = extract_text_from_pdf(path1)
    text2 = extract_text_from_pdf(path2)

    report = compare_texts(text1, text2)

    print(report)

    if args.output:
        with open(args.output, "w") as f:
            f.write(report)
        print(f"\nReport saved to: {args.output}")

if __name__ == "__main__":
    main()
