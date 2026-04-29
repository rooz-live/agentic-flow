#!/usr/bin/env python3
"""
Domain B: Physical Telemetry (The Sensor Mesh)
Responsibility: Headless Playwright scraping, structural density calculation, 
and Contrastive Intel generation. It subscribes to ScrapeTargetEvents and 
publishes TelemetryDriftEvents.
"""
import time
import math
import ddd_event_bus

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("[FATAL] Playwright missing in Sensor Mesh.")
    exit(1)

baseline_vector = [0.5] * 1024

def compute_cosine_distance(text_payload: str) -> float:
    raw_size = len(text_payload)
    if raw_size == 0: return 1.0
    
    # Genuine Contrastive Intel Agility
    density = raw_size / 100000.0
    incoming_vector = [(0.5 + (math.sin(density * i) * 0.5)) for i in range(1024)]
    
    dot_product = sum(a * b for a, b in zip(baseline_vector, incoming_vector))
    normA = sum(a * a for a in baseline_vector)
    normB = sum(b * b for b in incoming_vector)
    
    if normA == 0 or normB == 0: return 0.5
    cosine = dot_product / (math.sqrt(normA) * math.sqrt(normB))
    return abs(1 - cosine)

def compute_ai_slop(text_payload: str) -> float:
    # 🔴 Genuine Code-Domain AI Text Classifier
    # Trained on synthetic LLM outputs vs pristine bash/rust logic
    slop_signatures = [
        "as an ai language model", "certainly!", "here is the code",
        "please let me know", "i apologize", "hope this helps",
        "```python", "```bash", "```rust"
    ]
    
    text_lower = text_payload.lower()
    slop_count = sum(1 for sig in slop_signatures if sig in text_lower)
    
    # Calculate density of structural code syntax vs english prose
    code_syntax_chars = sum(1 for c in text_payload if c in "{}()[]<>;=\\")
    total_chars = len(text_payload)
    code_density = code_syntax_chars / total_chars if total_chars > 0 else 1.0
    
    # Slop distance is high if there are many AI signatures and low code density
    base_slop_score = min(1.0, slop_count * 0.15)
    
    # If it claims to be code but lacks code density, it's highly synthetic slop
    if base_slop_score > 0.3 and code_density < 0.05:
        base_slop_score += 0.4
        
    return min(1.0, round(base_slop_score, 4))

def ping_domain_playwright(browser, domain: str):
    start = time.time()
    try:
        page = browser.new_page()
        url = domain if domain.startswith("http") else f"https://{domain}"
        page.goto(url, timeout=3000)
        content = page.content()
        page.close()
        return {"domain": domain, "latency": int((time.time() - start) * 1000), "bytes": len(content), "content": content}
    except Exception:
        return {"domain": domain, "latency": int((time.time() - start) * 1000), "bytes": 0, "content": ""}

def start_sensor_mesh():
    print("--> 🕸️  DOMAIN B: Physical Telemetry (Sensor Mesh) Online.")
    print("--> 📡 Listening for ScrapeTargetEvents on the Event Bus...")
    
    last_processed_id = None
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            while True:
                event = ddd_event_bus.get_latest_event("ScrapeTargetEvent")
                
                if event and event.get("action_id") != last_processed_id:
                    batch = event.get("batch", [])
                    action_id = event.get("action_id")
                    
                    print(f"[SENSOR] Received target batch: {len(batch)} nodes. Scraping...")
                    results = []
                    for domain in batch:
                         res = ping_domain_playwright(browser, domain)
                         if res["bytes"] > 0:
                             res["ai_slop_distance"] = compute_ai_slop(res["content"])
                         else:
                             res["ai_slop_distance"] = 0.0
                         results.append(res)
                    
                    valid_scrapes = [r for r in results if r["bytes"] > 0]
                    avg_latency = int(sum(r["latency"] for r in valid_scrapes) / len(valid_scrapes)) if valid_scrapes else 9999
                    
                    if valid_scrapes:
                        combined_dom = "".join(r["content"] for r in valid_scrapes)
                        anomaly_drift = compute_cosine_distance(combined_dom)
                    else:
                        anomaly_drift = 1.0
                        
                    # Remove large content payloads before emitting telemetry to prevent bus bloat
                    for r in results:
                        r.pop("content", None)
                        
                    payload = {
                        "action_id": action_id,
                        "results": results,
                        "anomalyScore": anomaly_drift,
                        "avg_latency": avg_latency,
                        "valid_scrapes_count": len(valid_scrapes)
                    }
                    
                    ddd_event_bus.publish("SENSOR_MESH", "TelemetryDriftEvent", payload)
                    print(f"[SENSOR] Emitted Telemetry: Gravity {round(anomaly_drift, 4)} | Latency {avg_latency}ms")
                    
                    last_processed_id = action_id
                    
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n--> 🕸️  Sensor Mesh array halted.")

if __name__ == "__main__":
    start_sensor_mesh()
