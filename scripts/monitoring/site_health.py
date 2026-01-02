#!/usr/bin/env python3
"""
Site Health Monitor for interface.tag.ooo Ecosystem
Tracks: components, context, protocols, metrics, and productivity (not just output)
"""

import json
import requests
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed

@dataclass
class SiteHealth:
    site_url: str
    status: str  # up, down, degraded
    response_time_ms: float
    status_code: int
    timestamp: str
    components: Dict[str, bool]  # Component availability
    context: Dict  # Site-specific context
    protocols: List[str]  # Active protocols
    productivity_metrics: Dict  # Quality metrics, not just output

INTERFACE_TAG_SITES = {
    'app': {
        'url': 'https://app.interface.tag.ooo',
        'components': ['auth', 'dashboard', 'api', 'websocket'],
        'protocols': ['oauth2', 'rest', 'websocket'],
        'productivity_checks': ['user_sessions', 'api_latency', 'error_rate']
    },
    'billing': {
        'url': 'https://billing.interface.tag.ooo',
        'components': ['payment_gateway', 'invoice_generator', 'subscription_manager'],
        'protocols': ['https', 'stripe_webhook', 'rest'],
        'productivity_checks': ['payment_success_rate', 'invoice_accuracy', 'billing_cycle_adherence']
    },
    'blog': {
        'url': 'https://blog.interface.tag.ooo',
        'components': ['cms', 'cdn', 'search'],
        'protocols': ['https', 'rss', 'sitemap'],
        'productivity_checks': ['content_freshness', 'seo_score', 'reader_engagement']
    },
    'dev': {
        'url': 'https://dev.interface.tag.ooo',
        'components': ['ci_cd', 'code_review', 'test_runner', 'deployment'],
        'protocols': ['https', 'git', 'docker'],
        'productivity_checks': ['build_success_rate', 'test_coverage', 'deployment_frequency']
    },
    'forum': {
        'url': 'https://forum.interface.tag.ooo',
        'components': ['discussion_board', 'user_management', 'moderation'],
        'protocols': ['https', 'rest', 'sse'],
        'productivity_checks': ['response_time_to_posts', 'resolution_rate', 'community_engagement']
    },
    'starlingx': {
        'url': 'https://starlingx.interface.tag.ooo',
        'components': ['kubernetes', 'openstack', 'ceph_storage', 'monitoring'],
        'protocols': ['https', 'kubernetes_api', 'openstack_api'],
        'productivity_checks': ['cluster_health', 'resource_utilization', 'deployment_success_rate']
    }
}

class SiteHealthMonitor:
    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.sites = INTERFACE_TAG_SITES
    
    def check_site(self, site_name: str, site_config: Dict) -> SiteHealth:
        """Check health of a single site"""
        url = site_config['url']
        start_time = time.time()
        
        try:
            response = requests.get(url, timeout=self.timeout, allow_redirects=True)
            response_time_ms = (time.time() - start_time) * 1000
            
            # Determine status
            if response.status_code == 200:
                status = 'up'
            elif 500 <= response.status_code < 600:
                status = 'down'
            else:
                status = 'degraded'
            
            # Mock component checks (in production, these would be real health endpoints)
            components = {comp: status == 'up' for comp in site_config['components']}
            
            # Mock productivity metrics
            productivity_metrics = {}
            for check in site_config['productivity_checks']:
                if status == 'up':
                    productivity_metrics[check] = self._generate_metric(check)
                else:
                    productivity_metrics[check] = {'status': 'unavailable'}
            
            context = {
                'site_name': site_name,
                'last_check': datetime.now(timezone.utc).isoformat(),
                'health_endpoint': f"{url}/health"
            }
            
            return SiteHealth(
                site_url=url,
                status=status,
                response_time_ms=round(response_time_ms, 2),
                status_code=response.status_code,
                timestamp=datetime.now(timezone.utc).isoformat(),
                components=components,
                context=context,
                protocols=site_config['protocols'],
                productivity_metrics=productivity_metrics
            )
        
        except requests.exceptions.Timeout:
            return SiteHealth(
                site_url=url,
                status='down',
                response_time_ms=self.timeout * 1000,
                status_code=0,
                timestamp=datetime.now(timezone.utc).isoformat(),
                components={comp: False for comp in site_config['components']},
                context={'site_name': site_name, 'error': 'timeout'},
                protocols=site_config['protocols'],
                productivity_metrics={'status': 'timeout'}
            )
        
        except Exception as e:
            return SiteHealth(
                site_url=url,
                status='down',
                response_time_ms=0,
                status_code=0,
                timestamp=datetime.now(timezone.utc).isoformat(),
                components={comp: False for comp in site_config['components']},
                context={'site_name': site_name, 'error': str(e)},
                protocols=site_config['protocols'],
                productivity_metrics={'status': 'error', 'message': str(e)}
            )
    
    def _generate_metric(self, check_name: str) -> Dict:
        """Generate productivity metrics (in production, these would be real data)"""
        metrics_map = {
            'user_sessions': {'active': 42, 'avg_duration_min': 15, 'quality_score': 0.85},
            'api_latency': {'p50_ms': 45, 'p95_ms': 120, 'p99_ms': 250},
            'error_rate': {'rate_percent': 0.5, 'threshold': 1.0, 'status': 'healthy'},
            'payment_success_rate': {'rate_percent': 99.2, 'threshold': 98.0, 'status': 'healthy'},
            'invoice_accuracy': {'accuracy_percent': 99.8, 'errors_last_24h': 2},
            'billing_cycle_adherence': {'on_time_percent': 99.5, 'delayed': 3},
            'content_freshness': {'days_since_last_post': 2, 'posts_per_week': 4},
            'seo_score': {'score': 92, 'issues': 3, 'opportunities': 5},
            'reader_engagement': {'avg_time_on_page_sec': 180, 'bounce_rate': 35},
            'build_success_rate': {'rate_percent': 94.5, 'failed_builds_today': 2},
            'test_coverage': {'coverage_percent': 82, 'lines_covered': 45320, 'lines_total': 55268},
            'deployment_frequency': {'deploys_per_day': 8, 'avg_duration_min': 12},
            'response_time_to_posts': {'avg_hours': 2.5, 'sla_hours': 4.0, 'status': 'meeting_sla'},
            'resolution_rate': {'rate_percent': 87, 'avg_resolution_hours': 18},
            'community_engagement': {'active_users': 156, 'posts_per_day': 34, 'quality_score': 0.78},
            'cluster_health': {'nodes_healthy': 6, 'nodes_total': 6, 'status': 'healthy'},
            'resource_utilization': {'cpu_percent': 45, 'memory_percent': 62, 'disk_percent': 38},
            'deployment_success_rate': {'rate_percent': 98.5, 'failed_deployments_today': 1}
        }
        
        return metrics_map.get(check_name, {'status': 'unknown'})
    
    def check_all_sites(self, parallel: bool = True) -> Dict[str, SiteHealth]:
        """Check health of all sites"""
        results = {}
        
        if parallel:
            with ThreadPoolExecutor(max_workers=len(self.sites)) as executor:
                futures = {
                    executor.submit(self.check_site, name, config): name
                    for name, config in self.sites.items()
                }
                
                for future in as_completed(futures):
                    site_name = futures[future]
                    try:
                        results[site_name] = future.result()
                    except Exception as e:
                        print(f"Error checking {site_name}: {e}")
        else:
            for site_name, site_config in self.sites.items():
                results[site_name] = self.check_site(site_name, site_config)
        
        return results
    
    def get_summary(self, results: Dict[str, SiteHealth]) -> Dict:
        """Generate health summary"""
        total = len(results)
        up = sum(1 for r in results.values() if r.status == 'up')
        degraded = sum(1 for r in results.values() if r.status == 'degraded')
        down = sum(1 for r in results.values() if r.status == 'down')
        
        avg_response_time = sum(r.response_time_ms for r in results.values()) / total if total > 0 else 0
        
        return {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'total_sites': total,
            'up': up,
            'degraded': degraded,
            'down': down,
            'availability_percent': round((up / total * 100) if total > 0 else 0, 2),
            'avg_response_time_ms': round(avg_response_time, 2),
            'sites': {name: health.status for name, health in results.items()}
        }


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Site Health Monitor')
    parser.add_argument('--site', choices=list(INTERFACE_TAG_SITES.keys()), help='Check specific site')
    parser.add_argument('--summary', action='store_true', help='Show summary only')
    parser.add_argument('--json', action='store_true', help='JSON output')
    parser.add_argument('--timeout', type=int, default=10, help='Request timeout in seconds')
    
    args = parser.parse_args()
    
    monitor = SiteHealthMonitor(timeout=args.timeout)
    
    if args.site:
        # Check single site
        health = monitor.check_site(args.site, INTERFACE_TAG_SITES[args.site])
        
        if args.json:
            print(json.dumps(asdict(health), indent=2))
        else:
            print(f"\n{'='*70}")
            print(f"Site Health: {args.site}")
            print(f"{'='*70}")
            print(f"URL: {health.site_url}")
            print(f"Status: {health.status.upper()}")
            print(f"Response Time: {health.response_time_ms}ms")
            print(f"Status Code: {health.status_code}")
            print(f"\nComponents:")
            for comp, status in health.components.items():
                icon = "✓" if status else "✗"
                print(f"  {icon} {comp}")
            print(f"\nProtocols: {', '.join(health.protocols)}")
            print(f"\nProductivity Metrics:")
            for metric, value in health.productivity_metrics.items():
                if isinstance(value, dict):
                    print(f"  {metric}:")
                    for k, v in value.items():
                        print(f"    {k}: {v}")
                else:
                    print(f"  {metric}: {value}")
            print(f"{'='*70}\n")
    
    else:
        # Check all sites
        results = monitor.check_all_sites()
        summary = monitor.get_summary(results)
        
        if args.json:
            if args.summary:
                print(json.dumps(summary, indent=2))
            else:
                output = {
                    'summary': summary,
                    'sites': {name: asdict(health) for name, health in results.items()}
                }
                print(json.dumps(output, indent=2))
        else:
            print(f"\n{'='*70}")
            print(f"Interface.tag.ooo Ecosystem Health")
            print(f"{'='*70}")
            print(f"Availability: {summary['availability_percent']}% ({summary['up']}/{summary['total_sites']} up)")
            print(f"Avg Response Time: {summary['avg_response_time_ms']}ms")
            print(f"\nSite Status:")
            
            for site_name, health in results.items():
                status_icon = {
                    'up': '✓',
                    'degraded': '⚠',
                    'down': '✗'
                }.get(health.status, '?')
                
                print(f"  {status_icon} {site_name:15} {health.status:10} {health.response_time_ms:6.1f}ms")
            
            print(f"{'='*70}\n")


if __name__ == '__main__':
    main()
