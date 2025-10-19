use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorConfig {
    /// Vector dimension
    pub dimension: usize,

    /// Storage mode (in-memory or persistent)
    pub storage_mode: StorageMode,

    /// Enable WAL mode for better write concurrency
    pub wal_mode: bool,

    /// Memory-mapped I/O size (bytes)
    pub mmap_size: Option<usize>,

    /// Page cache size (pages)
    pub cache_size: i32,

    /// Batch insert size for optimization
    pub batch_size: usize,

    /// Enable SIMD optimization
    pub enable_simd: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum StorageMode {
    InMemory,
    Persistent,
}

impl Default for VectorConfig {
    fn default() -> Self {
        Self {
            dimension: 1536, // Default OpenAI embedding size
            storage_mode: StorageMode::InMemory,
            wal_mode: true,
            mmap_size: Some(64 * 1024 * 1024), // 64MB
            cache_size: -2000, // 2MB
            batch_size: 1000,
            enable_simd: cfg!(any(target_arch = "x86_64", target_arch = "aarch64")),
        }
    }
}

impl VectorConfig {
    pub fn new(dimension: usize) -> Self {
        Self {
            dimension,
            ..Default::default()
        }
    }

    pub fn with_storage_mode(mut self, mode: StorageMode) -> Self {
        self.storage_mode = mode;
        self
    }

    pub fn with_wal(mut self, enabled: bool) -> Self {
        self.wal_mode = enabled;
        self
    }

    pub fn with_cache_size(mut self, size: i32) -> Self {
        self.cache_size = size;
        self
    }

    pub fn with_batch_size(mut self, size: usize) -> Self {
        self.batch_size = size;
        self
    }

    pub fn with_simd(mut self, enabled: bool) -> Self {
        self.enable_simd = enabled;
        self
    }
}
