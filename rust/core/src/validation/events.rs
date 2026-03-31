//! Domain Events - Things that happened

use super::aggregates::ValidationReport;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Event emitted when validation completes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationCompleted {
    pub event_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub report_id: Uuid,
    pub verdict: String,
    pub pass_count: usize,
    pub fail_count: usize,
}

impl ValidationCompleted {
    pub fn from_report(report: &ValidationReport) -> Self {
        Self {
            event_id: Uuid::new_v4(),
            timestamp: Utc::now(),
            report_id: report.id,
            verdict: report.overall_verdict.to_string(),
            pass_count: report.pass_count,
            fail_count: report.fail_count,
        }
    }
}
