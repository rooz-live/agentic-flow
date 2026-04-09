#!/usr/bin/env python3
"""
Comprehensive Test Suite for Anthropic Affinity Engine
Tests AI-powered attribution validation, affinity scoring, and fraud detection
"""

import asyncio
import json
import pytest
import sqlite3
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch, AsyncMock
import tempfile
import os

from anthropic_affinity_engine import (
    AnthropicAffinityEngine,
    AffiliateConversion,
    AttributionSource,
    AffinityScore,
    FraudDetectionResult,
    FraudRiskLevel
)


class TestAnthropicAffinityEngine:
    """Test suite for Anthropic Affinity Engine"""
    
    @pytest.fixture
    def temp_db(self):
        """Create temporary database for testing"""
        db_fd, db_path = tempfile.mkstemp()
        yield db_path
        os.close(db_fd)
        os.unlink(db_path)
    
    @pytest.fixture
    def engine(self, temp_db):
        """Create engine instance with test configuration"""
        config = {
            "anthropic_api_key": "test_key",
            "stripe_api_key": "test_stripe_key",
            "database_path": temp_db,
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
        
        with patch('anthropic_affinity_engine.Anthropic'), \
             patch('stripe.api_key', 'test_stripe_key'):
            engine = AnthropicAffinityEngine()
            engine.config = config
            engine.db_path = temp_db
            engine._initialize_database()
            return engine
    
    @pytest.fixture
    def sample_conversion(self):
        """Create sample conversion for testing"""
        return AffiliateConversion(
            conversion_id="test_conv_001",
            affiliate_id="AFF001",
            user_id="user_123",
            revenue=Decimal("150.00"),
            timestamp=datetime.now(),
            attribution_source=AttributionSource.API_CALL,
            confidence_score=0.85,
            user_agent="Mozilla/5.0 (Test Browser)",
            ip_address="192.168.1.100",
            device_fingerprint="fp_test_123",
            conversion_path=["landing", "product", "checkout"],
            product_category="electronics",
            session_duration=300,
            page_views=5
        )
    
    @pytest.mark.asyncio
    async def test_analyze_conversion_with_claude(self, engine, sample_conversion):
        """Test Claude-based conversion analysis"""
        # Mock Claude response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "attribution_confidence": 0.92,
            "fraud_risk_score": 0.15,
            "risk_factors": [],
            "recommended_confidence": 0.90,
            "suspicious_patterns": [],
            "requires_manual_review": False
        })
        
        with patch.object(engine.client.messages, 'create', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = mock_response
            
            result = await engine.analyze_conversion_with_claude(sample_conversion)
            
            assert result["attribution_confidence"] == 0.92
            assert result["fraud_risk_score"] == 0.15
            assert result["requires_manual_review"] == False
            mock_create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_conversion_with_claude_fallback(self, engine, sample_conversion):
        """Test Claude analysis fallback when API is unavailable"""
        with patch.object(engine.client.messages, 'create', side_effect=Exception("API Error")):
            result = await engine.analyze_conversion_with_claude(sample_conversion)
            
            # Should return fallback analysis
            assert result["attribution_confidence"] == 0.75
            assert result["fraud_risk_score"] == 0.25
            assert "claude_unavailable" in result["risk_factors"]
    
    @pytest.mark.asyncio
    async def test_calculate_affinity_score(self, engine):
        """Test affinity score calculation"""
        # Insert test data
        with sqlite3.connect(engine.db_path) as conn:
            # Insert user conversion history
            conn.execute("""
                INSERT INTO affiliate_conversions 
                (conversion_id, affiliate_id, user_id, revenue, timestamp, 
                 attribution_source, confidence_score, session_duration, page_views)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "test_conv_001", "AFF001", "user_123", 150.00,
                datetime.now(), "api_call", 0.85, 300, 5
            ))
            
            # Insert affiliate content
            conn.execute("""
                INSERT INTO affiliate_content 
                (affiliate_id, content_type, content_text, semantic_category, engagement_score)
                VALUES (?, ?, ?, ?, ?)
            """, (
                "AFF001", "product_review", "Great electronics product with amazing features",
                "electronics", 0.8
            ))
            
            # Insert affiliate partner
            conn.execute("""
                INSERT INTO affiliate_partners 
                (affiliate_id, name, platform, status, tier)
                VALUES (?, ?, ?, ?, ?)
            """, ("AFF001", "Test Affiliate", "web", "active", "premium"))
        
        # Mock Claude content analysis
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "relevance_score": 0.85,
            "predictive_factors": {
                "content_match": 0.9,
                "user_interest": 0.8
            }
        })
        
        with patch.object(engine.client.messages, 'create', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = mock_response
            
            affinity_score = await engine.calculate_affinity_score("user_123", "AFF001")
            
            assert isinstance(affinity_score, AffinityScore)
            assert affinity_score.user_id == "user_123"
            assert affinity_score.affiliate_id == "AFF001"
            assert 0 <= affinity_score.overall_affinity <= 1
            assert affinity_score.behavioral_score >= 0
            assert affinity_score.content_relevance_score >= 0
            assert affinity_score.conversion_probability >= 0
            assert affinity_score.trust_score >= 0
            assert affinity_score.engagement_score >= 0
    
    @pytest.mark.asyncio
    async def test_detect_fraud_low_risk(self, engine, sample_conversion):
        """Test fraud detection for low-risk conversion"""
        # Mock Claude fraud analysis
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "fraud_risk_score": 0.15,
            "risk_factors": [],
            "recommended_action": "approve",
            "requires_manual_review": False,
            "confidence": 0.9
        })
        
        with patch.object(engine.client.messages, 'create', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = mock_response
            
            result = await engine.detect_fraud(sample_conversion)
            
            assert isinstance(result, FraudDetectionResult)
            assert result.conversion_id == "test_conv_001"
            assert result.risk_level == FraudRiskLevel.LOW
            assert result.risk_score == 0.15
            assert result.requires_manual_review == False
            assert result.recommended_action == "approve"
    
    @pytest.mark.asyncio
    async def test_detect_fraud_high_risk(self, engine, sample_conversion):
        """Test fraud detection for high-risk conversion"""
        # Create suspicious conversion
        suspicious_conversion = AffiliateConversion(
            conversion_id="test_conv_suspicious",
            affiliate_id="AFF001",
            user_id="user_123",
            revenue=Decimal("5000.00"),  # Unusually high
            timestamp=datetime.now(),
            attribution_source=AttributionSource.API_CALL,
            confidence_score=0.45,  # Low confidence
            user_agent="Suspicious Bot",
            ip_address="192.168.1.100",
            device_fingerprint="fp_suspicious",
            conversion_path=["landing", "checkout"],  # Unusual path
            product_category="electronics",
            session_duration=10,  # Very short
            page_views=1  # Very low
        )
        
        # Mock Claude fraud analysis
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "fraud_risk_score": 0.85,
            "risk_factors": ["high_value", "low_confidence", "short_session"],
            "recommended_action": "manual_review",
            "requires_manual_review": True,
            "confidence": 0.95
        })
        
        with patch.object(engine.client.messages, 'create', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = mock_response
            
            result = await engine.detect_fraud(suspicious_conversion)
            
            assert result.risk_level == FraudRiskLevel.HIGH
            assert result.risk_score == 0.85
            assert result.requires_manual_review == True
            assert result.recommended_action == "manual_review"
            assert "high_value" in result.risk_factors
    
    @pytest.mark.asyncio
    async def test_process_real_time_event_conversion(self, engine, sample_conversion):
        """Test real-time conversion event processing"""
        event_data = {
            "conversion_id": "test_conv_001",
            "affiliate_id": "AFF001",
            "user_id": "user_123",
            "revenue": 150.00,
            "attribution_source": "api_call",
            "user_agent": "Mozilla/5.0",
            "ip_address": "192.168.1.100",
            "device_fingerprint": "fp_test_123",
            "conversion_path": ["landing", "product", "checkout"],
            "product_category": "electronics",
            "session_duration": 300,
            "page_views": 5
        }
        
        # Mock Claude responses
        mock_analysis_response = Mock()
        mock_analysis_response.content = [Mock()]
        mock_analysis_response.content[0].text = json.dumps({
            "attribution_confidence": 0.92,
            "fraud_risk_score": 0.15,
            "requires_manual_review": False
        })
        
        mock_fraud_response = Mock()
        mock_fraud_response.content = [Mock()]
        mock_fraud_response.content[0].text = json.dumps({
            "fraud_risk_score": 0.15,
            "requires_manual_review": False
        })
        
        with patch.object(engine.client.messages, 'create', new_callable=AsyncMock) as mock_create:
            mock_create.side_effect = [mock_analysis_response, mock_fraud_response]
            
            result = await engine.process_real_time_event(
                "conversion", "user_123", "AFF001", event_data
            )
            
            assert result["processed"] == True
            assert "conversion_analysis" in result
            assert "fraud_detection" in result
            assert "affinity_score" in result
            assert "event_id" in result
    
    @pytest.mark.asyncio
    async def test_process_real_time_event_engagement(self, engine):
        """Test real-time engagement event processing"""
        event_data = {
            "page_url": "/product/electronics-123",
            "time_on_page": 45,
            "scroll_depth": 0.8,
            "interactions": ["click", "hover"]
        }
        
        result = await engine.process_real_time_event(
            "page_view", "user_123", "AFF001", event_data
        )
        
        assert result["processed"] == True
        assert "event_id" in result
    
    def test_generate_affiliate_recommendations(self, engine):
        """Test affiliate recommendation generation"""
        # Insert test affinity scores
        with sqlite3.connect(engine.db_path) as conn:
            # Insert affiliates
            conn.execute("""
                INSERT INTO affiliate_partners 
                (affiliate_id, name, platform, status, tier)
                VALUES 
                    ('AFF001', 'Tech Store', 'web', 'active', 'premium'),
                    ('AFF002', 'Gadget Shop', 'web', 'active', 'standard'),
                    ('AFF003', 'Electronics Plus', 'web', 'active', 'enterprise')
            """)
            
            # Insert affinity scores
            conn.execute("""
                INSERT INTO user_affinity_scores 
                (user_id, affiliate_id, overall_affinity, behavioral_score,
                 content_relevance_score, conversion_probability, trust_score,
                 engagement_score, last_updated)
                VALUES 
                    ('user_123', 'AFF001', 0.85, 0.8, 0.9, 0.85, 0.9, 0.8, ?),
                    ('user_123', 'AFF002', 0.65, 0.6, 0.7, 0.65, 0.7, 0.6, ?),
                    ('user_123', 'AFF003', 0.75, 0.7, 0.8, 0.75, 0.8, 0.7, ?)
            """, (datetime.now(), datetime.now(), datetime.now()))
        
        recommendations = engine.generate_affiliate_recommendations("user_123", limit=3)
        
        assert len(recommendations) == 3
        assert recommendations[0]["affiliate_id"] == "AFF001"  # Highest affinity
        assert recommendations[0]["affinity_score"] == 0.85
        assert all("recommendation_reason" in rec for rec in recommendations)
        assert all("predicted_conversion_probability" in rec for rec in recommendations)
    
    def test_get_comprehensive_analytics(self, engine):
        """Test comprehensive analytics generation"""
        # Insert test data
        with sqlite3.connect(engine.db_path) as conn:
            # Insert conversions
            for i in range(10):
                conn.execute("""
                    INSERT INTO affiliate_conversions 
                    (conversion_id, affiliate_id, user_id, revenue, timestamp,
                     attribution_source, confidence_score, ai_validated, fraud_risk_level)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"conv_{i:03d}", f"AFF00{i%3+1}", f"user_{i%5+1}",
                    100.0 + i * 10, datetime.now() - timedelta(days=i),
                    ["api_call", "cookie", "referrer"][i%3],
                    0.8 + i * 0.02, True, "low"
                ))
            
            # Insert fraud detection logs
            conn.execute("""
                INSERT INTO fraud_detection_logs 
                (conversion_id, risk_level, risk_score, risk_factors, confidence)
                VALUES (?, ?, ?, ?, ?)
            """, ("conv_001", "medium", 0.65, '["unusual_pattern"]', 0.8))
        
        start_date = datetime.now() - timedelta(days=30)
        end_date = datetime.now()
        
        analytics = engine.get_comprehensive_analytics(start_date, end_date)
        
        assert "period" in analytics
        assert "overall_metrics" in analytics
        assert "attribution_breakdown" in analytics
        assert "fraud_metrics" in analytics
        assert "top_affiliates" in analytics
        
        assert analytics["overall_metrics"]["total_conversions"] == 10
        assert analytics["overall_metrics"]["active_affiliates"] == 3
        assert analytics["overall_metrics"]["unique_users"] == 5
    
    def test_calculate_behavioral_score(self, engine):
        """Test behavioral score calculation"""
        user_history = [
            {
                "conversion_id": "conv_001",
                "revenue": 100.0,
                "timestamp": datetime.now().isoformat(),
                "confidence_score": 0.85
            },
            {
                "conversion_id": "conv_002", 
                "revenue": 150.0,
                "timestamp": datetime.now().isoformat(),
                "confidence_score": 0.90
            }
        ]
        
        user_behavior = {
            "total_conversions": 2,
            "avg_revenue": 125.0,
            "avg_session_duration": 300,
            "avg_page_views": 5,
            "unique_affiliates": 1
        }
        
        score = engine._calculate_behavioral_score(user_history, user_behavior)
        
        assert 0 <= score <= 1
        assert score > 0.5  # Should be decent score with this history
    
    def test_calculate_trust_score(self, engine):
        """Test trust score calculation"""
        affiliate_performance = {
            "total_conversions": 100,
            "avg_confidence": 0.85,
            "unique_users": 50
        }
        
        user_history = [
            {
                "conversion_id": "conv_001",
                "revenue": 100.0,
                "timestamp": datetime.now().isoformat(),
                "confidence_score": 0.85
            }
        ]
        
        score = engine._calculate_trust_score(affiliate_performance, user_history)
        
        assert 0 <= score <= 1
        assert score > 0.5  # Should be decent with good performance
    
    def test_predict_conversion_probability(self, engine):
        """Test conversion probability prediction"""
        user_history = [
            {
                "conversion_id": "conv_001",
                "revenue": 100.0,
                "timestamp": (datetime.now() - timedelta(days=5)).isoformat(),
                "confidence_score": 0.85
            }
        ]
        
        affiliate_performance = {
            "avg_confidence": 0.85
        }
        
        probability = engine._predict_conversion_probability(user_history, affiliate_performance)
        
        assert 0 <= probability <= 1
        assert probability > 0  # Should be positive with recent conversion
    
    def test_determine_risk_level(self, engine):
        """Test risk level determination"""
        assert engine._determine_risk_level(0.1) == FraudRiskLevel.LOW
        assert engine._determine_risk_level(0.4) == FraudRiskLevel.MEDIUM
        assert engine._determine_risk_level(0.7) == FraudRiskLevel.HIGH
        assert engine._determine_risk_level(0.95) == FraudRiskLevel.CRITICAL
    
    def test_parse_claude_response(self, engine):
        """Test Claude response parsing"""
        json_response = '''
        {
            "attribution_confidence": 0.92,
            "fraud_risk_score": 0.15,
            "risk_factors": [],
            "recommended_confidence": 0.90
        }
        '''
        
        result = engine._parse_claude_response(json_response)
        
        assert result["attribution_confidence"] == 0.92
        assert result["fraud_risk_score"] == 0.15
        assert result["recommended_confidence"] == 0.90
    
    def test_parse_claude_response_fallback(self, engine):
        """Test Claude response parsing fallback"""
        invalid_response = "This is not valid JSON"
        
        result = engine._parse_claude_response(invalid_response)
        
        # Should return fallback analysis
        assert result["attribution_confidence"] == 0.85
        assert result["fraud_risk_score"] == 0.15


class TestAffinityEngineIntegration:
    """Integration tests for the complete affinity engine workflow"""
    
    @pytest.mark.asyncio
    async def test_complete_conversion_workflow(self, engine, sample_conversion):
        """Test complete conversion processing workflow"""
        # Mock Claude responses for all AI calls
        mock_responses = [
            # Conversion analysis
            Mock(content=[Mock(text=json.dumps({
                "attribution_confidence": 0.92,
                "fraud_risk_score": 0.15,
                "requires_manual_review": False
            }))]),
            # Fraud detection
            Mock(content=[Mock(text=json.dumps({
                "fraud_risk_score": 0.15,
                "requires_manual_review": False
            }))]),
            # Content affinity analysis
            Mock(content=[Mock(text=json.dumps({
                "relevance_score": 0.85,
                "predictive_factors": {"content_match": 0.9}
            }))])
        ]
        
        with patch.object(engine.client.messages, 'create', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = mock_responses[0]
            
            # Process conversion
            analysis = await engine.analyze_conversion_with_claude(sample_conversion)
            
            mock_create.return_value = mock_responses[1]
            fraud_result = await engine.detect_fraud(sample_conversion)
            
            # Insert test data for affinity calculation
            with sqlite3.connect(engine.db_path) as conn:
                conn.execute("""
                    INSERT INTO affiliate_conversions 
                    (conversion_id, affiliate_id, user_id, revenue, timestamp,
                     attribution_source, confidence_score, session_duration, page_views)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    sample_conversion.conversion_id,
                    sample_conversion.affiliate_id,
                    sample_conversion.user_id,
                    float(sample_conversion.revenue),
                    sample_conversion.timestamp,
                    sample_conversion.attribution_source.value,
                    sample_conversion.confidence_score,
                    sample_conversion.session_duration,
                    sample_conversion.page_views
                ))
            
            mock_create.return_value = mock_responses[2]
            affinity_score = await engine.calculate_affinity_score(
                sample_conversion.user_id, 
                sample_conversion.affiliate_id
            )
            
            # Verify workflow results
            assert analysis["attribution_confidence"] == 0.92
            assert fraud_result.risk_level == FraudRiskLevel.LOW
            assert affinity_score.overall_affinity > 0.5
            
            # Verify data was saved
            with sqlite3.connect(engine.db_path) as conn:
                # Check conversion was saved
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT COUNT(*) FROM affiliate_conversions 
                    WHERE conversion_id = ?
                """, (sample_conversion.conversion_id,))
                assert cursor.fetchone()[0] == 1
                
                # Check affinity score was saved
                cursor.execute("""
                    SELECT COUNT(*) FROM user_affinity_scores 
                    WHERE user_id = ? AND affiliate_id = ?
                """, (sample_conversion.user_id, sample_conversion.affiliate_id))
                assert cursor.fetchone()[0] == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])