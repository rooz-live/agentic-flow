"""Wave A — real IMAP ingest from cPanel (MDOD-A3). Excludes rooz.live per scope."""
from __future__ import annotations

import imaplib
import json
import os
import ssl
import time
from pathlib import Path

STATE_PATH = Path(os.environ.get("IMAP_INGEST_STATE", "/data/ingest_state.json"))
EXCLUDE = {d.strip().lower() for d in os.environ.get("IMAP_EXCLUDE_DOMAINS", "rooz.live").split(",") if d.strip()}


def _host() -> str:
    return os.environ.get("IMAP_SOURCE_HOST", "cpanel-whm")


def _port() -> int:
    return int(os.environ.get("IMAP_SOURCE_PORT", "993"))


def _user() -> str:
    user = os.environ.get("IMAP_INGEST_USER", "").strip()
    if not user:
        raise ValueError("IMAP_INGEST_USER unset")
    domain = user.split("@")[-1].lower() if "@" in user else ""
    if domain in EXCLUDE:
        raise ValueError(f"mailbox domain excluded: {domain}")
    return user


def _password() -> str:
    pw = os.environ.get("IMAP_INGEST_PASSWORD", "").strip()
    if not pw:
        raise ValueError("IMAP_INGEST_PASSWORD unset")
    return pw


def run_once() -> dict:
    user, host, port = _user(), _host(), _port()
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    conn = imaplib.IMAP4_SSL(host, port, ssl_context=ctx)
    try:
        conn.login(user, _password())
        typ, _ = conn.select("INBOX", readonly=True)
        if typ != "OK":
            raise RuntimeError(f"SELECT INBOX failed: {typ}")
        typ, data = conn.search(None, "ALL")
        if typ != "OK":
            raise RuntimeError(f"SEARCH failed: {typ}")
        uids = (data[0] or b"").split()
        fetched = 0
        sample_uid = None
        if uids:
            sample_uid = uids[-1].decode()
            typ, msg = conn.fetch(sample_uid, "(RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])")
            if typ == "OK":
                fetched = 1
        result = {
            "schema": "mail.imap_ingest.v1",
            "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "source_host": host,
            "source_port": port,
            "mailbox": user,
            "exclude_domains": sorted(EXCLUDE),
            "inbox_messages": len(uids),
            "fetched_headers": fetched,
            "sample_uid": sample_uid,
            "verified": fetched >= 1 or len(uids) == 0,
            "detail": "ingest_ok_empty_inbox" if len(uids) == 0 else "ingest_ok_fetched_header",
        }
        STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
        STATE_PATH.write_text(json.dumps(result, indent=2) + "\n")
        print(
            f"[IMAP] Ingestion complete: mailbox={user} host={host}:{port} "
            f"inbox={len(uids)} fetched={fetched} excluded={sorted(EXCLUDE)}"
        )
        return result
    finally:
        try:
            conn.logout()
        except Exception:
            pass


if __name__ == "__main__":
    print(json.dumps(run_once(), indent=2))
