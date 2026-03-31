# Long-Prompt Engineering and Consolidate-Then-Extend

**Principle:** Consolidate then extend, not extend then consolidate. Quality delivery over error-prone speed. Multi-cycle rebuild with optimal token usage for long-prompt iteration.

---

## 1. Consolidate-Then-Extend

- **Consolidate first:** Single source of truth (one ROAM risk, one PDF location, one email workflow), deduplicate entries, merge context before adding features.
- **Extend second:** New integrations, feature flags, automation only after the consolidated state is valid and documented.
- **Applies to:** ROAM tracker (one entry per risk), document paths (canonical folder + filename), prompts (single consolidated context or RAG index before adding more instructions).

---

## 2. Long-Prompt and Token Optimization

### Recursive / Chunked Processing

- Break documents into **semantically coherent** segments; process individually or via retrieval.
- Prefer **RAG**: embed chunks, retrieve only relevant context at runtime to reduce token usage while preserving information.

### Vector Database Retrieval

- Use an embedding model to convert document chunks into vectors; store in existing DBs.
- At runtime, retrieve only the most relevant, context-specific chunks to build the prompt.

### Prompt Compression

- **LLMLingua / LongLLMLingua:** Identify and remove redundant or low-value tokens from previous prompts; retain performance with shorter context.
- **Summarization:** Have a prior step summarize relevant data instead of feeding raw long content.

### Needle-in-Haystack Mitigation

- **Context rot:** Models often miss information in long, dense prompts.
- **Structure:** Put the most critical instructions **after** the long context, or use **XML tags** to delimit documents.
- **Sandwich:** Crucial instructions at the **beginning**, long context in the **middle**, repeat key instructions at the **end**.

### Dynamic Token Pruning (e.g. LazyLLM)

- Selectively compute the Key-Value (KV) cache for the most important tokens in prefilling and decoding.
- Reduces re-processing of large, static inputs and accelerates inference.

### Behavior-Equivalent (BE) Tokens

- Replace long, recurring context segments with trained "behavior-equivalent" tokens that encode prior context efficiently.

### Limited Context (e.g. llama.cpp)

- **n_keep:** Retain a fixed number of tokens from the start of the prompt when the context window is refreshed so core instructions are not lost.
- **State simulation:** For complex debugging, manually concatenate the original prompt with the required "preserved" part of a previous response to simulate continuous state.

---

## 3. Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Structure** | Sandwich: critical instructions → long context → repeat instructions |
| **Version control** | Treat prompt updates like code; use semantic versioning for context structure or JSON schema changes |
| **Summarization** | Pre-summarize data to cut token cost instead of feeding raw dumps |
| **Chunk + RAG** | Chunk by semantic coherence; retrieve at runtime instead of sending full docs |
| **Delimiters** | Use XML or markdown fences to separate documents and instructions |

---

## 4. Relation to This Repo

- **ROAM / evidence:** One risk ID per issue (e.g. single R-2026-009); one canonical path per document (e.g. `12-AMANDA-BECK-110-FRAZIER/2026-02-24-PROPERTY-110-Frazier-Ave.pdf`).
- **Pre-send ceremony:** `pre-send-email-workflow.sh` runs ROAM staleness and coherence checks; ROAM path falls back to `ROAM_TRACKER.yaml` at repo root if `.goalie/ROAM_TRACKER.yaml` is missing.
- **Validation mesh:** `unified-validation-mesh.sh` exposes FEATURE_* flags (email placeholder, legal citation, attachment verification, cyclic regression, auto-fix); default on for validation-driven flow.
- **Long prompts:** For very long prompts (e.g. trial prep, multi-doc review), apply chunking, RAG, or summarization before sending to the model; keep a single consolidated context or manifest for reproducibility.
