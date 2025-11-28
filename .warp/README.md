# Warp Terminal Workflows

Warp AI-native workflows for agentic-flow project management.

## Available Workflows

### 1. Quick Wins Progress (`quick-wins.yaml`)
Track QUICK_WINS.md progress with WSJF prioritization.

**Usage in Warp:**
```bash
# From Warp Command Palette (Cmd+P), search: "Quick Wins Progress"
# Or run directly:
./scripts/show_quick_wins_progress.sh
```

**Subcommands:**
- **Link Metrics**: Link git commits to retro items, calculate Cost of Delay
- **View Metrics**: Show metrics dashboard with retro impact
- **Next Action**: Display next WSJF-prioritized HIGH priority item
- **Complete Item**: Mark item as complete (interactive)

---

### 2. Governor Monitor (`governor.yaml`)
Monitor Process Governor CPU load, WIP limits, and incidents.

**Usage in Warp:**
```bash
# From Command Palette: "Governor Monitor"
# Shows: CPU cores, load average, config, recent incidents
```

**Subcommands:**
- **View Incidents**: Show all governor incidents with JSON details
- **CPU Stats**: Detailed CPU and memory utilization
- **Test Stress**: Run governor validation stress test
- **Clear Logs**: Archive incident logs with timestamp

---

## Warp AI Integration

These workflows integrate with Warp AI for intelligent command suggestions:

```bash
# Example Warp AI prompts:
"Show me the Quick Wins progress"
"What's the CPU load on the governor?"
"Link my recent commits to retro items"
"Show governor incidents from today"
```

## Environment Variables

Set in `.warp/workflows/*.yaml` or globally in `~/.zshrc`:

```bash
export AF_CPU_HEADROOM_TARGET="0.35"  # 35% CPU idle target
export AF_MAX_WIP="10"                # Max work-in-progress
export AF_BATCH_SIZE="5"              # Batch processing size
```

## Files Created

- `.warp/workflows/quick-wins.yaml` - Progress tracking
- `.warp/workflows/governor.yaml` - Performance monitoring
- `.warp/README.md` - This file

**No new .md files in docs/** - All documentation in `.warp/` directory per constraint.

## Integration with Existing Scripts

These workflows are thin wrappers around existing scripts:
- `scripts/show_quick_wins_progress.sh`
- `scripts/link_metrics_to_retro.sh`
- `scripts/validate-governor-integration.sh`

## Next Steps

1. Open Warp terminal in project root
2. Press **Cmd+P** to open Command Palette
3. Search for "Quick Wins" or "Governor"
4. Select workflow to execute

**Tip**: Bookmark frequently used workflows in Warp for 1-click access.
