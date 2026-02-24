export interface PhotoMetadata {
  path: string;
  captureDate: string | null;
  cameraModel: string | null;
  sha256: string;
  fileSize: number;
}

export interface PdfMetadata {
  path: string;
  pageCount: number;
  textPreview: string;
  sha256: string;
  fileSize: number;
}

/**
 * Validate photo EXIF metadata
 * @returns PhotoMetadata with capture_date, camera_model, SHA-256 hash
 * @throws Error if file not found or not a valid image
 */
export function validatePhotoExif(path: string): PhotoMetadata;

/**
 * Validate PDF metadata
 * @returns PdfMetadata with page_count, text preview, SHA-256 hash
 * @throws Error if file not found or not a valid PDF
 */
export function validatePdf(path: string): PdfMetadata;

/**
 * Batch validate photos in parallel (10-100x faster than Python)
 * @param paths Array of photo file paths
 * @returns Array of PhotoMetadata (skips invalid files)
 */
export function batchValidatePhotos(paths: string[]): PhotoMetadata[];

/**
 * Get evidence-validator version
 */
export function version(): string;
