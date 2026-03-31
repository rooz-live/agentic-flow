"""
Interactive Brokers API Client
Provides unified interface for IBKR trading operations
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from decimal import Decimal

try:
    from ib_insync import IB, Contract, Stock, Order, MarketOrder, LimitOrder, Trade
    IB_INSYNC_AVAILABLE = True
except ImportError:
    IB_INSYNC_AVAILABLE = False
    logging.warning("ib_insync not available. Install with: pip install ib_insync")


# ============================================================================
# ENUMS
# ============================================================================

class OrderAction(str, Enum):
    """Order action types"""
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    """Order types"""
    MARKET = "MKT"
    LIMIT = "LMT"
    STOP = "STP"
    STOP_LIMIT = "STP LMT"
    TRAILING_STOP = "TRAIL"


class OrderStatus(str, Enum):
    """Order status"""
    PENDING = "PendingSubmit"
    PRE_SUBMITTED = "PreSubmitted"
    SUBMITTED = "Submitted"
    FILLED = "Filled"
    PARTIALLY_FILLED = "PartiallyFilled"
    CANCELLED = "Cancelled"
    INACTIVE = "Inactive"


class TimeInForce(str, Enum):
    """Time in force options"""
    DAY = "DAY"
    GTC = "GTC"  # Good till cancelled
    IOC = "IOC"  # Immediate or cancel
    GTD = "GTD"  # Good till date


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class IBKRConfig:
    """Configuration for IBKR connection"""
    host: str = "127.0.0.1"
    port: int = 5000
    client_id: int = 1
    account: Optional[str] = None
    paper_trading: bool = True
    timeout: int = 30
    retry_attempts: int = 3
    retry_delay: int = 5


@dataclass
class Position:
    """Trading position"""
    account: str
    symbol: str
    contract: Any  # Contract object
    position: Decimal
    avg_cost: Decimal
    market_price: Decimal
    market_value: Decimal
    unrealized_pnl: Decimal
    realized_pnl: Decimal
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "account": self.account,
            "symbol": self.symbol,
            "position": float(self.position),
            "avg_cost": float(self.avg_cost),
            "market_price": float(self.market_price),
            "market_value": float(self.market_value),
            "unrealized_pnl": float(self.unrealized_pnl),
            "realized_pnl": float(self.realized_pnl),
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class OrderRequest:
    """Order request"""
    symbol: str
    action: OrderAction
    quantity: int
    order_type: OrderType = OrderType.MARKET
    limit_price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    tif: TimeInForce = TimeInForce.DAY
    account: Optional[str] = None

    def validate(self) -> bool:
        """Validate order request"""
        if self.quantity <= 0:
            raise ValueError("Quantity must be positive")
        
        if self.order_type == OrderType.LIMIT and self.limit_price is None:
            raise ValueError("Limit price required for limit orders")
        
        if self.order_type == OrderType.STOP and self.stop_price is None:
            raise ValueError("Stop price required for stop orders")
        
        return True


@dataclass
class OrderResponse:
    """Order response"""
    order_id: int
    perm_id: int
    client_id: int
    status: OrderStatus
    filled_quantity: int
    remaining_quantity: int
    avg_fill_price: Optional[Decimal]
    last_fill_price: Optional[Decimal]
    commission: Optional[Decimal]
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "order_id": self.order_id,
            "perm_id": self.perm_id,
            "client_id": self.client_id,
            "status": self.status.value,
            "filled_quantity": self.filled_quantity,
            "remaining_quantity": self.remaining_quantity,
            "avg_fill_price": float(self.avg_fill_price) if self.avg_fill_price else None,
            "last_fill_price": float(self.last_fill_price) if self.last_fill_price else None,
            "commission": float(self.commission) if self.commission else None,
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class AccountSummary:
    """Account summary information"""
    account: str
    net_liquidation: Decimal
    total_cash: Decimal
    buying_power: Decimal
    excess_liquidity: Decimal
    equity_with_loan: Decimal
    gross_position_value: Decimal
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "account": self.account,
            "net_liquidation": float(self.net_liquidation),
            "total_cash": float(self.total_cash),
            "buying_power": float(self.buying_power),
            "excess_liquidity": float(self.excess_liquidity),
            "equity_with_loan": float(self.equity_with_loan),
            "gross_position_value": float(self.gross_position_value),
            "timestamp": self.timestamp.isoformat()
        }


# ============================================================================
# IBKR CLIENT
# ============================================================================

class IBKRClient:
    """
    Interactive Brokers API Client
    
    Provides unified interface for IBKR trading operations using ib_insync.
    """
    
    def __init__(self, config: IBKRConfig):
        """Initialize client with configuration"""
        if not IB_INSYNC_AVAILABLE:
            raise ImportError("ib_insync library required. Install with: pip install ib_insync")
        
        self.config = config
        self.ib: Optional[IB] = None
        self.connected = False
        self.logger = logging.getLogger(__name__)
        
    async def connect(self) -> bool:
        """
        Connect to IBKR
        
        Returns:
            bool: True if connected successfully
        """
        if self.connected:
            self.logger.info("Already connected")
            return True
        
        try:
            self.ib = IB()
            await self.ib.connectAsync(
                self.config.host,
                self.config.port,
                clientId=self.config.client_id,
                timeout=self.config.timeout
            )
            self.connected = True
            self.logger.info(f"Connected to IBKR at {self.config.host}:{self.config.port}")
            return True
        
        except Exception as e:
            self.logger.error(f"Connection failed: {e}")
            self.connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from IBKR"""
        if self.ib and self.connected:
            self.ib.disconnect()
            self.connected = False
            self.logger.info("Disconnected from IBKR")
    
    async def reconnect(self) -> bool:
        """Reconnect to IBKR with exponential backoff"""
        await self.disconnect()
        
        for attempt in range(self.config.retry_attempts):
            self.logger.info(f"Reconnection attempt {attempt + 1}/{self.config.retry_attempts}")
            
            if await self.connect():
                return True
            
            if attempt < self.config.retry_attempts - 1:
                delay = self.config.retry_delay * (2 ** attempt)
                self.logger.info(f"Retrying in {delay} seconds...")
                await asyncio.sleep(delay)
        
        return False
    
    async def get_account_summary(self) -> Optional[AccountSummary]:
        """
        Get account summary
        
        Returns:
            AccountSummary: Account summary data
        """
        if not self.connected:
            raise ConnectionError("Not connected to IBKR")
        
        try:
            summary = await self.ib.accountSummaryAsync()
            
            # Parse summary into AccountSummary object
            summary_dict = {item.tag: item.value for item in summary}
            
            return AccountSummary(
                account=summary[0].account if summary else "Unknown",
                net_liquidation=Decimal(summary_dict.get("NetLiquidation", "0")),
                total_cash=Decimal(summary_dict.get("TotalCashValue", "0")),
                buying_power=Decimal(summary_dict.get("BuyingPower", "0")),
                excess_liquidity=Decimal(summary_dict.get("ExcessLiquidity", "0")),
                equity_with_loan=Decimal(summary_dict.get("EquityWithLoanValue", "0")),
                gross_position_value=Decimal(summary_dict.get("GrossPositionValue", "0"))
            )
        
        except Exception as e:
            self.logger.error(f"Failed to get account summary: {e}")
            return None
    
    async def get_positions(self) -> List[Position]:
        """
        Get all open positions
        
        Returns:
            List[Position]: List of positions
        """
        if not self.connected:
            raise ConnectionError("Not connected to IBKR")
        
        try:
            positions = await self.ib.positionsAsync()
            
            result = []
            for pos in positions:
                result.append(Position(
                    account=pos.account,
                    symbol=pos.contract.symbol,
                    contract=pos.contract,
                    position=Decimal(str(pos.position)),
                    avg_cost=Decimal(str(pos.avgCost)),
                    market_price=Decimal(str(pos.marketPrice)) if pos.marketPrice else Decimal("0"),
                    market_value=Decimal(str(pos.marketValue)) if pos.marketValue else Decimal("0"),
                    unrealized_pnl=Decimal(str(pos.unrealizedPNL)) if pos.unrealizedPNL else Decimal("0"),
                    realized_pnl=Decimal(str(pos.realizedPNL)) if pos.realizedPNL else Decimal("0")
                ))
            
            return result
        
        except Exception as e:
            self.logger.error(f"Failed to get positions: {e}")
            return []
    
    async def place_order(self, order_request: OrderRequest) -> Optional[OrderResponse]:
        """
        Place an order
        
        Args:
            order_request: Order request details
            
        Returns:
            OrderResponse: Order response with order ID and status
        """
        if not self.connected:
            raise ConnectionError("Not connected to IBKR")
        
        # Validate order
        order_request.validate()
        
        try:
            # Create contract
            contract = Stock(order_request.symbol, 'SMART', 'USD')
            
            # Create order based on type
            if order_request.order_type == OrderType.MARKET:
                order = MarketOrder(
                    order_request.action.value,
                    order_request.quantity
                )
            elif order_request.order_type == OrderType.LIMIT:
                order = LimitOrder(
                    order_request.action.value,
                    order_request.quantity,
                    float(order_request.limit_price)
                )
            else:
                raise ValueError(f"Order type {order_request.order_type} not yet implemented")
            
            # Set time in force
            order.tif = order_request.tif.value
            
            # Set account if specified
            if order_request.account:
                order.account = order_request.account
            
            # Place order
            trade = self.ib.placeOrder(contract, order)
            
            # Wait for order to be submitted
            await asyncio.sleep(1)
            
            return OrderResponse(
                order_id=trade.order.orderId,
                perm_id=trade.order.permId,
                client_id=trade.order.clientId,
                status=OrderStatus(trade.orderStatus.status),
                filled_quantity=int(trade.orderStatus.filled),
                remaining_quantity=int(trade.orderStatus.remaining),
                avg_fill_price=Decimal(str(trade.orderStatus.avgFillPrice)) if trade.orderStatus.avgFillPrice else None,
                last_fill_price=Decimal(str(trade.orderStatus.lastFillPrice)) if trade.orderStatus.lastFillPrice else None,
                commission=None  # Updated after fill
            )
        
        except Exception as e:
            self.logger.error(f"Failed to place order: {e}")
            return None
    
    async def cancel_order(self, order_id: int) -> bool:
        """
        Cancel an order
        
        Args:
            order_id: Order ID to cancel
            
        Returns:
            bool: True if cancellation successful
        """
        if not self.connected:
            raise ConnectionError("Not connected to IBKR")
        
        try:
            # Find trade by order ID
            trades = self.ib.trades()
            trade = next((t for t in trades if t.order.orderId == order_id), None)
            
            if not trade:
                self.logger.error(f"Order {order_id} not found")
                return False
            
            # Cancel order
            self.ib.cancelOrder(trade.order)
            self.logger.info(f"Cancelled order {order_id}")
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to cancel order {order_id}: {e}")
            return False
    
    def __enter__(self):
        """Context manager entry"""
        asyncio.run(self.connect())
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        asyncio.run(self.disconnect())


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

async def create_ibkr_client(
    host: str = "127.0.0.1",
    port: int = 5000,
    paper_trading: bool = True
) -> IBKRClient:
    """
    Create and connect IBKR client
    
    Args:
        host: IBKR gateway host
        port: IBKR gateway port
        paper_trading: Use paper trading account
        
    Returns:
        IBKRClient: Connected client
    """
    config = IBKRConfig(
        host=host,
        port=port,
        paper_trading=paper_trading
    )
    
    client = IBKRClient(config)
    await client.connect()
    
    return client
