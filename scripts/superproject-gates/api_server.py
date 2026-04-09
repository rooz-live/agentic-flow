#!/usr/bin/env python3
"""
FastAPI Server for Enhanced Affiliate Platform with Anthropic Integration
Provides real-time tracking, analytics, and partner management APIs
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import asdict
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
import uvicorn

from anthropic_affinity_engine import (
    AnthropicAffinityEngine, 
    AffiliateConversion, 
    AttributionSource,
    AffinityScore,
    FraudDetectionResult,
    FraudRiskLevel
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()

# Global engine instance
engine: Optional[AnthropicAffinityEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global engine
    # Startup
    logger.info("Initializing Anthropic Affinity Engine...")
    engine = AnthropicAffinityEngine()
    logger.info("Affinity Engine initialized successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")


# Initialize FastAPI app
app = FastAPI(
    title="Enhanced Affiliate Platform API",
    description="AI-powered affiliate tracking and analytics with Anthropic integration",
    version="2.0.0",
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Pydantic Models for API
class ConversionRequest(BaseModel):
    """Request model for conversion tracking"""
    affiliate_id: str = Field(..., description="Affiliate identifier")
    user_id: str = Field(..., description="User identifier")
    revenue: float = Field(..., gt=0, description="Conversion revenue")
    attribution_source: str = Field(..., description="Attribution source")
    user_agent: str = Field(..., description="User agent string")
    ip_address: str = Field(..., description="Client IP address")
    device_fingerprint: str = Field(..., description="Device fingerprint")
    conversion_path: List[str] = Field(default=[], description="Conversion path")
    product_category: str = Field(..., description="Product category")
    session_duration: int = Field(default=0, ge=0, description="Session duration in seconds")
    page_views: int = Field(default=0, ge=0, description="Number of page views")
    
    @validator('attribution_source')
    def validate_attribution_source(cls, v):
        valid_sources = [source.value for source in AttributionSource]
        if v not in valid_sources:
            raise ValueError(f"Invalid attribution source. Must be one of: {valid_sources}")
        return v


class ConversionResponse(BaseModel):
    """Response model for conversion tracking"""
    conversion_id: str
    status: str
    attribution_confidence: float
    fraud_risk_score: float
    affinity_score: float
    requires_manual_review: bool
    processing_time_ms: float


class AffinityRequest(BaseModel):
    """Request model for affinity scoring"""
    user_id: str = Field(..., description="User identifier")
    affiliate_id: str = Field(..., description="Affiliate identifier")


class AffinityResponse(BaseModel):
    """Response model for affinity scoring"""
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


class RecommendationRequest(BaseModel):
    """Request model for affiliate recommendations"""
    user_id: str = Field(..., description="User identifier")
    limit: int = Field(default=10, ge=1, le=50, description="Maximum number of recommendations")


class AnalyticsRequest(BaseModel):
    """Request model for analytics data"""
    start_date: datetime = Field(..., description="Start date for analytics period")
    end_date: datetime = Field(..., description="End date for analytics period")
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError("End date must be after start date")
        return v


class RealTimeEventRequest(BaseModel):
    """Request model for real-time event processing"""
    event_type: str = Field(..., description="Type of event")
    user_id: str = Field(..., description="User identifier")
    affiliate_id: Optional[str] = Field(None, description="Affiliate identifier")
    event_data: Dict[str, Any] = Field(..., description="Event data")


# Authentication and Authorization
async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key for protected endpoints"""
    # In production, implement proper API key validation
    valid_keys = ["demo-api-key", "test-key", "prod-key"]
    if credentials.credentials not in valid_keys:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return credentials.credentials


# Health Check
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "engine_status": "initialized" if engine else "not_initialized"
    }


# Conversion Tracking Endpoints
@app.post("/api/v2/conversions", response_model=ConversionResponse, tags=["Conversions"])
async def track_conversion(
    conversion_request: ConversionRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """
    Track a conversion with AI-powered attribution validation and fraud detection
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Affinity engine not initialized")
    
    start_time = datetime.now()
    
    try:
        # Generate conversion ID
        conversion_id = f"conv_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        # Create conversion object
        conversion = AffiliateConversion(
            conversion_id=conversion_id,
            affiliate_id=conversion_request.affiliate_id,
            user_id=conversion_request.user_id,
            revenue=conversion_request.revenue,
            timestamp=datetime.now(),
            attribution_source=AttributionSource(conversion_request.attribution_source),
            confidence_score=1.0,  # Will be updated by AI analysis
            user_agent=conversion_request.user_agent,
            ip_address=conversion_request.ip_address,
            device_fingerprint=conversion_request.device_fingerprint,
            conversion_path=conversion_request.conversion_path,
            product_category=conversion_request.product_category,
            session_duration=conversion_request.session_duration,
            page_views=conversion_request.page_views
        )
        
        # Process conversion with AI analysis
        claude_analysis = await engine.analyze_conversion_with_claude(conversion)
        fraud_result = await engine.detect_fraud(conversion)
        affinity_score = await engine.calculate_affinity_score(
            conversion_request.user_id, 
            conversion_request.affiliate_id
        )
        
        # Store conversion in database
        await store_conversion(conversion, claude_analysis, fraud_result)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Return response
        return ConversionResponse(
            conversion_id=conversion_id,
            status="processed",
            attribution_confidence=claude_analysis.get("attribution_confidence", 0.0),
            fraud_risk_score=fraud_result.risk_score,
            affinity_score=affinity_score.overall_affinity,
            requires_manual_review=fraud_result.requires_manual_review,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error processing conversion: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


async def store_conversion(conversion: AffiliateConversion, analysis: Dict, fraud_result: FraudDetectionResult):
    """Store conversion with AI analysis results"""
    # This would integrate with the database storage in the engine
    # Implementation depends on specific database schema
    pass


# Affinity Scoring Endpoints
@app.post("/api/v2/affinity/score", response_model=AffinityResponse, tags=["Affinity"])
async def get_affinity_score(
    request: AffinityRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Get affinity score for user-affiliate pair
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Affinity engine not initialized")
    
    try:
        affinity_score = await engine.calculate_affinity_score(
            request.user_id, 
            request.affiliate_id
        )
        
        return AffinityResponse(**asdict(affinity_score))
        
    except Exception as e:
        logger.error(f"Error calculating affinity score: {e}")
        raise HTTPException(status_code=500, detail=f"Affinity calculation error: {str(e)}")


@app.post("/api/v2/affinity/recommendations", tags=["Affinity"])
async def get_affiliate_recommendations(
    request: RecommendationRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Get personalized affiliate recommendations for a user
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Affinity engine not initialized")
    
    try:
        recommendations = engine.generate_affiliate_recommendations(
            request.user_id, 
            request.limit
        )
        
        return {
            "user_id": request.user_id,
            "recommendations": recommendations,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")


# Real-time Event Processing
@app.post("/api/v2/events/realtime", tags=["Events"])
async def process_real_time_event(
    request: RealTimeEventRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Process real-time events for immediate analysis
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Affinity engine not initialized")
    
    try:
        result = await engine.process_real_time_event(
            request.event_type,
            request.user_id,
            request.affiliate_id,
            request.event_data
        )
        
        return {
            "status": "processed",
            "event_id": result.get("event_id"),
            "processing_results": result
        }
        
    except Exception as e:
        logger.error(f"Error processing real-time event: {e}")
        raise HTTPException(status_code=500, detail=f"Event processing error: {str(e)}")


# Analytics Endpoints
@app.post("/api/v2/analytics/comprehensive", tags=["Analytics"])
async def get_comprehensive_analytics(
    request: AnalyticsRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Get comprehensive analytics for the specified period
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Affinity engine not initialized")
    
    try:
        analytics = engine.get_comprehensive_analytics(
            request.start_date,
            request.end_date
        )
        
        return analytics
        
    except Exception as e:
        logger.error(f"Error generating analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")


@app.get("/api/v2/analytics/dashboard", tags=["Analytics"])
async def get_dashboard_data(
    days: int = 30,
    api_key: str = Depends(verify_api_key)
):
    """
    Get dashboard data for the last N days
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Affinity engine not initialized")
    
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        analytics = engine.get_comprehensive_analytics(start_date, end_date)
        
        # Add dashboard-specific metrics
        dashboard_data = {
            **analytics,
            "dashboard_metrics": {
                "daily_avg_conversions": analytics["overall_metrics"]["total_conversions"] / days,
                "daily_avg_revenue": analytics["overall_metrics"]["total_revenue"] / days,
                "conversion_rate_trend": calculate_conversion_trend(start_date, end_date),
                "top_performing_category": get_top_category(analytics),
                "fraud_detection_rate": calculate_fraud_rate(analytics)
            }
        }
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Error generating dashboard data: {e}")
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")


def calculate_conversion_trend(start_date: datetime, end_date: datetime) -> str:
    """Calculate conversion trend (placeholder implementation)"""
    # In production, this would analyze historical data
    return "increasing"


def get_top_category(analytics: Dict) -> str:
    """Get top performing category (placeholder implementation)"""
    # In production, this would analyze category performance
    return "electronics"


def calculate_fraud_rate(analytics: Dict) -> float:
    """Calculate fraud detection rate"""
    total_fraud = sum(item["count"] for item in analytics["fraud_metrics"] 
                      if item["risk_level"] in ["high", "critical"])
    total_conversions = analytics["overall_metrics"]["total_conversions"]
    
    return (total_fraud / total_conversions * 100) if total_conversions > 0 else 0.0


# Partner Management Endpoints
@app.get("/api/v2/partners", tags=["Partners"])
async def get_affiliate_partners(
    status: Optional[str] = None,
    tier: Optional[str] = None,
    api_key: str = Depends(verify_api_key)
):
    """
    Get list of affiliate partners with optional filtering
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Affinity engine not initialized")
    
    try:
        # Query partners from database
        partners = get_partners_from_db(status, tier)
        
        return {
            "partners": partners,
            "total_count": len(partners),
            "filters": {
                "status": status,
                "tier": tier
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching partners: {e}")
        raise HTTPException(status_code=500, detail=f"Partner fetch error: {str(e)}")


def get_partners_from_db(status: Optional[str], tier: Optional[str]) -> List[Dict]:
    """Get partners from database with filtering"""
    # This would query the actual database
    # Placeholder implementation
    return [
        {
            "affiliate_id": "AFF001",
            "name": "Google Partner",
            "platform": "google",
            "status": "active",
            "tier": "premium",
            "commission_rate": 0.15,
            "total_conversions": 1250,
            "total_revenue": 45678.90
        }
    ]


# Compliance and Audit Endpoints
@app.get("/api/v2/compliance/audit-log", tags=["Compliance"])
async def get_audit_log(
    start_date: datetime,
    end_date: datetime,
    event_type: Optional[str] = None,
    api_key: str = Depends(verify_api_key)
):
    """
    Get compliance audit log for specified period
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Affinity engine not initialized")
    
    try:
        audit_log = get_audit_log_from_db(start_date, end_date, event_type)
        
        return {
            "audit_log": audit_log,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "total_events": len(audit_log)
        }
        
    except Exception as e:
        logger.error(f"Error fetching audit log: {e}")
        raise HTTPException(status_code=500, detail=f"Audit log error: {str(e)}")


def get_audit_log_from_db(start_date: datetime, end_date: datetime, event_type: Optional[str]) -> List[Dict]:
    """Get audit log from database"""
    # This would query the actual audit log table
    # Placeholder implementation
    return [
        {
            "timestamp": datetime.now().isoformat(),
            "event_type": "conversion_processed",
            "user_id": "user_123",
            "affiliate_id": "AFF001",
            "details": {"conversion_id": "conv_123", "revenue": 150.0}
        }
    ]


# Webhook Endpoints for Stripe Integration
@app.post("/api/v2/webhooks/stripe", tags=["Webhooks"])
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhooks for payment processing
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Affinity engine not initialized")
    
    try:
        # Verify webhook signature
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        # Process webhook event
        event = process_stripe_webhook(payload, sig_header)
        
        # Handle different event types
        if event["type"] == "payment_intent.succeeded":
            await handle_payment_success(event["data"])
        elif event["type"] == "payment_intent.payment_failed":
            await handle_payment_failure(event["data"])
        
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"Error processing Stripe webhook: {e}")
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")


def process_stripe_webhook(payload: bytes, sig_header: str) -> Dict:
    """Process and verify Stripe webhook"""
    # In production, this would use Stripe's webhook verification
    return {"type": "payment_intent.succeeded", "data": {"id": "pi_123"}}


async def handle_payment_success(payment_data: Dict):
    """Handle successful payment"""
    # Update affiliate commission, send notifications, etc.
    logger.info(f"Payment succeeded: {payment_data.get('id')}")


async def handle_payment_failure(payment_data: Dict):
    """Handle failed payment"""
    # Log failure, notify affiliate, etc.
    logger.warning(f"Payment failed: {payment_data.get('id')}")


# Error Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "timestamp": datetime.now().isoformat()
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error",
                "timestamp": datetime.now().isoformat()
            }
        }
    )


# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log incoming requests"""
    start_time = datetime.now()
    
    response = await call_next(request)
    
    process_time = (datetime.now() - start_time).total_seconds()
    
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Run server
if __name__ == "__main__":
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )