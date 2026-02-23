#!/usr/bin/env python3
"""
PDF Classifier for Legal Documents
Extracts first page text and classifies: Answer, Motion, Complaint, Order, Other
"""

import sys
import subprocess
from pathlib import Path


def extract_first_page_text(pdf_path: str) -> str:
    """Extract text from PDF using macOS textutil (native tool)"""
    try:
        # Method 1: Try textutil (native macOS tool)
        result = subprocess.run(
            ["textutil", "-convert", "txt", "-stdout", pdf_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and result.stdout:
            return result.stdout.lower()
        
        # Method 2: Fallback to pdftotext if available
        result = subprocess.run(
            ["pdftotext", "-f", "1", "-l", "1", pdf_path, "-"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.lower()
        
        print(f"⚠️  Could not extract text from {Path(pdf_path).name}")
        return ""
    except Exception as e:
        print(f"❌ Error extracting text: {e}")
        return ""


def classify_legal_document(text: str) -> str:
    """Classify document based on first page content"""
    text = text.lower()
    
    # Priority order matters (check specific before generic)
    if "answer to summary ejectment" in text or "answer to complaint" in text:
        return "ANSWER"
    elif "motion to consolidate" in text or "motion for" in text:
        return "MOTION"
    elif "complaint for summary ejectment" in text or "plaintiff" in text and "complaint" in text:
        return "COMPLAINT"
    elif "order" in text and ("court" in text or "judge" in text):
        return "ORDER"
    else:
        return "UNKNOWN"


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 pdf_classifier.py <pdf_file> [<pdf_file> ...]")
        print("\nExample:")
        print("  python3 pdf_classifier.py ~/Downloads/26CV007491-590*.pdf")
        sys.exit(1)
    
    results = []
    for pdf_arg in sys.argv[1:]:
        # Handle wildcards
        for pdf_path in Path(pdf_arg).parent.glob(Path(pdf_arg).name):
            if not pdf_path.exists():
                print(f"⚠️  File not found: {pdf_path}")
                continue
            
            print(f"\n📄 Processing: {pdf_path.name}")
            text = extract_first_page_text(str(pdf_path))
            
            if not text:
                print(f"   ❌ Could not extract text")
                continue
            
            doc_type = classify_legal_document(text)
            results.append((pdf_path, doc_type))
            
            # Print classification
            emoji = {
                "ANSWER": "✅",
                "MOTION": "📋",
                "COMPLAINT": "⚖️",
                "ORDER": "🔨",
                "UNKNOWN": "❓"
            }.get(doc_type, "❓")
            
            print(f"   {emoji} Classification: {doc_type}")
    
    # Summary
    if results:
        print("\n" + "="*60)
        print("CLASSIFICATION SUMMARY")
        print("="*60)
        for pdf_path, doc_type in results:
            print(f"{doc_type:12} → {pdf_path.name}")
        
        # Suggest rename commands
        print("\n" + "="*60)
        print("SUGGESTED RENAME COMMANDS")
        print("="*60)
        print("cd ~/Downloads")
        for pdf_path, doc_type in results:
            if doc_type == "ANSWER":
                new_name = "FILED-2026-02-23-ANSWER-FILE-STAMPED.pdf"
            elif doc_type == "MOTION":
                new_name = "FILED-2026-02-23-MOTION-FILE-STAMPED.pdf"
            elif doc_type == "COMPLAINT":
                new_name = "ORIGINAL-2026-02-09-COMPLAINT-MAA.pdf"
            else:
                new_name = f"UNKNOWN-{pdf_path.name}"
            
            print(f'mv "{pdf_path.name}" "{new_name}"')


if __name__ == "__main__":
    main()
