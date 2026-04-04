#!/usr/bin/env python3
"""
Enhanced Payment Processing with Stripe Integration
Handles commission calculations, payouts, and financial compliance
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import stripe
from decimal import Decimal, ROUND_HALF_UP
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PaymentStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PayoutFrequency(Enum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    ON_DEMAND = "on_demand"


class PaymentMethod(Enum):
    STRIPE = "stripe"
    PAYPAL = "paypal"
    WIRE_TRANSFER = "wire_transfer"
    CHECK = "check"


@dataclass
class CommissionCalculation:
    """Commission calculation result"""
    affiliate_id: str
    conversion_id: str
    revenue: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    bonus_amount: Decimal
    total_payout: Decimal
    calculation_date: datetime
    tier_multiplier: Decimal
    performance_bonus: Decimal


@dataclass
class PayoutRequest:
    """Payout request data"""
    payout_id: str
    affiliate_id: str
    amount: Decimal
    currency: str
    payment_method: PaymentMethod
    status: PaymentStatus
    created_at: datetime
    processed_at: Optional[datetime]
    transaction_id: Optional[str]
    failure_reason: Optional[str]
    metadata: Dict[str, Any]


@dataclass
class PaymentSettings:
    """Affiliate payment settings"""
    affiliate_id: str
    payment_method: PaymentMethod
    payout_frequency: PayoutFrequency
    stripe_account_id: Optional[str]
    paypal_email: Optional[str]
    wire_transfer_details: Optional[Dict[str, str]]
    minimum_payout_amount: Decimal
    tax_withholding_rate: Decimal
    compliance_verified: bool


class StripePaymentProcessor:
    """Enhanced Stripe payment processing with fraud detection"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        stripe.api_key = config.get("stripe_api_key")
        self.webhook_secret = config.get("stripe_webhook_secret")
        self.db_path = config.get("database_path", "affiliate_platform.db")
        
        # Commission tiers and rates
        self.commission_tiers = config.get("commission_tiers", {
            "standard": Decimal("0.10"),
            "premium": Decimal("0.15"),
            "enterprise": Decimal("0.20")
        })
        
        # Performance bonuses
        self.performance_bonuses = config.get("performance_bonuses", {
            "high_volume": {"threshold": 100, "bonus": Decimal("0.02")},
            "high_value": {"threshold": Decimal("100.00"), "bonus": Decimal("0.01")},
            "retention": {"threshold": 0.8, "bonus": Decimal("0.015")}
        })
        
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize payment processing database schema"""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                -- Commission calculations table
                CREATE TABLE IF NOT EXISTS commission_calculations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    affiliate_id TEXT NOT NULL,
                    conversion_id TEXT NOT NULL,
                    revenue DECIMAL(10,2) NOT NULL,
                    commission_rate DECIMAL(5,4) NOT NULL,
                    commission_amount DECIMAL(10,2) NOT NULL,
                    bonus_amount DECIMAL(10,2) DEFAULT 0.00,
                    total_payout DECIMAL(10,2) NOT NULL,
                    calculation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    tier_multiplier DECIMAL(5,4) DEFAULT 1.0,
                    performance_bonus DECIMAL(10,2) DEFAULT 0.00,
                    UNIQUE(conversion_id)
                );
                
                -- Payout requests table
                CREATE TABLE IF NOT EXISTS payout_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    payout_id TEXT UNIQUE NOT NULL,
                    affiliate_id TEXT NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    currency TEXT DEFAULT 'USD',
                    payment_method TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processed_at DATETIME,
                    transaction_id TEXT,
                    failure_reason TEXT,
                    metadata TEXT,
                    INDEX idx_affiliate_status (affiliate_id, status),
                    INDEX idx_created_at (created_at)
                );
                
                -- Payment settings table
                CREATE TABLE IF NOT EXISTS payment_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    affiliate_id TEXT UNIQUE NOT NULL,
                    payment_method TEXT NOT NULL,
                    payout_frequency TEXT NOT NULL,
                    stripe_account_id TEXT,
                    paypal_email TEXT,
                    wire_transfer_details TEXT,
                    minimum_payout_amount DECIMAL(10,2) DEFAULT 50.00,
                    tax_withholding_rate DECIMAL(5,4) DEFAULT 0.00,
                    compliance_verified BOOLEAN DEFAULT FALSE,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Transaction audit log
                CREATE TABLE IF NOT EXISTS transaction_audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_id TEXT NOT NULL,
                    affiliate_id TEXT NOT NULL,
                    transaction_type TEXT NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    status TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    details TEXT
                );
                
                -- Fraud detection alerts
                CREATE TABLE IF NOT EXISTS payment_fraud_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_id TEXT UNIQUE NOT NULL,
                    affiliate_id TEXT NOT NULL,
                    payout_id TEXT,
                    alert_type TEXT NOT NULL,
                    risk_score DECIMAL(5,4) NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    resolved_at DATETIME
                );
                
                -- Compliance tracking
                CREATE TABLE IF NOT EXISTS compliance_tracking (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    affiliate_id TEXT NOT NULL,
                    compliance_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    verified_at DATETIME,
                    expires_at DATETIME,
                    documents TEXT,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            """)
    
    async def calculate_commission(self, conversion_data: Dict[str, Any]) -> CommissionCalculation:
        """
        Calculate commission with AI-enhanced factors and performance bonuses
        """
        affiliate_id = conversion_data["affiliate_id"]
        conversion_id = conversion_data["conversion_id"]
        revenue = Decimal(str(conversion_data["revenue"]))
        
        # Get affiliate tier and base commission rate
        affiliate_tier = await self._get_affiliate_tier(affiliate_id)
        base_commission_rate = self.commission_tiers.get(affiliate_tier, Decimal("0.10"))
        
        # Apply AI-powered adjustments
        ai_adjustment = await self._get_ai_commission_adjustment(conversion_data)
        adjusted_rate = base_commission_rate * (1 + ai_adjustment)
        
        # Calculate performance bonuses
        performance_bonus = await self._calculate_performance_bonuses(affiliate_id, conversion_data)
        
        # Apply tier multiplier
        tier_multiplier = await self._get_tier_multiplier(affiliate_id)
        
        # Calculate final commission
        commission_amount = revenue * adjusted_rate * tier_multiplier
        total_payout = commission_amount + performance_bonus
        
        # Create commission calculation record
        calculation = CommissionCalculation(
            affiliate_id=affiliate_id,
            conversion_id=conversion_id,
            revenue=revenue,
            commission_rate=adjusted_rate,
            commission_amount=commission_amount,
            bonus_amount=performance_bonus,
            total_payout=total_payout,
            calculation_date=datetime.now(),
            tier_multiplier=tier_multiplier,
            performance_bonus=performance_bonus
        )
        
        # Save to database
        await self._save_commission_calculation(calculation)
        
        return calculation
    
    async def _get_affiliate_tier(self, affiliate_id: str) -> str:
        """Get affiliate tier based on performance metrics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT tier FROM affiliate_partners WHERE affiliate_id = ?
            """, (affiliate_id,))
            
            result = cursor.fetchone()
            return result[0] if result else "standard"
    
    async def _get_ai_commission_adjustment(self, conversion_data: Dict[str, Any]) -> Decimal:
        """
        Use AI to calculate commission adjustments based on conversion quality
        """
        # Factors to consider:
        # - Attribution confidence
        # - User engagement metrics
        # - Fraud risk score
        # - Content relevance
        # - Seasonal factors
        
        attribution_confidence = Decimal(str(conversion_data.get("attribution_confidence", 0.85)))
        fraud_risk_score = Decimal(str(conversion_data.get("fraud_risk_score", 0.1)))
        engagement_score = Decimal(str(conversion_data.get("engagement_score", 0.7)))
        
        # Calculate AI adjustment (range: -0.1 to +0.2)
        base_adjustment = (attribution_confidence - Decimal("0.5")) * Decimal("0.2")
        fraud_penalty = fraud_risk_score * Decimal("0.3")
        engagement_bonus = (engagement_score - Decimal("0.5")) * Decimal("0.1")
        
        ai_adjustment = base_adjustment - fraud_penalty + engagement_bonus
        
        # Clamp to reasonable range
        ai_adjustment = max(Decimal("-0.1"), min(Decimal("0.2"), ai_adjustment))
        
        return ai_adjustment
    
    async def _calculate_performance_bonuses(self, affiliate_id: str, conversion_data: Dict[str, Any]) -> Decimal:
        """Calculate performance bonuses based on affiliate metrics"""
        total_bonus = Decimal("0.00")
        
        # Get affiliate performance metrics
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_conversions,
                    AVG(revenue) as avg_revenue,
                    COUNT(DISTINCT user_id) as unique_users
                FROM affiliate_conversions
                WHERE affiliate_id = ? AND timestamp >= datetime('now', '-30 days')
            """, (affiliate_id,))
            
            metrics = cursor.fetchone()
            total_conversions, avg_revenue, unique_users = metrics
        
        # High volume bonus
        if total_conversions >= self.performance_bonuses["high_volume"]["threshold"]:
            volume_bonus = Decimal(str(conversion_data["revenue"])) * \
                        self.performance_bonuses["high_volume"]["bonus"]
            total_bonus += volume_bonus
        
        # High value bonus
        conversion_revenue = Decimal(str(conversion_data["revenue"]))
        if conversion_revenue >= self.performance_bonuses["high_value"]["threshold"]:
            value_bonus = conversion_revenue * \
                        self.performance_bonuses["high_value"]["bonus"]
            total_bonus += value_bonus
        
        # Retention bonus (high repeat customer rate)
        if unique_users > 0:
            retention_rate = total_conversions / unique_users
            if retention_rate >= self.performance_bonuses["retention"]["threshold"]:
                retention_bonus = conversion_revenue * \
                              self.performance_bonuses["retention"]["bonus"]
                total_bonus += retention_bonus
        
        return total_bonus.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    
    async def _get_tier_multiplier(self, affiliate_id: str) -> Decimal:
        """Get tier multiplier based on affiliate performance"""
        # Advanced affiliates get higher multipliers
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_conversions,
                    SUM(revenue) as total_revenue
                FROM affiliate_conversions
                WHERE affiliate_id = ? AND timestamp >= datetime('now', '-90 days')
            """, (affiliate_id,))
            
            metrics = cursor.fetchone()
            total_conversions, total_revenue = metrics
        
        # Calculate multiplier based on performance
        if total_conversions >= 500 and total_revenue >= 25000:
            return Decimal("1.2")  # Enterprise level
        elif total_conversions >= 100 and total_revenue >= 5000:
            return Decimal("1.1")  # Premium level
        else:
            return Decimal("1.0")  # Standard level
    
    async def _save_commission_calculation(self, calculation: CommissionCalculation):
        """Save commission calculation to database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO commission_calculations
                (affiliate_id, conversion_id, revenue, commission_rate, commission_amount,
                 bonus_amount, total_payout, calculation_date, tier_multiplier, performance_bonus)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                calculation.affiliate_id,
                calculation.conversion_id,
                calculation.revenue,
                calculation.commission_rate,
                calculation.commission_amount,
                calculation.bonus_amount,
                calculation.total_payout,
                calculation.calculation_date,
                calculation.tier_multiplier,
                calculation.performance_bonus
            ))
    
    async def create_payout_request(self, affiliate_id: str, amount: Optional[Decimal] = None) -> PayoutRequest:
        """
        Create payout request with fraud detection and compliance checks
        """
        # Get payment settings
        payment_settings = await self._get_payment_settings(affiliate_id)
        
        if not payment_settings:
            raise ValueError(f"No payment settings found for affiliate {affiliate_id}")
        
        # Calculate total available balance
        available_balance = await self._calculate_available_balance(affiliate_id)
        
        # Use provided amount or total available balance
        payout_amount = amount or available_balance
        
        # Check minimum payout requirement
        if payout_amount < payment_settings.minimum_payout_amount:
            raise ValueError(f"Payout amount ${payout_amount} below minimum ${payment_settings.minimum_payout_amount}")
        
        # Fraud detection check
        fraud_check = await self._fraud_detection_check(affiliate_id, payout_amount)
        if fraud_check["risk_score"] > Decimal("0.8"):
            raise ValueError(f"High fraud risk detected: {fraud_check['reason']}")
        
        # Compliance verification
        if not payment_settings.compliance_verified:
            raise ValueError("Affiliate compliance verification required")
        
        # Create payout request
        payout_id = f"payout_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        payout_request = PayoutRequest(
            payout_id=payout_id,
            affiliate_id=affiliate_id,
            amount=payout_amount,
            currency="USD",
            payment_method=payment_settings.payment_method,
            status=PaymentStatus.PENDING,
            created_at=datetime.now(),
            processed_at=None,
            transaction_id=None,
            failure_reason=None,
            metadata={"fraud_check": fraud_check, "compliance_verified": payment_settings.compliance_verified}
        )
        
        # Save to database
        await self._save_payout_request(payout_request)
        
        return payout_request
    
    async def _get_payment_settings(self, affiliate_id: str) -> Optional[PaymentSettings]:
        """Get payment settings for affiliate"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT affiliate_id, payment_method, payout_frequency, stripe_account_id,
                       paypal_email, wire_transfer_details, minimum_payout_amount,
                       tax_withholding_rate, compliance_verified
                FROM payment_settings
                WHERE affiliate_id = ?
            """, (affiliate_id,))
            
            result = cursor.fetchone()
            if not result:
                return None
            
            return PaymentSettings(
                affiliate_id=result[0],
                payment_method=PaymentMethod(result[1]),
                payout_frequency=PayoutFrequency(result[2]),
                stripe_account_id=result[3],
                paypal_email=result[4],
                wire_transfer_details=json.loads(result[5]) if result[5] else None,
                minimum_payout_amount=Decimal(str(result[6])),
                tax_withholding_rate=Decimal(str(result[7])),
                compliance_verified=bool(result[8])
            )
    
    async def _calculate_available_balance(self, affiliate_id: str) -> Decimal:
        """Calculate available balance for affiliate"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Sum of unpaid commissions
            cursor.execute("""
                SELECT COALESCE(SUM(total_payout), 0) as total_commissions
                FROM commission_calculations cc
                LEFT JOIN payout_requests pr ON cc.conversion_id = pr.conversion_id
                WHERE cc.affiliate_id = ? AND pr.payout_id IS NULL
            """, (affiliate_id,))
            
            total_commissions = Decimal(str(cursor.fetchone()[0]))
            
            # Subtract tax withholding
            payment_settings = await self._get_payment_settings(affiliate_id)
            tax_rate = payment_settings.tax_withholding_rate if payment_settings else Decimal("0.00")
            tax_withholding = total_commissions * tax_rate
            
            return (total_commissions - tax_withholding).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    
    async def _fraud_detection_check(self, affiliate_id: str, amount: Decimal) -> Dict[str, Any]:
        """
        Advanced fraud detection for payout requests
        """
        risk_score = Decimal("0.00")
        risk_factors = []
        
        # Check for unusual payout patterns
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Recent payout frequency
            cursor.execute("""
                SELECT COUNT(*) as recent_payouts, AVG(amount) as avg_amount
                FROM payout_requests
                WHERE affiliate_id = ? AND created_at >= datetime('now', '-7 days')
            """, (affiliate_id,))
            
            result = cursor.fetchone()
            recent_payouts, avg_amount = result
            
            if recent_payouts > 3:
                risk_score += Decimal("0.3")
                risk_factors.append("high_payout_frequency")
            
            # Amount anomaly detection
            if avg_amount > 0:
                amount_ratio = amount / Decimal(str(avg_amount))
                if amount_ratio > Decimal("3.0"):
                    risk_score += Decimal("0.4")
                    risk_factors.append("unusually_high_amount")
            
            # Check for sudden increase in conversions
            cursor.execute("""
                SELECT COUNT(*) as recent_conversions
                FROM commission_calculations
                WHERE affiliate_id = ? AND calculation_date >= datetime('now', '-24 hours')
            """, (affiliate_id,))
            
            recent_conversions = cursor.fetchone()[0]
            if recent_conversions > 50:
                risk_score += Decimal("0.3")
                risk_factors.append("sudden_conversion_spike")
        
        # Cap risk score at 1.0
        risk_score = min(Decimal("1.0"), risk_score)
        
        return {
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "reason": ", ".join(risk_factors) if risk_factors else "No risk factors detected"
        }
    
    async def _save_payout_request(self, payout_request: PayoutRequest):
        """Save payout request to database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO payout_requests
                (payout_id, affiliate_id, amount, currency, payment_method, status,
                 created_at, processed_at, transaction_id, failure_reason, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payout_request.payout_id,
                payout_request.affiliate_id,
                payout_request.amount,
                payout_request.currency,
                payout_request.payment_method.value,
                payout_request.status.value,
                payout_request.created_at,
                payout_request.processed_at,
                payout_request.transaction_id,
                payout_request.failure_reason,
                json.dumps(payout_request.metadata)
            ))
    
    async def process_payout_stripe(self, payout_request: PayoutRequest) -> Dict[str, Any]:
        """
        Process payout through Stripe with enhanced security
        """
        try:
            # Update status to processing
            await self._update_payout_status(payout_request.payout_id, PaymentStatus.PROCESSING)
            
            # Get payment settings
            payment_settings = await self._get_payment_settings(payout_request.affiliate_id)
            
            if not payment_settings.stripe_account_id:
                raise ValueError("No Stripe account ID configured")
            
            # Create Stripe transfer
            transfer = stripe.Transfer.create(
                amount=int(payout_request.amount * 100),  # Convert to cents
                currency="USD",
                destination=payment_settings.stripe_account_id,
                transfer_group=f"affiliate_payout_{payout_request.payout_id}",
                metadata={
                    "affiliate_id": payout_request.affiliate_id,
                    "payout_id": payout_request.payout_id,
                    "processed_by": "enhanced_affiliate_platform"
                }
            )
            
            # Update payout request with transaction details
            await self._update_payout_transaction(
                payout_request.payout_id,
                transfer.id,
                PaymentStatus.COMPLETED
            )
            
            # Log transaction for audit
            await self._log_transaction(
                transfer.id,
                payout_request.affiliate_id,
                "payout",
                payout_request.amount,
                "completed",
                {"payout_id": payout_request.payout_id, "method": "stripe"}
            )
            
            return {
                "success": True,
                "transaction_id": transfer.id,
                "status": "completed",
                "message": "Payout processed successfully"
            }
            
        except stripe.error.StripeError as e:
            error_message = str(e)
            
            # Update payout request with failure
            await self._update_payout_transaction(
                payout_request.payout_id,
                None,
                PaymentStatus.FAILED,
                error_message
            )
            
            # Log failed transaction
            await self._log_transaction(
                payout_request.payout_id,
                payout_request.affiliate_id,
                "payout",
                payout_request.amount,
                "failed",
                {"error": error_message, "method": "stripe"}
            )
            
            return {
                "success": False,
                "error": error_message,
                "status": "failed"
            }
    
    async def _update_payout_status(self, payout_id: str, status: PaymentStatus):
        """Update payout request status"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE payout_requests
                SET status = ?, processed_at = ?
                WHERE payout_id = ?
            """, (status.value, datetime.now(), payout_id))
    
    async def _update_payout_transaction(self, payout_id: str, transaction_id: Optional[str], 
                                      status: PaymentStatus, failure_reason: Optional[str] = None):
        """Update payout request with transaction details"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE payout_requests
                SET transaction_id = ?, status = ?, processed_at = ?, failure_reason = ?
                WHERE payout_id = ?
            """, (transaction_id, status.value, datetime.now(), failure_reason, payout_id))
    
    async def _log_transaction(self, transaction_id: str, affiliate_id: str, 
                             transaction_type: str, amount: Decimal, status: str, 
                             details: Dict[str, Any]):
        """Log transaction for audit purposes"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO transaction_audit_log
                (transaction_id, affiliate_id, transaction_type, amount, status, details)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (transaction_id, affiliate_id, transaction_type, amount, status, json.dumps(details)))
    
    async def process_webhook_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process Stripe webhook events for real-time payment updates
        """
        try:
            event_type = event_data["type"]
            event_object = event_data["data"]["object"]
            
            if event_type == "transfer.paid":
                # Transfer completed successfully
                payout_id = event_object.get("metadata", {}).get("payout_id")
                if payout_id:
                    await self._update_payout_transaction(
                        payout_id,
                        event_object["id"],
                        PaymentStatus.COMPLETED
                    )
                    
                    return {
                        "status": "processed",
                        "payout_id": payout_id,
                        "event": "transfer_completed"
                    }
            
            elif event_type == "transfer.failed":
                # Transfer failed
                payout_id = event_object.get("metadata", {}).get("payout_id")
                if payout_id:
                    await self._update_payout_transaction(
                        payout_id,
                        event_object["id"],
                        PaymentStatus.FAILED,
                        event_object.get("failure_message", "Unknown error")
                    )
                    
                    return {
                        "status": "processed",
                        "payout_id": payout_id,
                        "event": "transfer_failed",
                        "error": event_object.get("failure_message")
                    }
            
            elif event_type == "transfer.reversed":
                # Transfer reversed (chargeback)
                payout_id = event_object.get("metadata", {}).get("payout_id")
                if payout_id:
                    await self._update_payout_transaction(
                        payout_id,
                        event_object["id"],
                        PaymentStatus.REFUNDED
                    )
                    
                    return {
                        "status": "processed",
                        "payout_id": payout_id,
                        "event": "transfer_reversed"
                    }
            
            return {
                "status": "ignored",
                "event_type": event_type,
                "message": "Event not relevant for payout processing"
            }
            
        except Exception as e:
            logger.error(f"Error processing webhook event: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def generate_compliance_report(self, affiliate_id: str, start_date: datetime, 
                                     end_date: datetime) -> Dict[str, Any]:
        """
        Generate comprehensive compliance report for affiliate
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get transaction summary
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_amount,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions
                FROM transaction_audit_log
                WHERE affiliate_id = ? AND created_at BETWEEN ? AND ?
            """, (affiliate_id, start_date, end_date))
            
            transaction_summary = cursor.fetchone()
            
            # Get fraud alerts
            cursor.execute("""
                SELECT alert_type, risk_score, description, status
                FROM payment_fraud_alerts
                WHERE affiliate_id = ? AND created_at BETWEEN ? AND ?
                ORDER BY created_at DESC
            """, (affiliate_id, start_date, end_date))
            
            fraud_alerts = [
                {
                    "type": row[0],
                    "risk_score": float(row[1]),
                    "description": row[2],
                    "status": row[3]
                }
                for row in cursor.fetchall()
            ]
            
            # Get compliance status
            cursor.execute("""
                SELECT compliance_type, status, verified_at, expires_at
                FROM compliance_tracking
                WHERE affiliate_id = ?
                ORDER BY compliance_type
            """, (affiliate_id,))
            
            compliance_status = [
                {
                    "type": row[0],
                    "status": row[1],
                    "verified_at": row[2],
                    "expires_at": row[3]
                }
                for row in cursor.fetchall()
            ]
        
        return {
            "affiliate_id": affiliate_id,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "transaction_summary": {
                "total_transactions": transaction_summary[0] or 0,
                "total_amount": float(transaction_summary[1] or 0),
                "completed_transactions": transaction_summary[2] or 0,
                "failed_transactions": transaction_summary[3] or 0,
                "success_rate": (transaction_summary[2] or 0) / max(1, transaction_summary[0] or 1) * 100
            },
            "fraud_alerts": fraud_alerts,
            "compliance_status": compliance_status,
            "generated_at": datetime.now().isoformat()
        }
    
    async def update_payment_settings(self, affiliate_id: str, settings: Dict[str, Any]) -> bool:
        """
        Update payment settings for affiliate with validation
        """
        try:
            # Validate settings
            if settings["payment_method"] == "stripe" and not settings.get("stripe_account_id"):
                raise ValueError("Stripe account ID required for Stripe payments")
            
            if settings["payment_method"] == "paypal" and not settings.get("paypal_email"):
                raise ValueError("PayPal email required for PayPal payments")
            
            # Update database
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO payment_settings
                    (affiliate_id, payment_method, payout_frequency, stripe_account_id,
                     paypal_email, wire_transfer_details, minimum_payout_amount,
                     tax_withholding_rate, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    affiliate_id,
                    settings["payment_method"],
                    settings.get("payout_frequency", "monthly"),
                    settings.get("stripe_account_id"),
                    settings.get("paypal_email"),
                    json.dumps(settings.get("wire_transfer_details", {})),
                    Decimal(str(settings.get("minimum_payout_amount", 50))),
                    Decimal(str(settings.get("tax_withholding_rate", 0))),
                    datetime.now()
                ))
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating payment settings: {e}")
            return False


# Example usage
if __name__ == "__main__":
    async def main():
        config = {
            "stripe_api_key": os.getenv("STRIPE_API_KEY"),
            "stripe_webhook_secret": os.getenv("STRIPE_WEBHOOK_SECRET"),
            "database_path": "affiliate_platform.db"
        }
        
        processor = StripePaymentProcessor(config)
        
        # Example commission calculation
        conversion_data = {
            "affiliate_id": "AFF001",
            "conversion_id": "conv_123",
            "revenue": 150.00,
            "attribution_confidence": 0.92,
            "fraud_risk_score": 0.05,
            "engagement_score": 0.85
        }
        
        commission = await processor.calculate_commission(conversion_data)
        print(f"Commission calculated: ${commission.total_payout}")
        
        # Example payout request
        payout = await processor.create_payout_request("AFF001")
        print(f"Payout request created: {payout.payout_id}")
        
        # Process payout
        result = await processor.process_payout_stripe(payout)
        print(f"Payout processing result: {result}")
    
    import os
    asyncio.run(main())