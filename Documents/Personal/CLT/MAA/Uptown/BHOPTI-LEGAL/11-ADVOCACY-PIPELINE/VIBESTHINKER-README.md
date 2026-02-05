# VibeThinker: Focused Iterative Model with Wholeness Validation

A focused iterative run model that generates dynamic variations, validates them against 21-dimensional wholeness criteria, and selects the optimal output using MGPO (Monte Carlo Gradient Policy Optimization).

## Overview

VibeThinker implements a reality-tracking optimization framework designed for advocacy content that must maintain epistemic integrity under distortion pressure.

### Core Components

1. **Dynamic Variation Generation** - Adaptively generates 3-10 variations using different strategies
2. **21-Dimensional Wholeness Validation** - Comprehensive validation across 5 categories
3. **MGPO Selection** - Policy gradient-based optimal variation selection
4. **Iterative Refinement** - Multi-iteration optimization until target score achieved

## Architecture

```
vibesthinker/
├── __init__.py          # Package exports
├── core.py              # Main VibeThinker orchestrator
├── wholeness.py         # 21-dimensional validation framework
├── variations.py        # Dynamic variation generator
└── mgpo.py              # MGPO selector
```

## 21-Dimensional Wholeness Framework

### Category 1: Falsifiability (5 dimensions)
- **dates_precision** - Specific dates vs vague references
- **dollar_amounts** - Concrete monetary values
- **countable_claims** - Numbers with units (5 letters, 10 years)
- **actor_specificity** - Named actors vs vague subjects
- **claim_density** - Overall falsifiable claim density

### Category 2: Causality & Time (4 dimensions)
- **causality_chains** - Explicit cause→effect markers
- **temporal_coherence** - Date/time consistency
- **timeline_completeness** - Beginning, middle, end structure
- **temporal_precision** - Absence of vague temporal references

### Category 3: Ownership & Agency (3 dimensions)
- **first_person_ownership** - "I" vs distributed responsibility
- **active_voice** - Active vs passive constructions
- **responsibility_clarity** - Clear attribution

### Category 4: Evidence & Truth (4 dimensions)
- **elemental_truth** - Raw observations vs normalized descriptions
- **evidence_alignment** - Claims match evidence database
- **tension_preservation** - Critical tensions maintained
- **falsifiable_tests** - Explicit testability statements

### Category 5: Anti-Patterns (5 dimensions)
- **ritual_language_absence** - No unfalsifiable moral abstractions
- **distributed_responsibility_absence** - No vague attribution
- **vague_temporal_absence** - No "recently", "soon"
- **passive_voice_absence** - Minimal passive voice
- **normalization_resistance** - Urgency/harm language preserved

## Installation

```bash
# Activate your virtual environment
source venv-vibesthinker/bin/activate  # or your env

# Install dependencies
pip install -r requirements-vibesthinker.txt
```

## Quick Start

```python
from vibesthinker import create_vibesthinker

# Create instance
thinker = create_vibesthinker(target_score=0.85, verbose=True)

# Optimize text
base_text = """
MAA recently sent a non-renewal notice.
I made good faith efforts to resolve this.
The situation is challenging.
"""

result = thinker.run(base_text, iterative=True)

print(f"Score: {result.wholeness_score.percentage:.1f}%")
print(f"Optimized: {result.selected_variation.text}")
```

## Advanced Usage

### 1. With Context

```python
context = {
    'current_date': 'February 3, 2026',
    'deadline': 'February 5, 2026',
    'days_until_deadline': 2,
    'key_tensions': [
        '26-day gap between displacement and hearing',
        'Zero responses to five letters'
    ]
}

result = thinker.run(base_text, context=context, iterative=True)
```

### 2. Compare Multiple Variations

```python
# Get top 3 variations for human review
top_results = thinker.compare_variations(base_text, top_k=3)

for idx, result in enumerate(top_results, 1):
    print(f"{idx}. {result.wholeness_score.percentage:.1f}%")
    print(f"   Strategy: {result.selected_variation.strategy.value}")
```

### 3. Detailed Dimension Analysis

```python
analysis = thinker.explain_dimensions(base_text)

for category, data in analysis['categories'].items():
    print(f"{category}: {data['percentage']:.1f}%")
    for dim in data['dimensions']:
        status = "✓" if dim['passed'] else "✗"
        print(f"  {status} {dim['name']}: {dim['percentage']:.1f}%")
```

### 4. Batch Processing

```python
texts = [
    "Text 1 to optimize...",
    "Text 2 to optimize...",
    "Text 3 to optimize...",
]

results = thinker.run_batch(texts, iterative=True)
```

## Variation Strategies

The generator uses 7 different strategies:

- **BASELINE** - Original with minimal changes
- **CAUSALITY_EMPHASIS** - Emphasize cause→effect chains
- **TEMPORAL_PRECISION** - Add specific dates/times
- **FIRST_PERSON_BOOST** - Increase ownership language
- **EVIDENCE_DENSE** - Maximize falsifiable claims
- **ANTI_RITUAL** - Remove ritual language
- **TENSION_AMPLIFY** - Amplify critical tensions
- **HYBRID_BALANCED** - Combination of strategies

## MGPO Selection

The selector uses:
- **Exploration rate** (default 0.1) - Probability of non-greedy selection
- **Temperature** (default 1.0) - Softmax temperature for diversity
- **Diversity weight** (default 0.2) - Weight given to strategy diversity

Selection probability for variation `i`:

```
p(i) = softmax((score_i + diversity_bonus_i * w_div) / temp)
```

## Configuration

### VibeThinker Parameters

```python
thinker = VibeThinker(
    min_variations=3,        # Minimum variations to generate
    max_variations=10,       # Maximum variations to generate
    target_score=0.85,       # Target wholeness score (0.0-1.0)
    exploration_rate=0.1,    # MGPO exploration
    max_iterations=5,        # Max iterative refinement passes
    verbose=False            # Enable logging
)
```

### Wholeness Score Thresholds

- **OPTIMAL**: 95-100% (19-21 dimensions passed)
- **EXCELLENT**: 85-94% (18-19 dimensions passed)
- **GOOD**: 75-84% (16-17 dimensions passed)
- **PARTIAL**: 60-74% (13-15 dimensions passed)
- **SURFACE_ALIGNMENT**: <60% (<13 dimensions passed)

## Examples

See `example_vibesthinker.py` for complete examples:

```bash
python example_vibesthinker.py
```

Examples include:
1. Basic single-text optimization
2. Using context for validation
3. Comparing top variations
4. Detailed dimension analysis
5. Batch processing multiple texts

## Integration with Existing Wholeness Framework

VibeThinker extends your existing wholeness framework:

- Compatible with `WHOLENESS-FRAMEWORK.md` principles
- Implements all checks from `WHOLENESS-WORKFLOW.md`
- Extends 6 original tests to 21 comprehensive dimensions
- Maintains philosophical grounding (Adil's Test + Taleb's insights)

## Philosophical Grounding

### Adil's Test
> "If what you're saying cannot be falsified, you're not speaking—you're performing compatibility."

### Core Principles
- **Reality-Tracking** over surface alignment
- **Falsifiable Claims** over ritual language
- **Owned Statements** over distributed responsibility
- **Temporal Precision** over vague timeframes
- **Causality Chains** over narrative fog

## Performance

On typical advocacy content:
- **Generation**: 100-500ms per variation
- **Validation**: 20-50ms per text
- **Selection**: 10-30ms for 3-10 variations
- **Full Run** (iterative): 1-5 seconds

## Testing

```bash
# Run tests
pytest vibesthinker/

# With coverage
pytest --cov=vibesthinker vibesthinker/
```

## Future Enhancements

Potential additions:
1. Evidence database integration for `evidence_alignment` dimension
2. Semantic embeddings for similarity-based variation generation
3. Neural language model integration for advanced variation strategies
4. Multi-objective optimization (wholeness + readability + brevity)
5. A/B testing framework for strategy effectiveness

## API Reference

### Core Classes

#### `VibeThinker`
Main orchestrator class.

**Methods:**
- `run(text, context, iterative)` - Run optimization
- `run_batch(texts, context, iterative)` - Batch processing
- `compare_variations(text, context, top_k)` - Get top K variations
- `explain_dimensions(text, context)` - Detailed dimension breakdown

#### `WholenessValidator`
21-dimensional validation.

**Methods:**
- `validate(text, context)` - Returns `WholenessScore`

#### `VariationGenerator`
Dynamic variation generation.

**Methods:**
- `generate(base_text, context, target_score)` - Returns list of `Variation`

#### `MGPOSelector`
MGPO-based selection.

**Methods:**
- `select(variations, context, target_score)` - Returns `SelectionResult`
- `select_top_k(variations, k, context)` - Returns top K results
- `adaptive_select(variations, context, target_score, max_iterations)` - Iterative selection

### Data Classes

#### `WholenessScore`
- `text: str` - Validated text
- `dimensions: List[DimensionScore]` - All 21 dimension scores
- `total_score: float` - Weighted average (0.0-1.0)
- `status: WholenessStatus` - Overall status
- `percentage: float` - Score as percentage
- `passed_count: int` - Number of passed dimensions
- `failed_count: int` - Number of failed dimensions

#### `VibeThinkResult`
- `original_text: str` - Original input
- `selected_variation: Variation` - Best variation
- `wholeness_score: WholenessScore` - Validation score
- `all_variations: List[Variation]` - All generated variations
- `selection_result: SelectionResult` - MGPO selection details
- `run_metadata: Dict` - Run statistics

## License

Part of the Advocacy Pipeline project.

## Support

For issues or questions:
1. Check `example_vibesthinker.py` for usage examples
2. Review `WHOLENESS-FRAMEWORK.md` for conceptual background
3. See `WHOLENESS-WORKFLOW.md` for integration with existing tools

---

**Remember**: Wholeness = maintaining awareness. Fragmentation = "unseeing" to avoid discomfort.

VibeThinker prevents epistemic outsourcing to systems that won't validate.
