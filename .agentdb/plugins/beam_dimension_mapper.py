#!/usr/bin/env python3
"""
BEAM Dimension Mapper - Multi-Dimensional Event Analysis
========================================================

Extracts WHO/WHAT/WHEN/WHERE/WHY/HOW dimensions from operations to enable
factual dimensional analytics and organizational tribe routing.

BEAM Framework (Business Event Analysis & Modeling):
- WHO: Actors, agents, teams involved
- WHAT: Actions, events, outcomes
- WHEN: Temporal patterns, sequences
- WHERE: Locations, contexts, environments
- WHY: Motivations, purposes, goals
- HOW: Methods, mechanisms, processes

Organizational Tribes Supported:
- agentic-teams: Multi-agent coordination
- deep-research: Analysis & benchmarking
- neural-trading: Risk-adjusted alpha generation
- security-infrastructure: Zero-trust enforcement
- startups-saas: Product deployment & ops

Metrics:
- <2ms extraction latency
- 100% coverage (all events tagged)
- ≥95% dimensional accuracy
- Zero data loss

Usage:
    python3 beam_dimension_mapper.py --initialize
    python3 beam_dimension_mapper.py --extract "git commit -m 'feat: add plugin'"
    python3 beam_dimension_mapper.py --tribe neural-trading --analyze --days 7
    python3 beam_dimension_mapper.py --report --tribe all
"""

import argparse
import json
import sqlite3
import time
import hashlib
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Set
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))


class BEAMDimensionMapper:
    """Extract and analyze BEAM dimensions from operations"""
    
    # Performance targets
    TARGETS = {
        'extraction_latency_ms': 2.0,    # <2ms
        'coverage': 1.0,                  # 100%
        'dimensional_accuracy': 0.95,     # ≥95%
        'zero_data_loss': True
    }
    
    # Organizational tribes
    TRIBES = {
        'agentic-teams': {
            'focus': ['coordination', 'collaboration', 'swarm', 'delegation'],
            'kpis': ['task_completion_rate', 'agent_utilization', 'synergy_score']
        },
        'deep-research': {
            'focus': ['analysis', 'benchmarking', 'investigation', 'evaluation'],
            'kpis': ['insight_quality', 'research_depth', 'citation_accuracy']
        },
        'neural-trading': {
            'focus': ['trade', 'risk', 'alpha', 'portfolio', 'market'],
            'kpis': ['risk_adjusted_return', 'sharpe_ratio', 'win_rate', 'drawdown']
        },
        'security-infrastructure': {
            'focus': ['security', 'authentication', 'encryption', 'audit', 'compliance'],
            'kpis': ['threat_detection_rate', 'false_positive_rate', 'incident_response_time']
        },
        'startups-saas': {
            'focus': ['deployment', 'pipeline', 'release', 'monitoring', 'scaling'],
            'kpis': ['uptime', 'deployment_frequency', 'mttr', 'change_failure_rate']
        }
    }
    
    # BEAM dimension extraction patterns
    WHO_PATTERNS = {
        'agent': r'agent[:\-_]?\s*(\w+)',
        'user': r'user[:\-_]?\s*(\w+)',
        'team': r'team[:\-_]?\s*(\w+)',
        'system': r'(claude|gpt|deepseek|qwen|grok|gemini)',
        'role': r'(coder|architect|tester|devops|security|researcher)'
    }
    
    WHAT_PATTERNS = {
        'action': r'(create|update|delete|read|execute|deploy|test|analyze|refactor)',
        'event': r'(started|completed|failed|succeeded|triggered|cancelled)',
        'outcome': r'(success|failure|partial|pending|blocked)',
        'artifact': r'(file|function|class|module|service|database|api)'
    }
    
    WHEN_PATTERNS = {
        'temporal': r'(\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2})',
        'sequence': r'(before|after|during|while|then|next)',
        'frequency': r'(daily|weekly|monthly|continuous|hourly)'
    }
    
    WHERE_PATTERNS = {
        'location': r'(local|remote|cloud|edge|distributed)',
        'environment': r'(dev|test|staging|prod|production)',
        'context': r'(file|directory|repository|server|container|cluster)'
    }
    
    WHY_PATTERNS = {
        'goal': r'(to|for|because|since|improve|fix|optimize|enhance)',
        'motivation': r'(performance|security|reliability|usability|cost)',
        'purpose': r'(testing|debugging|monitoring|analysis|deployment)'
    }
    
    HOW_PATTERNS = {
        'method': r'(via|using|through|with|by)',
        'mechanism': r'(api|cli|ui|webhook|queue|stream)',
        'process': r'(pipeline|workflow|chain|sequence|batch)'
    }
    
    def __init__(self, db_path: str = '.agentdb/agentdb.sqlite'):
        self.db_path = Path(db_path)
        if not self.db_path.exists():
            raise FileNotFoundError(f"AgentDB not found at {self.db_path}")
        
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.row_factory = sqlite3.Row
    
    def initialize(self) -> bool:
        """Initialize BEAM dimension schema"""
        try:
            cursor = self.conn.cursor()
            
            # BEAM dimensions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS beam_dimensions (
                    dimension_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_hash TEXT UNIQUE NOT NULL,
                    event_text TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    who TEXT,              -- Actors
                    what TEXT,             -- Actions
                    when_temporal TEXT,    -- Time
                    where_location TEXT,   -- Place
                    why_purpose TEXT,      -- Reason
                    how_method TEXT,       -- Mechanism
                    tribe TEXT,            -- Organizational unit
                    confidence_score REAL DEFAULT 0.5,
                    extraction_latency_ms REAL,
                    created_at TEXT NOT NULL
                )
            """)
            
            # Tribal analytics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tribal_analytics (
                    analytics_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tribe TEXT NOT NULL,
                    period_start TEXT NOT NULL,
                    period_end TEXT NOT NULL,
                    total_events INTEGER DEFAULT 0,
                    kpi_metrics TEXT,     -- JSON
                    dimensional_breakdown TEXT,  -- JSON
                    insights TEXT,        -- JSON
                    recommendations TEXT,  -- JSON
                    timestamp TEXT NOT NULL
                )
            """)
            
            # BEAM-TDD integration table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS beam_tdd_metrics (
                    metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dimension_id INTEGER,
                    tdd_metric_id INTEGER,
                    correlation_score REAL,
                    insight TEXT,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (dimension_id) REFERENCES beam_dimensions(dimension_id)
                )
            """)
            
            # Create indexes
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_beam_tribe 
                ON beam_dimensions(tribe)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_beam_timestamp 
                ON beam_dimensions(timestamp)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_beam_who 
                ON beam_dimensions(who)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_tribal_analytics 
                ON tribal_analytics(tribe, period_start)
            """)
            
            self.conn.commit()
            print("✅ BEAM Dimension Mapper schema initialized")
            return True
            
        except sqlite3.Error as e:
            print(f"❌ Database error: {e}")
            return False
    
    def extract_dimensions(self, event_text: str, tribe: Optional[str] = None) -> Dict:
        """
        Extract BEAM dimensions from event text
        
        Returns:
            dict: {
                'who': str,
                'what': str,
                'when': str,
                'where': str,
                'why': str,
                'how': str,
                'tribe': str,
                'confidence': float,
                'latency_ms': float
            }
        """
        start_time = time.perf_counter()
        event_hash = hashlib.sha256(event_text.encode()).hexdigest()[:16]
        
        # Extract each dimension
        dimensions = {
            'who': self._extract_dimension(event_text, self.WHO_PATTERNS),
            'what': self._extract_dimension(event_text, self.WHAT_PATTERNS),
            'when': self._extract_dimension(event_text, self.WHEN_PATTERNS),
            'where': self._extract_dimension(event_text, self.WHERE_PATTERNS),
            'why': self._extract_dimension(event_text, self.WHY_PATTERNS),
            'how': self._extract_dimension(event_text, self.HOW_PATTERNS)
        }
        
        # Infer tribe if not provided
        if not tribe:
            tribe = self._infer_tribe(event_text, dimensions)
        
        # Calculate confidence
        confidence = self._calculate_confidence(dimensions)
        
        # Measure latency
        end_time = time.perf_counter()
        latency_ms = (end_time - start_time) * 1000
        
        # Store in database
        timestamp = datetime.now().isoformat()
        cursor = self.conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO beam_dimensions 
                (event_hash, event_text, timestamp, who, what, when_temporal,
                 where_location, why_purpose, how_method, tribe, confidence_score,
                 extraction_latency_ms, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_hash,
                event_text,
                timestamp,
                dimensions['who'],
                dimensions['what'],
                dimensions['when'],
                dimensions['where'],
                dimensions['why'],
                dimensions['how'],
                tribe,
                confidence,
                latency_ms,
                timestamp
            ))
            self.conn.commit()
        except sqlite3.IntegrityError:
            pass  # Event already extracted
        
        return {
            'who': dimensions['who'],
            'what': dimensions['what'],
            'when': dimensions['when'],
            'where': dimensions['where'],
            'why': dimensions['why'],
            'how': dimensions['how'],
            'tribe': tribe,
            'confidence': confidence,
            'latency_ms': latency_ms
        }
    
    def _extract_dimension(self, text: str, patterns: Dict[str, str]) -> str:
        """Extract dimension using regex patterns"""
        matches = []
        for key, pattern in patterns.items():
            found = re.findall(pattern, text, re.IGNORECASE)
            if found:
                matches.extend([f"{key}:{match}" if isinstance(match, str) else f"{key}:{match[0]}" 
                               for match in found])
        
        return '; '.join(matches) if matches else 'unknown'
    
    def _infer_tribe(self, text: str, dimensions: Dict[str, str]) -> str:
        """Infer organizational tribe from event characteristics"""
        text_lower = text.lower()
        
        # Score each tribe based on keyword overlap
        scores = {}
        for tribe_name, tribe_config in self.TRIBES.items():
            score = 0
            for keyword in tribe_config['focus']:
                if keyword in text_lower:
                    score += 1
                # Check dimensions too
                for dim_value in dimensions.values():
                    if keyword in dim_value.lower():
                        score += 0.5
            
            scores[tribe_name] = score
        
        # Return tribe with highest score, or 'agentic-teams' as default
        if scores:
            best_tribe = max(scores.items(), key=lambda x: x[1])
            return best_tribe[0] if best_tribe[1] > 0 else 'agentic-teams'
        
        return 'agentic-teams'
    
    def _calculate_confidence(self, dimensions: Dict[str, str]) -> float:
        """Calculate extraction confidence based on dimension completeness"""
        extracted = sum(1 for v in dimensions.values() if v != 'unknown')
        total = len(dimensions)
        
        return extracted / total if total > 0 else 0.0
    
    def analyze_tribe(self, tribe: str, days: int = 7) -> Dict:
        """
        Generate tribal analytics report
        
        Returns:
            dict: {
                'tribe': str,
                'period': str,
                'total_events': int,
                'kpi_metrics': dict,
                'dimensional_breakdown': dict,
                'insights': list,
                'recommendations': list
            }
        """
        cursor = self.conn.cursor()
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Get events for tribe
        cursor.execute("""
            SELECT * FROM beam_dimensions
            WHERE tribe = ? AND timestamp >= ?
            ORDER BY timestamp DESC
        """, (tribe, cutoff))
        
        events = cursor.fetchall()
        
        if not events:
            return {
                'tribe': tribe,
                'period': f'{days} days',
                'total_events': 0,
                'kpi_metrics': {},
                'dimensional_breakdown': {},
                'insights': ['No events recorded in this period'],
                'recommendations': ['Increase activity to generate insights']
            }
        
        # Analyze dimensions
        dimensional_breakdown = {
            'who': self._count_values([e['who'] for e in events]),
            'what': self._count_values([e['what'] for e in events]),
            'when': self._count_values([e['when_temporal'] for e in events]),
            'where': self._count_values([e['where_location'] for e in events]),
            'why': self._count_values([e['why_purpose'] for e in events]),
            'how': self._count_values([e['how_method'] for e in events])
        }
        
        # Calculate tribe-specific KPIs
        tribe_config = self.TRIBES.get(tribe, {})
        kpi_metrics = self._calculate_tribe_kpis(tribe, events, tribe_config)
        
        # Generate insights
        insights = self._generate_insights(tribe, events, dimensional_breakdown, kpi_metrics)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(tribe, kpi_metrics, insights)
        
        # Store analytics
        timestamp = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO tribal_analytics 
            (tribe, period_start, period_end, total_events, kpi_metrics,
             dimensional_breakdown, insights, recommendations, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tribe,
            cutoff,
            timestamp,
            len(events),
            json.dumps(kpi_metrics),
            json.dumps(dimensional_breakdown),
            json.dumps(insights),
            json.dumps(recommendations),
            timestamp
        ))
        self.conn.commit()
        
        return {
            'tribe': tribe,
            'period': f'{days} days',
            'total_events': len(events),
            'kpi_metrics': kpi_metrics,
            'dimensional_breakdown': dimensional_breakdown,
            'insights': insights,
            'recommendations': recommendations
        }
    
    def _count_values(self, values: List[str]) -> Dict[str, int]:
        """Count occurrences of dimension values"""
        counts = {}
        for value in values:
            if value and value != 'unknown':
                # Split compound values
                parts = value.split('; ')
                for part in parts:
                    counts[part] = counts.get(part, 0) + 1
        
        # Return top 10
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        return dict(sorted_counts[:10])
    
    def _calculate_tribe_kpis(self, tribe: str, events: List, tribe_config: Dict) -> Dict:
        """Calculate tribe-specific KPIs"""
        kpis = {}
        
        if tribe == 'neural-trading':
            # Risk-adjusted metrics
            kpis['total_trades'] = len([e for e in events if 'trade' in e['what'].lower()])
            kpis['risk_events'] = len([e for e in events if 'risk' in e['what'].lower()])
            kpis['avg_confidence'] = sum(e['confidence_score'] for e in events) / len(events)
        
        elif tribe == 'security-infrastructure':
            # Security metrics
            kpis['security_scans'] = len([e for e in events if 'scan' in e['what'].lower()])
            kpis['threats_detected'] = len([e for e in events if 'threat' in e['what'].lower()])
            kpis['avg_latency_ms'] = sum(e['extraction_latency_ms'] for e in events) / len(events)
        
        elif tribe == 'agentic-teams':
            # Coordination metrics
            kpis['agents_active'] = len(set(e['who'] for e in events if e['who'] != 'unknown'))
            kpis['tasks_coordinated'] = len([e for e in events if 'task' in e['what'].lower()])
            kpis['collaboration_events'] = len([e for e in events if 'team' in e['who'].lower()])
        
        elif tribe == 'deep-research':
            # Research metrics
            kpis['analyses_performed'] = len([e for e in events if 'analyze' in e['what'].lower()])
            kpis['insights_generated'] = len([e for e in events if 'insight' in e['why_purpose'].lower()])
            kpis['avg_confidence'] = sum(e['confidence_score'] for e in events) / len(events)
        
        elif tribe == 'startups-saas':
            # Deployment metrics
            kpis['deployments'] = len([e for e in events if 'deploy' in e['what'].lower()])
            kpis['releases'] = len([e for e in events if 'release' in e['what'].lower()])
            kpis['pipeline_runs'] = len([e for e in events if 'pipeline' in e['how_method'].lower()])
        
        return kpis
    
    def _generate_insights(
        self, 
        tribe: str, 
        events: List, 
        dimensional_breakdown: Dict,
        kpi_metrics: Dict
    ) -> List[str]:
        """Generate tribe-specific insights"""
        insights = []
        
        # Generic insights
        insights.append(f"Processed {len(events)} events over analysis period")
        
        # Most active dimension
        who_counts = dimensional_breakdown.get('who', {})
        if who_counts:
            top_actor = max(who_counts.items(), key=lambda x: x[1])
            insights.append(f"Most active actor: {top_actor[0]} ({top_actor[1]} events)")
        
        # Temporal pattern
        when_counts = dimensional_breakdown.get('when', {})
        if when_counts:
            insights.append(f"Detected {len(when_counts)} distinct temporal patterns")
        
        # Tribe-specific insights
        if tribe == 'neural-trading' and kpi_metrics.get('total_trades', 0) > 0:
            insights.append(f"Risk-adjusted activity: {kpi_metrics['risk_events']} risk assessments for {kpi_metrics['total_trades']} trades")
        
        elif tribe == 'security-infrastructure' and kpi_metrics.get('security_scans', 0) > 0:
            threat_rate = kpi_metrics.get('threats_detected', 0) / kpi_metrics['security_scans']
            insights.append(f"Threat detection rate: {threat_rate:.1%}")
        
        return insights
    
    def _generate_recommendations(self, tribe: str, kpi_metrics: Dict, insights: List[str]) -> List[str]:
        """Generate tribe-specific recommendations"""
        recommendations = []
        
        # Generic recommendations
        if not insights or len(insights) < 3:
            recommendations.append("Increase event logging to generate more detailed insights")
        
        # Tribe-specific recommendations
        if tribe == 'neural-trading':
            if kpi_metrics.get('avg_confidence', 0) < 0.7:
                recommendations.append("Improve trade confidence scoring - target ≥70%")
            if kpi_metrics.get('risk_events', 0) < kpi_metrics.get('total_trades', 1):
                recommendations.append("Increase risk assessment coverage to 1:1 with trades")
        
        elif tribe == 'security-infrastructure':
            if kpi_metrics.get('avg_latency_ms', 10) > 2.0:
                recommendations.append("Optimize security scan latency - target <2ms")
        
        elif tribe == 'agentic-teams':
            if kpi_metrics.get('collaboration_events', 0) < kpi_metrics.get('tasks_coordinated', 1) * 0.5:
                recommendations.append("Increase inter-agent collaboration - aim for 50% task coordination")
        
        return recommendations if recommendations else ['System performing within targets']
    
    def generate_report(self, tribe: Optional[str] = None, days: int = 7) -> Dict:
        """Generate comprehensive BEAM report"""
        cursor = self.conn.cursor()
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        if tribe and tribe != 'all':
            # Single tribe report
            return self.analyze_tribe(tribe, days)
        
        # All tribes report
        all_reports = {}
        for tribe_name in self.TRIBES.keys():
            all_reports[tribe_name] = self.analyze_tribe(tribe_name, days)
        
        # Overall metrics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_events,
                AVG(confidence_score) as avg_confidence,
                AVG(extraction_latency_ms) as avg_latency
            FROM beam_dimensions
            WHERE timestamp >= ?
        """, (cutoff,))
        
        overall = cursor.fetchone()
        
        return {
            'period': f'{days} days',
            'overall_metrics': {
                'total_events': overall['total_events'] or 0,
                'avg_confidence': overall['avg_confidence'] or 0.0,
                'avg_latency_ms': overall['avg_latency'] or 0.0,
                'meets_latency_target': (overall['avg_latency'] or 0) <= self.TARGETS['extraction_latency_ms'],
                'meets_confidence_target': (overall['avg_confidence'] or 0) >= self.TARGETS['dimensional_accuracy']
            },
            'tribal_reports': all_reports,
            'timestamp': datetime.now().isoformat()
        }


def main():
    parser = argparse.ArgumentParser(description='BEAM Dimension Mapper - Multi-Dimensional Analytics')
    parser.add_argument('--initialize', action='store_true', help='Initialize schema')
    parser.add_argument('--extract', type=str, help='Extract dimensions from event text')
    parser.add_argument('--tribe', type=str, choices=list(BEAMDimensionMapper.TRIBES.keys()) + ['all'],
                       help='Organizational tribe')
    parser.add_argument('--analyze', action='store_true', help='Analyze tribe')
    parser.add_argument('--report', action='store_true', help='Generate report')
    parser.add_argument('--days', type=int, default=7, help='Analysis period (days)')
    parser.add_argument('--db-path', type=str, default='.agentdb/agentdb.sqlite', help='Database path')
    
    args = parser.parse_args()
    
    try:
        mapper = BEAMDimensionMapper(db_path=args.db_path)
        
        if args.initialize:
            mapper.initialize()
        
        elif args.extract:
            result = mapper.extract_dimensions(args.extract, args.tribe)
            print(json.dumps(result, indent=2))
            
            # Visual summary
            print(f"\n📊 BEAM Dimensions Extracted")
            print(f"WHO: {result['who']}")
            print(f"WHAT: {result['what']}")
            print(f"WHEN: {result['when']}")
            print(f"WHERE: {result['where']}")
            print(f"WHY: {result['why']}")
            print(f"HOW: {result['how']}")
            print(f"TRIBE: {result['tribe']}")
            print(f"Confidence: {result['confidence']:.1%} | Latency: {result['latency_ms']:.2f}ms")
        
        elif args.analyze and args.tribe and args.tribe != 'all':
            analysis = mapper.analyze_tribe(args.tribe, args.days)
            print(json.dumps(analysis, indent=2))
            
            # Visual summary
            print(f"\n🏛️ Tribal Analytics: {analysis['tribe']}")
            print(f"Period: {analysis['period']}")
            print(f"Total Events: {analysis['total_events']}")
            print(f"\nKPI Metrics:")
            for key, value in analysis['kpi_metrics'].items():
                print(f"  {key}: {value}")
            print(f"\nInsights:")
            for insight in analysis['insights']:
                print(f"  • {insight}")
            print(f"\nRecommendations:")
            for rec in analysis['recommendations']:
                print(f"  → {rec}")
        
        elif args.report:
            report = mapper.generate_report(args.tribe, args.days)
            print(json.dumps(report, indent=2))
            
            # Visual summary
            print(f"\n📈 BEAM Comprehensive Report ({report['period']})")
            print(f"\nOverall Metrics:")
            metrics = report['overall_metrics']
            print(f"  Total Events: {metrics['total_events']}")
            print(f"  Avg Confidence: {metrics['avg_confidence']:.1%}")
            print(f"  Avg Latency: {metrics['avg_latency_ms']:.2f}ms")
            print(f"  Meets Targets: {'✅' if metrics['meets_latency_target'] and metrics['meets_confidence_target'] else '⚠️'}")
            
            if 'tribal_reports' in report:
                print(f"\nTribal Summaries:")
                for tribe_name, tribe_report in report['tribal_reports'].items():
                    print(f"  {tribe_name}: {tribe_report['total_events']} events")
        
        else:
            parser.print_help()
            return 1
        
        return 0
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
