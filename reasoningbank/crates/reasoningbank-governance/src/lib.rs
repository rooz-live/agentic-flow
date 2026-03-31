pub use agentic_jujutsu;

use agentic_jujutsu::{JJConfig, JJWrapper};
use chrono::{SecondsFormat, Utc};
use serde::Serialize;
use std::{fs::OpenOptions, io, io::Write, path::Path};

/// Summary of a governance probe using `agentic-jujutsu`.
#[derive(Debug, Clone)]
pub struct GovernanceProbeResult {
    pub ok: bool,
    pub message: String,
}

/// Check that agentic-jujutsu is available and able to talk to jj.
///
/// This performs a very small `jj status` call using the embedded binary.
pub async fn probe_governance() -> GovernanceProbeResult {
    // Initialize wrapper with default config
    let wrapper = match JJWrapper::with_config(JJConfig::default()) {
        Ok(w) => w,
        Err(e) => {
            return GovernanceProbeResult {
                ok: false,
                message: format!("failed to init JJWrapper: {e}"),
            };
        }
    };

    // Execute a lightweight status to confirm basic functionality
    match wrapper.status().await {
        Ok(result) => {
            let first_line = result
                .stdout
                .lines()
                .next()
                .unwrap_or("jj status ok")
                .to_string();

            GovernanceProbeResult {
                ok: true,
                message: first_line,
            }
        }
        Err(e) => GovernanceProbeResult {
            ok: false,
            message: format!("jj status failed: {e}"),
        },
    }
}

/// Append a governance heartbeat to `.goalie/metrics_log.jsonl`.
///
/// This mirrors the JSONL style used by the `af` script, so federation
/// agents and dashboards can consume it alongside other metrics.
pub fn write_governance_heartbeat(
    goalie_dir: &Path,
    probe: &GovernanceProbeResult,
) -> io::Result<()> {
    std::fs::create_dir_all(goalie_dir)?;
    let path = goalie_dir.join("metrics_log.jsonl");

    #[derive(Serialize)]
    struct Heartbeat<'a> {
        timestamp: String,
        #[serde(rename = "type")]
        record_type: &'a str,
        source: &'a str,
        ok: bool,
        message: &'a str,
    }

    let ts = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    let record = Heartbeat {
        timestamp: ts,
        record_type: "governance_heartbeat",
        source: "reasoningbank-governance",
        ok: probe.ok,
        message: &probe.message,
    };

    let json = serde_json::to_string(&record)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;

    let mut file = OpenOptions::new().create(true).append(true).open(path)?;
    writeln!(file, "{json}")?;

    Ok(())
}

/// Lightweight marker that the governance crate is wired and ready.
pub fn governance_wired() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn heartbeat_writes_line() {
        let dir = std::env::temp_dir().join("rb_governance_heartbeat_test");
        std::fs::create_dir_all(&dir).unwrap();

        let probe = GovernanceProbeResult {
            ok: true,
            message: "test".into(),
        };

        write_governance_heartbeat(&dir, &probe).unwrap();

        let log_path = dir.join("metrics_log.jsonl");
        let contents = std::fs::read_to_string(log_path).unwrap();
        assert!(contents.contains("governance_heartbeat"));
    }
}
