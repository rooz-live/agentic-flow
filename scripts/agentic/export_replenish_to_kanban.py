#!/usr/bin/env python3
"""
Export Retro-Replenish Items to KANBAN
Writes ReplenishItem objects from retro_replenish_workflow to KANBAN_BOARD.yaml
with proper WSJF field persistence (fixes RCA root cause).

Usage: python3 export_replenish_to_kanban.py --circle innovator [--dry-run]
"""

import os
import sys
import yaml
import argparse
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(PROJECT_ROOT / "scripts"))

from agentic.retro_replenish_workflow import RetroReplenishWorkflow
from agentic.pattern_logger import PatternLogger


KANBAN_FILE = PROJECT_ROOT / ".goalie" / "KANBAN_BOARD.yaml"


def export_to_kanban(circle: str, use_ai: bool = True, dry_run: bool = False) -> dict:
    """
    Run retro-replenish workflow and export items to KANBAN with WSJF persistence.
    
    Args:
        circle: Target circle for replenishment
        use_ai: Use AI enhancement for WSJF
        dry_run: Preview without writing
        
    Returns:
        dict: Summary of export operation
    """
    print("\n" + "="*60)
    print("🔄 RETRO-REPLENISH → KANBAN EXPORT")
    print("="*60 + "\n")
    
    # Initialize logger
    logger = PatternLogger(
        mode="advisory" if dry_run else "mutate",
        circle=circle,
        run_id=f"export-{int(datetime.now().timestamp())}"
    )
    
    # Run workflow
    workflow = RetroReplenishWorkflow()
    print("📊 Running retro-replenish workflow...\n")
    
    insights = workflow.run_retro()
    items = workflow.run_replenish(target_circle=circle)
    refinement = workflow.run_refine(use_ai=use_ai)
    
    if not items:
        print("\n✅ No items to export\n")
        return {
            "exported": 0,
            "dry_run": dry_run,
            "circle": circle
        }
    
    print(f"\n📝 Exporting {len(items)} items to KANBAN...\n")
    
    # Load KANBAN board
    if not KANBAN_FILE.exists():
        print(f"❌ KANBAN board not found at {KANBAN_FILE}")
        return {"error": "KANBAN board not found"}
    
    with open(KANBAN_FILE, 'r') as f:
        kanban = yaml.safe_load(f) or {}
    
    # Ensure NEXT column exists
    if 'NEXT' not in kanban:
        kanban['NEXT'] = []
    
    # Export items
    exported_count = 0
    skipped_count = 0
    
    for item in items:
        # Check for duplicates by ID
        existing_ids = [i.get('id') for col in ['NEXT', 'LATER', 'NOW', 'DOING', 'DONE'] 
                       for i in kanban.get(col, [])]
        
        if item.item_id in existing_ids:
            print(f"   ⏭️  Skipping {item.item_id} (already exists)")
            skipped_count += 1
            continue
        
        # Create KANBAN entry with WSJF field (RCA fix)
        kanban_entry = {
            'id': item.item_id,
            'title': item.title,
            'summary': f"{item.description} (Circle: {item.circle}, Tier: {item.tier})",
            'circle': item.circle,
            'tier': item.tier,
            'status': 'todo',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'wsjf': round(item.wsjf, 2),  # ← TOP-LEVEL FIELD (RCA FIX)
            'economic': {
                'ubv': item.ubv,
                'tc': item.tc,
                'rr': item.rr,
                'size': item.size,
                'cod': item.ubv + item.tc + item.rr,
                'wsjf': round(item.wsjf, 2)
            },
            'source': {
                'workflow': 'retro-replenish',
                'insight_id': item.source_insight
            }
        }
        
        kanban['NEXT'].append(kanban_entry)
        exported_count += 1
        
        print(f"   ✨ {item.item_id}: {item.title[:50]}... (WSJF: {item.wsjf:.2f})")
        
        # Log export event
        logger.log(
            pattern_name="retro_replenish_export",
            data={
                "item_id": item.item_id,
                "circle": item.circle,
                "tier": item.tier,
                "source_insight": item.source_insight,
                "action": "export_to_kanban"
            },
            gate="governance",
            behavioral_type="enforcement",
            backlog_item=item.item_id,
            economic={
                "wsjf_score": float(item.wsjf),
                "ubv": float(item.ubv),
                "tc": float(item.tc),
                "rr": float(item.rr),
                "size": float(item.size),
                "cod": float(item.ubv + item.tc + item.rr)
            },
            run_type="retro_replenish_export"
        )
    
    # Write to file
    if not dry_run and exported_count > 0:
        with open(KANBAN_FILE, 'w') as f:
            yaml.dump(kanban, f, default_flow_style=False, sort_keys=False)
        print(f"\n✅ Exported {exported_count} items to KANBAN NEXT column")
    elif dry_run:
        print(f"\n🚫 DRY RUN: Would export {exported_count} items")
    else:
        print(f"\n✅ No new items to export")
    
    if skipped_count > 0:
        print(f"⏭️  Skipped {skipped_count} duplicate items")
    
    result = {
        "exported": exported_count,
        "skipped": skipped_count,
        "dry_run": dry_run,
        "circle": circle,
        "insights_analyzed": len(insights),
        "items_generated": len(items),
        "items_prioritized": refinement.items_prioritized,
        "ai_enhanced": refinement.ai_enhanced
    }
    
    print("\n" + "="*60)
    print("✅ EXPORT COMPLETE")
    print(f"   Insights: {len(insights)} → Items: {len(items)} → Exported: {exported_count}")
    print("="*60 + "\n")
    
    return result


def main():
    parser = argparse.ArgumentParser(
        description="Export retro-replenish items to KANBAN with WSJF persistence"
    )
    parser.add_argument("--circle", default="innovator",
                       help="Target circle for replenishment")
    parser.add_argument("--no-ai", action="store_true",
                       help="Disable AI enhancement")
    parser.add_argument("--dry-run", action="store_true",
                       help="Preview without writing")
    parser.add_argument("--json", action="store_true",
                       help="Output JSON summary")
    args = parser.parse_args()
    
    result = export_to_kanban(
        circle=args.circle,
        use_ai=not args.no_ai,
        dry_run=args.dry_run
    )
    
    if args.json:
        import json
        print(json.dumps(result, indent=2))
    
    return 0 if result.get("exported", 0) >= 0 else 1


if __name__ == "__main__":
    sys.exit(main())
