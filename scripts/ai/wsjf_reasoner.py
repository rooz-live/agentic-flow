#!/usr/bin/env python3
"""
WSJF AI Reasoner - VibeThinker-1.5B Integration

Uses WeiboAI/VibeThinker-1.5B for WSJF task analysis and reasoning
Model: https://huggingface.co/WeiboAI/VibeThinker-1.5B

Capabilities:
- WSJF component estimation (business value, time criticality, risk reduction, size)
- Task decomposition and dependency analysis
- Risk assessment and mitigation suggestions
- Pattern matching (TDD, Safe-Degrade, etc.)

Pattern: Observability-First (emits telemetry for all inferences)
"""

import sys
import json
import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
import warnings

# Suppress transformers warnings
warnings.filterwarnings('ignore')

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("⚠️  Warning: transformers not installed. Install with:", file=sys.stderr)
    print("   pip install transformers torch", file=sys.stderr)

class WSJFReasoner:
    """WSJF Reasoner using VibeThinker-1.5B"""
    
    def __init__(self, model_name: str = "WeiboAI/VibeThinker-1.5B", 
                 device: str = "cpu"):
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers and torch are required")
        
        self.model_name = model_name
        self.device = device
        self.tokenizer = None
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load VibeThinker model and tokenizer"""
        print(f"Loading model {self.model_name}...", file=sys.stderr)
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float32 if self.device == "cpu" else torch.float16,
                device_map=self.device
            )
            self.model.eval()
            print(f"✅ Model loaded on {self.device}", file=sys.stderr)
        except Exception as e:
            print(f"❌ Failed to load model: {e}", file=sys.stderr)
            raise
    
    def analyze_task(self, title: str, description: str = "", 
                     context: Optional[Dict] = None) -> Dict:
        """
        Analyze task and estimate WSJF components
        
        Args:
            title: Task title
            description: Task description
            context: Additional context (circle, dependencies, etc.)
        
        Returns:
            {
                'business_value': 1-10,
                'time_criticality': 1-10,
                'risk_reduction': 1-10,
                'job_size': 1-10,
                'reasoning': 'explanation',
                'pattern_suggestions': ['TDD', 'Safe-Degrade'],
                'risks': ['risk1', 'risk2'],
                'dependencies': ['dep1', 'dep2']
            }
        """
        context = context or {}
        
        # Build prompt
        prompt = self._build_analysis_prompt(title, description, context)
        
        # Generate reasoning
        reasoning_output = self._generate(prompt, max_new_tokens=512)
        
        # Parse output
        result = self._parse_analysis_output(reasoning_output)
        result['raw_output'] = reasoning_output
        
        # Emit telemetry
        self._emit_telemetry('analyze_task', {
            'title': title,
            'description': description[:100],
            'context': context,
            'result': result
        })
        
        return result
    
    def _build_analysis_prompt(self, title: str, description: str, 
                                context: Dict) -> str:
        """Build prompt for WSJF analysis"""
        circle = context.get('circle', 'unassigned')
        current_status = context.get('status', 'PENDING')
        
        prompt = f"""You are a WSJF (Weighted Shortest Job First) expert analyzing software development tasks.

Task Title: {title}
Description: {description or 'No description provided'}
Circle: {circle}
Status: {current_status}

Analyze this task and provide:

1. Business Value (1-10): How much value does this deliver to users/business?
   - Consider: revenue impact, user satisfaction, competitive advantage
   - 1 = minimal value, 10 = critical business value

2. Time Criticality (1-10): How urgent is this task?
   - Consider: deadlines, dependencies, opportunity cost
   - 1 = no urgency, 10 = must be done immediately

3. Risk Reduction (1-10): How much risk does this mitigate?
   - Consider: security, stability, technical debt, compliance
   - 1 = low risk reduction, 10 = eliminates critical risk

4. Job Size (1-10): How much effort is required?
   - Consider: complexity, unknowns, integration points
   - 1 = trivial (< 1 hour), 10 = epic (> 1 month)

5. Pattern Suggestions: Which patterns apply? (TDD, Safe-Degrade, Observability-First, etc.)

6. Risks: What are the potential risks?

7. Dependencies: What are the dependencies?

Provide your analysis in JSON format:
{{
  "business_value": <score>,
  "time_criticality": <score>,
  "risk_reduction": <score>,
  "job_size": <score>,
  "reasoning": "<explanation>",
  "pattern_suggestions": ["pattern1", "pattern2"],
  "risks": ["risk1", "risk2"],
  "dependencies": ["dep1", "dep2"]
}}

Analysis:"""
        
        return prompt
    
    def _generate(self, prompt: str, max_new_tokens: int = 512) -> str:
        """Generate text using VibeThinker model"""
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=0.7,
                top_p=0.9,
                do_sample=True
            )
        
        generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract only the generated portion (after prompt)
        generated_portion = generated_text[len(prompt):].strip()
        
        return generated_portion
    
    def _parse_analysis_output(self, output: str) -> Dict:
        """Parse model output into structured result"""
        # Try to extract JSON from output
        try:
            # Look for JSON block
            start_idx = output.find('{')
            end_idx = output.rfind('}') + 1
            
            if start_idx >= 0 and end_idx > start_idx:
                json_str = output[start_idx:end_idx]
                result = json.loads(json_str)
                
                # Validate scores
                for key in ['business_value', 'time_criticality', 'risk_reduction', 'job_size']:
                    if key in result:
                        result[key] = max(1, min(10, int(result[key])))
                
                return result
        except (json.JSONDecodeError, ValueError):
            pass
        
        # Fallback: return default values with raw output
        return {
            'business_value': 5,
            'time_criticality': 5,
            'risk_reduction': 5,
            'job_size': 5,
            'reasoning': output[:500],
            'pattern_suggestions': [],
            'risks': [],
            'dependencies': [],
            'parse_error': 'Could not parse JSON output'
        }
    
    def _emit_telemetry(self, event_type: str, data: Dict):
        """Emit telemetry event"""
        event = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'event': f'wsjf_ai_{event_type}',
            'model': self.model_name,
            'device': self.device,
            'data': data
        }
        
        telemetry_file = Path('logs/wsjf_ai_telemetry.jsonl')
        telemetry_file.parent.mkdir(parents=True, exist_ok=True)
        with open(telemetry_file, 'a') as f:
            f.write(json.dumps(event) + '\n')

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="WSJF AI Reasoner using VibeThinker-1.5B"
    )
    parser.add_argument('--title', required=True,
                        help='Task title')
    parser.add_argument('--description', default='',
                        help='Task description')
    parser.add_argument('--circle', default='unassigned',
                        help='Circle assignment')
    parser.add_argument('--status', default='PENDING',
                        help='Current status')
    parser.add_argument('--model', default='WeiboAI/VibeThinker-1.5B',
                        help='Model name or path')
    parser.add_argument('--device', default='cpu',
                        choices=['cpu', 'cuda', 'mps'],
                        help='Device for inference')
    parser.add_argument('--json', action='store_true',
                        help='Output JSON only')
    
    args = parser.parse_args()
    
    if not TRANSFORMERS_AVAILABLE:
        print("❌ Error: transformers not installed", file=sys.stderr)
        print("Install with: pip install transformers torch", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Initialize reasoner
        reasoner = WSJFReasoner(model_name=args.model, device=args.device)
        
        # Analyze task
        context = {
            'circle': args.circle,
            'status': args.status
        }
        result = reasoner.analyze_task(args.title, args.description, context)
        
        # Output
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print("=" * 70)
            print("🧠 WSJF AI Analysis")
            print("=" * 70)
            print(f"\nTask: {args.title}")
            if args.description:
                print(f"Description: {args.description[:100]}...")
            print()
            print(f"Business Value:     {result['business_value']}/10")
            print(f"Time Criticality:   {result['time_criticality']}/10")
            print(f"Risk Reduction:     {result['risk_reduction']}/10")
            print(f"Job Size:           {result['job_size']}/10")
            
            cod = result['business_value'] + result['time_criticality'] + result['risk_reduction']
            wsjf = cod / result['job_size'] if result['job_size'] > 0 else 0
            print()
            print(f"Cost of Delay (CoD): {cod}")
            print(f"WSJF:                {wsjf:.2f}")
            
            if result.get('pattern_suggestions'):
                print()
                print(f"Pattern Suggestions: {', '.join(result['pattern_suggestions'])}")
            
            if result.get('risks'):
                print()
                print("Risks:")
                for risk in result['risks']:
                    print(f"  - {risk}")
            
            if result.get('dependencies'):
                print()
                print("Dependencies:")
                for dep in result['dependencies']:
                    print(f"  - {dep}")
            
            print()
            print("Reasoning:")
            print(result.get('reasoning', 'No reasoning provided')[:500])
            print("=" * 70)
    
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
