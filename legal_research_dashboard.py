#!/usr/bin/env python3
"""
Legal Research Dashboard (TUI)
Manages case law, statutes, and analysis documents for the advocacy pipeline.
"""

import os
from pathlib import Path
from textual.app import App, ComposeResult
from textual.widgets import Header, Footer, DataTable, Tree, Static, Input, Button
from textual.containers import Container, Vertical, Horizontal
from textual.widgets.tree import TreeNode

# Configuration
LEGAL_ROOT = Path("/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/RESEARCH")

class LegalResearchDashboard(App):
    """TUI for legal research management"""

    CSS = """
    Screen {
        layout: horizontal;
    }

    #sidebar {
        width: 30%;
        border: solid $secondary;
        margin: 1;
    }

    #main_content {
        width: 70%;
        layout: vertical;
        margin: 1;
    }

    #case_results {
        height: 50%;
        border: solid $primary;
    }

    #citation_status {
        height: 20%;
        border: solid $accent;
        padding: 1;
    }

    #search_bar {
        height: 3;
        margin-bottom: 1;
    }
    """

    BINDINGS = [
        ("q", "quit", "Quit"),
        ("r", "refresh", "Refresh"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()

        with Container(id="sidebar"):
            yield Tree("Legal Research", id="research_tree")

        with Container(id="main_content"):
            with Horizontal(id="search_bar"):
                yield Input(placeholder="Search case law...", id="search_input")
                yield Button("Search", id="search_btn")

            yield DataTable(id="case_results")
            yield Static("Select a case to view details...", id="citation_status")

        yield Footer()

    def on_mount(self) -> None:
        self.refresh_tree()
        self._init_datatable()

    def refresh_tree(self) -> None:
        tree = self.query_one("#research_tree", Tree)
        tree.clear()
        root = tree.root
        root.expand()

        # Add main folders
        self._add_folder(root, "EMAILS", LEGAL_ROOT / "Emails")
        self._add_folder(root, "CASE-LAW", LEGAL_ROOT / "CASE-LAW")
        self._add_folder(root, "STATUTES", LEGAL_ROOT / "STATUTES")
        self._add_folder(root, "ANALYSIS", LEGAL_ROOT / "ANALYSIS")

    def _add_folder(self, node: TreeNode, name: str, path: Path) -> None:
        if not path.exists():
            return

        folder_node = node.add(name, expand=True)
        for item in sorted(path.iterdir()):
            if item.is_dir():
                self._add_folder(folder_node, item.name, item)
            elif item.suffix.lower() in ['.pdf', '.md', '.txt', '.eml']:
                folder_node.add_leaf(item.name)

    def _init_datatable(self) -> None:
        table = self.query_one("#case_results", DataTable)
        table.add_columns("Case Name", "Jurisdiction", "Date", "Relevance")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "search_btn":
            query = self.query_one("#search_input", Input).value
            self.perform_search(query)

    def perform_search(self, query: str) -> None:
        table = self.query_one("#case_results", DataTable)
        table.clear()
        # Mock search results for now - integration with CourtListener would go here
        if query:
            table.add_row("Von Pettis v. McKoy", "NC Court of Appeals", "2024", "High (Retaliation)")
            table.add_row("Dunn v. Combs", "NC District", "2023", "Medium (Habitability)")
            self.query_one("#citation_status", Static).update(f"Found 2 items for '{query}'")

    def on_tree_node_selected(self, event: Tree.NodeSelected) -> None:
        node_label = str(event.node.label)
        self.query_one("#citation_status", Static).update(f"Selected: {node_label}")

if __name__ == "__main__":
    app = LegalResearchDashboard()
    app.run()
