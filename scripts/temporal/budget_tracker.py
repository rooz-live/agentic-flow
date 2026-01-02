#!/usr/bin/env python3
"""
CapEx-to-Revenue Budget Tracker with Temporal Controls
Tracks capital expenditures converting to revenue, iteration budgets, and early stopping logic
"""

import json
import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

class BudgetType(Enum):
    CAPEX = "capex"
    OPEX = "opex"
    REVENUE = "revenue"
    ITERATION = "iteration"

class BudgetStatus(Enum):
    ALLOCATED = "allocated"
    IN_USE = "in_use"
    CONVERTED = "converted_to_revenue"
    EXHAUSTED = "exhausted"
    EARLY_STOPPED = "early_stopped"

@dataclass
class Budget:
    budget_id: str
    tenant_id: str
    budget_type: BudgetType
    amount: float
    currency: str = "USD"
    allocated_at: str = None
    valid_from: str = None
    valid_to: str = None
    status: BudgetStatus = BudgetStatus.ALLOCATED
    conversion_rate: float = 0.0  # CapEx -> Revenue conversion %
    iterations_used: int = 0
    iterations_limit: int = 100
    early_stop_threshold: float = 0.8  # Stop at 80% budget utilization
    metadata: Dict = None

@dataclass
class RevenueConversion:
    conversion_id: str
    budget_id: str
    capex_amount: float
    revenue_generated: float
    conversion_rate: float
    converted_at: str
    pattern: str
    circle: str

class BudgetTracker:
    def __init__(self, db_path: str = ".goalie/budget_tracker.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """Initialize temporal budget database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Budgets table with temporal validity
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS budgets (
                budget_id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                budget_type TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'USD',
                allocated_at TEXT NOT NULL,
                valid_from TEXT NOT NULL,
                valid_to TEXT,
                status TEXT NOT NULL,
                conversion_rate REAL DEFAULT 0.0,
                iterations_used INTEGER DEFAULT 0,
                iterations_limit INTEGER DEFAULT 100,
                early_stop_threshold REAL DEFAULT 0.8,
                metadata TEXT
            )
        """)
        
        # Create indexes separately
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tenant ON budgets(tenant_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_valid_period ON budgets(valid_from, valid_to)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_status ON budgets(status)")
        
        # Revenue conversions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS revenue_conversions (
                conversion_id TEXT PRIMARY KEY,
                budget_id TEXT NOT NULL,
                capex_amount REAL NOT NULL,
                revenue_generated REAL NOT NULL,
                conversion_rate REAL NOT NULL,
                converted_at TEXT NOT NULL,
                pattern TEXT,
                circle TEXT,
                FOREIGN KEY (budget_id) REFERENCES budgets(budget_id)
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_budget ON revenue_conversions(budget_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_converted_at ON revenue_conversions(converted_at)")
        
        # Pattern costs table (tracks which patterns cost what)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pattern_costs (
                pattern TEXT PRIMARY KEY,
                capex_cost REAL NOT NULL,
                opex_cost REAL NOT NULL,
                avg_revenue REAL DEFAULT 0.0,
                execution_count INTEGER DEFAULT 0,
                last_updated TEXT NOT NULL
            )
        """)
        
        conn.commit()
        conn.close()
    
    def allocate_budget(
        self,
        tenant_id: str,
        budget_type: BudgetType,
        amount: float,
        valid_days: int = 30,
        iterations_limit: int = 100,
        early_stop_threshold: float = 0.8
    ) -> Budget:
        """Allocate new budget with temporal validity"""
        now = datetime.now(timezone.utc)
        budget_id = f"{tenant_id}-{budget_type.value}-{now.strftime('%Y%m%d%H%M%S')}"
        
        budget = Budget(
            budget_id=budget_id,
            tenant_id=tenant_id,
            budget_type=budget_type,
            amount=amount,
            allocated_at=now.isoformat(),
            valid_from=now.isoformat(),
            valid_to=(now + timedelta(days=valid_days)).isoformat(),
            iterations_limit=iterations_limit,
            early_stop_threshold=early_stop_threshold
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO budgets (
                budget_id, tenant_id, budget_type, amount, allocated_at,
                valid_from, valid_to, status, iterations_limit, early_stop_threshold, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            budget.budget_id, budget.tenant_id, budget.budget_type.value,
            budget.amount, budget.allocated_at, budget.valid_from, budget.valid_to,
            budget.status.value, budget.iterations_limit, budget.early_stop_threshold,
            json.dumps(budget.metadata or {})
        ))
        conn.commit()
        conn.close()
        
        return budget
    
    def use_iteration(self, budget_id: str) -> Tuple[bool, str]:
        """
        Use one iteration from budget. Returns (allowed, reason).
        Implements early stopping to prevent budget exhaustion.
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT iterations_used, iterations_limit, early_stop_threshold, status, amount
            FROM budgets WHERE budget_id = ?
        """, (budget_id,))
        
        row = cursor.fetchone()
        if not row:
            conn.close()
            return False, "budget_not_found"
        
        iterations_used, iterations_limit, early_stop_threshold, status, amount = row
        
        # Check status
        if status == BudgetStatus.EXHAUSTED.value:
            conn.close()
            return False, "budget_exhausted"
        
        if status == BudgetStatus.EARLY_STOPPED.value:
            conn.close()
            return False, "early_stopped"
        
        # Check iteration limit
        if iterations_used >= iterations_limit:
            cursor.execute("""
                UPDATE budgets SET status = ? WHERE budget_id = ?
            """, (BudgetStatus.EXHAUSTED.value, budget_id))
            conn.commit()
            conn.close()
            return False, "iteration_limit_reached"
        
        # Early stopping check
        utilization = iterations_used / iterations_limit
        if utilization >= early_stop_threshold:
            cursor.execute("""
                UPDATE budgets SET status = ? WHERE budget_id = ?
            """, (BudgetStatus.EARLY_STOPPED.value, budget_id))
            conn.commit()
            conn.close()
            return False, f"early_stop_threshold_reached_{utilization:.1%}"
        
        # Increment iteration
        cursor.execute("""
            UPDATE budgets SET iterations_used = iterations_used + 1, status = ?
            WHERE budget_id = ?
        """, (BudgetStatus.IN_USE.value, budget_id))
        conn.commit()
        conn.close()
        
        return True, f"iteration_{iterations_used + 1}/{iterations_limit}"
    
    def record_capex_to_revenue(
        self,
        budget_id: str,
        capex_amount: float,
        revenue_generated: float,
        pattern: str,
        circle: str
    ) -> RevenueConversion:
        """Record CapEx converting to revenue"""
        conversion_rate = (revenue_generated / capex_amount * 100) if capex_amount > 0 else 0
        now = datetime.now(timezone.utc)
        
        conversion = RevenueConversion(
            conversion_id=f"conv-{now.strftime('%Y%m%d%H%M%S%f')}",
            budget_id=budget_id,
            capex_amount=capex_amount,
            revenue_generated=revenue_generated,
            conversion_rate=conversion_rate,
            converted_at=now.isoformat(),
            pattern=pattern,
            circle=circle
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO revenue_conversions (
                conversion_id, budget_id, capex_amount, revenue_generated,
                conversion_rate, converted_at, pattern, circle
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            conversion.conversion_id, conversion.budget_id, conversion.capex_amount,
            conversion.revenue_generated, conversion.conversion_rate,
            conversion.converted_at, conversion.pattern, conversion.circle
        ))
        
        # Update budget conversion rate
        cursor.execute("""
            UPDATE budgets SET conversion_rate = (
                SELECT AVG(conversion_rate) FROM revenue_conversions
                WHERE budget_id = ?
            ), status = ? WHERE budget_id = ?
        """, (budget_id, BudgetStatus.CONVERTED.value, budget_id))
        
        conn.commit()
        conn.close()
        
        return conversion
    
    def get_active_budgets(self, tenant_id: Optional[str] = None) -> List[Budget]:
        """Get currently active budgets (within validity period)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.now(timezone.utc).isoformat()
        
        if tenant_id:
            cursor.execute("""
                SELECT * FROM budgets
                WHERE tenant_id = ? AND valid_from <= ? AND (valid_to IS NULL OR valid_to >= ?)
                AND status NOT IN ('exhausted', 'early_stopped')
                ORDER BY allocated_at DESC
            """, (tenant_id, now, now))
        else:
            cursor.execute("""
                SELECT * FROM budgets
                WHERE valid_from <= ? AND (valid_to IS NULL OR valid_to >= ?)
                AND status NOT IN ('exhausted', 'early_stopped')
                ORDER BY allocated_at DESC
            """, (now, now))
        
        budgets = []
        for row in cursor.fetchall():
            budgets.append(Budget(
                budget_id=row[0],
                tenant_id=row[1],
                budget_type=BudgetType(row[2]),
                amount=row[3],
                currency=row[4],
                allocated_at=row[5],
                valid_from=row[6],
                valid_to=row[7],
                status=BudgetStatus(row[8]),
                conversion_rate=row[9],
                iterations_used=row[10],
                iterations_limit=row[11],
                early_stop_threshold=row[12],
                metadata=json.loads(row[13]) if row[13] else {}
            ))
        
        conn.close()
        return budgets
    
    def get_conversion_summary(self, tenant_id: Optional[str] = None) -> Dict:
        """Get CapEx-to-Revenue conversion summary"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if tenant_id:
            cursor.execute("""
                SELECT 
                    COUNT(*) as conversion_count,
                    SUM(capex_amount) as total_capex,
                    SUM(revenue_generated) as total_revenue,
                    AVG(conversion_rate) as avg_conversion_rate
                FROM revenue_conversions rc
                JOIN budgets b ON rc.budget_id = b.budget_id
                WHERE b.tenant_id = ?
            """, (tenant_id,))
        else:
            cursor.execute("""
                SELECT 
                    COUNT(*) as conversion_count,
                    SUM(capex_amount) as total_capex,
                    SUM(revenue_generated) as total_revenue,
                    AVG(conversion_rate) as avg_conversion_rate
                FROM revenue_conversions
            """)
        
        row = cursor.fetchone()
        conn.close()
        
        return {
            'conversion_count': row[0] or 0,
            'total_capex': round(row[1] or 0, 2),
            'total_revenue': round(row[2] or 0, 2),
            'avg_conversion_rate': round(row[3] or 0, 2),
            'roi': round((row[2] / row[1] * 100) if row[1] and row[1] > 0 else 0, 2)
        }


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Budget Tracker with CapEx-to-Revenue')
    parser.add_argument('--allocate', action='store_true', help='Allocate new budget')
    parser.add_argument('--tenant-id', help='Tenant ID')
    parser.add_argument('--type', choices=['capex', 'opex', 'iteration'], help='Budget type')
    parser.add_argument('--amount', type=float, help='Budget amount')
    parser.add_argument('--iterations', type=int, default=100, help='Iteration limit')
    parser.add_argument('--early-stop', type=float, default=0.8, help='Early stop threshold')
    parser.add_argument('--summary', action='store_true', help='Show conversion summary')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    tracker = BudgetTracker()
    
    if args.allocate:
        if not all([args.tenant_id, args.type, args.amount]):
            print("Error: --tenant-id, --type, and --amount required for allocation")
            return
        
        budget = tracker.allocate_budget(
            tenant_id=args.tenant_id,
            budget_type=BudgetType(args.type),
            amount=args.amount,
            iterations_limit=args.iterations,
            early_stop_threshold=args.early_stop
        )
        
        if args.json:
            print(json.dumps(asdict(budget), default=str, indent=2))
        else:
            print(f"✓ Allocated {budget.budget_type.value} budget: ${budget.amount:,.2f}")
            print(f"  Budget ID: {budget.budget_id}")
            print(f"  Iterations: {budget.iterations_limit} (early stop at {budget.early_stop_threshold:.0%})")
    
    elif args.summary:
        summary = tracker.get_conversion_summary(args.tenant_id)
        
        if args.json:
            print(json.dumps(summary, indent=2))
        else:
            print(f"\n{'='*60}")
            print(f"CapEx-to-Revenue Conversion Summary")
            if args.tenant_id:
                print(f"Tenant: {args.tenant_id}")
            print(f"{'='*60}")
            print(f"Conversions: {summary['conversion_count']}")
            print(f"Total CapEx: ${summary['total_capex']:,.2f}")
            print(f"Total Revenue: ${summary['total_revenue']:,.2f}")
            print(f"Avg Conversion Rate: {summary['avg_conversion_rate']:.2f}%")
            print(f"ROI: {summary['roi']:.2f}%")
            print(f"{'='*60}\n")
    
    else:
        budgets = tracker.get_active_budgets(args.tenant_id)
        
        if args.json:
            print(json.dumps([asdict(b) for b in budgets], default=str, indent=2))
        else:
            print(f"\nActive Budgets: {len(budgets)}")
            for b in budgets:
                print(f"\n  {b.budget_type.value.upper()}: ${b.amount:,.2f}")
                print(f"  ID: {b.budget_id}")
                print(f"  Iterations: {b.iterations_used}/{b.iterations_limit} ({b.iterations_used/b.iterations_limit:.1%})")
                print(f"  Status: {b.status.value}")
                if b.conversion_rate > 0:
                    print(f"  Conversion Rate: {b.conversion_rate:.2f}%")


if __name__ == '__main__':
    main()
