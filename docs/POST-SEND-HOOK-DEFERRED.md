# post-send-hook.sh (deferred)

No `post-send-hook.sh` ships in this iteration. When specified, it should:

- Accept the sent `.eml` path (or stdin) and optional weight for telemetry.
- Exit `0` on idempotent success; non-zero blocks downstream only if policy requires it.
- Integrate with `EMAIL_HASH_LOG` registration after successful Mail.app send (HITL).

Track implementation under the same WSJF backlog as dashboard post-send workflow items.
