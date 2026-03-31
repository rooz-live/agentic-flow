#!/usr/bin/env python3
"""
Kanban Sync: Bridge between .goalie/KANBAN_BOARD.yaml and VSCode extension
Part of BML-10: Launch VSCode/Kanban Integration
"""

import json
import yaml
from datetime import datetime
from pathlib import Path
from typing import Dict, List


class KanbanSync:
    """Synchronize Kanban board state between YAML and VSCode."""
    
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.yaml_board = self.project_root / ".goalie" / "KANBAN_BOARD.yaml"
        self.vscode_config = self.project_root / ".vscode" / "kanban.json"
        self.cycle_log = self.project_root / ".goalie" / "cycle_log.jsonl"
        
    def sync_yaml_to_vscode(self) -> Dict:
        """Sync YAML board state to VSCode config."""
        if not self.yaml_board.exists():
            return {'status': 'error', 'message': 'YAML board not found'}
        
        with open(self.yaml_board, 'r') as f:
            board_data = yaml.safe_load(f)
        
        # Update VSCode config with current counts
        if self.vscode_config.exists():
            with open(self.vscode_config, 'r') as f:
                vscode_data = json.load(f)
            
            # Update column titles with current counts
            for col in vscode_data['columns']:
                col_id = col['id']
                if col_id in board_data['columns']:
                    items = board_data['columns'][col_id]['items']
                    count = len(items)
                    
                    if col_id == 'NOW':
                        wip_limit = board_data['columns'][col_id]['wip_limit']
                        col['title'] = f"NOW (WIP: {count}/{wip_limit})"
                    elif col_id == 'NEXT':
                        wip_limit = board_data['columns'][col_id]['wip_limit']
                        col['title'] = f"NEXT (Ready: {count}/{wip_limit})"
                    elif col_id == 'LATER':
                        col['title'] = f"LATER (Backlog: {count})"
                    elif col_id == 'DONE':
                        col['title'] = f"DONE ({count})"
            
            with open(self.vscode_config, 'w') as f:
                json.dump(vscode_data, f, indent=2)
        
        return {
            'status': 'synced',
            'timestamp': datetime.now().isoformat(),
            'source': str(self.yaml_board),
            'target': str(self.vscode_config)
        }
    
    def move_item(self, item_id: str, from_column: str, to_column: str) -> Dict:
        """Move an item between columns."""
        if not self.yaml_board.exists():
            return {'status': 'error', 'message': 'YAML board not found'}
        
        with open(self.yaml_board, 'r') as f:
            board_data = yaml.safe_load(f)
        
        # Find and move item
        item = None
        from_items = board_data['columns'][from_column]['items']
        
        for i, candidate in enumerate(from_items):
            if candidate['id'] == item_id:
                item = from_items.pop(i)
                break
        
        if not item:
            return {'status': 'error', 'message': f'Item {item_id} not found'}
        
        # Update item status
        if to_column == 'DONE':
            item['completed_at'] = datetime.now().strftime('%Y-%m-%d')
        
        # Add to target column
        board_data['columns'][to_column]['items'].append(item)
        
        # Update metadata
        board_data['metadata']['last_updated'] = datetime.now().isoformat()
        
        # Write back to YAML
        with open(self.yaml_board, 'w') as f:
            yaml.dump(board_data, f, default_flow_style=False, sort_keys=False)
        
        # Log to cycle log
        self._log_move(item_id, from_column, to_column)
        
        # Sync to VSCode
        self.sync_yaml_to_vscode()
        
        return {
            'status': 'moved',
            'item_id': item_id,
            'from': from_column,
            'to': to_column,
            'timestamp': datetime.now().isoformat()
        }
    
    def _log_move(self, item_id: str, from_column: str, to_column: str):
        """Log item movement to cycle log."""
        log_entry = {
            'event': 'kanban_move',
            'item_id': item_id,
            'from': from_column,
            'to': to_column,
            'timestamp': datetime.now().isoformat()
        }
        
        with open(self.cycle_log, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    def get_status(self) -> Dict:
        """Get current board status."""
        if not self.yaml_board.exists():
            return {'status': 'error', 'message': 'YAML board not found'}
        
        with open(self.yaml_board, 'r') as f:
            board_data = yaml.safe_load(f)
        
        status = {
            'board_version': board_data['metadata']['board_version'],
            'last_updated': board_data['metadata']['last_updated'],
            'columns': {}
        }
        
        for col_id, col_data in board_data['columns'].items():
            status['columns'][col_id] = {
                'count': len(col_data['items']),
                'wip_limit': col_data.get('wip_limit'),
                'description': col_data['description']
            }
        
        return status


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Kanban board synchronization')
    parser.add_argument('--sync', action='store_true', 
                       help='Sync YAML to VSCode')
    parser.add_argument('--status', action='store_true',
                       help='Show board status')
    parser.add_argument('--move', nargs=3, metavar=('ITEM_ID', 'FROM', 'TO'),
                       help='Move item between columns')
    parser.add_argument('--json', action='store_true',
                       help='Output as JSON')
    
    args = parser.parse_args()
    
    sync = KanbanSync()
    
    if args.sync:
        result = sync.sync_yaml_to_vscode()
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"✅ Synced: {result['status']}")
            
    elif args.status:
        result = sync.get_status()
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print("📊 Board Status:")
            for col_id, col_status in result['columns'].items():
                wip = col_status['wip_limit']
                count = col_status['count']
                if wip:
                    print(f"  {col_id}: {count}/{wip}")
                else:
                    print(f"  {col_id}: {count}")
                    
    elif args.move:
        item_id, from_col, to_col = args.move
        result = sync.move_item(item_id, from_col, to_col)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"✅ Moved {item_id}: {from_col} → {to_col}")
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
