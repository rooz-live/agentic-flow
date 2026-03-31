#!/usr/bin/env python3
"""
Generate comprehensive trial preparation report from VibeThinker iterations.

Analyzes all VibeThinker iterations, MGPO refinements, and cross-evaluation scores
to produce a structured HTML report for trial preparation.

Output: /tmp/trial-validation-report.html
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
import re

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SWARM_LOG = Path.home() / "Library/Logs/vibethinker-trial-swarm.log"
MGPO_LOG = Path.home() / "Library/Logs/vibethinker-mgpo.log"
OUTPUT_PATH = Path("/tmp/trial-validation-report.html")

class TrialReportGenerator:
    """Generate comprehensive trial preparation report from VibeThinker data."""
    
    def __init__(self):
        self.timestamp = datetime.now()
        self.iterations = []
        self.scores = []
        
    def extract_iterations(self) -> List[Dict]:
        """Extract iteration data from VibeThinker logs."""
        iterations = []
        
        try:
            if SWARM_LOG.exists():
                content = SWARM_LOG.read_text()
                
                # Find all iterations
                iteration_pattern = r'\[(?:SFT|RL|EVAL)-(\d+)\](.*?)(?=\[(?:SFT|RL|EVAL)-\d+\]|$)'
                matches = re.findall(iteration_pattern, content, re.DOTALL)
                
                for iteration_num, iteration_content in matches:
                    iterations.append({
                        'iteration': int(iteration_num),
                        'content': iteration_content.strip(),
                        'length': len(iteration_content.strip())
                    })
                    
        except Exception as e:
            print(f"Error extracting iterations: {e}", file=sys.stderr)
            
        return sorted(iterations, key=lambda x: x['iteration'])
    
    def extract_scores(self) -> List[Dict]:
        """Extract scoring data from logs."""
        scores = []
        
        try:
            if SWARM_LOG.exists():
                content = SWARM_LOG.read_text()
                
                # Find scorer output
                score_pattern = r'\[SCORER\] Iteration (\d+): Evidence=([\d.]+)/10, Risk=([\d.]+), Confidence=([\d.]+), Coherence=([\d.]+)'
                matches = re.findall(score_pattern, content)
                
                for match in matches:
                    iteration, evidence, risk, confidence, coherence = match
                    scores.append({
                        'iteration': int(iteration),
                        'evidence_strength': float(evidence),
                        'perjury_risk': float(risk),
                        'confidence_score': float(confidence),
                        'coherence_score': float(coherence)
                    })
                    
        except Exception as e:
            print(f"Error extracting scores: {e}", file=sys.stderr)
            
        return sorted(scores, key=lambda x: x['iteration'])
    
    def generate_html_report(self) -> str:
        """Generate HTML report content."""
        self.iterations = self.extract_iterations()
        self.scores = self.extract_scores()
        
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VibeThinker Trial Preparation Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
        h2 {{ color: #34495e; margin-top: 30px; }}
        .summary {{ background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; }}
        .iteration {{ border: 1px solid #bdc3c7; margin: 15px 0; padding: 15px; border-radius: 5px; }}
        .scores {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0; }}
        .score-card {{ background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }}
        .score-value {{ font-size: 24px; font-weight: bold; color: #2c3e50; }}
        .score-label {{ color: #7f8c8d; font-size: 14px; }}
        .high-risk {{ color: #e74c3c; }}
        .medium-risk {{ color: #f39c12; }}
        .low-risk {{ color: #27ae60; }}
        .timestamp {{ color: #7f8c8d; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🏛️ VibeThinker Trial Preparation Report</h1>
        <div class="timestamp">Generated: {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}</div>
        
        <div class="summary">
            <h2>📊 Executive Summary</h2>
            <p><strong>Total Iterations:</strong> {len(self.iterations)}</p>
            <p><strong>Content Generated:</strong> {sum(it['length'] for it in self.iterations):,} characters</p>
            <p><strong>Scoring Coverage:</strong> {len(self.scores)} iterations scored</p>
        </div>
        
        <h2>📈 Iteration Analysis</h2>
"""
        
        # Add iteration details
        for iteration in self.iterations:
            # Find corresponding scores
            scores = next((s for s in self.scores if s['iteration'] == iteration['iteration']), None)
            
            html += f"""
        <div class="iteration">
            <h3>Iteration {iteration['iteration']}</h3>
            <p><strong>Content Length:</strong> {iteration['length']:,} characters</p>
"""
            
            if scores:
                risk_class = "high-risk" if scores['perjury_risk'] > 0.7 else "medium-risk" if scores['perjury_risk'] > 0.3 else "low-risk"
                
                html += f"""
            <div class="scores">
                <div class="score-card">
                    <div class="score-value">{scores['evidence_strength']:.1f}/10</div>
                    <div class="score-label">Evidence Strength</div>
                </div>
                <div class="score-card">
                    <div class="score-value {risk_class}">{scores['perjury_risk']:.2f}</div>
                    <div class="score-label">Perjury Risk</div>
                </div>
                <div class="score-card">
                    <div class="score-value">{scores['confidence_score']:.2f}</div>
                    <div class="score-label">Confidence</div>
                </div>
                <div class="score-card">
                    <div class="score-value">{scores['coherence_score']:.2f}</div>
                    <div class="score-label">Coherence</div>
                </div>
            </div>
"""
            else:
                html += "<p><em>No scoring data available for this iteration.</em></p>"
                
            html += "</div>"
        
        # Add recommendations
        if self.scores:
            avg_evidence = sum(s['evidence_strength'] for s in self.scores) / len(self.scores)
            avg_risk = sum(s['perjury_risk'] for s in self.scores) / len(self.scores)
            avg_confidence = sum(s['confidence_score'] for s in self.scores) / len(self.scores)
            
            html += f"""
        <div class="summary">
            <h2>🎯 Recommendations</h2>
            <p><strong>Average Evidence Strength:</strong> {avg_evidence:.1f}/10</p>
            <p><strong>Average Perjury Risk:</strong> {avg_risk:.2f}</p>
            <p><strong>Average Confidence:</strong> {avg_confidence:.2f}</p>
            
            <h3>Action Items:</h3>
            <ul>
"""
            
            if avg_evidence < 7.0:
                html += "<li>🔍 <strong>Strengthen Evidence:</strong> Gather additional supporting documentation and case law.</li>"
            if avg_risk > 0.5:
                html += "<li>⚠️ <strong>Reduce Perjury Risk:</strong> Review statements for consistency and accuracy.</li>"
            if avg_confidence < 0.6:
                html += "<li>💪 <strong>Build Confidence:</strong> Clarify uncertain arguments and gather more definitive evidence.</li>"
                
            html += """
            </ul>
        </div>
"""
        
        html += """
        <div class="timestamp">
            <p>Report generated by VibeThinker Trial Preparation System</p>
            <p>For questions or issues, review the VibeThinker logs or contact legal team.</p>
        </div>
    </div>
</body>
</html>"""
        
        return html
    
    def generate_report(self) -> bool:
        """Generate and save the trial report."""
        try:
            html_content = self.generate_html_report()
            OUTPUT_PATH.write_text(html_content)
            
            print(f"✅ Trial report generated: {OUTPUT_PATH}")
            print(f"📊 Analyzed {len(self.iterations)} iterations with {len(self.scores)} scored")
            
            return True
            
        except Exception as e:
            print(f"❌ Error generating trial report: {e}", file=sys.stderr)
            return False

def main():
    """Main entry point."""
    generator = TrialReportGenerator()
    success = generator.generate_report()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
