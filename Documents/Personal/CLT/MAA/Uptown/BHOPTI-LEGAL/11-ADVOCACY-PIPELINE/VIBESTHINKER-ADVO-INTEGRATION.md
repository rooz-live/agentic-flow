# VibeThinker + ADVO CLI Integration

Complete integration of VibeThinker focused iterative model with retrospective learning into the `advo` CLI.

## 🎯 What's New

### 1. **Adaptive Variation Generation**
The variation count now adapts based on THREE factors:

```python
total_variations = min_variations + score_factor + length_factor + retro_factor
```

- **Score Factor**: Higher targets → more variations
- **Length Factor**: Longer text → more variations  
- **Retro Factor**: ⭐ **NEW!** Learning-based boost (0-2 variations)

### 2. **Retrospective-Driven Strategy Selection**
After 5+ runs, VibeThinker learns which strategies work best and **auto-prioritizes** them:

**Before Learning (default):**
```
1. anti_ritual
2. causality_emphasis
3. evidence_dense
...
```

**After Learning (adaptive):**
```
1. hybrid_balanced     (0.78 avg) ← Learned this works best!
2. anti_ritual         (0.74 avg)
3. causality_emphasis  (0.71 avg)
...
```

### 3. **Pattern & Anti-Pattern Detection**
Automatically discovers what helps/hurts wholeness scores:

**Successful Patterns:**
- `anti_ritual` improves `ritual_language_absence` (+0.85 impact, 12x seen)
- `causality_emphasis` improves `causality_chains` (+0.42 impact, 8x seen)

**Anti-Patterns:**
- `baseline` degrades `temporal_precision` (-0.30 impact, 5x seen)

## 🚀 Usage

### Quick Start
```bash
# Optimize a text file
advo vibe run letter.txt

# High-target optimization
advo vibe run day1-draft.txt --target 0.90 --verbose

# View learning insights
advo vibe retro report

# Quick stats
advo vibe retro stats
```

### Example Workflow
```bash
# Day 1: First optimization (no learning yet)
advo vibe run email-day1.txt
# → Generates 5 variations (default strategies)
# → Score: 62% → 74% (anti_ritual selected)

# Day 2: VibeThinker starts learning
advo vibe run email-day2.txt
# → Generates 5 variations (same)
# → Score: 58% → 71% (hybrid_balanced selected)

# Day 3-5: Continue building history
advo vibe run email-day3.txt
advo vibe run email-day4.txt  
advo vibe run email-day5.txt

# After 5+ runs: Learning activates!
advo vibe run new-letter.txt
# → NOW generates 6-7 variations (retro boost activated!)
# → Prioritizes hybrid_balanced first (learned it works)
# → Score: 60% → 82% (better results from learning!)

# View what was learned
advo vibe retro report
```

## 📊 Retro Factor Logic

The `retro_factor` adds 0-2 extra variations when:

```python
if retro_insights['total_runs'] < 5:
    return 0  # Need at least 5 runs to learn

# +1 if struggling to improve
if avg_improvement < 0.05:
    retro_boost += 1  # Try more variations to explore

# +1 if high target with variance
if target >= 0.90 and strategy_variance > 0.15:
    retro_boost += 1  # High targets need exploration

return min(retro_boost, 2)  # Cap at +2
```

## 🔄 Integration Flow

```
advo vibe run file.txt
       ↓
scripts/vibe-optimize.sh
       ↓
VibeThinker(with retro_db)
       ↓
VariationGenerator(retro_db=vibesthinker_retro.json)
       ↓
[Loads retro insights]
       ↓
_determine_variation_count()
  - score_factor: +3-4 (for target 0.85)
  - length_factor: +1 (for 300 word text)
  - retro_factor: +1 ⭐ (if struggling)
  = 7 variations total
       ↓
_select_strategies()
  - Uses get_retro_recommended_strategies() ⭐
  - Prioritizes hybrid_balanced (learned best)
       ↓
Generate 7 variations with learned ordering
       ↓
MGPO Selection
       ↓
Save optimized output
       ↓
VibeThinkerRetro.record_run() ⭐
  - Records baseline & final scores
  - Tracks which strategies helped/hurt
  - Updates strategy performance
  - Identifies patterns & anti-patterns
       ↓
Next run will be smarter! 🧠
```

## 📁 Files Modified/Created

### Core VibeThinker Enhancements
- `vibesthinker/variations.py` ⭐ Enhanced with retro learning
  - Added `retro_db` parameter
  - Added `_load_retro_insights()`
  - Added `_calculate_retro_factor()`
  - Added `get_retro_recommended_strategies()`
  - Modified `_determine_variation_count()` to use retro
  - Modified `_select_strategies()` to use learned ordering

- `vibesthinker/retro.py` ⭐ New pattern learning module (430 lines)

### CLI Integration
- `scripts/vibe-optimize.sh` ⭐ New bash integration script (299 lines)
- `advo` - Added `vibe` command integration
- `VIBESTHINKER-README.md` - Full documentation
- `example_retro.py` - Retrospective examples

## 🎓 Learning Cycle

```
Run 1-4: Building history
  ├─ Using default strategy prioritization
  ├─ Recording all dimension changes
  └─ Tracking strategy performance

Run 5+: Learning activated! 🧠
  ├─ Adaptive variation count (+0-2 based on patterns)
  ├─ Learned strategy ordering (best first)
  ├─ Pattern-aware optimization
  └─ Continuous improvement

Run 10+: Advanced patterns
  ├─ Dimension-specific insights
  ├─ Strategy-dimension correlation
  └─ Trend analysis (improving vs declining)
```

## 📈 Expected Improvements

**Without Retro Learning:**
- Fixed 5-6 variations every run
- Static strategy ordering
- No adaptation to text patterns
- Avg improvement: +15-20%

**With Retro Learning (5+ runs):**
- Adaptive 5-8 variations (smart boost)
- Learned strategy ordering
- Pattern-aware optimization  
- Avg improvement: +20-30% ⭐
- Faster convergence to target

## 🔧 Configuration

All retrospective data is stored in:
```
vibesthinker_retro.json
```

Contents:
- `run_history`: All past optimizations
- `patterns`: Successful patterns discovered
- `anti_patterns`: Anti-patterns to avoid
- `strategy_performance`: Per-strategy metrics

## 💡 Best Practices

1. **Build History First**: Run 5-10 optimizations before relying on retro
2. **Check Insights**: Periodically run `advo vibe retro report`
3. **High Targets**: For 0.90+ targets, let retro boost kick in
4. **Trend Monitoring**: Watch for declining trends (signals need for strategy refresh)

## 🎯 Example Results

```bash
$ advo vibe retro stats

📊 Quick Stats
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total runs:     12
Patterns:       15
Anti-patterns:  8

🎯 Top 3 Strategies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. hybrid_balanced      Avg: 0.780 (8 runs)
2. anti_ritual          Avg: 0.742 (9 runs)
3. causality_emphasis   Avg: 0.715 (7 runs)

📈 Improvement Trend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trend:          IMPROVING
Avg Improvement: 0.082
```

## 🚦 Quick Reference

| Command | Purpose |
|---------|---------|
| `advo vibe run <file>` | Optimize with retro learning |
| `advo vibe run <file> --no-retro` | Optimize without retro |
| `advo vibe run <file> --target 0.90` | High-target optimization |
| `advo vibe retro report` | Full retrospective report |
| `advo vibe retro stats` | Quick stats |
| `advo vibe config` | Show configuration |

---

**Remember**: VibeThinker gets smarter with every run! The more you use it, the better it becomes at optimizing your text. 🧠✨
