# ADR-004: NAPI-RS Rust Bindings for Evidence Validation

**Status**: Accepted  
**Date**: 2026-02-24  
**Context**: Phase 4 Implementation  

---

## Context

The Python-based PDF classifier (`pdf_classifier_multi_provider.py`) is slow for batch processing:
- **Current**: 1-3 seconds per PDF (Python `textutil`/`pdftotext`)
- **Target**: <100ms per PDF (10-30x speedup)
- **Use Case**: Validate 100+ trial photos, 50+ PDFs in evidence bundle

Trial #1 (6 days away) requires EXIF timestamp validation for 40+ mold photos to prove 22-month pattern.

### Requirements

1. **EXIF Extraction**: Extract photo capture date/time with <10ms latency
2. **PDF Validation**: Verify PDF integrity + extract text with <100ms latency
3. **Cryptographic Integrity**: SHA-256 hash for chain of custody
4. **Node.js Integration**: Callable from JavaScript/TypeScript
5. **Error Handling**: Graceful fallback to Python if Rust fails

---

## Decision

Implement **NAPI-RS Rust bindings** with:

1. **Rust Core**:
```rust
// rust/evidence-validator/src/lib.rs
use napi::bindgen_prelude::*;
use kamadak_exif::Reader;
use lopdf::Document;

#[napi]
pub fn validate_photo_exif(path: String) -> Result<PhotoMetadata> {
    let file = std::fs::File::open(&path)?;
    let mut buf_reader = std::io::BufReader::new(&file);
    let exif = Reader::new().read_from_container(&mut buf_reader)?;
    
    // Extract DateTime
    let datetime = exif.get_field(Tag::DateTime, In::PRIMARY)
        .and_then(|f| f.display_value().to_string());
    
    Ok(PhotoMetadata {
        path,
        capture_date: datetime,
        camera_model: extract_camera_model(&exif),
        sha256: hash_file(&path)?,
    })
}

#[napi]
pub fn validate_pdf(path: String) -> Result<PdfMetadata> {
    let doc = Document::load(&path)?;
    
    Ok(PdfMetadata {
        path,
        page_count: doc.get_pages().len(),
        text: extract_first_page_text(&doc)?,
        sha256: hash_file(&path)?,
    })
}
```

2. **Node.js Wrapper**:
```typescript
// src/evidence-validator.ts
import { validatePhotoExif, validatePdf } from '@ruvector/evidence-validator';

export async function validateEvidence(path: string): Promise<Evidence> {
    if (path.endsWith('.jpg') || path.endsWith('.heic')) {
        return validatePhotoExif(path);
    } else if (path.endsWith('.pdf')) {
        return validatePdf(path);
    }
    throw new Error(`Unsupported file type: ${path}`);
}
```

3. **Python Fallback**:
```python
# scripts/evidence_validator.py
def validate_evidence(path: str) -> Dict[str, Any]:
    try:
        # Try Rust binding first
        from evidence_validator import validate_photo_exif
        return validate_photo_exif(path)
    except ImportError:
        # Fall back to Python
        return validate_with_pillow(path)
```

---

## Rationale

### Why NAPI-RS Over Native Node.js Addons?

**Accepted**: NAPI-RS (Rust + N-API)
- Type-safe bindings (no manual FFI)
- Memory safety guaranteed by Rust
- Cross-platform (macOS/Linux/Windows)
- npm package distribution (`npm install @ruvector/evidence-validator`)

**Rejected**: C++ Node.js addon (node-gyp)
- Manual memory management (segfaults risk)
- Platform-specific compilation issues
- Harder to maintain

### Why Not Pure Python?

**Performance Gap**:
- Python PIL: 500-1000ms per EXIF extraction
- Rust kamadak-exif: 5-10ms per EXIF extraction
- **50-100x speedup**

**Trial Context**:
- 40+ mold photos need EXIF timestamps
- Python: 40 photos × 500ms = **20 seconds**
- Rust: 40 photos × 10ms = **0.4 seconds**

### Why Not Pure Node.js?

**Rejected**: JavaScript libraries (`exif-parser`, `pdf-parse`)
- Still slower than Rust (10-20x slower)
- Limited EXIF field support
- No cryptographic hashing built-in

---

## Consequences

### Positive

1. **10-100x Speedup**: Batch evidence validation completes in seconds
2. **Memory Safety**: Rust prevents buffer overflows (critical for evidence integrity)
3. **npm Distribution**: Easy installation (`npm install @ruvector/evidence-validator`)
4. **Cross-Platform**: Works on macOS/Linux/Windows out of box

### Negative

1. **Build Complexity**: Requires Rust toolchain (cargo, rustc)
2. **Binary Size**: ~2-5MB native addon (vs <100KB JavaScript)
3. **Debugging**: Harder to debug Rust panics from Node.js
4. **Platform Testing**: Need to test on all 3 platforms

### Mitigations

1. **Cargo Workspace**:
```toml
[workspace]
members = ["crates/evidence-validator"]

[package]
name = "evidence-validator"
version = "0.1.0"

[dependencies]
napi = "2.13"
napi-derive = "2.13"
kamadak-exif = "0.5"
lopdf = "0.32"
sha2 = "0.10"
```

2. **Python Fallback**:
```python
try:
    from evidence_validator import validate_photo_exif
    RUST_AVAILABLE = True
except ImportError:
    RUST_AVAILABLE = False
    # Use PIL fallback
```

3. **Pre-built Binaries**: Publish to npm with pre-built binaries for common platforms

---

## Implementation Checklist

- [ ] Create Rust crate (`cargo new --lib evidence-validator`)
- [ ] Add NAPI-RS dependencies
- [ ] Implement `validate_photo_exif()`
- [ ] Implement `validate_pdf()`
- [ ] Add SHA-256 hashing
- [ ] Create TypeScript bindings
- [ ] Add Python fallback
- [ ] Write unit tests (Rust)
- [ ] Write integration tests (Node.js → Rust)
- [ ] Publish to npm (@ruvector/evidence-validator)

---

## Alternatives Considered

### Alternative 1: WebAssembly (WASM)

**Rejected**:
- No file system access (WASI needed)
- Slower than native (20-30% overhead)
- Still experimental for EXIF/PDF parsing

### Alternative 2: FFI (Foreign Function Interface)

**Rejected**:
- Manual memory management (unsafe)
- Platform-specific compilation
- No type safety

### Alternative 3: Subprocess (spawn Rust CLI)

**Rejected**:
- High latency (spawn process per file)
- IPC overhead (JSON serialization)
- Resource wastage (process creation)

---

## Verification (TDD/VDD)

### Unit Tests (Rust)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_photo_exif() {
        let result = validate_photo_exif("tests/fixtures/mold_2024_06.jpg".to_string());
        assert!(result.is_ok());
        let metadata = result.unwrap();
        assert_eq!(metadata.capture_date, Some("2024:06:15 14:30:00".to_string()));
    }

    #[test]
    fn test_validate_pdf() {
        let result = validate_pdf("tests/fixtures/order.pdf".to_string());
        assert!(result.is_ok());
        let metadata = result.unwrap();
        assert!(metadata.page_count > 0);
    }
}
```

### Integration Tests (Node.js)

```typescript
import { validateEvidence } from '@ruvector/evidence-validator';

test('validates photo EXIF', async () => {
    const result = await validateEvidence('tests/fixtures/mold_2024_06.jpg');
    expect(result.captureDate).toBe('2024:06:15 14:30:00');
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
});

test('validates PDF', async () => {
    const result = await validateEvidence('tests/fixtures/order.pdf');
    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.text).toContain('ORDERED');
});
```

### VDD Acceptance Criteria

| Criterion | Target | Status |
|-----------|--------|--------|
| EXIF extraction | <10ms | ⏳ |
| PDF validation | <100ms | ⏳ |
| Batch 40 photos | <1s | ⏳ |
| Memory usage | <50MB | ⏳ |
| Cross-platform | macOS/Linux/Win | ⏳ |

---

## Performance Targets

| Operation | Python (Current) | Rust (Target) | Speedup |
|-----------|------------------|---------------|---------|
| EXIF extraction | 500ms | 10ms | **50x** |
| PDF text extract | 1000ms | 100ms | **10x** |
| SHA-256 hash | 100ms | 5ms | **20x** |
| Batch 40 photos | 20s | 0.4s | **50x** |

---

## Security Considerations

1. **Memory Safety**: Rust prevents buffer overflows (C/C++ vulnerabilities eliminated)
2. **Path Traversal**: Validate file paths before opening
3. **File Size Limits**: Reject files >100MB (DOS prevention)
4. **EXIF Injection**: Sanitize EXIF strings (prevent XSS in web displays)

---

## References

- NAPI-RS: https://napi.rs/
- kamadak-exif: https://crates.io/crates/kamadak-exif
- lopdf: https://crates.io/crates/lopdf
- Node-API: https://nodejs.org/api/n-api.html

---

**Decision Maker**: Shahrooz Bhopti (Pro Se Litigant)  
**Stakeholders**: Trial #1 (40+ mold photos need EXIF validation)  
**Co-Authored-By**: Oz <oz-agent@warp.dev>
