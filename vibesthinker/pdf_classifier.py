#!/usr/bin/env python3
"""
PDF Classifier - Auto-identify legal documents using multi-provider vision AI
Part of advocate CLI suite

Supports: Anthropic Claude, OpenAI GPT-4V, Google Gemini, X.AI Grok
"""

import os
import sys
import json
import base64
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from enum import Enum

# Optional imports - fail gracefully
ANTHROPIC_AVAILABLE = False
OPENAI_AVAILABLE = False
GEMINI_AVAILABLE = False
XAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    pass

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    pass

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    pass

try:
    import xai
    XAI_AVAILABLE = True
except ImportError:
    pass


class Provider(Enum):
    """Vision AI providers"""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GEMINI = "gemini"
    XAI = "xai"
    AUTO = "auto"


class PDFClassifier:
    """Classify legal PDFs using multi-provider vision AI"""
    
    DOCUMENT_TYPES = {
        "complaint": "Original complaint filed by plaintiff",
        "answer": "Defendant's answer to complaint",
        "motion": "Motion filed with court",
        "order": "Court order or ruling",
        "summons": "Court summons",
        "exhibit": "Evidence exhibit",
        "notice": "Notice or notification",
        "affidavit": "Sworn affidavit",
        "stipulation": "Agreed stipulation",
        "subpoena": "Court subpoena",
        "scra": "Servicemembers Civil Relief Act document",
        "other": "Unclassified document"
    }
    
    PROVIDER_MODELS = {
        Provider.ANTHROPIC: ["claude-3-haiku-20240307", "claude-3-sonnet-20240229"],
        Provider.OPENAI: ["gpt-4o", "gpt-4-turbo", "gpt-4-vision-preview"],
        Provider.GEMINI: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro-vision"],
        Provider.XAI: ["grok-vision-beta", "grok-1"]
    }
    
    def __init__(self, provider: Provider = Provider.AUTO, api_keys: Optional[Dict[str, str]] = None):
        self.provider = provider
        self.api_keys = api_keys or {}
        self.clients = {}
        self.active_provider = None
        self.active_model = None
        
        # Auto-detect API keys from env
        if not self.api_keys:
            self.api_keys = {
                "anthropic": os.getenv("ANTHROPIC_API_KEY"),
                "openai": os.getenv("OPENAI_API_KEY"),
                "gemini": os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"),
                "xai": os.getenv("XAI_API_KEY")
            }
        
        # Initialize clients
        self._init_clients()
    
    def _init_clients(self):
        """Initialize available provider clients"""
        if ANTHROPIC_AVAILABLE and self.api_keys.get("anthropic"):
            try:
                self.clients[Provider.ANTHROPIC] = anthropic.Anthropic(
                    api_key=self.api_keys["anthropic"]
                )
            except Exception as e:
                print(f"⚠️  Anthropic init failed: {e}")
        
        if OPENAI_AVAILABLE and self.api_keys.get("openai"):
            try:
                self.clients[Provider.OPENAI] = openai.OpenAI(
                    api_key=self.api_keys["openai"]
                )
            except Exception as e:
                print(f"⚠️  OpenAI init failed: {e}")
        
        if GEMINI_AVAILABLE and self.api_keys.get("gemini"):
            try:
                genai.configure(api_key=self.api_keys["gemini"])
                self.clients[Provider.GEMINI] = genai
            except Exception as e:
                print(f"⚠️  Gemini init failed: {e}")
        
        if XAI_AVAILABLE and self.api_keys.get("xai"):
            try:
                self.clients[Provider.XAI] = xai.Client(api_key=self.api_keys["xai"])
            except Exception as e:
                print(f"⚠️  X.AI init failed: {e}")
        
        if not self.clients:
            raise ValueError("No vision AI providers available. Set API keys for: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, or XAI_API_KEY")
    
    def pdf_to_png(self, pdf_path: Path) -> Path:
        """Convert first page of PDF to PNG using sips"""
        png_path = Path(f"/tmp/{pdf_path.stem}-page1.png")
        
        try:
            subprocess.run([
                "sips", "-s", "format", "png",
                str(pdf_path), "--out", str(png_path)
            ], check=True, capture_output=True)
            return png_path
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Failed to convert PDF: {e}")
    
    def _get_classification_prompt(self, case_number: Optional[str] = None) -> str:
        """Generate classification prompt"""
        return f"""Analyze this legal document image and classify it.

Case context: {case_number or "Unknown"}

Identify:
1. Document type: {", ".join(self.DOCUMENT_TYPES.keys())}
2. Case number (if visible)
3. Filing date (if visible)
4. Filing time (if visible)
5. Parties (plaintiff/defendant)
6. Key details (2-3 sentences)

Respond in JSON:
{{
  "document_type": "complaint|answer|motion|order|summons|exhibit|notice|affidavit|stipulation|subpoena|scra|other",
  "confidence": 0.0-1.0,
  "case_number": "26CV...",
  "filing_date": "YYYY-MM-DD",
  "filing_time": "HH:MM AM/PM",
  "plaintiff": "...",
  "defendant": "...",
  "summary": "...",
  "recommended_filename": "YYYY-MM-DD-TYPE-DESCRIPTION.pdf"
}}"""
    
    def _classify_anthropic(self, image_data: str, prompt: str) -> Dict:
        """Classify using Anthropic Claude"""
        client = self.clients[Provider.ANTHROPIC]
        
        for model in self.PROVIDER_MODELS[Provider.ANTHROPIC]:
            try:
                message = client.messages.create(
                    model=model,
                    max_tokens=1024,
                    messages=[{
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": image_data
                                }
                            },
                            {"type": "text", "text": prompt}
                        ]
                    }]
                )
                self.active_provider = Provider.ANTHROPIC
                self.active_model = model
                return self._parse_json_response(message.content[0].text)
            except Exception as e:
                print(f"  Anthropic {model} failed: {e}")
                continue
        raise RuntimeError("All Anthropic models failed")
    
    def _classify_openai(self, image_data: str, prompt: str) -> Dict:
        """Classify using OpenAI GPT-4V"""
        client = self.clients[Provider.OPENAI]
        
        for model in self.PROVIDER_MODELS[Provider.OPENAI]:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{image_data}"}
                            }
                        ]
                    }],
                    max_tokens=1024
                )
                self.active_provider = Provider.OPENAI
                self.active_model = model
                return self._parse_json_response(response.choices[0].message.content)
            except Exception as e:
                print(f"  OpenAI {model} failed: {e}")
                continue
        raise RuntimeError("All OpenAI models failed")
    
    def _classify_gemini(self, image_path: Path, prompt: str) -> Dict:
        """Classify using Google Gemini"""
        client = self.clients[Provider.GEMINI]
        
        for model_name in self.PROVIDER_MODELS[Provider.GEMINI]:
            try:
                model = client.GenerativeModel(model_name)
                image = client.upload_file(str(image_path))
                response = model.generate_content([prompt, image])
                self.active_provider = Provider.GEMINI
                self.active_model = model_name
                return self._parse_json_response(response.text)
            except Exception as e:
                print(f"  Gemini {model_name} failed: {e}")
                continue
        raise RuntimeError("All Gemini models failed")
    
    def _validate_and_correct_dates(self, result: Dict) -> Dict:
        """Validate and correct OCR date errors (e.g. 2020 vs 2026)"""
        import re
        from datetime import datetime
        
        # Common OCR errors: 2020 instead of 2026, 2021 instead of 2027
        current_year = datetime.now().year
        corrections_made = {}  # Track corrections for filename update
        
        for date_field in ["filing_date", "date", "created_date"]:
            if date_field in result:
                date_str = result[date_field]
                if date_str and isinstance(date_str, str):
                    # Extract year from date string (YYYY-MM-DD format)
                    year_match = re.search(r'(20[0-2][0-9])', date_str)
                    if year_match:
                        extracted_year = int(year_match.group(1))
                        
                        # If year is 2020-2025 but we're in 2026+, likely OCR error
                        if 2020 <= extracted_year <= 2025 and current_year >= 2026:
                            # Correct: 2020 → 2026, 2021 → 2027, etc.
                            corrected_year = current_year + (extracted_year - 2020)
                            corrected_date = date_str.replace(str(extracted_year), str(corrected_year))
                            
                            corrections_made[str(extracted_year)] = str(corrected_year)
                            
                            # Add warning
                            if "warnings" not in result:
                                result["warnings"] = []
                            result["warnings"].append(
                                f"Date corrected: {date_str} → {corrected_date} (OCR likely confused {extracted_year} with {corrected_year})"
                            )
                            result[date_field] = corrected_date
        
        # Apply corrections to recommended_filename
        if corrections_made and "recommended_filename" in result:
            filename = result["recommended_filename"]
            for old_year, new_year in corrections_made.items():
                filename = filename.replace(old_year, new_year)
            result["recommended_filename"] = filename
        
        return result
    
    def _parse_json_response(self, response_text: str) -> Dict:
        """Parse JSON from LLM response"""
        try:
            # Extract JSON from markdown if wrapped
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            result = json.loads(response_text.strip())
            result["provider"] = self.active_provider.value if self.active_provider else "unknown"
            result["model"] = self.active_model or "unknown"
            
            # Validate and correct dates
            result = self._validate_and_correct_dates(result)
            
            return result
        except json.JSONDecodeError:
            return {
                "document_type": "other",
                "confidence": 0.0,
                "summary": response_text,
                "error": "Failed to parse JSON",
                "provider": self.active_provider.value if self.active_provider else "unknown",
                "model": self.active_model or "unknown"
            }
    
    def classify_image(self, image_path: Path, case_number: Optional[str] = None) -> Dict:
        """Classify document using available vision AI (cascading fallback)"""
        
        with open(image_path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")
        
        prompt = self._get_classification_prompt(case_number)
        
        # Provider priority order
        providers = [
            Provider.ANTHROPIC,
            Provider.OPENAI,
            Provider.GEMINI,
            Provider.XAI
        ] if self.provider == Provider.AUTO else [self.provider]
        
        last_error = None
        for provider in providers:
            if provider not in self.clients:
                continue
            
            try:
                if provider == Provider.ANTHROPIC:
                    return self._classify_anthropic(image_data, prompt)
                elif provider == Provider.OPENAI:
                    return self._classify_openai(image_data, prompt)
                elif provider == Provider.GEMINI:
                    return self._classify_gemini(image_path, prompt)
                elif provider == Provider.XAI:
                    # X.AI implementation (similar to OpenAI)
                    pass
            except Exception as e:
                last_error = e
                print(f"  {provider.value} classification failed: {e}")
                continue
        
        raise RuntimeError(f"All providers failed. Last error: {last_error}")
    
    def _prompt_user_classification(self, pdf_path: Path, result: Dict) -> Dict:
        """Interactive fallback for low-confidence classifications"""
        print(f"\n⚠️  Low confidence classification for: {pdf_path.name}")
        print(f"   AI suggestion: {result.get('document_type', 'unknown')} ({result.get('confidence', 0):.0%})")
        print(f"   Summary: {result.get('summary', 'N/A')[:100]}...\n")
        
        print("Available document types:")
        for i, (doc_type, description) in enumerate(self.DOCUMENT_TYPES.items(), 1):
            print(f"  {i}. {doc_type.upper()}: {description}")
        
        while True:
            choice = input("\nSelect document type (1-12, or 'skip'): ").strip().lower()
            
            if choice == 'skip':
                return result  # Keep AI classification
            
            try:
                idx = int(choice) - 1
                if 0 <= idx < len(self.DOCUMENT_TYPES):
                    doc_type = list(self.DOCUMENT_TYPES.keys())[idx]
                    result['document_type'] = doc_type
                    result['confidence'] = 1.0  # User override = 100% confidence
                    result['manual_override'] = True
                    print(f"✓ Classified as: {doc_type.upper()}\n")
                    return result
            except ValueError:
                pass
            
            print("Invalid choice. Try again.")
    
    def classify_pdf(self, pdf_path: Path, case_number: Optional[str] = None, 
                     auto_mode: bool = True, confidence_threshold: float = 0.80) -> Dict:
        """Classify PDF document with semi-auto fallback
        
        Args:
            pdf_path: Path to PDF file
            case_number: Case number for context
            auto_mode: If True, auto-classify high-confidence. If False, always prompt.
            confidence_threshold: Minimum confidence for auto-classification (default: 0.80)
        """
        print(f"📄 Processing: {pdf_path.name}")
        
        # Convert to PNG
        print("  Converting first page to PNG...")
        png_path = self.pdf_to_png(pdf_path)
        
        # Classify
        print("  Analyzing with Claude vision...")
        result = self.classify_image(png_path, case_number)
        
        # Clean up
        png_path.unlink(missing_ok=True)
        
        # Semi-auto fallback: prompt user if confidence below threshold
        if auto_mode and result.get('confidence', 0) < confidence_threshold:
            result = self._prompt_user_classification(pdf_path, result)
        
        return result
    
    def classify_batch(self, pdf_dir: Path, case_number: Optional[str] = None) -> List[Dict]:
        """Classify all PDFs in directory"""
        pdfs = sorted(pdf_dir.glob("*.pdf"))
        
        if not pdfs:
            print(f"⚠️  No PDFs found in {pdf_dir}")
            return []
        
        print(f"\n🔍 Found {len(pdfs)} PDFs to classify\n")
        
        results = []
        for pdf_path in pdfs:
            try:
                result = self.classify_pdf(pdf_path, case_number)
                result["original_filename"] = pdf_path.name
                results.append(result)
                
                # Print summary
                doc_type = result.get("document_type", "unknown")
                confidence = result.get("confidence", 0.0)
                print(f"  ✓ {doc_type.upper()} (confidence: {confidence:.0%})")
                print(f"    → {result.get('recommended_filename', 'N/A')}\n")
                
            except Exception as e:
                print(f"  ✗ Error: {e}\n")
                results.append({
                    "original_filename": pdf_path.name,
                    "error": str(e)
                })
        
        return results


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Classify legal PDFs using multi-provider vision AI",
        epilog="Supports: Anthropic Claude, OpenAI GPT-4V, Google Gemini, X.AI Grok"
    )
    parser.add_argument("path", nargs="?", help="PDF file or directory")
    parser.add_argument("--case", help="Case number for context")
    parser.add_argument("--output", help="Output JSON file")
    parser.add_argument(
        "--provider",
        choices=["auto", "anthropic", "openai", "gemini", "xai"],
        default="auto",
        help="Vision AI provider (default: auto cascading fallback)"
    )
    parser.add_argument(
        "--mode",
        choices=["full-auto", "semi-auto", "manual"],
        default="semi-auto",
        help="Classification mode (default: semi-auto with 80%% confidence threshold)"
    )
    parser.add_argument(
        "--confidence",
        type=float,
        default=0.80,
        help="Confidence threshold for semi-auto mode (default: 0.80)"
    )
    parser.add_argument("--list-providers", action="store_true", help="List available providers")
    
    args = parser.parse_args()
    
    if not args.path and not args.list_providers:
        parser.error("path is required unless --list-providers is used")
    
    # List providers
    if args.list_providers:
        print("\n📋 Available Vision AI Providers:\n")
        print(f"  Anthropic Claude: {'✅ SDK installed' if ANTHROPIC_AVAILABLE else '❌ pip install anthropic'}")
        print(f"  OpenAI GPT-4V:    {'✅ SDK installed' if OPENAI_AVAILABLE else '❌ pip install openai'}")
        print(f"  Google Gemini:    {'✅ SDK installed' if GEMINI_AVAILABLE else '❌ pip install google-generativeai'}")
        print(f"  X.AI Grok:        {'✅ SDK installed' if XAI_AVAILABLE else '❌ pip install xai'}\n")
        print("Environment Variables:")
        print(f"  ANTHROPIC_API_KEY: {'✅ Set' if os.getenv('ANTHROPIC_API_KEY') else '❌ Not set'}")
        print(f"  OPENAI_API_KEY:    {'✅ Set' if os.getenv('OPENAI_API_KEY') else '❌ Not set'}")
        print(f"  GOOGLE_API_KEY:    {'✅ Set' if os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY') else '❌ Not set'}")
        print(f"  XAI_API_KEY:       {'✅ Set' if os.getenv('XAI_API_KEY') else '❌ Not set'}\n")
        sys.exit(0)
    
    # Initialize classifier
    provider_enum = Provider[args.provider.upper()] if args.provider != "auto" else Provider.AUTO
    
    try:
        classifier = PDFClassifier(provider=provider_enum)
        print(f"\n🤖 Using provider mode: {args.provider}")
        print(f"   Available: {', '.join([p.value for p in classifier.clients.keys()])}\n")
    except ValueError as e:
        print(f"\n⚠️  {e}\n")
        print("Run with --list-providers to see setup instructions\n")
        sys.exit(1)
    
    path = Path(args.path).expanduser()
    
    # Classify
    if path.is_file():
        results = [classifier.classify_pdf(path, args.case)]
    elif path.is_dir():
        results = classifier.classify_batch(path, args.case)
    else:
        print(f"⚠️  Path not found: {path}")
        sys.exit(1)
    
    # Output
    if args.output:
        output_path = Path(args.output)
        output_path.write_text(json.dumps(results, indent=2))
        print(f"\n✓ Results saved to {output_path}")
    else:
        print("\n" + json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
