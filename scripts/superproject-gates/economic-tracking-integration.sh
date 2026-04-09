#!/bin/bash

# Economic Tracking Integration Script
# 
# Integrates economic tracking with production cycle scripts
# and provides automated economic analysis capabilities

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ECONOMICS_MODULE="$PROJECT_ROOT/agentic-flow-core/src/economics"
LOG_FILE="$PROJECT_ROOT/.goalie/economic-tracking.log"
GOALIE_DIR="$PROJECT_ROOT/.goalie"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} [$timestamp] $message" | tee -a "$LOG_FILE"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} [$timestamp] $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} [$timestamp] $message" | tee -a "$LOG_FILE"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} [$timestamp] $message" | tee -a "$LOG_FILE"
            ;;
        *)
            echo "[$timestamp] $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Check dependencies
check_dependencies() {
    log "INFO" "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js is required but not installed"
        exit 1
    fi
    
    # Check TypeScript
    if ! command -v npx &> /dev/null; then
        log "ERROR" "TypeScript/npx is required but not installed"
        exit 1
    fi
    
    # Check if economics module exists
    if [ ! -d "$ECONOMICS_MODULE" ]; then
        log "ERROR" "Economics module not found at $ECONOMICS_MODULE"
        exit 1
    fi
    
    log "INFO" "Dependencies check passed"
}

# Initialize economic tracking
initialize_economic_tracking() {
    log "INFO" "Initializing economic tracking system..."
    
    # Create economic tracking data directory in .goalie
    mkdir -p "$GOALIE_DIR/economic-data"
    
    # Initialize economic metrics database
    node -e "
        const { EconomicTracker } = require('$ECONOMICS_MODULE');
        const tracker = new EconomicTracker();
        
        tracker.on('trackingStarted', () => {
            console.log('Economic tracking started successfully');
        });
        
        tracker.on('economicMetricsUpdated', (metrics) => {
            console.log('Economic metrics updated:', {
                timestamp: metrics.timestamp,
                totalRevenue: metrics.revenue.total,
                capexOpexRatio: metrics.capex.totalInvestment / metrics.opex.totalOperatingCost,
                utilization: metrics.utilization.overall
            });
        });
        
        tracker.startTracking(300000) // 5 minutes
            .then(() => {
                console.log('Economic tracking initialization completed');
            })
            .catch(error => {
                console.error('Failed to start economic tracking:', error);
                process.exit(1);
            });
    " 2>&1 | tee -a "$LOG_FILE"
    
    log "INFO" "Economic tracking system initialized"
}

# Collect baseline economic metrics
collect_baseline_metrics() {
    log "INFO" "Collecting baseline economic metrics..."
    
    node -e "
        const { EconomicTracker } = require('$ECONOMICS_MODULE');
        const tracker = new EconomicTracker();
        
        tracker.collectEconomicMetrics()
            .then(metrics => {
                console.log('Baseline metrics collected:', {
                    timestamp: metrics.timestamp,
                    totalRevenue: metrics.revenue.total,
                    totalCapex: metrics.capex.totalInvestment,
                    totalOpex: metrics.opex.totalOperatingCost,
                    utilization: metrics.utilization.overall
                });
                
                // Save baseline to .goalie
                const fs = require('fs');
                const baselineData = {
                    timestamp: metrics.timestamp,
                    metrics: {
                        totalRevenue: metrics.revenue.total,
                        totalCapex: metrics.capex.totalInvestment,
                        totalOpex: metrics.opex.totalOperatingCost,
                        utilization: metrics.utilization.overall,
                        capexOpexRatio: metrics.capex.totalInvestment / metrics.opex.totalOperatingCost
                    }
                };
                
                fs.writeFileSync('$GOALIE_DIR/economic-baseline.json', JSON.stringify(baselineData, null, 2));
                console.log('Baseline saved to .goalie/economic-baseline.json');
            })
            .catch(error => {
                console.error('Failed to collect baseline metrics:', error);
                process.exit(1);
            });
    " 2>&1 | tee -a "$LOG_FILE"
    
    log "INFO" "Baseline metrics collection completed"
}

# Generate economic analysis report
generate_economic_report() {
    local period=${1:-"weekly"}
    log "INFO" "Generating economic analysis report for period: $period"
    
    node -e "
        const { EconomicTracker } = require('$ECONOMICS_MODULE');
        const tracker = new EconomicTracker();
        
        // Calculate period dates
        const endDate = new Date();
        const startDate = new Date();
        
        switch('$period') {
            case 'daily':
                startDate.setDate(startDate.getDate() - 1);
                break;
            case 'weekly':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'monthly':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7);
        }
        
        tracker.generateComprehensiveReport({
            start: startDate,
            end: endDate
        })
            .then(report => {
                console.log('Economic analysis report generated:', {
                    period: report.period,
                    totalRevenue: report.summary.totalRevenue,
                    profitMargin: report.summary.profitMargin,
                    avgUtilization: report.summary.avgUtilization,
                    roi: report.summary.roi
                });
                
                // Save report to .goalie
                const fs = require('fs');
                const reportData = {
                    timestamp: new Date(),
                    period: '$period',
                    report: report
                };
                
                fs.writeFileSync('$GOALIE_DIR/economic-report-$period.json', JSON.stringify(reportData, null, 2));
                console.log('Report saved to .goalie/economic-report-$period.json');
            })
            .catch(error => {
                console.error('Failed to generate economic report:', error);
                process.exit(1);
            });
    " 2>&1 | tee -a "$LOG_FILE"
    
    log "INFO" "Economic analysis report generated"
}

# Integrate with existing production scripts
integrate_production_scripts() {
    log "INFO" "Integrating with existing production scripts..."
    
    # Check if capture_baselines.sh exists
    if [ -f "$PROJECT_ROOT/scripts/capture_baselines.sh" ]; then
        log "INFO" "Found capture_baselines.sh, integrating economic tracking..."
        
        # Add economic tracking to baseline capture
        echo "
# Economic Tracking Integration
echo '[ECONOMIC-TRACKING] Capturing economic baselines...'
$SCRIPT_DIR/economic-tracking-integration.sh collect_baseline_metrics
" >> "$PROJECT_ROOT/scripts/capture_baselines.sh"
        
        log "INFO" "Integrated with capture_baselines.sh"
    fi
    
    # Check if other production scripts exist
    for script in "$PROJECT_ROOT/scripts"/*.sh; do
        if [ -f "$script" ]; then
            script_name=$(basename "$script")
            log "DEBUG" "Found production script: $script_name"
        fi
    done
    
    log "INFO" "Production script integration completed"
}

# Sync with .goalie system
sync_with_goalie() {
    log "INFO" "Syncing with .goalie system..."
    
    # Ensure .goalie directory structure exists
    mkdir -p "$GOALIE_DIR"/{economic-data,reports,goals,metrics}
    
    # Create economic goals configuration
    cat > "$GOALIE_DIR/economic-goals.yaml" << EOF
# Economic Goals Configuration
# Generated by economic-tracking-integration.sh

goals:
  cost_optimization:
    target: "Reduce CapEx/OpEx ratio by 15%"
    deadline: "2025-12-31"
    owner: "economic-team"
    circle: "technical-operations"
    status: "in_progress"
    
  revenue_growth:
    target: "Increase revenue by 20%"
    deadline: "2025-12-31"
    owner: "economic-team"
    circle: "business-operations"
    status: "in_progress"
    
  utilization_optimization:
    target: "Achieve 80% average utilization"
    deadline: "2025-12-31"
    owner: "economic-team"
    circle: "technical-operations"
    status: "in_progress"

tracking:
  interval_minutes: 5
  retention_days: 90
  alert_thresholds:
    capex_opex_ratio: 2.0
    utilization_low: 30
    utilization_high: 90
EOF
    
    log "INFO" "Created economic goals configuration"
    
    # Create metrics logging configuration
    cat > "$GOALIE_DIR/economic-metrics-config.json" << EOF
{
  "collection": {
    "interval_seconds": 300,
    "retention_days": 90,
    "batch_size": 100
  },
  "alerts": {
    "capex_opex_ratio": {
      "warning": 1.5,
      "critical": 2.0
    },
    "utilization": {
      "low_warning": 30,
      "low_critical": 20,
      "high_warning": 85,
      "high_critical": 95
    },
    "revenue": {
      "growth_warning": 0.02,
      "growth_critical": 0.0
    }
  },
  "reporting": {
    "default_period": "weekly",
    "formats": ["json", "yaml", "csv"],
    "auto_generate": true
  }
}
EOF
    
    log "INFO" "Created economic metrics configuration"
    log "INFO" ".goalie system sync completed"
}

# Setup monitoring and alerting
setup_monitoring() {
    log "INFO" "Setting up economic monitoring and alerting..."
    
    # Create monitoring script
    cat > "$PROJECT_ROOT/scripts/economic-monitor.sh" << 'EOF'
#!/bin/bash

# Economic Monitoring Script
# Monitors economic metrics and sends alerts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/.goalie/economic-monitoring.log"

# Check economic health
check_economic_health() {
    echo "$(date): Checking economic health..."
    
    # Check if economic tracking is running
    if ! pgrep -f "node.*economic-tracker" > /dev/null; then
        echo "$(date): WARNING - Economic tracking not running, restarting..."
        "$SCRIPT_DIR/economic-tracking-integration.sh" restart
    fi
    
    # Check for economic alerts
    if [ -f "$PROJECT_ROOT/.goalie/economic-alerts.json" ]; then
        echo "$(date): Economic alerts detected:"
        cat "$PROJECT_ROOT/.goalie/economic-alerts.json"
    fi
}

# Main monitoring loop
while true; do
    check_economic_health
    sleep 300  # Check every 5 minutes
done
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/economic-monitor.sh"
    
    log "INFO" "Created economic monitoring script"
    log "INFO" "Monitoring setup completed"
}

# Create economic dashboard integration
setup_dashboard_integration() {
    log "INFO" "Setting up dashboard integration..."
    
    # Create dashboard data generator
    cat > "$PROJECT_ROOT/scripts/generate-economic-dashboard-data.sh" << 'EOF'
#!/bin/bash

# Economic Dashboard Data Generator
# Generates data for economic dashboard

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GOALIE_DIR="$PROJECT_ROOT/.goalie"

# Generate dashboard data
generate_dashboard_data() {
    node -e "
        const fs = require('fs');
        
        // Read economic data
        const baselinePath = '$GOALIE_DIR/economic-baseline.json';
        const reportPath = '$GOALIE_DIR/economic-report-weekly.json';
        
        let baseline = null;
        let report = null;
        
        if (fs.existsSync(baselinePath)) {
            baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        }
        
        if (fs.existsSync(reportPath)) {
            report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        }
        
        // Generate dashboard data
        const dashboardData = {
            timestamp: new Date(),
            baseline: baseline,
            currentReport: report,
            kpis: {
                revenue: report?.summary?.totalRevenue || 0,
                profitMargin: report?.summary?.profitMargin || 0,
                utilization: report?.summary?.avgUtilization || 0,
                roi: report?.summary?.roi || 0
            },
            alerts: fs.existsSync('$GOALIE_DIR/economic-alerts.json') ? 
                JSON.parse(fs.readFileSync('$GOALIE_DIR/economic-alerts.json', 'utf8')) : 
                []
        };
        
        console.log(JSON.stringify(dashboardData, null, 2));
    "
}

# Output dashboard data
generate_dashboard_data
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/generate-economic-dashboard-data.sh"
    
    log "INFO" "Created economic dashboard integration"
}

# Restart economic tracking
restart_tracking() {
    log "INFO" "Restarting economic tracking..."
    
    # Stop existing processes
    pkill -f "node.*economic-tracker" || true
    
    # Wait a moment
    sleep 2
    
    # Restart tracking
    initialize_economic_tracking
    
    log "INFO" "Economic tracking restarted"
}

# Status check
check_status() {
    log "INFO" "Checking economic tracking status..."
    
    # Check if processes are running
    if pgrep -f "node.*economic-tracker" > /dev/null; then
        log "INFO" "Economic tracking is running"
    else
        log "WARN" "Economic tracking is not running"
    fi
    
    # Check recent logs
    if [ -f "$LOG_FILE" ]; then
        log "INFO" "Recent economic tracking activity:"
        tail -10 "$LOG_FILE"
    fi
    
    # Check .goalie integration status
    if [ -f "$GOALIE_DIR/economic-baseline.json" ]; then
        log "INFO" ".goalie integration: Active"
        baseline_time=$(stat -c %Y "$GOALIE_DIR/economic-baseline.json" 2>/dev/null || echo "unknown")
        log "INFO" "Last baseline update: $baseline_time"
    else
        log "WARN" ".goalie integration: Not found"
    fi
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up economic tracking resources..."
    
    # Stop tracking processes
    pkill -f "node.*economic-tracker" || true
    pkill -f "economic-monitor.sh" || true
    
    log "INFO" "Cleanup completed"
}

# Show usage
show_usage() {
    echo "Economic Tracking Integration Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  init              Initialize economic tracking system"
    echo "  baseline           Collect baseline economic metrics"
    echo "  report [period]  Generate economic analysis report (daily|weekly|monthly)"
    echo "  integrate          Integrate with production scripts"
    echo "  sync              Sync with .goalie system"
    echo "  monitor           Setup monitoring and alerting"
    echo "  dashboard         Setup dashboard integration"
    echo "  restart           Restart economic tracking"
    echo "  status            Check system status"
    echo "  cleanup           Clean up resources"
    echo ""
    echo "Examples:"
    echo "  $0 init                    # Initialize system"
    echo "  $0 baseline                # Collect baseline"
    echo "  $0 report weekly           # Generate weekly report"
    echo "  $0 integrate               # Integrate with scripts"
}

# Main execution logic
main() {
    local command=${1:-""}
    
    case $command in
        "init")
            check_dependencies
            initialize_economic_tracking
            ;;
        "baseline")
            collect_baseline_metrics
            ;;
        "report")
            generate_economic_report "$2"
            ;;
        "integrate")
            integrate_production_scripts
            ;;
        "sync")
            sync_with_goalie
            ;;
        "monitor")
            setup_monitoring
            ;;
        "dashboard")
            setup_dashboard_integration
            ;;
        "restart")
            restart_tracking
            ;;
        "status")
            check_status
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            echo "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Trap cleanup signals
trap cleanup EXIT INT TERM

# Execute main function
main "$@"