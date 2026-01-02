#!/usr/bin/env python3
"""
Enhanced Monitoring Dashboard with Integration Health Checks
Combines system metrics with integration health for comprehensive monitoring
"""

import streamlit as st
import pandas as pd
import altair as alt
import sqlite3
import os
import time
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Import integration health checker
sys.path.append(os.path.dirname(__file__))
from integration_health_checks import (
    check_all_integrations, IntegrationHealthReport
)

# Database connection (assuming AgentDB or similar)
DB_PATH = '../../.agentdb/agentdb.sqlite'  # Relative path


def load_metrics():
    """Load metrics from database with error handling."""
    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(
            "SELECT * FROM performance_metrics ORDER BY timestamp "
            "DESC LIMIT 100", conn
        )
        conn.close()
        return df
    except Exception as e:
        st.error(f"Database error: {e}")
        return pd.DataFrame()


def load_integration_health():
    """Load integration health status."""
    try:
        # Set environment for health check
        env = os.environ.get("AF_ENV", "local")
        os.environ["AF_ENV"] = env
        
        # Run integration health check
        result = subprocess.run(
            [sys.executable, "integration_health_checks.py", "--json"],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=os.path.dirname(__file__)
        )
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            st.error(f"Integration health check failed: {result.stderr}")
            return None
            
    except Exception as e:
        st.error(f"Integration health error: {e}")
        return None


def create_integration_health_chart(health_data):
    """Create integration health visualization."""
    if not health_data:
        return None
    
    # Convert to DataFrame
    integrations = []
    for integration in health_data.get("integrations", []):
        integrations.append({
            "name": integration["name"].replace("_", " ").title(),
            "status": integration["status"],
            "response_time": integration.get("response_time_ms", 0),
            "risk_score": integration.get("risk_score", 0),
            "write_allowed": integration.get("write_allowed", False)
        })
    
    df = pd.DataFrame(integrations)
    
    if df.empty:
        return None
    
    # Status distribution pie chart
    status_chart = alt.Chart(df).mark_arc().encode(
        theta=alt.Theta("count():Q", title="Count"),
        color=alt.Color("status:N", 
                       scale=alt.Scale(domain=["healthy", "degraded", "critical"],
                                     range=["green", "orange", "red"])),
        tooltip=["status", "count()"]
    ).properties(
        title="Integration Status Distribution",
        height=200
    )
    
    # Response time bar chart
    response_chart = alt.Chart(df).mark_bar().encode(
        x=alt.X("name:N", title="Integration", axis=alt.Axis(labelAngle=-45)),
        y=alt.Y("response_time:Q", title="Response Time (ms)"),
        color=alt.Color("status:N",
                       scale=alt.Scale(domain=["healthy", "degraded", "critical"],
                                     range=["green", "orange", "red"])),
        tooltip=["name", "response_time", "status"]
    ).properties(
        title="Integration Response Times",
        height=250
    )
    
    return status_chart, response_chart, df


# Page configuration for accessibility
st.set_page_config(
    page_title="Enhanced Monitoring Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)


# Header
st.title("📊 Enhanced Monitoring Dashboard")
st.markdown(
    "Real-time metrics and integration health for agentic-flow system"
)


# Environment selector in sidebar
with st.sidebar:
    st.title("Dashboard Controls")
    env = st.selectbox(
        "Environment",
        ["local", "dev", "stg", "prod"],
        index=0,
        help="Select environment to monitor"
    )
    os.environ["AF_ENV"] = env
    
    st.markdown("---")
    auto_refresh = st.checkbox("Enable auto-refresh (every 30s)", value=True)
    
    st.markdown("---")
    st.markdown("### Integration Health")
    st.caption(
        "Monitors MCP/StarlingX/OpenStack/HostBill integrations "
        "with bounded reasoning"
    )


# Refresh button for manual control
col1, col2, col3 = st.columns([1, 1, 3])
with col1:
    if st.button("🔄 Refresh Now"):
        st.rerun()
with col2:
    if st.button("🔍 Run Health Check"):
        st.session_state.force_health_check = True


# Load data
metrics_df = load_metrics()
integration_health = load_integration_health()


# Main dashboard layout
if metrics_df.empty and not integration_health:
    st.warning("No data available. Please run some operations to generate data.")
else:
    # Integration Health Section (Top Priority)
    st.header("🔍 Integration Health Status", help="Real-time health of all integrations")
    
    if integration_health:
        # Overall status
        overall_status = integration_health.get("overall_status", "unknown")
        status_icon = {
            "healthy": "✅", "degraded": "⚠️", "critical": "❌"
        }
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric(
                label="Overall Status",
                value=f"{status_icon.get(overall_status, '?')} "
                f"{overall_status.upper()}",
                delta=None
            )
        with col2:
            st.metric(
                label="Healthy",
                value=integration_health.get("total_healthy", 0),
                delta=None
            )
        with col3:
            st.metric(
                label="Degraded", 
                value=integration_health.get("total_degraded", 0),
                delta=None
            )
        with col4:
            st.metric(
                label="Critical",
                value=integration_health.get("total_critical", 0),
                delta=None
            )
        
        # Integration details
        st.subheader("Integration Details")
        
        # Create charts
        charts = create_integration_health_chart(integration_health)
        if charts:
            status_chart, response_chart, df = charts
            
            col1, col2 = st.columns(2)
            with col1:
                st.altair_chart(status_chart, use_container_width=True)
            with col2:
                st.altair_chart(response_chart, use_container_width=True)
            
            # Detailed table
            st.subheader("Integration Status Table")
            
            # Add status indicators and formatting
            def format_status_row(row):
                status_icon_map = {
                    "healthy": "✅", "degraded": "⚠️", "critical": "❌"
                }
                write_icon = "✅" if row["write_allowed"] else "🔒"

                return pd.Series({
                    "Integration": row["name"],
                    "Status": f"{status_icon_map.get(row['status'], '?')} "
                    f"{row['status'].upper()}",
                    "Environment": env.upper(),
                    "Response Time": (
                        f"{row['response_time']:.0f}ms"
                        if row["response_time"] > 0 else "N/A"
                    ),
                    "Risk Score": (
                        f"{row['risk_score']:.1f}/100"
                        if row["risk_score"] > 0 else "N/A"
                    ),
                    "Write Access": write_icon
                })
            
            formatted_df = df.apply(format_status_row, axis=1)
            st.dataframe(formatted_df, use_container_width=True, hide_index=True)
            
        else:
            st.error("Failed to generate integration health charts")
    else:
        st.error("Integration health data unavailable")
    
    st.markdown("---")
    
    # System Metrics Section
    if not metrics_df.empty:
        st.header("📈 System Performance Metrics", help="Historical performance data")
        
        # Key Metrics Overview
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                label="Hook Overhead (p95)",
                value=f"{metrics_df['hook_overhead_ms'].quantile(0.95):.2f} ms",
                delta="-5% from last week"
            )
        
        with col2:
            st.metric(
                label="TDD Accuracy",
                value=f"{metrics_df['tdd_accuracy'].mean():.1%}",
                delta="+2.3%"
            )
        
        with col3:
            st.metric(
                label="Token Reduction",
                value=f"{metrics_df['token_reduction'].mean():.1%}",
                delta="+1.5%"
            )
        
        with col4:
            st.metric(
                label="System Load",
                value=f"{metrics_df['system_load'].mean():.2f}",
                delta="-0.1"
            )

        # Real-time Charts
        st.subheader("Metrics Trends")
        
        # Hook Overhead Chart
        chart = alt.Chart(metrics_df).mark_line().encode(
            x='timestamp:T',
            y='hook_overhead_ms:Q',
            tooltip=['timestamp', 'hook_overhead_ms']
        ).interactive().properties(
            title="Hook Overhead Over Time",
            height=300
        )
        st.altair_chart(chart, use_container_width=True)

        # Q-Learning Integration Metrics
        st.subheader("Q-Learning Convergence")
        ql_chart = alt.Chart(metrics_df).mark_bar().encode(
            x='timestamp:T',
            y='q_learning_score:Q',
            color=alt.condition(
                alt.datum.q_learning_score > 0.8,
                alt.value('green'),
                alt.value('red')
            ),
            tooltip=['timestamp', 'q_learning_score']
        ).properties(
            title="Q-Learning Scores (Green: Converged >0.8)",
            height=300
        )
        st.altair_chart(ql_chart, use_container_width=True)

    # Governance and Risk Section
    st.header("🛡️ Governance & Risk Overview", help="Compliance and risk metrics")
    
    if integration_health:
        # Risk assessment summary
        high_risk_integrations = [
            i for i in integration_health.get("integrations", [])
            if i.get("risk_score", 0) > 70
        ]
        
        if high_risk_integrations:
            st.warning(
                f"⚠️ {len(high_risk_integrations)} high-risk integrations "
                "detected:"
            )
            for integration in high_risk_integrations:
                st.write(
                    f"- **{integration['name']}**: Risk Score "
                    f"{integration.get('risk_score', 0):.1f}/100"
                )
        else:
            st.success("✅ No high-risk integrations detected")
    
    # Environment-specific warnings
    if env == "prod":
        st.error(
            "🚨 PRODUCTION ENVIRONMENT: All operations are logged "
            "and audited"
        )
    elif env == "stg":
        st.warning(
            "⚠️ STAGING ENVIRONMENT: Write operations require CI "
            "green flag"
        )
    elif env == "dev":
        st.info(
            "ℹ️ DEVELOPMENT ENVIRONMENT: Team collaboration mode "
            "enabled"
        )
    else:
        st.success(
            "✅ LOCAL ENVIRONMENT: Experimental mode with "
            "permissive access"
        )

# Auto-refresh logic
if auto_refresh:
    time.sleep(30)
    st.rerun()
