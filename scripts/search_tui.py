#!/usr/bin/env python3
"""
Code Search TUI - Interactive Terminal UI
Textual-based interface for code_search.py and doc_query.py

Usage:
    python scripts/search_tui.py
    
Keyboard shortcuts:
    Ctrl+S: Switch between code search and doc query
    Ctrl+Q: Quit
    Enter: Execute search
    Tab: Cycle through results
"""

import asyncio
import sys
from pathlib import Path
from typing import List, Dict, Optional

from textual import on
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import (
    Header, Footer, Input, Button, DataTable, Static,
    ProgressBar, Label, TabbedContent, TabPane, Tree
)
from textual.worker import Worker, WorkerState

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent))

from code_search import CodeSearch
from doc_query import DocQuery


class SearchStats(Static):
    """Display search statistics."""
    
    def __init__(self):
        super().__init__()
        self.stats = {}
    
    def update_stats(self, stats: Dict):
        """Update statistics display."""
        self.stats = stats
        
        lines = []
        lines.append(f"Files: {stats.get('files_searched', 0)}")
        lines.append(f"Matches: {stats.get('matches_found', 0)}")
        lines.append(f"Time: {stats.get('elapsed_time_ms', 0)}ms")
        
        if 'performance_metrics' in stats:
            metrics = stats['performance_metrics']
            lines.append(f"Rate: {metrics.get('processing_rate_files_per_sec', 0):.1f} files/sec")
            
            if 'cache_hit_rate' in metrics:
                hit_rate = metrics['cache_hit_rate'] * 100
                lines.append(f"Cache: {hit_rate:.1f}%")
        
        self.update("\n".join(lines))


class CodeSearchTUI(App):
    """Interactive TUI for code search and doc query."""
    
    CSS = """
    Screen {
        background: $surface;
    }
    
    #search-input {
        dock: top;
        height: 3;
        margin: 1;
    }
    
    #controls {
        dock: top;
        height: 3;
        margin: 0 1;
    }
    
    #stats {
        dock: left;
        width: 30;
        margin: 1;
        background: $boost;
        padding: 1;
    }
    
    #results-container {
        margin: 1;
    }
    
    #progress-container {
        dock: bottom;
        height: 3;
        margin: 1;
    }
    
    DataTable {
        height: 100%;
    }
    
    Button {
        margin: 0 1;
    }
    
    ProgressBar {
        margin: 1 0;
    }
    """
    
    BINDINGS = [
        Binding("ctrl+s", "switch_mode", "Switch Mode"),
        Binding("ctrl+q", "quit", "Quit"),
        ("ctrl+c", "quit", "Quit"),
    ]
    
    def __init__(self):
        super().__init__()
        self.search_mode = "code"  # "code" or "doc"
        self.code_searcher = CodeSearch(
            root_dir=str(Path.cwd()),
            timeout=30,
            max_workers=4,
            enable_concurrency=True
        )
        self.doc_query = DocQuery(
            project_root=str(Path.cwd()),
            use_cache=True,
            max_workers=4,
            enable_concurrency=True
        )
        self.search_worker: Optional[Worker] = None
    
    def compose(self) -> ComposeResult:
        """Compose the TUI layout."""
        yield Header(show_clock=True)
        
        # Search input
        with Container(id="search-input"):
            yield Input(
                placeholder="Enter search pattern (regex supported)",
                id="pattern-input"
            )
        
        # Control buttons
        with Horizontal(id="controls"):
            yield Button("Search", variant="primary", id="search-btn")
            yield Button("Clear", id="clear-btn")
            yield Label(f"Mode: {self.search_mode.upper()}", id="mode-label")
        
        # Main content area with stats sidebar
        with Horizontal():
            yield SearchStats(id="stats")
            
            with Vertical(id="results-container"):
                # Tabbed results view
                with TabbedContent(id="results-tabs"):
                    with TabPane("Results", id="results-pane"):
                        table = DataTable(id="results-table", zebra_stripes=True)
                        table.cursor_type = "row"
                        yield table
                    
                    with TabPane("Details", id="details-pane"):
                        yield Static("Select a result to view details", id="details-view")
        
        # Progress bar at bottom
        with Container(id="progress-container"):
            yield ProgressBar(id="progress-bar", total=100)
            yield Label("Ready", id="status-label")
        
        yield Footer()
    
    def on_mount(self) -> None:
        """Initialize the application."""
        table = self.query_one("#results-table", DataTable)
        table.add_columns("File", "Line", "Match")
        self.update_status("Ready. Enter pattern and press Search or Enter.")
    
    @on(Input.Submitted, "#pattern-input")
    async def on_input_submitted(self, event: Input.Submitted) -> None:
        """Handle Enter key in input field."""
        await self.perform_search()
    
    @on(Button.Pressed, "#search-btn")
    async def on_search_pressed(self) -> None:
        """Handle search button press."""
        await self.perform_search()
    
    @on(Button.Pressed, "#clear-btn")
    def on_clear_pressed(self) -> None:
        """Clear results and input."""
        self.query_one("#pattern-input", Input).value = ""
        table = self.query_one("#results-table", DataTable)
        table.clear()
        self.query_one("#stats", SearchStats).update("")
        self.query_one("#details-view", Static).update("No results")
        self.update_status("Cleared")
    
    @on(DataTable.RowSelected, "#results-table")
    def on_row_selected(self, event: DataTable.RowSelected) -> None:
        """Show details when a row is selected."""
        if event.row_key:
            row_data = event.data_table.get_row(event.row_key)
            details = self.query_one("#details-view", Static)
            
            # Format details
            file_path, line_num, match_text = row_data
            details.update(
                f"[bold]File:[/bold] {file_path}\n"
                f"[bold]Line:[/bold] {line_num}\n"
                f"[bold]Match:[/bold]\n{match_text}"
            )
    
    def action_switch_mode(self) -> None:
        """Switch between code search and doc query modes."""
        self.search_mode = "doc" if self.search_mode == "code" else "code"
        mode_label = self.query_one("#mode-label", Label)
        mode_label.update(f"Mode: {self.search_mode.upper()}")
        self.update_status(f"Switched to {self.search_mode.upper()} mode")
    
    async def perform_search(self) -> None:
        """Execute the search operation."""
        pattern_input = self.query_one("#pattern-input", Input)
        pattern = pattern_input.value.strip()
        
        if not pattern:
            self.update_status("⚠️  Enter a search pattern")
            return
        
        # Cancel existing search if running
        if self.search_worker and self.search_worker.state == WorkerState.RUNNING:
            self.search_worker.cancel()
        
        # Clear previous results
        table = self.query_one("#results-table", DataTable)
        table.clear()
        
        # Start search
        self.update_status(f"🔍 Searching for '{pattern}'...")
        self.query_one("#progress-bar", ProgressBar).update(progress=0)
        
        # Run search in worker thread
        if self.search_mode == "code":
            self.search_worker = self.run_worker(
                self.code_search_worker(pattern),
                exclusive=True
            )
        else:
            self.search_worker = self.run_worker(
                self.doc_query_worker(pattern),
                exclusive=True
            )
    
    async def code_search_worker(self, pattern: str) -> Dict:
        """Worker for code search."""
        try:
            result = self.code_searcher.search(
                pattern=pattern,
                file_types=['py', 'sh', 'md', 'yaml', 'yml', 'json'],
                max_depth=8,
                regex=True,
                max_results=100,
                show_progress=False
            )
            
            if 'error' in result:
                self.update_status(f"❌ Error: {result['error']}")
                return result
            
            # Update UI with results
            self.call_from_thread(self.display_results, result)
            return result
            
        except Exception as e:
            error_result = {'error': str(e)}
            self.call_from_thread(self.update_status, f"❌ Error: {e}")
            return error_result
    
    async def doc_query_worker(self, query: str) -> Dict:
        """Worker for doc query."""
        try:
            result = self.doc_query.query(query, max_depth=5)
            
            if 'error' in result:
                self.update_status(f"❌ Error: {result['error']}")
                return result
            
            # Update UI with results
            self.call_from_thread(self.display_results, result)
            return result
            
        except Exception as e:
            error_result = {'error': str(e)}
            self.call_from_thread(self.update_status, f"❌ Error: {e}")
            return error_result
    
    def display_results(self, result: Dict) -> None:
        """Display search results in the table."""
        table = self.query_one("#results-table", DataTable)
        stats = self.query_one("#stats", SearchStats)
        progress = self.query_one("#progress-bar", ProgressBar)
        
        matches = result.get('matches', [])
        
        # Populate table
        for match in matches:
            file_path = match.get('file', '')
            line = match.get('line', 0)
            content = match.get('content', match.get('match', ''))
            
            # Truncate content for display
            if len(content) > 80:
                content = content[:77] + "..."
            
            table.add_row(file_path, str(line), content)
        
        # Update stats
        stats.update_stats(result)
        
        # Update progress
        progress.update(progress=100)
        
        # Update status
        match_count = len(matches)
        time_ms = result.get('elapsed_time_ms', 0)
        
        if match_count == 0:
            self.update_status("No matches found")
        else:
            perf_icon = "✅" if time_ms < 1000 else "⚠️"
            self.update_status(
                f"✅ Found {match_count} matches in {time_ms}ms {perf_icon}"
            )
    
    def update_status(self, message: str) -> None:
        """Update status label."""
        status = self.query_one("#status-label", Label)
        status.update(message)


def main():
    """Run the TUI application."""
    app = CodeSearchTUI()
    app.run()


if __name__ == '__main__':
    main()
