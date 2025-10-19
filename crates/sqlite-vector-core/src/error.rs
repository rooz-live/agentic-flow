use thiserror::Error;

#[derive(Error, Debug)]
pub enum VectorError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("Invalid vector dimension: expected {expected}, got {actual}")]
    DimensionMismatch { expected: usize, actual: usize },

    #[error("Invalid vector data: {0}")]
    InvalidVector(String),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Index error: {0}")]
    Index(String),
}

pub type Result<T> = std::result::Result<T, VectorError>;
