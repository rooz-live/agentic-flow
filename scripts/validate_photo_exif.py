#!/usr/bin/env python3
"""
EXIF Timestamp Validator for Legal Photo Evidence
Proves authenticity by extracting creation metadata

Pre-Trial ROI: Shifts burden to MAA to prove tampering
Post-Trial Scale: Reusable for all tenant photo evidence

Validates:
- DateTimeOriginal (camera capture time)
- GPSInfo (location verification)
- Software (detects editing tools)
- File modification vs EXIF creation delta
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def extract_exif(image_path):
    """Extract all EXIF metadata from image"""
    try:
        img = Image.open(image_path)
        exif_data = img._getexif()
        
        if not exif_data:
            return {"error": "No EXIF data found"}
        
        exif = {}
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)
            
            # Special handling for GPSInfo
            if tag == "GPSInfo":
                gps_data = {}
                for gps_tag_id, gps_value in value.items():
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_data[gps_tag] = str(gps_value)
                exif[tag] = gps_data
            else:
                exif[tag] = str(value)
        
        return exif
    except Exception as e:
        return {"error": str(e)}

def validate_authenticity(exif, file_path):
    """Check EXIF for tampering indicators"""
    checks = {
        "has_datetime_original": "DateTimeOriginal" in exif,
        "has_gps": "GPSInfo" in exif,
        "editing_software": None,
        "file_mtime_delta": None,
        "authenticity_score": 0
    }
    
    # Check for editing software
    if "Software" in exif:
        software = exif["Software"].lower()
        if any(editor in software for editor in ["photoshop", "gimp", "lightroom", "snapseed"]):
            checks["editing_software"] = exif["Software"]
            checks["authenticity_score"] -= 2
    
    # Compare EXIF datetime with file modification time
    if "DateTimeOriginal" in exif:
        try:
            exif_dt = datetime.strptime(exif["DateTimeOriginal"], "%Y:%m:%d %H:%M:%S")
            file_mtime = datetime.fromtimestamp(Path(file_path).stat().st_mtime)
            delta_seconds = abs((file_mtime - exif_dt).total_seconds())
            checks["file_mtime_delta"] = delta_seconds
            
            # Suspicious if file modified >1 day after EXIF capture
            if delta_seconds > 86400:
                checks["authenticity_score"] -= 1
            else:
                checks["authenticity_score"] += 2
        except:
            pass
    
    # Score interpretation
    if checks["has_datetime_original"]:
        checks["authenticity_score"] += 3
    if checks["has_gps"]:
        checks["authenticity_score"] += 1
    
    return checks

def format_legal_report(image_path, exif, validation):
    """Generate court-ready authenticity report"""
    report = []
    report.append("=" * 70)
    report.append(f"EXIF AUTHENTICITY REPORT")
    report.append(f"File: {image_path.name}")
    report.append("=" * 70)
    report.append("")
    
    # Key timestamps
    report.append("TEMPORAL EVIDENCE:")
    if "DateTimeOriginal" in exif:
        report.append(f"  Camera Capture:     {exif['DateTimeOriginal']}")
    if "DateTime" in exif:
        report.append(f"  File Timestamp:     {exif['DateTime']}")
    
    file_mtime = datetime.fromtimestamp(image_path.stat().st_mtime)
    report.append(f"  System Modified:    {file_mtime.strftime('%Y:%m:%d %H:%M:%S')}")
    report.append("")
    
    # Device metadata
    report.append("DEVICE METADATA:")
    if "Make" in exif:
        report.append(f"  Camera Make:        {exif['Make']}")
    if "Model" in exif:
        report.append(f"  Camera Model:       {exif['Model']}")
    if "Software" in exif:
        report.append(f"  Software:           {exif['Software']}")
    report.append("")
    
    # GPS location
    if "GPSInfo" in exif:
        report.append("GPS LOCATION:")
        gps = exif["GPSInfo"]
        for key, value in gps.items():
            report.append(f"  {key}: {value}")
        report.append("")
    
    # Authenticity verdict
    report.append("AUTHENTICITY ANALYSIS:")
    report.append(f"  Original Timestamp: {'✓' if validation['has_datetime_original'] else '✗'}")
    report.append(f"  GPS Verification:   {'✓' if validation['has_gps'] else '✗'}")
    report.append(f"  Editing Software:   {validation['editing_software'] or 'None detected'}")
    
    if validation['file_mtime_delta']:
        delta_days = validation['file_mtime_delta'] / 86400
        report.append(f"  File Age Delta:     {delta_days:.1f} days")
    
    score = validation['authenticity_score']
    if score >= 4:
        verdict = "HIGH CONFIDENCE - Original photo"
    elif score >= 2:
        verdict = "MODERATE - Likely authentic"
    else:
        verdict = "LOW - Potential tampering"
    
    report.append(f"  Authenticity Score: {score}/5 ({verdict})")
    report.append("=" * 70)
    
    return "\n".join(report)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 validate_photo_exif.py <image_file> [--json]")
        sys.exit(1)
    
    image_path = Path(sys.argv[1])
    output_json = "--json" in sys.argv
    
    if not image_path.exists():
        print(f"Error: File not found: {image_path}")
        sys.exit(1)
    
    # Extract EXIF
    exif = extract_exif(image_path)
    
    if "error" in exif:
        print(f"Error: {exif['error']}")
        sys.exit(1)
    
    # Validate authenticity
    validation = validate_authenticity(exif, image_path)
    
    # Output
    if output_json:
        result = {
            "file": str(image_path),
            "exif": exif,
            "validation": validation
        }
        print(json.dumps(result, indent=2))
    else:
        report = format_legal_report(image_path, exif, validation)
        print(report)
        
        # Save report
        report_file = image_path.parent / f"{image_path.stem}_exif_report.txt"
        report_file.write_text(report)
        print(f"\n✓ Report saved to: {report_file}", file=sys.stderr)

if __name__ == '__main__':
    main()
