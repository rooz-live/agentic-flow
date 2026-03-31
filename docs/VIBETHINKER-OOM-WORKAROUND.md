# VibeThinker OOM Workaround

If VibeThinker crashes with an out-of-memory error (exit code 240) during MGPO iterations, apply the following workaround. **No code fix is required.**

### Workaround Command
Run the MGPO generation with a smaller model size and limited iterations:

```bash
MGPO_MODEL_SIZE=small bash vibethinker-mgpo.sh --iterations 1
```

This ensures the process fits into memory constraints while still refining trial arguments.
