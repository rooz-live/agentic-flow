#!/usr/bin/env python3
"""
Session End WSJF Summary Report Hook
=====================================
Called at session end to generate WSJF analytics summary.

Hook Interface:
    Input: session context with episode list
    Output: session context with summary report
"""

import json
import sys
from typing import List, Dict
from statistics import mean, stdev


def generate_wsjf_summary(episodes: List[Dict]) -> Dict:
    """
    Generate WSJF summary statistics from episode list.
    
    Args:
        episodes: List of episode dicts with wsjf_context
    
    Returns:
        Summary statistics dict
    """
    wsjf_scores = []
    confidence_scores = []
    rewards = []
    
    for episode in episodes:
        wsjf_ctx = episode.get('wsjf_context', {})
        
        if wsjf_ctx:
            wsjf = wsjf_ctx.get('wsjf')
            confidence = wsjf_ctx.get('confidence')
            
            if wsjf is not None:
                wsjf_scores.append(float(wsjf))
            if confidence is not None:
                confidence_scores.append(float(confidence))
        
        reward = episode.get('reward')
        if reward is not None:
            rewards.append(float(reward))
    
    summary = {
        'episode_count': len(episodes),
        'wsjf_stats': {},
        'confidence_stats': {},
        'reward_stats': {}
    }
    
    # WSJF statistics
    if wsjf_scores:
        summary['wsjf_stats'] = {
            'min': round(min(wsjf_scores), 2),
            'max': round(max(wsjf_scores), 2),
            'mean': round(mean(wsjf_scores), 2),
            'stdev': round(stdev(wsjf_scores), 2) if len(wsjf_scores) > 1 else 0.0
        }
    
    # Confidence statistics
    if confidence_scores:
        summary['confidence_stats'] = {
            'min': round(min(confidence_scores), 2),
            'max': round(max(confidence_scores), 2),
            'mean': round(mean(confidence_scores), 2)
        }
    
    # Reward statistics
    if rewards:
        summary['reward_stats'] = {
            'min': round(min(rewards), 2),
            'max': round(max(rewards), 2),
            'mean': round(mean(rewards), 2),
            'stdev': round(stdev(rewards), 2) if len(rewards) > 1 else 0.0
        }
    
    return summary


def hook(context: dict) -> dict:
    """
    Generate WSJF summary report for session.
    
    Args:
        context: Session context with keys:
            - episodes: List of episode dicts
            - (other keys preserved)
    
    Returns:
        Enhanced context with 'wsjf_summary' field
    """
    episodes = context.get('episodes', [])
    
    if episodes:
        summary = generate_wsjf_summary(episodes)
        context['wsjf_summary'] = summary
        
        # Generate human-readable report
        report_lines = [
            "=" * 50,
            "WSJF Session Summary",
            "=" * 50,
            f"Episodes: {summary['episode_count']}",
            ""
        ]
        
        if summary['wsjf_stats']:
            wsjf = summary['wsjf_stats']
            report_lines.extend([
                "WSJF Scores:",
                f"  Min:    {wsjf['min']}",
                f"  Max:    {wsjf['max']}",
                f"  Mean:   {wsjf['mean']}",
                f"  StdDev: {wsjf['stdev']}",
                ""
            ])
        
        if summary['reward_stats']:
            reward = summary['reward_stats']
            report_lines.extend([
                "Rewards:",
                f"  Min:    {reward['min']}",
                f"  Max:    {reward['max']}",
                f"  Mean:   {reward['mean']}",
                f"  StdDev: {reward['stdev']}",
                ""
            ])
        
        if summary['confidence_stats']:
            conf = summary['confidence_stats']
            report_lines.extend([
                "Confidence:",
                f"  Min:  {int(conf['min'] * 100)}%",
                f"  Max:  {int(conf['max'] * 100)}%",
                f"  Mean: {int(conf['mean'] * 100)}%",
                ""
            ])
        
        report_lines.append("=" * 50)
        
        context['wsjf_summary_report'] = "\n".join(report_lines)
    else:
        context['wsjf_summary'] = {'episode_count': 0, 'note': 'No episodes in session'}
    
    return context


def main():
    """CLI interface for testing"""
    if len(sys.argv) > 1:
        context = json.loads(sys.argv[1])
    else:
        context = json.load(sys.stdin)
    
    result = hook(context)
    
    # Print human-readable report if available
    if 'wsjf_summary_report' in result:
        print(result['wsjf_summary_report'])
        print()
    
    # Print JSON
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
