use std::path::PathBuf;

use reasoningbank_governance::{probe_governance, write_governance_heartbeat};

fn main() {
    let args: Vec<String> = std::env::args().collect();

    let mut goalie_dir: Option<PathBuf> = None;
    let mut repo_root: Option<PathBuf> = None;
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--goalie-dir" => {
                if i + 1 < args.len() {
                    goalie_dir = Some(PathBuf::from(&args[i + 1]));
                    i += 1;
                }
            }
            "--repo-root" => {
                if i + 1 < args.len() {
                    repo_root = Some(PathBuf::from(&args[i + 1]));
                    i += 1;
                }
            }
            _ => {}
        }
        i += 1;
    }

    let goalie_dir = goalie_dir.unwrap_or_else(|| PathBuf::from(".goalie"));

    if let Some(root) = repo_root {
        if let Err(e) = std::env::set_current_dir(&root) {
            eprintln!(
                "governance_probe: failed to set repo root '{}': {e}",
                root.display()
            );
        }
    }

    // Use a small Tokio runtime to run the async governance probe
    let rt = tokio::runtime::Runtime::new().expect("failed to create Tokio runtime");
    let probe = rt.block_on(probe_governance());

    if let Err(e) = write_governance_heartbeat(&goalie_dir, &probe) {
        eprintln!("governance_probe: failed to write heartbeat: {e}");
    }

    println!(
        "governance_probe: ok={} message={}",
        probe.ok,
        probe.message
    );
}
