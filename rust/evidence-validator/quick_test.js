const validator = require('./index.js');

console.log('🧪 Quick NAPI-RS test\n');
console.log('Version:', validator.version());

const testPdf = '/Users/shahroozbhopti/Downloads/wage transcript and monetary determination_ncui550-1.pdf';
console.log('\n📄 Testing PDF validation...');
const start = Date.now();
const pdf = validator.validatePdf(testPdf);
const elapsed = Date.now() - start;

console.log('✅ PDF validated in', elapsed, 'ms');
console.log('  Pages:', pdf.pageCount);
console.log('  SHA-256:', pdf.sha256);
console.log('  Size:', (pdf.fileSize / 1024).toFixed(2), 'KB');
console.log('  Text preview:', pdf.textPreview.substring(0, 150) + '...');
