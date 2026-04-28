# ETF Topology Mapping Algorithm

The Economic Reactor does not process natural language; it calculates gravity and pressure inside a 1024-dimensional topological matrix dynamically.

## 1. The Fuel (VisionClaw Intake)
When a raw chart or geopolitical intelligence feed is dropped into `VisionClawUploader.tsx`:
1. **OCR Scraping:** Generates the DOM snapshot payload string ($S$).
2. **Identity-Locked Generation:** We mathematically strip standard formatting and extract strict Semantic Context ($C$).

## 2. The Semantic Crunch (MiroFish)
The $C$ is piped into `multimodal-embedding.ts` via the LLama API array.
```math
V_{incoming} = embed(C)
```
Where $V_{incoming}$ is a $[1..1024]$ vector representation.

### Euclidean Risk Distance
We define absolute "Panic" not by reading if the text says "crash", but by measuring its geometric distance against the Systemic Baseline Vector ($V_{base}$ being a $1024$-dim array of perfectly mundane market events).

```math
P_{panic} = \sqrt{\sum_{i=1}^{1024} (V_{incoming, i} - V_{base, i})^2}
```

## 3. The Titanium Box (Circuit Breakers)
Before $P_{panic}$ triggers real capital reallocation, the `CircuitBreakerNode` intercepts:
- If $P_{panic} > 1.8$, **[CONTAINMENT BREACH]** is natively fired, starving the execution layer and halting any trades (ADR-092 mechanical constraint protection).
- If Local Edge density reaches $MAX\_CALLS\_PER\_SESSION$, it flags `LBEC_OFFLOAD_STATUS = true`, dynamically wrapping the execution state into a Cloud API router (`tag.ooo`) rather than hanging locally.

## 4. The Action Execution (Dashboard Binding)
When $P_{panic} \leq 1.8$, the execution array maps the vector distance directly to the Multi-Agent Trading configuration:
* If $0.1 < P_{panic} \leq 0.5$: Execute Neutral/Rebalancing ETF sequences.
* If $0.5 < P_{panic} \leq 1.0$: Fire "Adverse" Short/Inverse ETF logic limits immediately. 
* If $1.0 < P_{panic} \leq 1.8$: Trigger "Severe" Hedging & Offload algorithms natively across `trading_dashboard.tsx`.
