#!/usr/bin/env python3
"""
Multi-Provider PDF Classifier with Session Persistence
Cascades: Anthropic → OpenAI → Gemini → Local fallback
"""

import os
import sys
import json
import base64
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List

# Session persistence
SESSION_FILE = Path.home() / ".advocate" / "session.json"

class SessionManager:
    """Manages session state across invocations"""
    
    def __init__(self):
        SESSION_FILE.parent.mkdir(exist_ok=True)
        self.session = self._load()
    
    def _load(self) -> Dict[str, Any]:
        if SESSION_FILE.exists():
            with open(SESSION_FILE) as f:
                return json.load(f)
        return {
            "last_case": None,
            "last_classification": None,
            "document_count": 0,
            "api_usage": {
                "classify_calls": 0,
                "last_month_cost": 0.0,
                "provider_stats": {
                    "anthropic": 0,
                    "openai": 0,
                    "gemini": 0,
                    "local": 0
                }
            }
        }
    
    def save(self):
        with open(SESSION_FILE, 'w') as f:
            json.dump(self.session, f, indent=2)
    
    def record_classification(self, provider: str, cost: float = 0.0):
        self.session["last_classification"] = datetime.utcnow().isoformat() + "Z"
        self.session["api_usage"]["classify_calls"] += 1
        self.session["api_usage"]["last_month_cost"] += cost
        self.session["api_usage"]["provider_stats"][provider] += 1
        self.save()

class MultiProviderClassifier:
    """Cascading PDF classifier with provider fallback"""
    
    PROVIDERS = ["anthropic", "openai", "gemini", "local"]
    
    DOCUMENT_TYPES = {
        "answer": ["ANSWER", "DEFENDANT'S ANSWER", "RESPONSE TO"],
        "motion": ["MOTION TO", "MOTION FOR"],
        "complaint": ["COMPLAINT", "SUMMONS", "PLAINTIFF"],
        "order": ["ORDER", "COURT ORDER", "ORDERED"],
        "notice": ["NOTICE OF", "NOTIFICATION"],
        "subpoena": ["SUBPOENA"],
        "discovery": ["INTERROGATORIES", "REQUEST FOR PRODUCTION"],
    }
    
    def __init__(self, api_keys: Optional[Dict[str, str]] = None):
        self.session = SessionManager()
        self.api_keys = api_keys or {
            "anthropic": os.getenv("ANTHROPIC_API_KEY"),
            "openai": os.getenv("OPENAI_API_KEY"),
            "google": os.getenv("GOOGLE_API_KEY")
        }
    
    def classify(self, pdf_path: Path, confidence_threshold: float = 0.8) -> Dict[str, Any]:
        """Classify PDF with cascading provider fallback"""
        
        for provider in self.PROVIDERS:
            try:
                result = self._classify_with_provider(pdf_path, provider)
                
                if result["confidence"] >= confidence_threshold:
                    # Record successful classification
                    self.session.record_classification(
                        provider=provider,
                        cost=result.get("cost", 0.0)
                    )
                    return result
                
            except Exception as e:
                print(f"⚠️  {provider} failed: {e}", file=sys.stderr)
                continue
        
        # All providers failed, return local fallback result
        return self._local_fallback(pdf_path)
    
    def _classify_with_provider(self, pdf_path: Path, provider: str) -> Dict[str, Any]:
        """Classify PDF using specific provider"""
        
        if provider == "anthropic":
            return self._classify_anthropic(pdf_path)
        elif provider == "openai":
            return self._classify_openai(pdf_path)
        elif provider == "gemini":
            return self._classify_gemini(pdf_path)
        elif provider == "local":
            return self._local_fallback(pdf_path)
        else:
            raise ValueError(f"Unknown provider: {provider}")
    
    def _classify_anthropic(self, pdf_path: Path) -> Dict[str, Any]:
        """Classify using Anthropic Claude Vision API"""
        
        if not self.api_keys["anthropic"]:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        
        # Convert first page to image
        img_path = self._pdf_to_image(pdf_path)
        
        try:
            import anthropic
            
            client = anthropic.Anthropic(api_key=self.api_keys["anthropic"])
            
            with open(img_path, "rb") as f:
                image_data = base64.standard_b64encode(f.read()).decode("utf-8")
            
            message = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=512,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": """Classify this legal document. Reply with ONLY a JSON object:
{
  "type": "answer|motion|complaint|order|notice|subpoena|discovery|other",
  "confidence": 0.0-1.0,
  "case_number": "extracted case number or null",
  "reasoning": "brief explanation"
}"""
                        }
                    ],
                }]
            )
            
            # Parse JSON response
            response_text = message.content[0].text.strip()
            if response_text.startswith("```json"):
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            
            result = json.loads(response_text)
            result["provider"] = "anthropic"
            result["cost"] = 0.003  # ~$3 per 1K tokens (Sonnet)
            
            return result
            
        finally:
            # Cleanup temp image
            if img_path.exists():
                img_path.unlink()
    
    def _classify_openai(self, pdf_path: Path) -> Dict[str, Any]:
        """Classify using OpenAI GPT-4 Vision API"""
        
        if not self.api_keys["openai"]:
            raise RuntimeError("OPENAI_API_KEY not set")
        
        # Convert first page to image
        img_path = self._pdf_to_image(pdf_path)
        
        try:
            import openai
            
            client = openai.OpenAI(api_key=self.api_keys["openai"])
            
            with open(img_path, "rb") as f:
                image_data = base64.standard_b64encode(f.read()).decode("utf-8")
            
            response = client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Classify this legal document. Reply with ONLY a JSON object:
{
  "type": "answer|motion|complaint|order|notice|subpoena|discovery|other",
  "confidence": 0.0-1.0,
  "case_number": "extracted case number or null",
  "reasoning": "brief explanation"
}"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_data}"
                            }
                        }
                    ]
                }],
                max_tokens=512
            )
            
            response_text = response.choices[0].message.content.strip()
            if response_text.startswith("```json"):
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            
            result = json.loads(response_text)
            result["provider"] = "openai"
            result["cost"] = 0.01  # ~$10 per 1K tokens (GPT-4V)
            
            return result
            
        finally:
            if img_path.exists():
                img_path.unlink()
    
    def _classify_gemini(self, pdf_path: Path) -> Dict[str, Any]:
        """Classify using Google Gemini Vision API"""
        
        if not self.api_keys["google"]:
            raise RuntimeError("GOOGLE_API_KEY not set")
        
        # Convert first page to image
        img_path = self._pdf_to_image(pdf_path)
        
        try:
            import google.generativeai as genai
            
            genai.configure(api_key=self.api_keys["google"])
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            with open(img_path, "rb") as f:
                image_data = f.read()
            
            prompt = """Classify this legal document. Reply with ONLY a JSON object:
{
  "type": "answer|motion|complaint|order|notice|subpoena|discovery|other",
  "confidence": 0.0-1.0,
  "case_number": "extracted case number or null",
  "reasoning": "brief explanation"
}"""
            
            response = model.generate_content([prompt, image_data])
            response_text = response.text.strip()
            
            if response_text.startswith("```json"):
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            
            result = json.loads(response_text)
            result["provider"] = "gemini"
            result["cost"] = 0.0002  # ~$0.20 per 1K tokens (Gemini Flash)
            
            return result
            
        finally:
            if img_path.exists():
                img_path.unlink()
    
    def _local_fallback(self, pdf_path: Path) -> Dict[str, Any]:
        """Local text-based classification (no API calls)"""
        
        # Extract text using textutil/pdftotext
        try:
            text = subprocess.check_output(
                ["textutil", "-convert", "txt", "-stdout", str(pdf_path)],
                stderr=subprocess.DEVNULL
            ).decode("utf-8", errors="ignore").upper()
        except:
            try:
                text = subprocess.check_output(
                    ["pdftotext", str(pdf_path), "-"],
                    stderr=subprocess.DEVNULL
                ).decode("utf-8", errors="ignore").upper()
            except:
                return {
                    "type": "unknown",
                    "confidence": 0.0,
                    "case_number": None,
                    "reasoning": "Could not extract text from PDF",
                    "provider": "local"
                }
        
        # Pattern matching
        best_match = None
        best_score = 0
        
        for doc_type, keywords in self.DOCUMENT_TYPES.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > best_score:
                best_score = score
                best_match = doc_type
        
        # Extract case number
        import re
        case_match = re.search(r'\b\d{2}CV\d{6}-\d{3}\b', text)
        case_number = case_match.group(0) if case_match else None
        
        confidence = min(best_score / 3.0, 1.0) if best_match else 0.0
        
        return {
            "type": best_match or "unknown",
            "confidence": confidence,
            "case_number": case_number,
            "reasoning": f"Local pattern match: {best_score} keywords found",
            "provider": "local"
        }
    
    def _pdf_to_image(self, pdf_path: Path) -> Path:
        """Convert first page of PDF to PNG image"""
        
        output = Path(f"/tmp/{pdf_path.stem}_page1.png")
        
        # Try sips (macOS built-in)
        try:
            subprocess.run(
                ["sips", "-s", "format", "png", str(pdf_path), "--out", str(output)],
                check=True,
                capture_output=True
            )
            return output
        except:
            pass
        
        # Try convert (ImageMagick)
        try:
            subprocess.run(
                ["convert", "-density", "150", f"{pdf_path}[0]", str(output)],
                check=True,
                capture_output=True
            )
            return output
        except:
            raise RuntimeError("No PDF→image converter found (tried sips, convert)")

def auto_rename(pdf_path: Path, classification: Dict[str, Any]) -> Optional[Path]:
    """Auto-rename PDF based on classification"""
    
    doc_type = classification["type"]
    case_num = classification.get("case_number")
    
    if doc_type == "unknown" or not case_num:
        return None
    
    # Generate new filename
    date_str = datetime.now().strftime("%Y-%m-%d")
    new_name = f"{date_str}-{doc_type.upper()}-{case_num}.pdf"
    new_path = pdf_path.parent / new_name
    
    # Rename
    pdf_path.rename(new_path)
    return new_path

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Multi-provider PDF classifier")
    parser.add_argument("pdf_path", type=Path, help="PDF file to classify")
    parser.add_argument("--auto-rename", action="store_true", help="Auto-rename file")
    parser.add_argument("--confidence", type=float, default=0.8, help="Confidence threshold")
    parser.add_argument("--provider", choices=["anthropic", "openai", "gemini", "local"], 
                        help="Force specific provider")
    
    args = parser.parse_args()
    
    if not args.pdf_path.exists():
        print(f"❌ File not found: {args.pdf_path}", file=sys.stderr)
        sys.exit(1)
    
    # Initialize classifier
    classifier = MultiProviderClassifier()
    
    # Override provider order if specified
    if args.provider:
        classifier.PROVIDERS = [args.provider] + [p for p in classifier.PROVIDERS if p != args.provider]
    
    # Classify
    print(f"🔍 Classifying: {args.pdf_path.name}")
    result = classifier.classify(args.pdf_path, confidence_threshold=args.confidence)
    
    # Display result
    print(f"\n📄 Type: {result['type']}")
    print(f"✓ Confidence: {result['confidence']:.1%}")
    print(f"🏛️  Case: {result.get('case_number', 'N/A')}")
    print(f"🤖 Provider: {result['provider']}")
    print(f"💡 Reasoning: {result['reasoning']}")
    
    # Auto-rename if requested
    if args.auto_rename:
        new_path = auto_rename(args.pdf_path, result)
        if new_path:
            print(f"\n✅ Renamed: {new_path.name}")
        else:
            print(f"\n⚠️  Could not auto-rename (type={result['type']}, confidence={result['confidence']:.0%})")
    
    # Display session stats
    session = classifier.session.session
    print(f"\n📊 Session Stats:")
    print(f"   Total classifications: {session['api_usage']['classify_calls']}")
    print(f"   This month cost: ${session['api_usage']['last_month_cost']:.2f}")
    print(f"   Provider usage:")
    for provider, count in session['api_usage']['provider_stats'].items():
        print(f"      {provider}: {count}")

if __name__ == "__main__":
    main()
