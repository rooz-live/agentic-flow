//! Repositories - Persistence abstractions

use super::aggregates::ValidationReport;
use super::ValidationResult;
use std::collections::HashMap;
use uuid::Uuid;

/// Repository for validation history (in-memory for MVP)
#[derive(Debug, Clone, Default)]
pub struct ValidationHistoryRepository {
    reports: HashMap<Uuid, ValidationReport>,
}

impl ValidationHistoryRepository {
    pub fn new() -> Self {
        Self {
            reports: HashMap::new(),
        }
    }

    pub fn save(&mut self, report: ValidationReport) -> ValidationResult<Uuid> {
        let id = report.id;
        self.reports.insert(id, report);
        Ok(id)
    }

    pub fn find_by_id(&self, id: &Uuid) -> Option<&ValidationReport> {
        self.reports.get(id)
    }

    pub fn find_by_file_path(&self, file_path: &str) -> Vec<&ValidationReport> {
        self.reports
            .values()
            .filter(|r| r.metadata.file_path == file_path)
            .collect()
    }

    pub fn count(&self) -> usize {
        self.reports.len()
    }
}
