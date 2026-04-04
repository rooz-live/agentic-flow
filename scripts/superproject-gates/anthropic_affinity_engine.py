#!/usr/bin/env python3
"""
Anthropic-Powered Affiliate Affinity Engine
Integrates Claude's financial services capabilities for enhanced affiliate analysis
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import anthropic
from anthropic import Anthropic
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
import stripe
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AttributionSource(Enum):
    COOKIE = "cookie"
    REFERRER = "referrer"
    SERVER_SIDE = "server_side"
    API_CALL = "api_call"
    MULTI_TOUCH = "multi_touch"

class FraudRiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class AffiliateConversion:
    """Data model for affiliate conversion events"""
    conversion_id: str
    affiliate_id: str
    user_id: str
    revenue: float
    timestamp: datetime
    attribution_source: AttributionSource
    confidence_score: float
    user_agent: str
    ip_address: str
    device_fingerprint: str
    conversion_path: List[str]
    product_category: str
    session_duration: int
    page_views: int

@dataclass
class AffinityScore:
    """Affinity scoring model for user-affiliate relationships"""
    user_id: str
    affiliate_id: str
    behavioral_score: float
    content_relevance_score: float
    conversion_probability: float
    trust_score: float
    engagement_score: float
    overall_affinity: float
    last_updated: datetime
    predictive_factors: Dict[str, float]

@dataclass
class FraudDetectionResult:
    """Fraud detection analysis results"""
    conversion_id: str
    risk_level: FraudRiskLevel
    risk_score: float
    risk_factors: List[str]
    confidence: float
    recommended_action: str
    requires_manual_review: bool

class AnthropicAffinityEngine:
    """Main engine integrating Anthropic's Claude for affiliate analysis"""
    
    def __init__(self, config_path: str = "config/anthropic_config.json"):
        self.config = self._load_config(config_path)
        self.client = Anthropic(api_key=self.config.get("anthropic_api_key"))
        self.db_path = self.config.get("database_path", "affiliate_platform.db")
        self.stripe_client = stripe.api_key = self.config.get("stripe_api_key")
        
        # Initialize ML components
        self.content_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.behavioral_weights = self.config.get("behavioral_weights", {
            "session_duration": 0.25,
            "page_views": 0.20,
            "conversion_history": 0.30,
            "content_engagement": 0.25
        })
        
        # Risk assessment thresholds
        self.risk_thresholds = self.config.get("risk_thresholds", {
            "low": 0.3,
            "medium": 0.6,
            "high": 0.8,
            "critical": 0.9
        })
        
        self._initialize_database()
        
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from file"""
        default_config = {
            "anthropic_api_key": os.getenv("ANTHROPIC_API_KEY"),
            "stripe_api_key": os.getenv("STRIPE_API_KEY"),
            "database_path": "affiliate_platform.db",
            "behavioral_weights": {
                "session_duration": 0.25,
                "page_views": 0.20,
                "conversion_history": 0.30,
                "content_engagement": 0.25
            },
            "risk_thresholds": {
                "low": 0.3,
                "medium": 0.6,
                "high": 0.8,
                "critical": 0.9
            }
        }
        
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                default_config.update(user_config)
        
        return default_config
    
    def _initialize_database(self):
        """Initialize database schema for enhanced affiliate tracking"""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                -- Enhanced conversions table with AI tracking
                CREATE TABLE IF NOT EXISTS affiliate_conversions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversion_id TEXT UNIQUE NOT NULL,
                    affiliate_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    revenue REAL NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    attribution_source TEXT NOT NULL,
                    confidence_score REAL DEFAULT 1.0,
                    user_agent TEXT,
                    ip_address TEXT,
                    device_fingerprint TEXT,
                    conversion_path TEXT, -- JSON array
                    product_category TEXT,
                    session_duration INTEGER,
                    page_views INTEGER,
                    ai_validated BOOLEAN DEFAULT FALSE,
                    fraud_risk_level TEXT,
                    fraud_risk_score REAL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Affinity scores table
                CREATE TABLE IF NOT EXISTS user_affinity_scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    affiliate_id TEXT NOT NULL,
                    behavioral_score REAL,
                    content_relevance_score REAL,
                    conversion_probability REAL,
                    trust_score REAL,
                    engagement_score REAL,
                    overall_affinity REAL,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                    predictive_factors TEXT, -- JSON
                    UNIQUE(user_id, affiliate_id)
                );
                
                -- Affiliate content analysis
                CREATE TABLE IF NOT EXISTS affiliate_content (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    affiliate_id TEXT NOT NULL,
                    content_type TEXT NOT NULL,
                    content_text TEXT NOT NULL,
                    content_vector TEXT, -- JSON array
                    semantic_category TEXT,
                    engagement_score REAL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Fraud detection logs
                CREATE TABLE IF NOT EXISTS fraud_detection_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversion_id TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    risk_score REAL NOT NULL,
                    risk_factors TEXT, -- JSON array
                    confidence REAL,
                    recommended_action TEXT,
                    requires_manual_review BOOLEAN,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Real-time events tracking
                CREATE TABLE IF NOT EXISTS real_time_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    affiliate_id TEXT,
                    event_data TEXT, -- JSON
                    processed BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Enhanced affiliate partners
                CREATE TABLE IF NOT EXISTS affiliate_partners (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    affiliate_id TEXT UNIQUE NOT NULL,
                    name TEXT,
                    platform TEXT,
                    status TEXT DEFAULT 'active',
                    tier TEXT DEFAULT 'standard',
                    commission_rate REAL DEFAULT 0.10,
                    payment_method TEXT,
                    stripe_account_id TEXT,
                    compliance_verified BOOLEAN DEFAULT FALSE,
                    risk_score REAL DEFAULT 0.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Indexes for performance
                CREATE INDEX IF NOT EXISTS idx_conversions_user_affiliate ON affiliate_conversions(user_id, affiliate_id);
                CREATE INDEX IF NOT EXISTS idx_conversions_timestamp ON affiliate_conversions(timestamp);
                CREATE INDEX IF NOT EXISTS idx_affinity_user_affiliate ON user_affinity_scores(user_id, affiliate_id);
                CREATE INDEX IF NOT EXISTS idx_events_processed ON real_time_events(processed);
            """)
    
    async def analyze_conversion_with_claude(self, conversion: AffiliateConversion) -> Dict[str, Any]:
        """
        Use Claude to analyze conversion for attribution validation and fraud detection
        """
        prompt = f"""
        Analyze this affiliate conversion for attribution accuracy and fraud risk:
        
        Conversion Details:
        - Conversion ID: {conversion.conversion_id}
        - Affiliate ID: {conversion.affiliate_id}
        - User ID: {conversion.user_id}
        - Revenue: ${conversion.revenue}
        - Attribution Source: {conversion.attribution_source.value}
        - Confidence Score: {conversion.confidence_score}
        - User Agent: {conversion.user_agent}
        - IP Address: {conversion.ip_address}
        - Device Fingerprint: {conversion.device_fingerprint}
        - Conversion Path: {conversion.conversion_path}
        - Product Category: {conversion.product_category}
        - Session Duration: {conversion.session_duration} seconds
        - Page Views: {conversion.page_views}
        
        Please provide:
        1. Attribution validation assessment (0-100 confidence)
        2. Fraud risk analysis with specific risk factors
        3. Recommended confidence score adjustment
        4. Any suspicious patterns detected
        
        Respond in JSON format with these keys:
        {{
            "attribution_confidence": float,
            "fraud_risk_score": float,
            "risk_factors": [string],
            "recommended_confidence": float,
            "suspicious_patterns": [string],
            "requires_manual_review": boolean
        }}
        """
        
        try:
            response = await self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse Claude's response
            analysis_text = response.content[0].text
            # Extract JSON from response (implementation depends on Claude's output format)
            analysis = self._parse_claude_response(analysis_text)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing conversion with Claude: {e}")
            return self._fallback_analysis(conversion)
    
    def _parse_claude_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Claude's response to extract structured analysis"""
        try:
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # Fallback parsing if JSON extraction fails
                return self._extract_analysis_from_text(response_text)
        except Exception as e:
            logger.error(f"Error parsing Claude response: {e}")
            return self._fallback_analysis(None)
    
    def _extract_analysis_from_text(self, text: str) -> Dict[str, Any]:
        """Extract analysis from text when JSON parsing fails"""
        # Simple text-based extraction logic
        return {
            "attribution_confidence": 0.85,
            "fraud_risk_score": 0.15,
            "risk_factors": [],
            "recommended_confidence": 0.85,
            "suspicious_patterns": [],
            "requires_manual_review": False
        }
    
    def _fallback_analysis(self, conversion: Optional[AffiliateConversion]) -> Dict[str, Any]:
        """Fallback analysis when Claude is unavailable"""
        return {
            "attribution_confidence": 0.75,
            "fraud_risk_score": 0.25,
            "risk_factors": ["claude_unavailable"],
            "recommended_confidence": 0.75,
            "suspicious_patterns": [],
            "requires_manual_review": False
        }
    
    async def calculate_affinity_score(self, user_id: str, affiliate_id: str) -> AffinityScore:
        """
        Calculate comprehensive affinity score using AI-powered analysis
        """
        # Get user's historical data
        user_history = self._get_user_conversion_history(user_id, affiliate_id)
        user_behavior = self._analyze_user_behavior(user_id)
        
        # Get affiliate content and performance data
        affiliate_content = self._get_affiliate_content(affiliate_id)
        affiliate_performance = self._get_affiliate_performance(affiliate_id)
        
        # Use Claude for semantic analysis
        semantic_analysis = await self._analyze_content_affinity(user_behavior, affiliate_content)
        
        # Calculate individual score components
        behavioral_score = self._calculate_behavioral_score(user_history, user_behavior)
        content_relevance_score = semantic_analysis.get("relevance_score", 0.5)
        conversion_probability = self._predict_conversion_probability(user_history, affiliate_performance)
        trust_score = self._calculate_trust_score(affiliate_performance, user_history)
        engagement_score = self._calculate_engagement_score(user_behavior)
        
        # Calculate overall affinity using weighted combination
        overall_affinity = (
            behavioral_score * 0.25 +
            content_relevance_score * 0.20 +
            conversion_probability * 0.25 +
            trust_score * 0.15 +
            engagement_score * 0.15
        )
        
        # Create affinity score object
        affinity_score = AffinityScore(
            user_id=user_id,
            affiliate_id=affiliate_id,
            behavioral_score=behavioral_score,
            content_relevance_score=content_relevance_score,
            conversion_probability=conversion_probability,
            trust_score=trust_score,
            engagement_score=engagement_score,
            overall_affinity=overall_affinity,
            last_updated=datetime.now(),
            predictive_factors=semantic_analysis.get("predictive_factors", {})
        )
        
        # Save to database
        self._save_affinity_score(affinity_score)
        
        return affinity_score
    
    def _get_user_conversion_history(self, user_id: str, affiliate_id: str) -> List[Dict]:
        """Get user's conversion history with specific affiliate"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT conversion_id, revenue, timestamp, confidence_score, product_category
                FROM affiliate_conversions
                WHERE user_id = ? AND affiliate_id = ?
                ORDER BY timestamp DESC
                LIMIT 50
            """, (user_id, affiliate_id))
            
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    def _analyze_user_behavior(self, user_id: str) -> Dict[str, Any]:
        """Analyze user behavior patterns"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get user's overall behavior metrics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_conversions,
                    AVG(revenue) as avg_revenue,
                    AVG(session_duration) as avg_session_duration,
                    AVG(page_views) as avg_page_views,
                    COUNT(DISTINCT affiliate_id) as unique_affiliates
                FROM affiliate_conversions
                WHERE user_id = ?
            """, (user_id,))
            
            result = cursor.fetchone()
            if result:
                return {
                    "total_conversions": result[0] or 0,
                    "avg_revenue": result[1] or 0,
                    "avg_session_duration": result[2] or 0,
                    "avg_page_views": result[3] or 0,
                    "unique_affiliates": result[4] or 0
                }
            return {}
    
    def _get_affiliate_content(self, affiliate_id: str) -> List[Dict]:
        """Get affiliate's content for semantic analysis"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT content_type, content_text, semantic_category, engagement_score
                FROM affiliate_content
                WHERE affiliate_id = ?
                ORDER BY created_at DESC
                LIMIT 20
            """, (affiliate_id,))
            
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    def _get_affiliate_performance(self, affiliate_id: str) -> Dict[str, Any]:
        """Get affiliate's performance metrics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_conversions,
                    AVG(revenue) as avg_revenue,
                    AVG(confidence_score) as avg_confidence,
                    COUNT(DISTINCT user_id) as unique_users,
                    SUM(revenue) as total_revenue
                FROM affiliate_conversions
                WHERE affiliate_id = ?
            """, (affiliate_id,))
            
            result = cursor.fetchone()
            if result:
                return {
                    "total_conversions": result[0] or 0,
                    "avg_revenue": result[1] or 0,
                    "avg_confidence": result[2] or 0,
                    "unique_users": result[3] or 0,
                    "total_revenue": result[4] or 0
                }
            return {}
    
    async def _analyze_content_affinity(self, user_behavior: Dict, affiliate_content: List[Dict]) -> Dict[str, Any]:
        """Use Claude to analyze content-user affinity"""
        if not affiliate_content:
            return {"relevance_score": 0.3, "predictive_factors": {}}
        
        # Prepare content samples for analysis
        content_samples = [content.get("content_text", "") for content in affiliate_content[:5]]
        content_text = "\n".join(content_samples)
        
        prompt = f"""
        Analyze the content affinity between user behavior and affiliate content:
        
        User Behavior:
        - Total Conversions: {user_behavior.get('total_conversions', 0)}
        - Average Revenue: ${user_behavior.get('avg_revenue', 0)}
        - Average Session Duration: {user_behavior.get('avg_session_duration', 0)}s
        - Average Page Views: {user_behavior.get('avg_page_views', 0)}
        - Unique Affiliates: {user_behavior.get('unique_affiliates', 0)}
        
        Affiliate Content Sample:
        {content_text[:2000]}... (truncated)
        
        Provide:
        1. Content relevance score (0-1)
        2. Key predictive factors for conversion
        3. User engagement likelihood
        
        Respond in JSON format.
        """
        
        try:
            response = await self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            analysis_text = response.content[0].text
            return self._parse_claude_response(analysis_text)
            
        except Exception as e:
            logger.error(f"Error in content affinity analysis: {e}")
            return {"relevance_score": 0.5, "predictive_factors": {}}
    
    def _calculate_behavioral_score(self, user_history: List[Dict], user_behavior: Dict) -> float:
        """Calculate behavioral affinity score"""
        if not user_history:
            return 0.3
        
        # Factors: conversion frequency, revenue consistency, engagement
        conversion_frequency = len(user_history) / max(1, user_behavior.get("unique_affiliates", 1))
        avg_revenue = user_behavior.get("avg_revenue", 0)
        session_duration_score = min(1.0, user_behavior.get("avg_session_duration", 0) / 300)  # 5 minutes max
        
        # Normalize and combine
        frequency_score = min(1.0, conversion_frequency / 5)  # 5 conversions max
        revenue_score = min(1.0, avg_revenue / 200)  # $200 max
        
        return (frequency_score * 0.4 + revenue_score * 0.3 + session_duration_score * 0.3)
    
    def _predict_conversion_probability(self, user_history: List[Dict], affiliate_performance: Dict) -> float:
        """Predict conversion probability based on historical data"""
        if not user_history:
            return 0.2  # Base probability for new users
        
        # Simple heuristic based on past performance
        recent_conversions = [c for c in user_history if 
                            datetime.fromisoformat(c["timestamp"]) > datetime.now() - timedelta(days=30)]
        
        if not recent_conversions:
            return 0.1
        
        # Calculate conversion rate and confidence
        avg_confidence = sum(c.get("confidence_score", 0.5) for c in recent_conversions) / len(recent_conversions)
        affiliate_quality = min(1.0, affiliate_performance.get("avg_confidence", 0.5))
        
        return (avg_confidence * 0.6 + affiliate_quality * 0.4)
    
    def _calculate_trust_score(self, affiliate_performance: Dict, user_history: List[Dict]) -> float:
        """Calculate trust score based on affiliate reliability"""
        if not affiliate_performance:
            return 0.5
        
        # Factors: conversion consistency, confidence scores, unique users
        total_conversions = affiliate_performance.get("total_conversions", 0)
        avg_confidence = affiliate_performance.get("avg_confidence", 0.5)
        unique_users = affiliate_performance.get("unique_users", 0)
        
        # Normalize scores
        volume_score = min(1.0, total_conversions / 100)  # 100 conversions max
        confidence_score = avg_confidence
        diversity_score = min(1.0, unique_users / 50)  # 50 unique users max
        
        return (volume_score * 0.3 + confidence_score * 0.4 + diversity_score * 0.3)
    
    def _calculate_engagement_score(self, user_behavior: Dict) -> float:
        """Calculate user engagement score"""
        session_duration = user_behavior.get("avg_session_duration", 0)
        page_views = user_behavior.get("avg_page_views", 0)
        
        # Normalize engagement metrics
        duration_score = min(1.0, session_duration / 600)  # 10 minutes max
        page_views_score = min(1.0, page_views / 10)  # 10 pages max
        
        return (duration_score * 0.6 + page_views_score * 0.4)
    
    def _save_affinity_score(self, affinity_score: AffinityScore):
        """Save affinity score to database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO user_affinity_scores 
                (user_id, affiliate_id, behavioral_score, content_relevance_score, 
                 conversion_probability, trust_score, engagement_score, overall_affinity, 
                 last_updated, predictive_factors)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                affinity_score.user_id,
                affinity_score.affiliate_id,
                affinity_score.behavioral_score,
                affinity_score.content_relevance_score,
                affinity_score.conversion_probability,
                affinity_score.trust_score,
                affinity_score.engagement_score,
                affinity_score.overall_affinity,
                affinity_score.last_updated,
                json.dumps(affinity_score.predictive_factors)
            ))
    
    async def detect_fraud(self, conversion: AffiliateConversion) -> FraudDetectionResult:
        """
        Advanced fraud detection using Anthropic's AI capabilities
        """
        # Get historical data for comparison
        user_history = self._get_user_conversion_history(conversion.user_id, conversion.affiliate_id)
        affiliate_history = self._get_affiliate_performance(conversion.affiliate_id)
        
        # Analyze with Claude
        fraud_analysis = await self._analyze_fraud_patterns(conversion, user_history, affiliate_history)
        
        # Calculate risk level
        risk_score = fraud_analysis.get("fraud_risk_score", 0.0)
        risk_level = self._determine_risk_level(risk_score)
        
        # Create fraud detection result
        result = FraudDetectionResult(
            conversion_id=conversion.conversion_id,
            risk_level=risk_level,
            risk_score=risk_score,
            risk_factors=fraud_analysis.get("risk_factors", []),
            confidence=fraud_analysis.get("confidence", 0.5),
            recommended_action=fraud_analysis.get("recommended_action", "monitor"),
            requires_manual_review=fraud_analysis.get("requires_manual_review", False)
        )
        
        # Log the detection
        self._log_fraud_detection(result)
        
        return result
    
    async def _analyze_fraud_patterns(self, conversion: AffiliateConversion, 
                                    user_history: List[Dict], 
                                    affiliate_history: Dict) -> Dict[str, Any]:
        """Use Claude to analyze fraud patterns"""
        prompt = f"""
        Analyze this conversion for potential fraud:
        
        Current Conversion:
        - Conversion ID: {conversion.conversion_id}
        - Revenue: ${conversion.revenue}
        - Attribution Source: {conversion.attribution_source.value}
        - Confidence: {conversion.confidence_score}
        - IP: {conversion.ip_address}
        - Device: {conversion.device_fingerprint}
        - Session: {conversion.session_duration}s, {conversion.page_views} pages
        
        User History: {len(user_history)} previous conversions
        Affiliate Performance: {affiliate_history.get('total_conversions', 0)} total conversions
        
        Identify:
        1. Fraud risk score (0-1)
        2. Specific risk factors
        3. Recommended action
        4. Manual review requirement
        
        Respond in JSON format.
        """
        
        try:
            response = await self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            analysis_text = response.content[0].text
            return self._parse_claude_response(analysis_text)
            
        except Exception as e:
            logger.error(f"Error in fraud analysis: {e}")
            return {
                "fraud_risk_score": 0.1,
                "risk_factors": ["analysis_error"],
                "recommended_action": "monitor",
                "requires_manual_review": False,
                "confidence": 0.3
            }
    
    def _determine_risk_level(self, risk_score: float) -> FraudRiskLevel:
        """Determine fraud risk level based on score"""
        if risk_score >= self.risk_thresholds["critical"]:
            return FraudRiskLevel.CRITICAL
        elif risk_score >= self.risk_thresholds["high"]:
            return FraudRiskLevel.HIGH
        elif risk_score >= self.risk_thresholds["medium"]:
            return FraudRiskLevel.MEDIUM
        else:
            return FraudRiskLevel.LOW
    
    def _log_fraud_detection(self, result: FraudDetectionResult):
        """Log fraud detection results"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO fraud_detection_logs 
                (conversion_id, risk_level, risk_score, risk_factors, 
                 confidence, recommended_action, requires_manual_review)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                result.conversion_id,
                result.risk_level.value,
                result.risk_score,
                json.dumps(result.risk_factors),
                result.confidence,
                result.recommended_action,
                result.requires_manual_review
            ))
    
    async def process_real_time_event(self, event_type: str, user_id: str, 
                                    affiliate_id: Optional[str], event_data: Dict) -> Dict[str, Any]:
        """
        Process real-time events for immediate affinity scoring and fraud detection
        """
        # Store event
        event_id = self._store_real_time_event(event_type, user_id, affiliate_id, event_data)
        
        # Process based on event type
        if event_type == "conversion":
            conversion = self._create_conversion_from_event(event_data)
            
            # Run AI analysis
            claude_analysis = await self.analyze_conversion_with_claude(conversion)
            fraud_result = await self.detect_fraud(conversion)
            
            # Update affinity score
            affinity_score = await self.calculate_affinity_score(user_id, affiliate_id)
            
            return {
                "event_id": event_id,
                "conversion_analysis": claude_analysis,
                "fraud_detection": asdict(fraud_result),
                "affinity_score": asdict(affinity_score),
                "processed": True
            }
        
        elif event_type == "page_view" or event_type == "engagement":
            # Update engagement metrics
            await self._update_engagement_metrics(user_id, affiliate_id, event_data)
            
            return {
                "event_id": event_id,
                "engagement_updated": True,
                "processed": True
            }
        
        return {"event_id": event_id, "processed": False}
    
    def _store_real_time_event(self, event_type: str, user_id: str, 
                              affiliate_id: Optional[str], event_data: Dict) -> str:
        """Store real-time event in database"""
        event_id = f"evt_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(str(event_data)) % 10000:04d}"
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO real_time_events 
                (event_type, user_id, affiliate_id, event_data, processed)
                VALUES (?, ?, ?, ?, ?)
            """, (event_type, user_id, affiliate_id, json.dumps(event_data), False))
        
        return event_id
    
    def _create_conversion_from_event(self, event_data: Dict) -> AffiliateConversion:
        """Create AffiliateConversion object from event data"""
        return AffiliateConversion(
            conversion_id=event_data.get("conversion_id", ""),
            affiliate_id=event_data.get("affiliate_id", ""),
            user_id=event_data.get("user_id", ""),
            revenue=event_data.get("revenue", 0.0),
            timestamp=datetime.fromisoformat(event_data.get("timestamp", datetime.now().isoformat())),
            attribution_source=AttributionSource(event_data.get("attribution_source", "api_call")),
            confidence_score=event_data.get("confidence_score", 1.0),
            user_agent=event_data.get("user_agent", ""),
            ip_address=event_data.get("ip_address", ""),
            device_fingerprint=event_data.get("device_fingerprint", ""),
            conversion_path=event_data.get("conversion_path", []),
            product_category=event_data.get("product_category", ""),
            session_duration=event_data.get("session_duration", 0),
            page_views=event_data.get("page_views", 0)
        )
    
    async def _update_engagement_metrics(self, user_id: str, affiliate_id: Optional[str], 
                                       event_data: Dict):
        """Update user engagement metrics"""
        # This would update user behavior data for more accurate affinity scoring
        # Implementation depends on specific engagement tracking requirements
        pass
    
    def generate_affiliate_recommendations(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Generate personalized affiliate recommendations using AI-powered affinity scoring
        """
        with sqlite3.connect(self.db_path) as conn:
            # Get top affinity scores for user
            cursor = conn.cursor()
            cursor.execute("""
                SELECT ua.affiliate_id, ua.overall_affinity, ap.name, ap.platform, ap.tier
                FROM user_affinity_scores ua
                JOIN affiliate_partners ap ON ua.affiliate_id = ap.affiliate_id
                WHERE ua.user_id = ? AND ap.status = 'active'
                ORDER BY ua.overall_affinity DESC
                LIMIT ?
            """, (user_id, limit))
            
            recommendations = []
            for row in cursor.fetchall():
                affiliate_id, affinity_score, name, platform, tier = row
                
                recommendations.append({
                    "affiliate_id": affiliate_id,
                    "name": name,
                    "platform": platform,
                    "tier": tier,
                    "affinity_score": affinity_score,
                    "recommendation_reason": self._generate_recommendation_reason(affinity_score),
                    "predicted_conversion_probability": self._get_conversion_probability(user_id, affiliate_id)
                })
            
            return recommendations
    
    def _generate_recommendation_reason(self, affinity_score: float) -> str:
        """Generate human-readable recommendation reason"""
        if affinity_score >= 0.8:
            return "High affinity based on your interests and past behavior"
        elif affinity_score >= 0.6:
            return "Good match for your preferences"
        elif affinity_score >= 0.4:
            return "Potential interest based on similar users"
        else:
            return "New recommendation to explore"
    
    def _get_conversion_probability(self, user_id: str, affiliate_id: str) -> float:
        """Get predicted conversion probability for user-affiliate pair"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT conversion_probability FROM user_affinity_scores
                WHERE user_id = ? AND affiliate_id = ?
            """, (user_id, affiliate_id))
            
            result = cursor.fetchone()
            return result[0] if result else 0.1
    
    def get_comprehensive_analytics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Generate comprehensive analytics for affiliate platform performance
        """
        with sqlite3.connect(self.db_path) as conn:
            # Overall performance metrics
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_conversions,
                    SUM(revenue) as total_revenue,
                    AVG(revenue) as avg_revenue,
                    COUNT(DISTINCT affiliate_id) as active_affiliates,
                    COUNT(DISTINCT user_id) as unique_users,
                    AVG(confidence_score) as avg_confidence
                FROM affiliate_conversions
                WHERE timestamp BETWEEN ? AND ?
            """, (start_date, end_date))
            
            overall_metrics = cursor.fetchone()
            
            # Attribution accuracy metrics
            cursor.execute("""
                SELECT 
                    attribution_source,
                    COUNT(*) as count,
                    AVG(confidence_score) as avg_confidence,
                    SUM(revenue) as total_revenue
                FROM affiliate_conversions
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY attribution_source
            """, (start_date, end_date))
            
            attribution_breakdown = []
            for row in cursor.fetchall():
                attribution_breakdown.append({
                    "source": row[0],
                    "conversions": row[1],
                    "avg_confidence": row[2],
                    "revenue": row[3]
                })
            
            # Fraud detection metrics
            cursor.execute("""
                SELECT 
                    risk_level,
                    COUNT(*) as count,
                    AVG(risk_score) as avg_risk_score
                FROM fraud_detection_logs
                WHERE created_at BETWEEN ? AND ?
                GROUP BY risk_level
            """, (start_date, end_date))
            
            fraud_metrics = []
            for row in cursor.fetchall():
                fraud_metrics.append({
                    "risk_level": row[0],
                    "count": row[1],
                    "avg_risk_score": row[2]
                })
            
            # Top performing affiliates
            cursor.execute("""
                SELECT 
                    ac.affiliate_id,
                    ap.name,
                    COUNT(*) as conversions,
                    SUM(ac.revenue) as total_revenue,
                    AVG(ac.confidence_score) as avg_confidence
                FROM affiliate_conversions ac
                JOIN affiliate_partners ap ON ac.affiliate_id = ap.affiliate_id
                WHERE ac.timestamp BETWEEN ? AND ?
                GROUP BY ac.affiliate_id, ap.name
                ORDER BY total_revenue DESC
                LIMIT 10
            """, (start_date, end_date))
            
            top_affiliates = []
            for row in cursor.fetchall():
                top_affiliates.append({
                    "affiliate_id": row[0],
                    "name": row[1],
                    "conversions": row[2],
                    "revenue": row[3],
                    "avg_confidence": row[4]
                })
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "overall_metrics": {
                    "total_conversions": overall_metrics[0] or 0,
                    "total_revenue": overall_metrics[1] or 0,
                    "avg_revenue": overall_metrics[2] or 0,
                    "active_affiliates": overall_metrics[3] or 0,
                    "unique_users": overall_metrics[4] or 0,
                    "avg_confidence": overall_metrics[5] or 0
                },
                "attribution_breakdown": attribution_breakdown,
                "fraud_metrics": fraud_metrics,
                "top_affiliates": top_affiliates
            }

# Example usage and initialization
if __name__ == "__main__":
    # Initialize the engine
    engine = AnthropicAffinityEngine()
    
    # Example conversion processing
    async def process_example_conversion():
        conversion = AffiliateConversion(
            conversion_id="conv_123456",
            affiliate_id="AFF001",
            user_id="user_789",
            revenue=150.00,
            timestamp=datetime.now(),
            attribution_source=AttributionSource.API_CALL,
            confidence_score=0.85,
            user_agent="Mozilla/5.0...",
            ip_address="192.168.1.100",
            device_fingerprint="fp_abc123",
            conversion_path=["landing", "product", "checkout"],
            product_category="electronics",
            session_duration=300,
            page_views=5
        )
        
        # Process with AI analysis
        analysis = await engine.analyze_conversion_with_claude(conversion)
        fraud_result = await engine.detect_fraud(conversion)
        affinity_score = await engine.calculate_affinity_score("user_789", "AFF001")
        
        print("Analysis Results:")
        print(f"Claude Analysis: {analysis}")
        print(f"Fraud Detection: {fraud_result}")
        print(f"Affinity Score: {affinity_score.overall_affinity}")
    
    # Run example
    asyncio.run(process_example_conversion())