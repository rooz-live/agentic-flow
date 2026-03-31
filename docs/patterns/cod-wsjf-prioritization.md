# Method Pattern: Cost of Delay (CoD) & Weighted Shortest Job First (WSJF)

**Status:** Active
**Context:** Prioritization of Circle Backlog Items
**Related Strategy:** [Continuous Improvement Strategy](../CONTINUOUS_IMPROVEMENT_STRATEGY.md)

## 1. Intent
To maximize economic flow by prioritizing work that delivers the highest value in the shortest time. This pattern replaces "gut feel" prioritization with a quantifiable economic model.

## 2. The Formula

We use the Scaled Agile Framework (SAFe) definition of WSJF:

$$ WSJF = \frac{\text{Cost of Delay (CoD)}}{\text{Job Duration (Size)}} $$

Where **Cost of Delay** is the sum of three components:

$$ \text{CoD} = \text{User-Business Value} + \text{Time Criticality} + \text{Risk Reduction/Opportunity Enablement} $$

### 2.1 Component Definitions (Relative Scale: 1, 2, 3, 5, 8, 13, 20)

*   **User-Business Value (UBV):** relative value to the user or business.
    *   *Do our users prefer this over that?*
    *   *Does this reduce OpEx significantly?*
*   **Time Criticality (TC):** how user/business value decays over time.
    *   *Is there a fixed deadline?*
    *   *Will users wait for us or move to a competitor?*
    *   *Is the value higher now than later?*
*   **Risk Reduction / Opportunity Enablement (RR/OE):**
    *   *Does this feature reduce the risk of future delivery?*
    *   *Does it enable new business opportunities?*
*   **Job Duration (Size):**
    *   Relative size/complexity of the task (Fibonacci).

## 3. Application in Agentic Flow

### 3.1 Backlog Integration

In your Circle's `backlog.md`, add `CoD` and `WSJF` metrics to the metadata or as explicit columns if supported.

**Recommended Format (YAML Frontmatter or Comment in Task):**

```markdown
| ID | Task | Status | Budget | WSJF | CoD | Size |
|---|---|---|---|---|---|---|
| FLOW-101 | Optimize Docker Build | IN_PROGRESS | OpEx | 12.0 | 36 | 3 |
```

*   **Calculation:** `(13 UBV + 13 TC + 10 RR) = 36 CoD`. `Size = 3`. `WSJF = 36 / 3 = 12.0`.

### 3.2 Automated Calculation (Future)

The `af governance-agent` or `replenish_circle.sh` scripts can facilitate this estimation by prompting for the 3 components and Size, then auto-calculating WSJF.

## 4. Economic Guardrails

*   **WSJF < 5:** Low priority. Do only if "Filler" or dependencies require it.
*   **WSJF > 20:** Critical. "Swarm" this item if blocked.
*   **CoD Spike:** If Time Criticality is maxed (20), the item bypasses standard flow (Expedite).

## 5. Verification

*   **Check:** Run `af priority-check` (if available) or review `backlog.md`.
*   **Success:** High WSJF items are at the top of the `PENDING` list.
