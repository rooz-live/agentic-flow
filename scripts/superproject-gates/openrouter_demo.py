#!/usr/bin/env python3
"""
OpenRouter Integration Demo
Shows how to use free-tier AI workflows with various models
"""

import os
import json
import asyncio
import aiohttp
from typing import Dict, List, Optional

class OpenRouterClient:
    """Client for OpenRouter API with free model support"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get('OPENROUTER_API_KEY')
        if not self.api_key:
            raise ValueError("OpenRouter API key not found. Set OPENROUTER_API_KEY environment variable.")
        
        self.base_url = "https://openrouter.ai/api/v1"
        
        # Free models available on OpenRouter
        self.free_models = {
            'gemini-2.0-flash': 'google/gemini-2.0-flash-exp:free',
            'deepseek-v3': 'deepseek/deepseek-chat-v3-0324:free', 
            'llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct:free'
        }
    
    async def generate_code(self, prompt: str, model_name: str = 'gemini-2.0-flash', language: str = 'python') -> Dict:
        """Generate code using specified model"""
        model_id = self.free_models.get(model_name, model_name)
        
        enhanced_prompt = f"""
        Generate {language} code for the following request:
        
        {prompt}
        
        Requirements:
        - Include proper error handling
        - Add comments for clarity
        - Follow best practices for {language}
        - Make the code production-ready
        
        Return only the code, no additional explanation.
        """
        
        return await self._make_request(model_id, enhanced_prompt)
    
    async def analyze_system_logs(self, logs: str, model_name: str = 'gemini-2.0-flash') -> Dict:
        """Analyze system logs for anomalies"""
        model_id = self.free_models.get(model_name, model_name)
        
        prompt = f"""
        Analyze these system logs and identify any anomalies, errors, or issues:
        
        {logs}
        
        Provide:
        1. Summary of findings
        2. Severity levels (INFO, WARNING, CRITICAL)
        3. Recommended actions
        4. Pattern analysis
        
        Format as JSON with structured output.
        """
        
        return await self._make_request(model_id, prompt)
    
    async def optimize_monitoring_config(self, current_config: str, model_name: str = 'deepseek-v3') -> Dict:
        """Optimize monitoring configuration using AI"""
        model_id = self.free_models.get(model_name, model_name)
        
        prompt = f"""
        Review and optimize this monitoring configuration:
        
        {current_config}
        
        Suggest improvements for:
        1. Performance optimization
        2. Better anomaly detection
        3. Reduced false positives
        4. Enhanced alerting
        5. Resource efficiency
        
        Provide the optimized configuration and explain changes.
        """
        
        return await self._make_request(model_id, prompt)
    
    async def generate_test_scenarios(self, system_description: str, model_name: str = 'llama-3.3-70b') -> Dict:
        """Generate comprehensive test scenarios"""
        model_id = self.free_models.get(model_name, model_name)
        
        prompt = f"""
        Create comprehensive test scenarios for this system:
        
        {system_description}
        
        Generate test cases for:
        1. Normal operation scenarios
        2. Failure modes and edge cases
        3. Performance stress testing
        4. Security vulnerability testing
        5. Recovery and resilience testing
        
        Format as structured test plans with steps and expected outcomes.
        """
        
        return await self._make_request(model_id, prompt)
    
    async def _make_request(self, model: str, prompt: str) -> Dict:
        """Make request to OpenRouter API"""
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://localhost:3000',  # Required for some free models
            'X-Title': 'DevOps Automation System'
        }
        
        payload = {
            'model': model,
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'max_tokens': 4000,
            'temperature': 0.1  # Lower temperature for more consistent results
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f'{self.base_url}/chat/completions',
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        return {
                            'success': True,
                            'model': model,
                            'content': result['choices'][0]['message']['content'],
                            'usage': result.get('usage', {}),
                            'cost': result.get('cost', 0)  # Free models should have 0 cost
                        }
                    else:
                        error_text = await response.text()
                        return {
                            'success': False,
                            'error': f'HTTP {response.status}: {error_text}',
                            'model': model
                        }
                        
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'model': model
            }

async def demo_code_generation():
    """Demo code generation capabilities"""
    print("🔧 OpenRouter Code Generation Demo")
    print("=" * 50)
    
    client = OpenRouterClient()
    
    # Test code generation
    prompt = "Create a Python function to calculate Fibonacci numbers with memoization"
    result = await client.generate_code(prompt, 'gemini-2.0-flash', 'python')
    
    if result['success']:
        print(f"✅ Generated code using {result['model']}")
        print(f"💰 Cost: ${result.get('cost', 0)}")
        print("📝 Generated Code:")
        print("-" * 30)
        print(result['content'])
        print("-" * 30)
    else:
        print(f"❌ Error: {result['error']}")

async def demo_log_analysis():
    """Demo log analysis capabilities"""
    print("\n📊 OpenRouter Log Analysis Demo")
    print("=" * 50)
    
    client = OpenRouterClient()
    
    # Sample logs for analysis
    sample_logs = """
    2025-01-15T10:30:15Z|device_tracker|ERROR|IPMI device hv2b40b82 unreachable: connection timeout
    2025-01-15T10:30:45Z|heartbeat_monitor|WARNING|Network endpoint 23.92.79.2 port 8443 timeout
    2025-01-15T10:31:15Z|promotion_gates|CRITICAL|Security scan failed: 5 critical vulnerabilities found
    2025-01-15T10:31:45Z|device_tracker|INFO|Auto-recovery initiated for hv2b40b82
    2025-01-15T10:32:15Z|device_tracker|OK|IPMI device hv2b40b82 recovered successfully
    """
    
    result = await client.analyze_system_logs(sample_logs, 'deepseek-v3')
    
    if result['success']:
        print(f"✅ Analysis completed using {result['model']}")
        print(f"💰 Cost: ${result.get('cost', 0)}")
        print("🔍 Analysis Results:")
        print("-" * 30)
        print(result['content'])
        print("-" * 30)
    else:
        print(f"❌ Error: {result['error']}")

async def demo_config_optimization():
    """Demo configuration optimization"""
    print("\n⚙️ OpenRouter Configuration Optimization Demo")
    print("=" * 50)
    
    client = OpenRouterClient()
    
    # Sample configuration
    sample_config = """
    monitoring:
      interval: 60
      timeout: 30
      thresholds:
        response_time_ms: 10000
        consecutive_failures: 5
    """
    
    result = await client.optimize_monitoring_config(sample_config, 'llama-3.3-70b')
    
    if result['success']:
        print(f"✅ Optimization completed using {result['model']}")
        print(f"💰 Cost: ${result.get('cost', 0)}")
        print("🛠️ Optimization Suggestions:")
        print("-" * 30)
        print(result['content'])
        print("-" * 30)
    else:
        print(f"❌ Error: {result['error']}")

def setup_instructions():
    """Print setup instructions"""
    print("🚀 OpenRouter Setup Instructions")
    print("=" * 50)
    print("1. Get a free API key: https://openrouter.ai/keys")
    print("2. Set environment variable:")
    print("   export OPENROUTER_API_KEY=sk-or-v1-your-key-here")
    print("3. Available free models:")
    for name, model_id in {
        'Gemini 2.0 Flash': 'google/gemini-2.0-flash-exp:free',
        'DeepSeek V3': 'deepseek/deepseek-chat-v3-0324:free',
        'Llama 3.3 70B': 'meta-llama/llama-3.3-70b-instruct:free'
    }.items():
        print(f"   - {name}: {model_id}")

async def main():
    """Main demo function"""
    print("🤖 OpenRouter AI Integration Demo")
    print("Free-tier AI workflows for DevOps automation")
    print()
    
    # Check if API key is set
    if not os.environ.get('OPENROUTER_API_KEY'):
        setup_instructions()
        return
    
    try:
        await demo_code_generation()
        await demo_log_analysis()
        await demo_config_optimization()
        
        print("\n✨ Demo completed! All models are free-tier.")
        print("💡 Integrate these capabilities into your monitoring and automation systems.")
        
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        setup_instructions()

if __name__ == "__main__":
    asyncio.run(main())