const validator = require('./index.js');

console.log('🧪 Testing evidence-validator NAPI-RS addon...\n');

// Test 1: Version
console.log('✅ Version:', validator.version());

// Test 2: Validate PDF
const testPdf = '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/EVIDENCE_BUNDLE/01_FILINGS/2025-10-20-COMPLAINT-26CV007491.pdf';
try {
  console.log('\n📄 Testing PDF validation...');
  const start = Date.now();
  const pdf = validator.validatePdf(testPdf);
  const elapsed = Date.now() - start;
  console.log('  Path:', pdf.path);
  console.log('  Pages:', pdf.pageCount);
  console.log('  Text preview:', pdf.textPreview.substring(0, 100) + '...');
  console.log('  SHA-256:', pdf.sha256);
  console.log('  File size:', (pdf.fileSize / 1024).toFixed(2), 'KB');
  console.log(`  ⚡ Validated in ${elapsed}ms`);
} catch (err) {
  console.error('  ❌ Error:', err.message);
}

// Test 3: Validate Photo EXIF (if exists)
const testPhoto = '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/EVIDENCE_BUNDLE/03_HABITABILITY_PHOTOS/mold_1.jpg';
try {
  const fs = require('fs');
  if (fs.existsSync(testPhoto)) {
    console.log('\n📸 Testing photo EXIF extraction...');
    const start = Date.now();
    const photo = validator.validatePhotoExif(testPhoto);
    const elapsed = Date.now() - start;
    console.log('  Path:', photo.path);
    console.log('  Capture date:', photo.captureDate || 'N/A');
    console.log('  Camera:', photo.cameraModel || 'N/A');
    console.log('  SHA-256:', photo.sha256);
    console.log('  File size:', (photo.fileSize / 1024).toFixed(2), 'KB');
    console.log(`  ⚡ Validated in ${elapsed}ms`);
  } else {
    console.log('\n⚠️ Test photo not found at', testPhoto);
  }
} catch (err) {
  console.error('  ❌ Error:', err.message);
}

// Test 4: Batch validation (if photos exist)
const photosDir = '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/EVIDENCE_BUNDLE/03_HABITABILITY_PHOTOS';
try {
  const fs = require('fs');
  const path = require('path');
  if (fs.existsSync(photosDir)) {
    const photos = fs.readdirSync(photosDir)
      .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      .map(f => path.join(photosDir, f))
      .slice(0, 10); // Test first 10
    
    if (photos.length > 0) {
      console.log(`\n📸 Testing batch validation on ${photos.length} photos...`);
      const start = Date.now();
      const results = validator.batchValidatePhotos(photos);
      const elapsed = Date.now() - start;
      console.log(`  ✅ Validated ${results.length} photos`);
      console.log(`  ⚡ Total time: ${elapsed}ms (${(elapsed / results.length).toFixed(1)}ms per photo)`);
      
      // Show first result
      if (results.length > 0) {
        const first = results[0];
        console.log('  First result:');
        console.log('    Path:', path.basename(first.path));
        console.log('    Date:', first.captureDate || 'N/A');
        console.log('    Camera:', first.cameraModel || 'N/A');
      }
    }
  }
} catch (err) {
  console.error('  ❌ Error:', err.message);
}

console.log('\n✅ Tests complete!');
