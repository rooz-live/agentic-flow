# Fix: Restore `ay yo i` Interactive Dashboard Mode

## Problem
Running `ay yo i` was failing with:
```
Usage: af yolife {ts-refresh|inventory|ssh-probe|ssm}
```

The interactive Python dashboard (`scripts/af_dashboard.py`) was not launching.

## Root Cause
The `ay_yo` bash function in `~/.bashrc` was routing **all** arguments to `af yolife`, bypassing the `scripts/ay-yo` script which contains the interactive mode logic.

**Broken flow:**
```
ay yo i → ay_yo() → af yolife i → ERROR (unknown subcommand)
```

**Expected flow:**
```
ay yo i → ay_yo() → scripts/ay-yo i → python3 scripts/af_dashboard.py --watch
```

## Solution
A patch script was created to fix the `ay_yo` function routing.

### Apply the Fix

1. **Run the patch script:**
   ```bash
   bash patches/fix-ay-yo-interactive.sh
   ```

2. **Reload your shell:**
   ```bash
   source ~/.bashrc
   ```

3. **Test the fix:**
   ```bash
   ay yo i
   ```
   
   This should now launch the interactive Python dashboard with real-time metrics.

### What the Patch Does

The updated `ay_yo` function now:
1. ✅ Checks for interactive mode **first** (`i`, `interactive`, or no args)
2. ✅ Routes interactive requests to `scripts/ay-yo`
3. ✅ Routes other commands to `af yolife` (inventory, ssh-probe, ssm, etc.)
4. ✅ Sets WSJF preset to P2 for yolife context

### Command Behavior After Fix

| Command | Behavior |
|---------|----------|
| `ay yo` | Runs learning cycles (default 10 iterations) |
| `ay yo i` | Launches interactive Python dashboard |
| `ay yo interactive` | Launches interactive Python dashboard |
| `ay yo inventory` | Runs SSH inventory probe |
| `ay yo ssh-probe` | Runs SSH probe for specific host |
| `ay yo ssm` | Launches AWS SSM session |

## Rollback

If you need to restore the original configuration:

```bash
cp ~/.bashrc.backup-* ~/.bashrc
source ~/.bashrc
```

Backups are timestamped with format: `~/.bashrc.backup-YYYYMMDD-HHMMSS`

## Testing

### Test Interactive Mode
```bash
ay yo i
```

Expected output:
- Dashboard header with timestamp
- Kanban board section
- Pattern metrics
- Governor incidents
- Real-time updates

### Test Yolife Commands
```bash
ay yo inventory
```

Expected output:
- SSH probe to configured hosts
- System information
- Connection status

## Alternative: Direct Script Access

If you prefer not to patch your shell, you can always call the script directly:

```bash
./scripts/ay-yo i
```

Or the dashboard directly:

```bash
python3 scripts/af_dashboard.py --watch
```

## Related Files

- **Patch script:** `patches/fix-ay-yo-interactive.sh`
- **Interactive script:** `scripts/ay-yo`
- **Dashboard:** `scripts/af_dashboard.py`
- **Yolife commands:** `scripts/af` (cmd_yolife function)

## See Also

- [scripts/ay-yo usage documentation](../scripts/ay-yo) - Lines 40-64
- [YoLifeCockpit React component](../src/components/yolife/YoLifeCockpit.tsx)
- [Dashboard server](../scripts/monitoring/dashboard_server.js)
