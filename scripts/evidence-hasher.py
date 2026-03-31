#!/usr/bin/env python3
"""
Evidence Hasher - File hashing and integrity verification
Generates EVIDENCE-HASH-MANIFEST-########.txt for legal document chain of custody
"""

import hashlib
import os
import sys
import json
from datetime import datetime
from pathlib import Path

def calculate_file_hash(file_path, algorithm='sha256'):
    """Calculate hash of a file using specified algorithm."""
    hash_obj = hashlib.new(algorithm)
    
    try:
        with open(file_path, 'rb') as f:
            # Read file in chunks to handle large files
            for chunk in iter(lambda: f.read(4096), b""):
                hash_obj.update(chunk)
        return hash_obj.hexdigest()
    except Exception as e:
        print(f"Error hashing {file_path}: {e}", file=sys.stderr)
        return None

def get_file_metadata(file_path):
    """Get file metadata for evidence tracking."""
    try:
        stat = os.stat(file_path)
        return {
            'size': stat.st_size,
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
            'permissions': oct(stat.st_mode)[-3:]
        }
    except Exception as e:
        print(f"Error getting metadata for {file_path}: {e}", file=sys.stderr)
        return {}

def generate_evidence_manifest(files, output_dir=None):
    """Generate evidence hash manifest for legal chain of custody."""
    if output_dir is None:
        output_dir = os.getcwd()
    
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    manifest_filename = f"EVIDENCE-HASH-MANIFEST-{timestamp}.txt"
    manifest_path = os.path.join(output_dir, manifest_filename)
    
    evidence_data = {
        'manifest_version': '1.0',
        'generated': datetime.now().isoformat(),
        'generator': 'evidence-hasher.py',
        'case_reference': 'LEGAL-EVIDENCE-CHAIN',
        'files': []
    }
    
    print(f"Generating evidence manifest: {manifest_filename}")
    print("=" * 60)
    
    with open(manifest_path, 'w') as manifest_file:
        # Write header
        manifest_file.write(f"EVIDENCE HASH MANIFEST\n")
        manifest_file.write(f"Generated: {evidence_data['generated']}\n")
        manifest_file.write(f"Case Reference: {evidence_data['case_reference']}\n")
        manifest_file.write("=" * 60 + "\n\n")
        
        for file_path in files:
            if not os.path.exists(file_path):
                print(f"Warning: File not found: {file_path}")
                continue
            
            print(f"Processing: {os.path.basename(file_path)}")
            
            # Calculate hashes
            sha256_hash = calculate_file_hash(file_path, 'sha256')
            md5_hash = calculate_file_hash(file_path, 'md5')
            
            if sha256_hash is None or md5_hash is None:
                continue
            
            # Get metadata
            metadata = get_file_metadata(file_path)
            
            # Create file record
            file_record = {
                'filename': os.path.basename(file_path),
                'full_path': os.path.abspath(file_path),
                'sha256': sha256_hash,
                'md5': md5_hash,
                'metadata': metadata
            }
            
            evidence_data['files'].append(file_record)
            
            # Write to manifest file
            manifest_file.write(f"File: {file_record['filename']}\n")
            manifest_file.write(f"Path: {file_record['full_path']}\n")
            manifest_file.write(f"SHA256: {sha256_hash}\n")
            manifest_file.write(f"MD5: {md5_hash}\n")
            manifest_file.write(f"Size: {metadata.get('size', 'unknown')} bytes\n")
            manifest_file.write(f"Modified: {metadata.get('modified', 'unknown')}\n")
            manifest_file.write(f"Created: {metadata.get('created', 'unknown')}\n")
            manifest_file.write("-" * 40 + "\n\n")
            
            print(f"  SHA256: {sha256_hash}")
            print(f"  MD5: {md5_hash}")
            print(f"  Size: {metadata.get('size', 'unknown')} bytes")
    
    # Also create JSON version for programmatic access
    json_manifest_path = manifest_path.replace('.txt', '.json')
    with open(json_manifest_path, 'w') as json_file:
        json.dump(evidence_data, json_file, indent=2)
    
    print("=" * 60)
    print(f"Evidence manifest created: {manifest_path}")
    print(f"JSON manifest created: {json_manifest_path}")
    print(f"Total files processed: {len(evidence_data['files'])}")
    
    return manifest_path, json_manifest_path

def verify_evidence_integrity(manifest_path):
    """Verify file integrity against existing manifest."""
    try:
        with open(manifest_path.replace('.txt', '.json'), 'r') as f:
            manifest_data = json.load(f)
    except FileNotFoundError:
        print(f"Manifest not found: {manifest_path}")
        return False
    
    print(f"Verifying evidence integrity from: {os.path.basename(manifest_path)}")
    print("=" * 60)
    
    all_verified = True
    
    for file_record in manifest_data['files']:
        file_path = file_record['full_path']
        expected_sha256 = file_record['sha256']
        
        if not os.path.exists(file_path):
            print(f"❌ MISSING: {file_record['filename']}")
            all_verified = False
            continue
        
        current_sha256 = calculate_file_hash(file_path, 'sha256')
        
        if current_sha256 == expected_sha256:
            print(f"✅ VERIFIED: {file_record['filename']}")
        else:
            print(f"❌ CORRUPTED: {file_record['filename']}")
            print(f"   Expected: {expected_sha256}")
            print(f"   Current:  {current_sha256}")
            all_verified = False
    
    print("=" * 60)
    if all_verified:
        print("✅ All evidence files verified successfully")
    else:
        print("❌ Evidence integrity verification FAILED")
    
    return all_verified

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Generate manifest: python3 evidence-hasher.py <file1> [file2] ...")
        print("  Verify integrity:  python3 evidence-hasher.py --verify <manifest.txt>")
        print("  Hash single file:  python3 evidence-hasher.py --hash <file>")
        sys.exit(1)
    
    if sys.argv[1] == '--verify':
        if len(sys.argv) != 3:
            print("Usage: python3 evidence-hasher.py --verify <manifest.txt>")
            sys.exit(1)
        
        manifest_path = sys.argv[2]
        success = verify_evidence_integrity(manifest_path)
        sys.exit(0 if success else 1)
    
    elif sys.argv[1] == '--hash':
        if len(sys.argv) != 3:
            print("Usage: python3 evidence-hasher.py --hash <file>")
            sys.exit(1)
        
        file_path = sys.argv[2]
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            sys.exit(1)
        
        sha256_hash = calculate_file_hash(file_path, 'sha256')
        print(f"{sha256_hash}  {file_path}")
        sys.exit(0)
    
    else:
        # Generate manifest for provided files
        files = sys.argv[1:]
        
        # Filter out non-existent files
        existing_files = [f for f in files if os.path.exists(f)]
        missing_files = [f for f in files if not os.path.exists(f)]
        
        if missing_files:
            print("Warning: The following files were not found:")
            for f in missing_files:
                print(f"  {f}")
            print()
        
        if not existing_files:
            print("No valid files provided.")
            sys.exit(1)
        
        manifest_path, json_path = generate_evidence_manifest(existing_files)
        print(f"\nManifest files created:")
        print(f"  Text: {manifest_path}")
        print(f"  JSON: {json_path}")

if __name__ == '__main__':
    main()
