use napi::bindgen_prelude::*;
use napi_derive::napi;
use sha2::{Sha256, Digest};
use std::fs::File;
use std::io::Read;

/// Metadata extracted from a photo file
#[napi(object)]
#[derive(Debug, Clone)]
pub struct PhotoMetadata {
    pub path: String,
    pub capture_date: Option<String>,
    pub camera_model: Option<String>,
    pub sha256: String,
    pub file_size: i64,
}

/// Metadata extracted from a PDF file
#[napi(object)]
#[derive(Debug, Clone)]
pub struct PdfMetadata {
    pub path: String,
    pub page_count: i32,
    pub text_preview: String,
    pub sha256: String,
    pub file_size: i64,
}

/// Validate photo and extract EXIF metadata
#[napi]
pub fn validate_photo_exif(path: String) -> Result<PhotoMetadata> {
    use exif::{Reader, Tag, In};
    
    let file_size = std::fs::metadata(&path)
        .map_err(|e| Error::from_reason(format!("Failed to read file: {}", e)))?
        .len() as i64;
    
    let sha256 = hash_file(&path)?;
    
    let file = File::open(&path)
        .map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;
    let mut buf_reader = std::io::BufReader::new(&file);
    
    let exif_reader = Reader::new();
    let exif = match exif_reader.read_from_container(&mut buf_reader) {
        Ok(exif) => exif,
        Err(_) => {
            return Ok(PhotoMetadata {
                path,
                capture_date: None,
                camera_model: None,
                sha256,
                file_size,
            });
        }
    };
    
    let capture_date = exif.get_field(Tag::DateTime, In::PRIMARY)
        .map(|f| f.display_value().to_string());
    
    let camera_model = exif.get_field(Tag::Model, In::PRIMARY)
        .map(|f| f.display_value().to_string());
    
    Ok(PhotoMetadata {
        path,
        capture_date,
        camera_model,
        sha256,
        file_size,
    })
}

/// Validate PDF and extract metadata
#[napi]
pub fn validate_pdf(path: String) -> Result<PdfMetadata> {
    use lopdf::Document;
    
    let file_size = std::fs::metadata(&path)
        .map_err(|e| Error::from_reason(format!("Failed to read file: {}", e)))?
        .len() as i64;
    
    let sha256 = hash_file(&path)?;
    
    let doc = Document::load(&path)
        .map_err(|e| Error::from_reason(format!("Failed to load PDF: {}", e)))?;
    
    let page_count = doc.get_pages().len() as i32;
    
    let text_preview = String::from("[Text extraction requires pdftotext]");
    
    Ok(PdfMetadata {
        path,
        page_count,
        text_preview,
        sha256,
        file_size,
    })
}

fn hash_file(path: &str) -> Result<String> {
    let mut file = File::open(path)
        .map_err(|e| Error::from_reason(format!("Failed to open file for hashing: {}", e)))?;
    
    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];
    
    loop {
        let n = file.read(&mut buffer)
            .map_err(|e| Error::from_reason(format!("Failed to read file: {}", e)))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }
    
    Ok(format!("{:x}", hasher.finalize()))
}

/// Batch validate multiple photos
#[napi]
pub fn batch_validate_photos(paths: Vec<String>) -> Result<Vec<PhotoMetadata>> {
    let mut results = Vec::new();
    
    for path in paths {
        match validate_photo_exif(path.clone()) {
            Ok(metadata) => results.push(metadata),
            Err(_) => {
                results.push(PhotoMetadata {
                    path,
                    capture_date: None,
                    camera_model: None,
                    sha256: String::from("error"),
                    file_size: 0,
                });
            }
        }
    }
    
    Ok(results)
}

#[napi]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_file() {
        use std::io::Write;
        let mut file = File::create("/tmp/test_hash.txt").unwrap();
        file.write_all(b"test content").unwrap();
        drop(file);
        
        let hash = hash_file("/tmp/test_hash.txt").unwrap();
        assert_eq!(hash.len(), 64);
        
        std::fs::remove_file("/tmp/test_hash.txt").unwrap();
    }
    
    #[test]
    fn test_version() {
        let v = version();
        assert!(!v.is_empty());
    }
}
