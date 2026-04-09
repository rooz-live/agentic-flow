#!/usr/bin/env python3
"""
Enhanced Temporal Accuracy Validator
Validates day-of-week matches date in email headers

DoR: Email with Date header exists
DoD: Returns validation result with day-of-week correctness
"""

import re
import sys
import argparse
from datetime import datetime
from typing import Dict, Tuple


class TemporalAccuracyValidator:
    """Validates temporal accuracy including day-of-week"""
    
    DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    MONTHS = {
        "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
        "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
    }
    
    def __init__(self):
        self.errors = []
        self.warnings = []
    
    def validate_email_date(self, date_header: str) -> Dict:
        """
        Validate email date header for temporal accuracy
        
        Format: "Day, DD Mon YYYY HH:MM:SS TZ"
        Example: "Tue, 11 Feb 2026 21:04:00 -0500"
        """
        
        result = {
            "valid": True,
            "date_header": date_header,
            "parsed_date": None,
            "expected_day": None,
            "actual_day": None,
            "day_of_week_correct": False,
            "errors": [],
            "warnings": []
        }
        
        # Parse date header
        try:
            parsed = self._parse_date_header(date_header)
            result["parsed_date"] = parsed
        except Exception as e:
            result["valid"] = False
            result["errors"].append(f"Failed to parse date header: {e}")
            return result
        
        # Validate day-of-week
        day_validation = self._validate_day_of_week(parsed)
        result.update(day_validation)
        
        if not day_validation["day_of_week_correct"]:
            result["valid"] = False
            result["errors"].append(
                f"Day-of-week mismatch: Header says '{day_validation['actual_day']}' "
                f"but {parsed['date_str']} is a '{day_validation['expected_day']}'"
            )
        
        # Validate time is reasonable (not too far in past/future)
        time_validation = self._validate_time_range(parsed)
        if not time_validation["valid"]:
            result["warnings"].extend(time_validation["warnings"])
        
        return result
    
    def _parse_date_header(self, date_header: str) -> Dict:
        """Parse email date header into components"""
        
        # Format: "Day, DD Mon YYYY HH:MM:SS TZ"
        # Example: "Tue, 11 Feb 2026 21:04:00 -0500"
        
        pattern = r'^([A-Za-z]{3}),\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+([-+]\d{4})$'
        match = re.match(pattern, date_header.strip())
        
        if not match:
            raise ValueError(f"Invalid date header format: {date_header}")
        
        day_of_week, day, month, year, hour, minute, second, tz = match.groups()
        
        month_num = self.MONTHS.get(month)
        if not month_num:
            raise ValueError(f"Invalid month: {month}")
        
        return {
            "day_of_week": day_of_week,
            "day": int(day),
            "month": month_num,
            "year": int(year),
            "hour": int(hour),
            "minute": int(minute),
            "second": int(second),
            "timezone": tz,
            "date_str": f"{year}-{month_num:02d}-{day.zfill(2)}"
        }
    
    def _validate_day_of_week(self, parsed: Dict) -> Dict:
        """Validate that day-of-week matches the date"""
        
        # Create datetime object
        dt = datetime(parsed["year"], parsed["month"], parsed["day"])
        
        # Get actual day-of-week (0=Monday, 6=Sunday)
        actual_day_index = dt.weekday()
        expected_day = self.DAYS_OF_WEEK[actual_day_index]
        
        actual_day = parsed["day_of_week"]
        
        return {
            "expected_day": expected_day,
            "actual_day": actual_day,
            "day_of_week_correct": expected_day == actual_day
        }
    
    def _validate_time_range(self, parsed: Dict) -> Dict:
        """Validate time is within reasonable range"""
        
        # Create datetime for email
        email_dt = datetime(
            parsed["year"], 
            parsed["month"], 
            parsed["day"],
            parsed["hour"],
            parsed["minute"],
            parsed["second"]
        )
        
        # Get current time
        now = datetime.now()
        
        # Calculate difference
        delta = (email_dt - now).total_seconds()
        
        warnings = []
        valid = True
        
        # Future-dated (more than 1 hour ahead)
        if delta > 3600:
            warnings.append(f"Email is future-dated by {delta/3600:.1f} hours")
            valid = False
        
        # Too far in past (more than 7 days)
        if delta < -604800:
            warnings.append(f"Email is dated {abs(delta)/86400:.1f} days in the past")
        
        return {
            "valid": valid,
            "warnings": warnings,
            "time_delta_seconds": delta
        }
    
    def validate_email_file(self, email_path: str) -> Dict:
        """Validate temporal accuracy of entire email file"""
        
        with open(email_path, 'r') as f:
            content = f.read()
        
        # Extract Date header
        date_match = re.search(r'^Date:\s*(.+)$', content, re.MULTILINE)
        
        if not date_match:
            return {
                "valid": False,
                "errors": ["No Date header found in email"],
                "file_path": email_path
            }
        
        date_header = date_match.group(1).strip()
        result = self.validate_email_date(date_header)
        result["file_path"] = email_path
        
        # Validate date arithmetic in email body
        arithmetic_errors = self._validate_date_arithmetic(content)
        if arithmetic_errors:
            result["valid"] = False
            result["errors"].extend(arithmetic_errors)
        
        return result
    
    def _validate_date_arithmetic(self, content: str) -> list:
        """Validate date arithmetic in email body (e.g., '48 hours' claims)"""
        errors = []
        
        # Pattern: "(Day), (Month) (Date) @ (Time)" followed by "(X hours/days)"
        # Example: "Extended: Friday, February 14 @ 5:00 PM EST (48 additional hours)"
        pattern = r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+@\s+\d{1,2}:\d{2}\s+[AP]M.*?\((\d+)\s+(additional\s+)?(hours|days)\)'
        
        matches = re.finditer(pattern, content, re.IGNORECASE)
        
        for match in matches:
            day_name = match.group(1)
            month_name = match.group(2)
            day_num = int(match.group(3))
            duration = int(match.group(4))
            unit = match.group(6).lower()
            
            # Convert month name to number
            month_num = self.MONTHS.get(month_name)
            if not month_num:
                continue
            
            # Assume year 2026 (or extract from context)
            try:
                claimed_date = datetime(2026, month_num, day_num)
                claimed_day = claimed_date.strftime("%A")
                
                if claimed_day != day_name:
                    errors.append(
                        f"Date arithmetic error: '{day_name}, {month_name} {day_num}' "
                        f"but {month_name} {day_num}, 2026 is actually a {claimed_day}. "
                        f"Duration claim: {duration} {unit}"
                    )
            except ValueError:
                errors.append(f"Invalid date in body: {month_name} {day_num}, 2026")
        
        return errors


def main():
    parser = argparse.ArgumentParser(description='Temporal Accuracy Validator')
    parser.add_argument('--file', required=True, help='Email file to validate')
    parser.add_argument('--fix', action='store_true', help='Suggest fix for errors')
    
    args = parser.parse_args()
    
    validator = TemporalAccuracyValidator()
    
    print("="*80)
    print("⏰ TEMPORAL ACCURACY VALIDATOR")
    print("="*80)
    print(f"\n📧 File: {args.file}\n")
    
    result = validator.validate_email_file(args.file)
    
    if result["valid"]:
        print("✅ VALIDATION PASSED\n")
        print(f"📅 Date: {result['date_header']}")
        print(f"✓  Day-of-week correct: {result['expected_day']} matches {result['actual_day']}")
        
        if result.get("warnings"):
            print("\n⚠️  WARNINGS:")
            for warning in result["warnings"]:
                print(f"   • {warning}")
        
        print("\n" + "="*80)
        return 0
    
    else:
        print("❌ VALIDATION FAILED\n")
        print(f"📅 Date: {result['date_header']}")
        
        if result.get("errors"):
            print("\n❌ ERRORS:")
            for error in result["errors"]:
                print(f"   • {error}")
        
        if result.get("warnings"):
            print("\n⚠️  WARNINGS:")
            for warning in result["warnings"]:
                print(f"   • {warning}")
        
        # Show fix suggestion
        if args.fix and result.get("expected_day") and result.get("parsed_date"):
            print("\n🔧 SUGGESTED FIX:")
            parsed = result["parsed_date"]
            fixed_date = (
                f"{result['expected_day']}, "
                f"{parsed['day']:02d} "
                f"{list(validator.MONTHS.keys())[parsed['month']-1]} "
                f"{parsed['year']} "
                f"{parsed['hour']:02d}:{parsed['minute']:02d}:{parsed['second']:02d} "
                f"{parsed['timezone']}"
            )
            print(f"   Date: {fixed_date}")
        
        print("\n" + "="*80)
        return 1


if __name__ == '__main__':
    sys.exit(main())
