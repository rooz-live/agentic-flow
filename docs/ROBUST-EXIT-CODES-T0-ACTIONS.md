# Robust Exit Codes → T0 Actions

Exit code to recommended action mapping. Aligned with `explain-exit-code.sh` and `exit-codes-robust.sh`.

## Zone Summary

| Zone | Range | Meaning | Next Action |
|------|-------|---------|-------------|
| Success | 0-9 | Task completed | Proceed to next step |
| Client | 10-49 | User input/config | Fix user input or configuration |
| Dependency | 50-99 | External services | Install missing dependencies |
| Validation | 100-149 | Data/format | Fix data validation issues |
| Business | 150-199 | Domain logic | Review business logic constraints |
| Infrastructure | 200-249 | System resources | Fix system resource or permission issues |
| Critical | 250-255 | Unrecoverable | CRITICAL - Manual intervention required |

## Specific Codes → Actions

### Success (0-9)
| Code | Meaning | Action |
|------|---------|--------|
| 0 | All checks passed | Proceed to next step |
| 1 | Success with warnings | Proceed; review recommended |
| 2 | Minor warnings | Proceed; non-blocking issues present |

### Client (10-49)
| Code | Meaning | Action |
|------|---------|--------|
| 10 | Invalid args | Check command syntax, file paths |
| 11 | File not found | Verify path, permissions |
| 20 | Parse error | Fix malformed content |
| 21 | Missing required field | Add required headers/fields |

### Dependency (50-99)
| Code | Meaning | Action |
|------|---------|--------|
| 50 | Network unavailable | Check connectivity |

| 60 | Tool missing | Install required command |
| 61 | Module missing | Install required library |

### Validation (100-149)
| Code | Meaning | Action |
|------|---------|--------|
| 100 | Schema validation failed | Fix data format |
| 110 | Date in past | Update to future date |
| 111 | Placeholder detected | Replace {{VARIABLE}} |
| 120 | Duplicate detected | Check for existing item |
| 130 | Address mismatch | Verify start/end addresses |

### Business (150-199)
| Code | Meaning | Action |
|------|---------|--------|
| 150 | Legal citation malformed | Fix N.C.G.S. § spacing |
| 151 | Purpose validation failed | Review WSJF gate |
| 152 | Habitability evidence failed | Complete evidence |
| 153 | Filing execution failed | Check filing process |
| 156 | ROAM stale | Update ROAM_TRACKER.yaml |
| 160 | WSJF score low | Raise priority or threshold |
| 170 | ADR compliance | Add ADR frontmatter |

### Tunnel (211-221)
| Code | Meaning | Action |
|------|---------|--------|
| 211 | Port in use | `lsof -ti:8080 \| xargs kill -9` |
| 212 | HTTP server failed | Check /tmp/http-server.log |
| 213 | Tailscale failed | `tailscale status` |
| 214 | ngrok failed | `ngrok config check` |
| 215 | Cloudflare failed | `cloudflared tunnel login` |
| 216 | localtunnel failed | Check npx |
| 217 | All providers failed | Run `./debug-exit-codes.sh diag` |
| 218 | URL expired | Update bookmark; use ngrok/Tailscale |
| 219 | Error 1033 | Restart cascade; check HTTP server |
| 221 | Health check failed | Increase timeout; check network |

### Infrastructure (200-249)
| Code | Meaning | Action |
|------|---------|--------|
| 200 | Disk full | Free space |
| 210 | Permission denied | Fix file/folder permissions |
| 220 | Daemon crashed | Restart background process |
| 230 | Database locked | Check SQLite locks |

### Critical (250-255)
| Code | Meaning | Action |
|------|---------|--------|
| 250 | Data corruption | Check checksums; restore backup |
| 255 | Panic | Manual intervention; check logs |

## Quick Reference

```bash
# Explain any exit code
bash _SYSTEM/_AUTOMATION/explain-exit-code.sh 111

# Suggest only
bash _SYSTEM/_AUTOMATION/explain-exit-code.sh --suggest 111

# JSON output
bash _SYSTEM/_AUTOMATION/explain-exit-code.sh --json 111

# Debug tunnel failure
bash _SYSTEM/_AUTOMATION/debug-exit-codes.sh 217 tunnel-failure

# System diagnostic
bash _SYSTEM/_AUTOMATION/debug-exit-codes.sh diag
```
