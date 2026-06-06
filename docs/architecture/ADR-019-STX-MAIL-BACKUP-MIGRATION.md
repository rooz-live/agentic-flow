# ADR-019: STX MailStore & Stalwart Mail Migration and Incremental Backup Strategy

## Status

Proposed (Drafted under WSJF priority)

## Context

With the decommission of AWS infrastructure, the authoritative source of truth (SoT) for mail data is the cPanel environment running on the KVM Edge (`192.168.122.237`). The objective is to establish a secure, performant, and self-hosted mail archive and MTA layer on StarlingX (STX) using Docker, Caddy, Stalwart, and Comet.

---

## 1. StarlingX (STX) Docker Compose Configuration

To run MailStore and Stalwart mail services on STX, we define a unified Docker Compose file mapping required ports and data directories.

```yaml
version: '3.8'

services:
  mailstore:
    image: mailstore/server:latest
    container_name: mailstore-server
    restart: unless-stopped
    ports:
      - "127.0.0.1:8081:80"     # HTTP Management (proxied by Caddy)
      - "4430:443"              # HTTPS administration (fallback)
    volumes:
      - mailstore_data:/var/lib/mailstore
    environment:
      - TZ=UTC

  stalwart:
    image: stalwartlabs/mail-server:latest
    container_name: stalwart-mail
    restart: unless-stopped
    hostname: mail.bhopti.com
    ports:
      - "25:25"                 # SMTP
      - "465:465"               # SMTPS
      - "587:587"               # Submission
      - "143:143"               # IMAP
      - "993:993"               # IMAPS
      - "4190:4190"             # ManageSieve
    volumes:
      - stalwart_data:/opt/stalwart-mail
    environment:
      - TZ=UTC

volumes:
  mailstore_data:
    driver: local
  stalwart_data:
    driver: local
```

---

## 2. Caddy Edge Configuration Diff

To serve the MailStore administration panel via Let's Encrypt (LE) SSL, we repoint the edge proxy rules.

```diff
# src/proxies/edge_gateway.cfg

+# 4. Mail Server Administration Portal (MailStore Archive Panel)
+mailadmin.bhopti.com {
+    # Public Let's Encrypt SSL
+    reverse_proxy 127.0.0.1:8081 {
+        header_up X-Real-IP {remote}
+        header_up X-Forwarded-Port {port}
+        header_up X-Forwarded-Proto {scheme}
+    }
+    encode gzip zstd
+    log {
+        output file /var/log/caddy/mailadmin_access.log
+    }
+}
```

---

## 3. Comet Job Scope (Incremental Offsite Backups)

To ensure zero data loss under our local/offsite backup topology:

* **Job Target**: `/home/*/mail` directory on cPanel host (`192.168.122.237`).
* **Backup Mode**: Incremental, block-level deduplicated backups.
* **Retention Policy**: Retain all historical snapshots, **no folder pruning** (preserve deleted mails in the backup vault).
* **Schedule**: Daily at `02:00 UTC`.
* **Path constraint**: All incremental paths source from `192.168.122.237:993` / cPanel local storage — never AWS.

---

## 4. Mail Migration & Ingestion Strategy

### A. IMAP Ingestion (Live Source of Truth)

MailStore will ingest mail records using SSL IMAP directly from cPanel on port `993` (`192.168.122.237:993`).

* **Domain Filtering**:
  * **Exclude**: `rooz.live` — This domain uses Google Workspace for MX and mail routing; archiving from the local cPanel IMAP would lead to stale/empty mail accounts.
  * **Include**: All other active bhopti.com subdomains and transactional mail hosts.

### B. MTA Cutover Risk Mitigation

Cutting over the MTA from cPanel Exim to Stalwart is a high blast-radius operation:

* **Step 1 (Comet & Archive Only)**: Run Comet backups and MailStore IMAP ingest in the background for 7 days to verify data completeness.
* **Step 2 (Stalwart Maturity Assessment)**: Stalwart is a modern, fast mail server in Rust, but it is **not yet production-mature** regarding edge-case milter routing, complex list managers, and multi-tenant delivery retry schedules. Thus, we run it in a "receive-only" sandbox first.
* **Step 3 (DNS & PTR cutover)**: Submit HiveVelocity ticket for IP `23.92.79.2` PTR mapping to `mail.bhopti.com` to prevent outgoing mail from being marked as spam.
* **Step 4 (Apache cleanup)**: Strip the dead Apache proxy redirection to `192.168.122.1:8081` on the cPanel server to prevent port collision with the new StarlingX services.

---

## 5. VM Audit & Decommission

Before shutting down the `intelligence-layer-decibel` VM:

1. Execute file search for any legacy mail spools (`/var/mail`, `/var/spool/mail`, `/home/*/mail`).
2. Verify that all mail configs have been backed up or consolidated into the primary cPanel instance.
3. Confirm no active user accounts route through this VM before cutting power.
