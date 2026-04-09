#!/usr/bin/env python3
"""
Risk Analytics Model Calibration Script
Establishes performance baselines and calibrates risk assessment thresholds
"""

import os
import sys
import json
import sqlite3
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import logging
import argparse
import yaml
import subprocess
from dataclasses import dataclass
from sklearn.metrics import precision_recall_curve, roc_auc_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class CalibrationResult:
    """Results from model calibration"""
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    auc_score: float
    optimal_threshold: float
    false_positive_rate: float
    false_negative_rate: float
    sample_size: int
    calibration_date: datetime

@dataclass
class BaselineMetrics:
    """Baseline performance metrics"""
    processing_time_p50: float
    processing_time_p95: float
    processing_time_p99: float
    throughput_per_hour: float
    memory_usage_avg: float
    cpu_usage_avg: float
    error_rate: float
    availability: float

class ModelCalibrator:
    """Main calibration class"""
    
    def __init__(self, config_path: str = '/etc/risk-analytics/config.yaml'):
        self.config = self._load_config(config_path)
        self.db_path = self.config.get('database_path', '/var/lib/risk-analytics/metrics.db')
        self.calibration_data_path = '/var/lib/risk-analytics/calibration.json'
        self.baselines_path = '/var/lib/risk-analytics/baselines.json'
        self.output_dir = Path('/var/lib/risk-analytics/calibration_reports')
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"ModelCalibrator initialized with config: {config_path}")
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}, using defaults")
            return {}
        except yaml.YAMLError as e:
            logger.error(f"Error parsing config file: {e}")
            return {}
    
    def collect_ground_truth_data(self, days: int = 30) -> pd.DataFrame:
        """Collect ground truth data for calibration"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Get historical decisions with outcomes
            query = '''
            SELECT 
                pr_number,
                risk_level,
                decision,
                confidence,
                processing_time,
                files_analyzed,
                lines_changed,
                is_false_positive,
                override_applied,
                override_reason,
                timestamp
            FROM risk_decisions 
            WHERE timestamp > datetime('now', '-{} days')
            AND confidence IS NOT NULL
            ORDER BY timestamp DESC
            '''.format(days)
            
            df = pd.read_sql_query(query, conn)
            conn.close()
            
            logger.info(f"Collected {len(df)} historical decisions for calibration")
            return df
            
        except Exception as e:
            logger.error(f"Error collecting ground truth data: {e}")
            return pd.DataFrame()
    
    def generate_synthetic_data(self, num_samples: int = 1000) -> pd.DataFrame:
        """Generate synthetic data for calibration if historical data is insufficient"""
        np.random.seed(42)
        
        # Generate synthetic PR characteristics
        data = []
        for i in range(num_samples):
            files_changed = np.random.poisson(5) + 1  # 1-20 files typically
            lines_changed = np.random.exponential(100) + 10  # 10-500 lines typically
            
            # Create risk score based on heuristics
            risk_score = 0.0
            
            # File count risk
            if files_changed > 10:
                risk_score += 0.3
            elif files_changed > 5:
                risk_score += 0.1
            
            # Lines changed risk
            if lines_changed > 500:
                risk_score += 0.4
            elif lines_changed > 200:
                risk_score += 0.2
            elif lines_changed > 100:
                risk_score += 0.1
            
            # Add some randomness
            risk_score += np.random.normal(0, 0.1)
            risk_score = np.clip(risk_score, 0, 1)
            
            # Determine if this should be a true positive
            true_positive = risk_score > 0.5 and np.random.random() < 0.7
            
            # Simulate model decision
            model_threshold = 0.6
            model_decision = 'block' if risk_score > model_threshold else 'allow'
            
            # Determine if this is a false positive
            is_false_positive = (model_decision == 'block' and not true_positive)
            
            data.append({
                'pr_number': 1000 + i,
                'risk_level': 'P0' if risk_score > 0.8 else ('P1' if risk_score > 0.6 else 'P2'),
                'decision': model_decision,
                'confidence': risk_score,
                'processing_time': np.random.lognormal(1, 0.5),  # ~3 seconds average
                'files_analyzed': files_changed,
                'lines_changed': int(lines_changed),
                'is_false_positive': is_false_positive,
                'override_applied': is_false_positive and np.random.random() < 0.8,  # 80% of FP get overridden
                'override_reason': 'false_positive' if is_false_positive else None,
                'timestamp': datetime.utcnow() - timedelta(days=np.random.randint(0, 30))
            })
        
        df = pd.DataFrame(data)
        logger.info(f"Generated {len(df)} synthetic samples for calibration")
        return df
    
    def calculate_calibration_metrics(self, df: pd.DataFrame) -> CalibrationResult:
        """Calculate calibration metrics from decision data"""
        if df.empty:
            logger.warning("No data available for calibration")
            return CalibrationResult(0, 0, 0, 0, 0, 0.5, 0, 0, 0, datetime.utcnow())
        
        # Create ground truth labels (1 = should block, 0 = should allow)
        # We consider override_applied as indication of false positive
        y_true = ~df['is_false_positive']  # Invert because false positive means shouldn't have blocked
        y_scores = df['confidence']
        y_pred = df['decision'] == 'block'
        
        # Calculate metrics
        try:
            auc_score = roc_auc_score(y_true, y_scores) if len(set(y_true)) > 1 else 0.5
        except ValueError:
            auc_score = 0.5
        
        # Confusion matrix
        cm = confusion_matrix(y_true, y_pred)
        
        if cm.shape == (2, 2):
            tn, fp, fn, tp = cm.ravel()
        else:
            # Handle case where we don't have both classes
            tp = fp = fn = tn = 0
            for i, (true_val, pred_val) in enumerate(zip(y_true, y_pred)):
                if true_val and pred_val:
                    tp += 1
                elif not true_val and pred_val:
                    fp += 1
                elif true_val and not pred_val:
                    fn += 1
                else:
                    tn += 1
        
        # Calculate derived metrics
        accuracy = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        false_positive_rate = fp / (fp + tn) if (fp + tn) > 0 else 0
        false_negative_rate = fn / (fn + tp) if (fn + tp) > 0 else 0
        
        # Find optimal threshold using precision-recall curve
        if len(set(y_true)) > 1:
            precision_vals, recall_vals, thresholds = precision_recall_curve(y_true, y_scores)
            f1_scores = 2 * (precision_vals * recall_vals) / (precision_vals + recall_vals)
            f1_scores = np.nan_to_num(f1_scores)
            
            if len(f1_scores) > 0:
                optimal_idx = np.argmax(f1_scores)
                optimal_threshold = thresholds[optimal_idx] if optimal_idx < len(thresholds) else 0.5
            else:
                optimal_threshold = 0.5
        else:
            optimal_threshold = 0.5
        
        result = CalibrationResult(
            accuracy=accuracy,
            precision=precision,
            recall=recall,
            f1_score=f1_score,
            auc_score=auc_score,
            optimal_threshold=optimal_threshold,
            false_positive_rate=false_positive_rate,
            false_negative_rate=false_negative_rate,
            sample_size=len(df),
            calibration_date=datetime.utcnow()
        )
        
        logger.info(f"Calibration metrics calculated: Accuracy={accuracy:.3f}, "
                   f"Precision={precision:.3f}, Recall={recall:.3f}, "
                   f"F1={f1_score:.3f}, AUC={auc_score:.3f}")
        
        return result
    
    def establish_performance_baselines(self, df: pd.DataFrame) -> BaselineMetrics:
        """Establish performance baselines from historical data"""
        if df.empty:
            logger.warning("No data available for baseline establishment")
            return BaselineMetrics(0, 0, 0, 0, 0, 0, 0, 1.0)
        
        # Processing time percentiles
        processing_times = df['processing_time'].dropna()
        if len(processing_times) > 0:
            p50 = np.percentile(processing_times, 50)
            p95 = np.percentile(processing_times, 95)
            p99 = np.percentile(processing_times, 99)
        else:
            p50 = p95 = p99 = 0
        
        # Throughput (decisions per hour)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        time_range = (df['timestamp'].max() - df['timestamp'].min()).total_seconds() / 3600
        throughput = len(df) / time_range if time_range > 0 else 0
        
        # Error rate (false positives + processing errors)
        error_rate = df['is_false_positive'].sum() / len(df) if len(df) > 0 else 0
        
        # Simulate system metrics (in real scenario, these would come from actual monitoring)
        memory_usage_avg = 45.0  # Placeholder
        cpu_usage_avg = 25.0     # Placeholder
        availability = 0.999     # Placeholder
        
        baselines = BaselineMetrics(
            processing_time_p50=p50,
            processing_time_p95=p95,
            processing_time_p99=p99,
            throughput_per_hour=throughput,
            memory_usage_avg=memory_usage_avg,
            cpu_usage_avg=cpu_usage_avg,
            error_rate=error_rate,
            availability=availability
        )
        
        logger.info(f"Performance baselines established: "
                   f"P95 latency={p95:.2f}s, Throughput={throughput:.1f}/hr, "
                   f"Error rate={error_rate:.3f}")
        
        return baselines
    
    def generate_calibration_report(self, calibration: CalibrationResult, 
                                  baselines: BaselineMetrics, df: pd.DataFrame):
        """Generate comprehensive calibration report with visualizations"""
        report_time = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        report_dir = self.output_dir / f"calibration_report_{report_time}"
        report_dir.mkdir(exist_ok=True)
        
        # Generate plots
        if not df.empty:
            self._plot_confidence_distribution(df, report_dir)
            self._plot_processing_time_distribution(df, report_dir)
            self._plot_decision_analysis(df, report_dir)
            self._plot_calibration_curves(df, report_dir)
        
        # Generate summary report
        report = {
            'calibration_summary': {
                'calibration_date': calibration.calibration_date.isoformat(),
                'sample_size': calibration.sample_size,
                'model_performance': {
                    'accuracy': calibration.accuracy,
                    'precision': calibration.precision,
                    'recall': calibration.recall,
                    'f1_score': calibration.f1_score,
                    'auc_score': calibration.auc_score,
                    'optimal_threshold': calibration.optimal_threshold
                },
                'error_rates': {
                    'false_positive_rate': calibration.false_positive_rate,
                    'false_negative_rate': calibration.false_negative_rate
                }
            },
            'performance_baselines': {
                'processing_latency': {
                    'p50_seconds': baselines.processing_time_p50,
                    'p95_seconds': baselines.processing_time_p95,
                    'p99_seconds': baselines.processing_time_p99
                },
                'throughput': {
                    'decisions_per_hour': baselines.throughput_per_hour
                },
                'system_resources': {
                    'memory_usage_avg_percent': baselines.memory_usage_avg,
                    'cpu_usage_avg_percent': baselines.cpu_usage_avg
                },
                'reliability': {
                    'error_rate': baselines.error_rate,
                    'availability': baselines.availability
                }
            },
            'recommendations': self._generate_recommendations(calibration, baselines),
            'thresholds': {
                'blocking_threshold': calibration.optimal_threshold,
                'warning_thresholds': {
                    'false_positive_rate_warning': 0.05,
                    'false_positive_rate_critical': 0.10,
                    'processing_latency_warning': baselines.processing_time_p95 * 1.2,
                    'processing_latency_critical': baselines.processing_time_p95 * 1.5
                }
            }
        }
        
        # Save report
        report_file = report_dir / 'calibration_report.json'
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Generate Markdown summary
        self._generate_markdown_report(report, report_dir)
        
        logger.info(f"Calibration report generated: {report_dir}")
        return report
    
    def _plot_confidence_distribution(self, df: pd.DataFrame, output_dir: Path):
        """Plot confidence score distribution"""
        plt.figure(figsize=(12, 6))
        
        plt.subplot(1, 2, 1)
        plt.hist(df['confidence'], bins=30, alpha=0.7, edgecolor='black')
        plt.xlabel('Confidence Score')
        plt.ylabel('Frequency')
        plt.title('Confidence Score Distribution')
        plt.grid(True, alpha=0.3)
        
        plt.subplot(1, 2, 2)
        blocked = df[df['decision'] == 'block']['confidence']
        allowed = df[df['decision'] == 'allow']['confidence']
        
        plt.hist(blocked, bins=20, alpha=0.7, label='Blocked', color='red')
        plt.hist(allowed, bins=20, alpha=0.7, label='Allowed', color='green')
        plt.xlabel('Confidence Score')
        plt.ylabel('Frequency')
        plt.title('Confidence Distribution by Decision')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(output_dir / 'confidence_distribution.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def _plot_processing_time_distribution(self, df: pd.DataFrame, output_dir: Path):
        """Plot processing time distribution"""
        plt.figure(figsize=(12, 6))
        
        processing_times = df['processing_time'].dropna()
        
        plt.subplot(1, 2, 1)
        plt.hist(processing_times, bins=30, alpha=0.7, edgecolor='black')
        plt.xlabel('Processing Time (seconds)')
        plt.ylabel('Frequency')
        plt.title('Processing Time Distribution')
        plt.grid(True, alpha=0.3)
        
        plt.subplot(1, 2, 2)
        plt.boxplot([processing_times], labels=['Processing Time'])
        plt.ylabel('Time (seconds)')
        plt.title('Processing Time Boxplot')
        plt.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(output_dir / 'processing_time_distribution.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def _plot_decision_analysis(self, df: pd.DataFrame, output_dir: Path):
        """Plot decision analysis charts"""
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # Decision distribution
        decision_counts = df['decision'].value_counts()
        axes[0, 0].pie(decision_counts.values, labels=decision_counts.index, autopct='%1.1f%%')
        axes[0, 0].set_title('Decision Distribution')
        
        # Risk level distribution
        risk_counts = df['risk_level'].value_counts()
        axes[0, 1].bar(risk_counts.index, risk_counts.values)
        axes[0, 1].set_title('Risk Level Distribution')
        axes[0, 1].set_xlabel('Risk Level')
        axes[0, 1].set_ylabel('Count')
        
        # False positive analysis
        fp_data = df.groupby('decision')['is_false_positive'].agg(['sum', 'count'])
        fp_rate = (fp_data['sum'] / fp_data['count']).fillna(0)
        axes[1, 0].bar(fp_rate.index, fp_rate.values)
        axes[1, 0].set_title('False Positive Rate by Decision')
        axes[1, 0].set_xlabel('Decision')
        axes[1, 0].set_ylabel('False Positive Rate')
        
        # Override analysis
        override_data = df.groupby('decision')['override_applied'].agg(['sum', 'count'])
        override_rate = (override_data['sum'] / override_data['count']).fillna(0)
        axes[1, 1].bar(override_rate.index, override_rate.values)
        axes[1, 1].set_title('Override Rate by Decision')
        axes[1, 1].set_xlabel('Decision')
        axes[1, 1].set_ylabel('Override Rate')
        
        plt.tight_layout()
        plt.savefig(output_dir / 'decision_analysis.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def _plot_calibration_curves(self, df: pd.DataFrame, output_dir: Path):
        """Plot calibration and ROC curves"""
        if df['is_false_positive'].nunique() < 2:
            logger.warning("Insufficient data variety for calibration curves")
            return
        
        plt.figure(figsize=(12, 6))
        
        y_true = ~df['is_false_positive']
        y_scores = df['confidence']
        
        # ROC Curve
        plt.subplot(1, 2, 1)
        from sklearn.metrics import roc_curve
        fpr, tpr, _ = roc_curve(y_true, y_scores)
        auc_score = roc_auc_score(y_true, y_scores)
        
        plt.plot(fpr, tpr, label=f'ROC Curve (AUC = {auc_score:.3f})')
        plt.plot([0, 1], [0, 1], 'k--', label='Random')
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('ROC Curve')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # Precision-Recall Curve
        plt.subplot(1, 2, 2)
        precision, recall, _ = precision_recall_curve(y_true, y_scores)
        
        plt.plot(recall, precision, label='PR Curve')
        plt.xlabel('Recall')
        plt.ylabel('Precision')
        plt.title('Precision-Recall Curve')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(output_dir / 'calibration_curves.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_recommendations(self, calibration: CalibrationResult, 
                                baselines: BaselineMetrics) -> List[str]:
        """Generate recommendations based on calibration results"""
        recommendations = []
        
        # Accuracy recommendations
        if calibration.accuracy < 0.8:
            recommendations.append("Model accuracy is below 80%. Consider retraining with more data or feature engineering.")
        
        # False positive rate recommendations
        if calibration.false_positive_rate > 0.1:
            recommendations.append("False positive rate is high (>10%). Consider raising the blocking threshold.")
        elif calibration.false_positive_rate > 0.05:
            recommendations.append("False positive rate is elevated (>5%). Monitor closely and consider threshold adjustment.")
        
        # Performance recommendations
        if baselines.processing_time_p95 > 10:
            recommendations.append("95th percentile processing time exceeds 10 seconds. Investigate performance optimization.")
        
        # Throughput recommendations
        if baselines.throughput_per_hour < 100:
            recommendations.append("Throughput is low (<100/hour). Consider scaling or performance improvements.")
        
        # Threshold recommendations
        if calibration.optimal_threshold != 0.5:
            recommendations.append(f"Consider adjusting blocking threshold to {calibration.optimal_threshold:.3f} for optimal F1 score.")
        
        return recommendations
    
    def _generate_markdown_report(self, report: Dict[str, Any], output_dir: Path):
        """Generate Markdown summary report"""
        md_content = f"""# Risk Analytics Calibration Report
        
**Generated**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

## Executive Summary

The risk analytics model has been calibrated using {report['calibration_summary']['sample_size']} samples.

### Key Metrics
- **Accuracy**: {report['calibration_summary']['model_performance']['accuracy']:.3f}
- **Precision**: {report['calibration_summary']['model_performance']['precision']:.3f}
- **Recall**: {report['calibration_summary']['model_performance']['recall']:.3f}
- **F1 Score**: {report['calibration_summary']['model_performance']['f1_score']:.3f}
- **False Positive Rate**: {report['calibration_summary']['error_rates']['false_positive_rate']:.3f}

### Performance Baselines
- **P95 Processing Latency**: {report['performance_baselines']['processing_latency']['p95_seconds']:.2f}s
- **Throughput**: {report['performance_baselines']['throughput']['decisions_per_hour']:.1f} decisions/hour
- **Error Rate**: {report['performance_baselines']['reliability']['error_rate']:.3f}

## Recommendations

"""
        
        for i, rec in enumerate(report['recommendations'], 1):
            md_content += f"{i}. {rec}\n"
        
        md_content += f"""
## Thresholds

### Current Configuration
- **Blocking Threshold**: {report['thresholds']['blocking_threshold']:.3f}
- **False Positive Warning**: {report['thresholds']['warning_thresholds']['false_positive_rate_warning']:.3f}
- **False Positive Critical**: {report['thresholds']['warning_thresholds']['false_positive_rate_critical']:.3f}

### Monitoring Thresholds
- **Latency Warning**: {report['thresholds']['warning_thresholds']['processing_latency_warning']:.2f}s
- **Latency Critical**: {report['thresholds']['warning_thresholds']['processing_latency_critical']:.2f}s

---

*This report was generated automatically by the Risk Analytics Model Calibrator.*
"""
        
        with open(output_dir / 'calibration_summary.md', 'w') as f:
            f.write(md_content)
    
    def save_calibration_results(self, calibration: CalibrationResult):
        """Save calibration results to configuration files"""
        # Save calibration data
        calibration_data = {
            'accuracy': calibration.accuracy,
            'precision': calibration.precision,
            'recall': calibration.recall,
            'f1_score': calibration.f1_score,
            'auc_score': calibration.auc_score,
            'optimal_threshold': calibration.optimal_threshold,
            'false_positive_rate': calibration.false_positive_rate,
            'false_negative_rate': calibration.false_negative_rate,
            'sample_size': calibration.sample_size,
            'last_updated': calibration.calibration_date.isoformat()
        }
        
        Path(self.calibration_data_path).parent.mkdir(parents=True, exist_ok=True)
        with open(self.calibration_data_path, 'w') as f:
            json.dump(calibration_data, f, indent=2)
        
        logger.info(f"Calibration results saved to {self.calibration_data_path}")
    
    def save_baseline_metrics(self, baselines: BaselineMetrics):
        """Save baseline metrics to configuration files"""
        baseline_data = {
            'processing_time_p50': baselines.processing_time_p50,
            'processing_time_p95': baselines.processing_time_p95,
            'processing_time_p99': baselines.processing_time_p99,
            'throughput_per_hour': baselines.throughput_per_hour,
            'memory_usage_avg': baselines.memory_usage_avg,
            'cpu_usage_avg': baselines.cpu_usage_avg,
            'error_rate': baselines.error_rate,
            'availability': baselines.availability,
            'last_updated': datetime.utcnow().isoformat()
        }
        
        Path(self.baselines_path).parent.mkdir(parents=True, exist_ok=True)
        with open(self.baselines_path, 'w') as f:
            json.dump(baseline_data, f, indent=2)
        
        logger.info(f"Baseline metrics saved to {self.baselines_path}")
    
    def run_calibration(self, use_synthetic: bool = False, days: int = 30) -> Dict[str, Any]:
        """Run complete calibration process"""
        logger.info("Starting model calibration process")
        
        # Collect data
        if use_synthetic:
            df = self.generate_synthetic_data(1000)
        else:
            df = self.collect_ground_truth_data(days)
            if df.empty or len(df) < 10:
                logger.warning("Insufficient historical data, using synthetic data")
                df = self.generate_synthetic_data(1000)
        
        # Calculate calibration metrics
        calibration = self.calculate_calibration_metrics(df)
        
        # Establish baselines
        baselines = self.establish_performance_baselines(df)
        
        # Generate report
        report = self.generate_calibration_report(calibration, baselines, df)
        
        # Save results
        self.save_calibration_results(calibration)
        self.save_baseline_metrics(baselines)
        
        logger.info("Model calibration completed successfully")
        return report

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Risk Analytics Model Calibrator')
    parser.add_argument('--config', default='/etc/risk-analytics/config.yaml',
                       help='Configuration file path')
    parser.add_argument('--synthetic', action='store_true',
                       help='Use synthetic data for calibration')
    parser.add_argument('--days', type=int, default=30,
                       help='Number of days of historical data to use')
    parser.add_argument('--output-summary', action='store_true',
                       help='Output calibration summary to stdout')
    
    args = parser.parse_args()
    
    try:
        calibrator = ModelCalibrator(args.config)
        report = calibrator.run_calibration(use_synthetic=args.synthetic, days=args.days)
        
        if args.output_summary:
            print(json.dumps(report['calibration_summary'], indent=2))
        
        print(f"✅ Model calibration completed successfully")
        print(f"📊 Accuracy: {report['calibration_summary']['model_performance']['accuracy']:.3f}")
        print(f"🎯 F1 Score: {report['calibration_summary']['model_performance']['f1_score']:.3f}")
        print(f"⚠️  False Positive Rate: {report['calibration_summary']['error_rates']['false_positive_rate']:.3f}")
        print(f"🔧 Optimal Threshold: {report['calibration_summary']['model_performance']['optimal_threshold']:.3f}")
        
    except Exception as e:
        logger.error(f"Calibration failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()