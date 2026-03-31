#!/usr/bin/env python3
"""
Automated Email Format Upgrader
Level 2 Automation: Auto-converts plain text .eml files to professional HTML format

DoR: Email files exist in plain text format
DoD: HTML-formatted emails with inline CSS styling + multipart MIME
"""

import os
import re
import sys
import argparse
from pathlib import Path
from datetime import datetime


class EmailFormatUpgrader:
    """Converts plain text emails to professional HTML format"""
    
    def __init__(self):
        self.upgraded_count = 0
        self.failed_count = 0
    
    def upgrade_email(self, email_path: str) -> bool:
        """Upgrade single email file to HTML format"""
        
        try:
            # Read original email
            with open(email_path, 'r') as f:
                content = f.read()
            
            # Check if already HTML
            if 'Content-Type: text/html' in content or 'multipart/alternative' in content:
                print(f"  ⏭️  Already HTML format: {os.path.basename(email_path)}")
                return True
            
            # Extract headers and body
            headers, body = self._split_headers_body(content)
            
            # Generate HTML version
            html_body = self._convert_to_html(body)
            
            # Create multipart MIME email
            html_email = self._create_multipart_email(headers, body, html_body)
            
            # Save HTML version
            html_path = email_path.replace('.eml', '-HTML.eml')
            with open(html_path, 'w') as f:
                f.write(html_email)
            
            print(f"  ✅ Upgraded: {os.path.basename(email_path)} → {os.path.basename(html_path)}")
            self.upgraded_count += 1
            return True
            
        except Exception as e:
            print(f"  ❌ Failed: {os.path.basename(email_path)} - {e}")
            self.failed_count += 1
            return False
    
    def _split_headers_body(self, content: str) -> tuple:
        """Split email into headers and body"""
        parts = content.split('\n\n', 1)
        if len(parts) == 2:
            return parts[0], parts[1]
        return content, ""
    
    def _convert_to_html(self, body: str) -> str:
        """Convert plain text body to HTML with inline styles"""
        
        # Split into sections
        sections = self._identify_sections(body)
        
        html = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settlement Communication</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    
    <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 40px; margin-bottom: 20px;">
'''
        
        for section in sections:
            html += self._format_section(section)
        
        html += '''    </div>
    
    <!-- FOOTER -->
    <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
        <p style="margin: 0;">This communication is part of ongoing settlement negotiations</p>
        <p style="margin: 5px 0 0 0;">Confidential Settlement Communication - Protected by Rule 408</p>
    </div>
    
</body>
</html>
'''
        
        return html
    
    def _identify_sections(self, body: str) -> list:
        """Identify sections in email body"""
        
        sections = []
        current_section = {'type': 'greeting', 'content': []}
        
        for line in body.split('\n'):
            # Detect section headers (ALL CAPS)
            if line.isupper() and len(line) > 10 and ':' in line:
                if current_section['content']:
                    sections.append(current_section)
                current_section = {'type': 'section', 'title': line.strip(':'), 'content': []}
            
            # Detect signature
            elif line.startswith('Respectfully') or line.startswith('Thank you'):
                if current_section['content']:
                    sections.append(current_section)
                current_section = {'type': 'signature', 'content': [line]}
            
            else:
                current_section['content'].append(line)
        
        if current_section['content']:
            sections.append(current_section)
        
        return sections
    
    def _format_section(self, section: dict) -> str:
        """Format section as HTML with appropriate styling"""
        
        section_type = section.get('type', 'paragraph')
        content = section.get('content', [])
        
        if section_type == 'greeting':
            return self._format_greeting(content)
        elif section_type == 'section':
            return self._format_titled_section(section)
        elif section_type == 'signature':
            return self._format_signature(content)
        else:
            return self._format_paragraph(content)
    
    def _format_greeting(self, lines: list) -> str:
        """Format greeting section"""
        html = ''
        for line in lines[:3]:  # First few lines
            if line.strip():
                html += f'<p style="margin: 0 0 20px 0; font-size: 16px;">{self._escape_html(line)}</p>\n'
        return html
    
    def _format_titled_section(self, section: dict) -> str:
        """Format section with title"""
        title = section.get('title', 'Section')
        content = section.get('content', [])
        
        # Determine section color based on title
        color_map = {
            'DEADLINE': '#0066cc',
            'SETTLEMENT': '#28a745',
            'HOUSING': '#ff9800',
            'RATIONALE': '#495057',
            'NEXT': '#4caf50'
        }
        
        color = '#666'
        for keyword, c in color_map.items():
            if keyword in title:
                color = c
                break
        
        html = f'''        <div style="background-color: #f8f9fa; border-left: 4px solid {color}; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h2 style="margin: 0 0 15px 0; font-size: 18px; color: {color}; font-weight: 600;">{self._escape_html(title)}</h2>
'''
        
        # Format content
        in_list = False
        for line in content:
            line = line.strip()
            if not line:
                continue
            
            # Detect list items
            if re.match(r'^\d+\.', line) or line.startswith('•'):
                if not in_list:
                    html += '            <ol style="margin: 0 0 15px 0; padding-left: 25px; font-size: 15px;">\n'
                    in_list = True
                html += f'                <li style="margin-bottom: 10px;">{self._escape_html(line[2:].strip())}</li>\n'
            else:
                if in_list:
                    html += '            </ol>\n'
                    in_list = False
                html += f'            <p style="margin: 0 0 15px 0; font-size: 15px;">{self._escape_html(line)}</p>\n'
        
        if in_list:
            html += '            </ol>\n'
        
        html += '        </div>\n'
        return html
    
    def _format_signature(self, lines: list) -> str:
        """Format signature block"""
        html = '''        <div style="border-top: 2px solid #dee2e6; padding-top: 20px; margin-top: 40px;">
'''
        
        for i, line in enumerate(lines):
            if not line.strip():
                continue
            
            if i == 0:  # "Respectfully" or similar
                html += f'            <p style="margin: 0 0 5px 0; font-size: 16px;">{self._escape_html(line)}</p>\n'
            elif 'Shahrooz Bhopti' in line or any(name in line for name in ['Your Name']):
                html += f'            <p style="margin: 20px 0 5px 0; font-size: 18px; font-weight: 600; color: #0066cc;">{self._escape_html(line)}</p>\n'
            elif 'Pro Se' in line or 'BSBA' in line:
                html += f'            <p style="margin: 0 0 3px 0; font-size: 14px; color: #666;">{self._escape_html(line)}</p>\n'
            elif 'Case No' in line or 'Court:' in line or 'Deadline' in line:
                html += f'            <p style="margin: 0 0 3px 0; font-size: 13px; color: #495057;"><strong>{line.split(":")[0]}:</strong> {self._escape_html(":".join(line.split(":")[1:]).strip())}</p>\n'
            else:
                html += f'            <p style="margin: 0 0 3px 0; font-size: 14px; color: #666;">{self._escape_html(line)}</p>\n'
        
        html += '        </div>\n'
        return html
    
    def _format_paragraph(self, lines: list) -> str:
        """Format regular paragraph"""
        html = ''
        for line in lines:
            if line.strip():
                html += f'        <p style="margin: 0 0 15px 0; font-size: 15px;">{self._escape_html(line)}</p>\n'
        return html
    
    def _escape_html(self, text: str) -> str:
        """Escape HTML special characters"""
        return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    
    def _create_multipart_email(self, headers: str, plain_body: str, html_body: str) -> str:
        """Create multipart MIME email with plain text + HTML"""
        
        # Update headers for multipart
        headers_dict = {}
        for line in headers.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                headers_dict[key.strip()] = value.strip()
        
        # Remove Date if exists (will update to current time)
        if 'Date' in headers_dict:
            # Keep original date or update to current time
            pass
        
        # Add MIME headers
        headers_dict['MIME-Version'] = '1.0'
        headers_dict['Content-Type'] = 'multipart/alternative; boundary="----=_Part_0_1234567890.1234567890"'
        
        # Build multipart email
        multipart = []
        
        # Headers
        for key, value in headers_dict.items():
            multipart.append(f"{key}: {value}")
        
        multipart.append('')
        multipart.append('------=_Part_0_1234567890.1234567890')
        multipart.append('Content-Type: text/plain; charset=UTF-8')
        multipart.append('Content-Transfer-Encoding: 7bit')
        multipart.append('')
        multipart.append(plain_body)
        multipart.append('')
        multipart.append('------=_Part_0_1234567890.1234567890')
        multipart.append('Content-Type: text/html; charset=UTF-8')
        multipart.append('Content-Transfer-Encoding: 7bit')
        multipart.append('')
        multipart.append(html_body)
        multipart.append('')
        multipart.append('------=_Part_0_1234567890.1234567890--')
        
        return '\n'.join(multipart)


def main():
    parser = argparse.ArgumentParser(description='Automated Email Format Upgrader')
    parser.add_argument('--file', help='Single email file to upgrade')
    parser.add_argument('--dir', help='Directory containing emails to upgrade')
    parser.add_argument('--recursive', action='store_true', help='Process subdirectories')
    
    args = parser.parse_args()
    
    upgrader = EmailFormatUpgrader()
    
    print("="*80)
    print("📧 AUTOMATED EMAIL FORMAT UPGRADER")
    print("="*80)
    print("\n🔄 Level 2 Automation: Plain Text → HTML with Inline Styling\n")
    
    if args.file:
        # Single file
        print(f"Processing: {args.file}\n")
        upgrader.upgrade_email(args.file)
    
    elif args.dir:
        # Directory
        print(f"Processing directory: {args.dir}\n")
        
        pattern = '**/*.eml' if args.recursive else '*.eml'
        email_files = list(Path(args.dir).glob(pattern))
        
        for email_file in email_files:
            # Skip already-HTML files
            if '-HTML.eml' in str(email_file):
                continue
            
            upgrader.upgrade_email(str(email_file))
    
    else:
        print("❌ Error: Provide either --file or --dir")
        return 1
    
    print("\n" + "="*80)
    print("📊 SUMMARY")
    print("="*80)
    print(f"\n✅ Upgraded: {upgrader.upgraded_count}")
    print(f"❌ Failed: {upgrader.failed_count}")
    print(f"📈 Success Rate: {(upgrader.upgraded_count / (upgrader.upgraded_count + upgrader.failed_count) * 100):.1f}%\n")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
