#!/usr/bin/env python3
"""
Wave 4 Agentic Architecture: Language-Aware AST Chunking
Replaces arbitrary 500-character splitting with precise Class/Function boundaries 
to preserve the Symmetry of the logic for mxbai-embed-large.
"""
import ast
import os
import json

class ASTSemanticChunker:
    def __init__(self, target_dir):
        self.target_dir = target_dir
        self.chunks = []

    def chunk_python_file(self, filepath):
        """
        Uses Python's native Abstract Syntax Tree to identify logical boundaries.
        Ensures the agentic Inference Engine does not receive fractured tensors.
        """
        with open(filepath, 'r') as f:
            source = f.read()
            
        try:
            tree = ast.parse(source)
            lines = source.splitlines()
            
            for node in ast.walk(tree):
                # Isolate boundaries strictly by logical construct
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    start_line = node.lineno - 1
                    end_line = node.end_lineno
                    
                    chunk_text = "\n".join(lines[start_line:end_line])
                    
                    self.chunks.append({
                        "file": filepath,
                        "type": type(node).__name__,
                        "name": node.name,
                        "token_estimate": len(chunk_text.split()),
                        "content": chunk_text
                    })
        except Exception as e:
            print(f"[AST-Indexer] Error parsing {filepath}: {e}")

    def execute_indexing(self):
        print(f"🌲 Initiating Tree-Sitter / AST Semantic Indexing across {self.target_dir}")
        for root, _, files in os.walk(self.target_dir):
            for file in files:
                if file.endswith('.py'):
                    self.chunk_python_file(os.path.join(root, file))
                    
        # Write contrastive intel payload
        output_path = os.path.join(self.target_dir, ".goalie", "ast_semantic_chunks.json")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(self.chunks, f, indent=2)
            
        print(f"✅ Successfully preserved symmetry. {len(self.chunks)} logic-bound tensors generated for Ollama mxbai-embed-large.")

if __name__ == "__main__":
    # Physical Test Run
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
    indexer = ASTSemanticChunker(root_dir)
    indexer.execute_indexing()
