#!/usr/bin/env python3
"""
Resume Generator
Converts RESUME-2026-AGENTIC-LEAD.md to a professional HTML format.
"""
import markdown
import sys
from pathlib import Path

CSS = """
body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
h1 { border-bottom: 2px solid #333; padding-bottom: 10px; color: #2c3e50; }
h2 { color: #2980b9; margin-top: 30px; border-bottom: 1px solid #eee; }
h3 { color: #16a085; margin-top: 20px; }
blockquote { border-left: 4px solid #bdc3c7; padding-left: 15px; color: #7f8c8d; background: #f9f9f9; padding: 10px; }
code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; font-family: Monaco, monospace; }
a { color: #2980b9; text-decoration: none; }
a:hover { text-decoration: underline; }
.header-contact { font-size: 0.9em; color: #7f8c8d; margin-bottom: 30px; }
"""

def generate_html(md_path, output_path):
    print(f"Generating HTML from: {md_path}")

    with open(md_path, 'r') as f:
        md_content = f.read()

    html_body = markdown.markdown(md_content, extensions=['extra', 'codehilite'])

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Shahrooz Bhopti - Agentic Resume</title>
        <style>{CSS}</style>
    </head>
    <body>
        {html_body}
    </body>
    </html>
    """

    with open(output_path, 'w') as f:
        f.write(html_content)

    print(f"Resume generated: {output_path}")

if __name__ == "__main__":
    md_path = "/Users/shahroozbhopti/.gemini/antigravity/brain/0474f97d-f240-455b-8517-6cc901701b62/RESUME-2026-AGENTIC-LEAD.md"
    output_path = "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/RESUME-2026-AGENTIC-LEAD.html"
    generate_html(md_path, output_path)
