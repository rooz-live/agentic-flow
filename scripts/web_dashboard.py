#!/usr/bin/env python3
"""
Agentic Flow Web Dashboard
Flask-based UI for velocity, flow efficiency, WSJF, and multitenant insights
"""

from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit
import json
import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime, timezone, timedelta
from collections import defaultdict

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(__file__))

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'agentic-flow-secret')
socketio = SocketIO(app, cors_allowed_origins="*")

# Domain to tenant mapping
DOMAIN_TENANT_MAP = {
    'decisioncall.com': 'decisioncall',
    'www.decisioncall.com': 'decisioncall',
    'analytics.interface.tag.ooo': 'analytics-interface',
    'half.masslessmassive.com': 'half-massive',
    'multi.masslessmassive.com': 'multi-massive',
    '127.0.0.1': 'localhost',
    'localhost': 'localhost'
}

def get_tenant_from_request():
    """Determine tenant ID from request headers or domain"""
    # Check X-Tenant-ID header (set by Nginx)
    tenant_id = request.headers.get('X-Tenant-ID')
    if tenant_id:
        return tenant_id
    
    # Check domain
    host = request.host.split(':')[0]  # Remove port
    return DOMAIN_TENANT_MAP.get(host, 'default')

PROJECT_ROOT = os.environ.get("PROJECT_ROOT", ".")
GOALIE_DIR = Path(PROJECT_ROOT) / ".goalie"
METRICS_FILE = GOALIE_DIR / "pattern_metrics.jsonl"
TRADING_SIGNALS_FILE = GOALIE_DIR / "trading_signals.jsonl"
MONITORING_DASHBOARD_FILE = Path(__file__).resolve().parent / "monitoring" / "dashboard.html"


def _load_jsonl(filepath, hours=168):
    """Load recent events from a JSONL file"""
    if not filepath.exists():
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    events = []

    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
                ts_str = event.get("timestamp") or event.get("ts", "")
                if ts_str:
                    try:
                        event_time = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                        if event_time > cutoff:
                            events.append(event)
                    except:
                        pass
            except json.JSONDecodeError:
                continue

    return events


def load_events(hours=168):
    """Load recent pattern events"""
    return _load_jsonl(METRICS_FILE, hours=hours)


def _load_trading_signals(hours=168):
    """Load recent trading signals from soxl_soxs_trader output"""
    return _load_jsonl(TRADING_SIGNALS_FILE, hours=hours)


def get_tenants():
    """Get list of unique tenants"""
    events = load_events(hours=720)  # 30 days
    tenants = set()
    for e in events:
        tenant_id = e.get('tenant_id')
        if tenant_id and tenant_id != 'default':
            tenants.add(tenant_id)
    return sorted(list(tenants))


def run_command(cmd):
    """Run CLI command and return JSON output"""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True,
            cwd=PROJECT_ROOT
        )
        if result.returncode == 0 and result.stdout:
            return json.loads(result.stdout)
        return None
    except:
        return None


# Serve Vite-built trading dashboard as static files at /trading
# Local dev: dist/ | Deployed: trading-dashboard/
TRADING_DIST = Path(PROJECT_ROOT) / "trading-dashboard"
if not TRADING_DIST.exists():
    TRADING_DIST = Path(PROJECT_ROOT) / "dist"

@app.route('/trading')
@app.route('/trading/')
def trading_dashboard():
    """Trading dashboard (React/Vite build)"""
    if (TRADING_DIST / "trading.html").exists():
        return send_from_directory(str(TRADING_DIST), "trading.html")
    if (TRADING_DIST / "index.html").exists():
        return send_from_directory(str(TRADING_DIST), "index.html")
    return '<h1>Trading dashboard not built</h1><p>Run: <code>npx vite build --base=/trading/ --outDir=dist</code></p>', 404

@app.route('/trading/<path:filename>')
def trading_assets(filename):
    """Serve trading dashboard static assets"""
    from flask import send_from_directory
    return send_from_directory(str(TRADING_DIST), filename)

# Routes
@app.route('/')
def home():
    """Home dashboard"""
    current_tenant = get_tenant_from_request()
    tenants = get_tenants()
    if MONITORING_DASHBOARD_FILE.exists():
        return MONITORING_DASHBOARD_FILE.read_text(encoding='utf-8')
    try:
        return render_template('dashboard.html', tenants=tenants, current_tenant=current_tenant)
    except Exception:
        return '<h1>Agentic Flow Dashboard</h1><p>Dashboard template not found.</p>', 500


@app.route('/patterns')
def patterns():
    """Patterns explorer"""
    tenants = get_tenants()
    return render_template('patterns.html', tenants=tenants)


@app.route('/wsjf')
def wsjf_board():
    """WSJF board"""
    tenants = get_tenants()
    return render_template('wsjf.html', tenants=tenants)


@app.route('/execution')
def execution():
    """Execution metrics"""
    tenants = get_tenants()
    return render_template('execution.html', tenants=tenants)


@app.route('/tenants')
def tenants_view():
    """Multitenant overview"""
    tenants = get_tenants()
    return render_template('tenants.html', tenants=tenants)


# API Endpoints
@app.route('/api/health')
def api_health():
    """System health"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'events_count': len(load_events(hours=24))
    })


@app.route('/api/recommendations')
def api_recommendations():
    """Actionable recommendations"""
    tenant_filter = request.args.get('tenant_id')
    result = run_command(f"{PROJECT_ROOT}/scripts/af actionable-context --json")
    
    if result and tenant_filter:
        # Filter recommendations by tenant (future enhancement)
        pass
    
    return jsonify(result or {'recommendations': []})


@app.route('/api/velocity')
def api_velocity():
    """Execution velocity metrics"""
    hours = int(request.args.get('hours', 72))
    tenant_filter = request.args.get('tenant_id')
    
    result = run_command(f"{PROJECT_ROOT}/scripts/af execution-velocity --hours {hours} --json")
    
    if result and tenant_filter:
        # Filter by tenant
        events = load_events(hours=hours)
        tenant_events = [e for e in events if e.get('tenant_id') == tenant_filter]
        # Recalculate velocity for tenant (simplified)
        result['filtered_by_tenant'] = tenant_filter
        result['tenant_event_count'] = len(tenant_events)
    
    return jsonify(result or {})


@app.route('/api/flow-efficiency')
def api_flow_efficiency():
    """Flow efficiency metrics"""
    hours = int(request.args.get('hours', 168))
    tenant_filter = request.args.get('tenant_id')
    
    result = run_command(f"{PROJECT_ROOT}/scripts/af flow-efficiency --hours {hours} --json")
    
    if result and tenant_filter:
        result['filtered_by_tenant'] = tenant_filter
    
    return jsonify(result or {})


@app.route('/api/trading')
def api_trading():
    """Trading signals and SOXL/SOXS events from both pattern_metrics + trading_signals"""
    hours = int(request.args.get('hours', 72))
    symbol_filter = request.args.get('symbol')  # e.g. SOXL, SOXS

    # Merge events from both JSONL sources
    events = load_events(hours=hours)
    events.extend(_load_trading_signals(hours=hours))

    trading_events = [
        e for e in events
        if e.get('pattern', '').startswith('trading')
        or e.get('component') in ('soxl_soxs_trader', 'neural-trader', 'backtest')
        or e.get('action') in ('BUY', 'SELL', 'HOLD')
        or any(t in str(e.get('data', '')) + str(e.get('symbol', '')) for t in ('SOXL', 'SOXS', 'SMH', 'SOXX'))
    ]

    if symbol_filter:
        trading_events = [e for e in trading_events if symbol_filter.upper() in str(e.get('symbol', '')) + str(e.get('data', ''))]

    # Sort by timestamp descending
    trading_events.sort(key=lambda e: e.get('timestamp', e.get('ts', '')), reverse=True)

    return jsonify({
        'events': trading_events[:100],
        'count': len(trading_events),
        'filters': {'hours': hours, 'symbol': symbol_filter},
        'status': 'ok'
    })


@app.route('/api/patterns')
def api_patterns():
    """Pattern events"""
    hours = int(request.args.get('hours', 24))
    circle = request.args.get('circle')
    tenant_id = request.args.get('tenant_id')
    pattern = request.args.get('pattern')
    
    events = load_events(hours=hours)
    
    # Apply filters
    if circle:
        events = [e for e in events if e.get('circle') == circle]
    if tenant_id:
        events = [e for e in events if e.get('tenant_id') == tenant_id]
    if pattern:
        events = [e for e in events if e.get('pattern') == pattern]
    
    return jsonify({
        'events': events[-100:],  # Last 100 events
        'count': len(events),
        'filters': {
            'hours': hours,
            'circle': circle,
            'tenant_id': tenant_id,
            'pattern': pattern
        }
    })


@app.route('/api/tenants')
def api_tenants():
    """Tenant list and metrics"""
    events = load_events(hours=168)
    
    # Aggregate by tenant
    tenant_stats = defaultdict(lambda: {
        'event_count': 0,
        'platforms': set(),
        'patterns': set(),
        'total_wsjf': 0,
        'total_cod': 0,
        'failed_actions': 0
    })
    
    for e in events:
        tenant_id = e.get('tenant_id', 'default')
        tenant_stats[tenant_id]['event_count'] += 1
        
        platform = e.get('tenant_platform')
        if platform:
            tenant_stats[tenant_id]['platforms'].add(platform)
        
        pattern = e.get('pattern')
        if pattern:
            tenant_stats[tenant_id]['patterns'].add(pattern)
        
        economic = e.get('economic', {})
        tenant_stats[tenant_id]['total_wsjf'] += economic.get('wsjf_score', 0)
        tenant_stats[tenant_id]['total_cod'] += economic.get('cod', 0)
        
        if not e.get('action_completed', True):
            tenant_stats[tenant_id]['failed_actions'] += 1
    
    # Convert sets to lists for JSON
    result = {}
    for tenant_id, stats in tenant_stats.items():
        result[tenant_id] = {
            'event_count': stats['event_count'],
            'platforms': list(stats['platforms']),
            'patterns': list(stats['patterns']),
            'total_wsjf': round(stats['total_wsjf'], 2),
            'total_cod': round(stats['total_cod'], 2),
            'failed_actions': stats['failed_actions'],
            'success_rate': round((stats['event_count'] - stats['failed_actions']) / stats['event_count'] * 100, 2) if stats['event_count'] > 0 else 0
        }
    
    return jsonify(result)


@app.route('/api/wsjf')
def api_wsjf():
    """WSJF scores from events"""
    hours = int(request.args.get('hours', 168))
    circle = request.args.get('circle')
    tenant_id = request.args.get('tenant_id')
    
    events = load_events(hours=hours)
    
    # Filter and extract WSJF data
    wsjf_items = []
    for e in events:
        if circle and e.get('circle') != circle:
            continue
        if tenant_id and e.get('tenant_id') != tenant_id:
            continue
        
        economic = e.get('economic', {})
        wsjf = economic.get('wsjf_score', 0)
        
        if wsjf > 0:
            wsjf_items.append({
                'pattern': e.get('pattern'),
                'circle': e.get('circle'),
                'wsjf_score': wsjf,
                'cod': economic.get('cod', 0),
                'tenant_id': e.get('tenant_id'),
                'tenant_platform': e.get('tenant_platform'),
                'timestamp': e.get('timestamp') or e.get('ts'),
                'data': e.get('data', {})
            })
    
    # Sort by WSJF descending
    wsjf_items.sort(key=lambda x: x['wsjf_score'], reverse=True)
    
    return jsonify({
        'items': wsjf_items[:50],  # Top 50
        'count': len(wsjf_items)
    })


# WebSocket events for real-time updates
@socketio.on('connect')
def handle_connect():
    """Client connected"""
    emit('connected', {'status': 'ok'})


@socketio.on('subscribe_patterns')
def handle_subscribe():
    """Subscribe to pattern stream"""
    # In production, this would tail the metrics file
    emit('pattern_update', {'message': 'Subscribed to pattern stream'})


def main():
    """Start the dashboard server"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Agentic Flow Web Dashboard')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║        🚀 Agentic Flow Dashboard Starting                   ║
╠══════════════════════════════════════════════════════════════╣
║  URL: http://{args.host}:{args.port}                        ║
║  Tenants: {len(get_tenants())}                              ║
║  Events (24h): {len(load_events(hours=24))}                 ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    socketio.run(app, host=args.host, port=args.port, debug=args.debug,
                 allow_unsafe_werkzeug=True)


if __name__ == '__main__':
    main()
