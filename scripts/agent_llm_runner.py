#!/usr/bin/env python3
import os
import sys
import subprocess
from google import genai
from google.genai import types

# Simulated Vector DB interface for organizational security policies
def fetch_vector_db_policy(framework_id):
    # In a fully deployed setup, this would query a Milvus/Qdrant/Pinecone cluster.
    policies = {
        "NIST": "NIST CSF 2.0: Enforce Zero Trust boundaries, least privilege access, and deterministic API execution routing.",
        "ISO": "ISO/IEC 27001: Ensure continuous risk management, non-deterministic agent oversight, and strategic architecture audits."
    }
    return policies.get(framework_id, "DEFAULT_POLICY: Enforce strict physical payload constraints.")

def run_local_gemma_fallback(prompt_text, system_instruction):
    print("[FALLBACK TRIGGERED] Booting local Gemma instance via physical edge bounds...")
    try:
        # Attempt to natively route to Ollama's gemma model
        combined_prompt = f"SYSTEM: {system_instruction}\nUSER: {prompt_text}"
        result = subprocess.run(
            ['ollama', 'run', 'gemma', combined_prompt],
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode == 0:
            return result.stdout
        else:
            raise Exception("Local Gemma returned non-zero execution code.")
    except Exception as e:
        print(f"[GEMMA ERROR] Local Gemma unavailable or timed out: {e}")
        return None

def run_agent(prompt_file_path):
    if not os.path.exists(prompt_file_path):
        print(f"Error: Prompt file {prompt_file_path} not found.")
        sys.exit(1)

    with open(prompt_file_path, 'r') as f:
        prompt_text = f.read()

    # Query Vector DB for constraints
    nist_policy = fetch_vector_db_policy("NIST")
    iso_policy = fetch_vector_db_policy("ISO")

    # Invert thinking: Embed constraints directly
    system_instruction = f"""
    You are an autonomous, structurally sovereign Agentic-QE node within the Swarm.
    Your decision boundaries are strictly governed by inverted thinking frameworks:
    - Tactical Hardening: {nist_policy}
    - Strategic Architecture: {iso_policy}
    - Always question the premise: 'What if the opposite is true?'
    """

    print(f"[AGENTIC RUNNER] Booting Multi-Model Cascade for {prompt_file_path}...")
    
    # 1. Primary: Gemini API
    try:
        client = genai.Client()
        print("[ROUTING] Attempting API: Gemini Flash Preview (Agent)...")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt_text,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            ),
        )
        
        print("\n=== SWARM RESPONSE (GEMINI) ===\n")
        print(response.text)
        print("\n===============================\n")
        return
        
    except Exception as e:
        print(f"[GEMINI BLOCK] API Connection failed or credits blocked: {str(e)}")

    # 2. Secondary: Local Gemma
    gemma_response = run_local_gemma_fallback(prompt_text, system_instruction)
    if gemma_response:
        print("\n=== SWARM RESPONSE (GEMMA FALLBACK) ===\n")
        print(gemma_response)
        print("\n========================================\n")
        return

    # 3. Tertiary: Systemic Halt
    print(f"[CRITICAL HALT] Multi-model cascade failed across Gemini and Gemma. Swarm looping delayed.")
    sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 agent_llm_runner.py <prompt_file>")
        sys.exit(1)
    
    run_agent(sys.argv[1])
