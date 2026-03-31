#!/usr/bin/env python3
"""
DDD Mapper - Domain-Driven Design Model Mapping
================================================
Maps domain models, aggregates, entities, and value objects across the codebase.

DoD:
- Identifies aggregate roots in Python and Rust code
- Maps entities and value objects
- Detects bounded contexts
- Generates domain model map (JSON)
"""

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass, asdict


@dataclass
class DomainModel:
    """Domain model representation"""
    name: str
    type: str  # aggregate, entity, value_object, domain_service
    file_path: str
    language: str  # python, rust
    properties: List[str]
    methods: List[str]


class DDDMapper:
    """Maps DDD domain models across codebase"""
    
    def __init__(self, src_dir: Path, rust_dir: Path = None):
        self.src_dir = Path(src_dir)
        self.rust_dir = Path(rust_dir) if rust_dir else None
        self.models: List[DomainModel] = []
    
    def map_all(self) -> Dict[str, Any]:
        """Map all domain models"""
        # Map Python models
        self._map_python_models()
        
        # Map Rust models if directory provided
        if self.rust_dir and self.rust_dir.exists():
            self._map_rust_models()
        
        return self._generate_report()
    
    def _map_python_models(self):
        """Map Python domain models"""
        python_files = list(self.src_dir.rglob("*.py"))
        
        for py_file in python_files:
            try:
                content = py_file.read_text()
                
                # Find dataclasses (likely value objects or entities)
                dataclass_matches = re.finditer(
                    r'@dataclass\s+class\s+(\w+).*?(?=\n(?:class|@|\Z))',
                    content,
                    re.DOTALL
                )
                
                for match in dataclass_matches:
                    class_name = match.group(1)
                    class_body = match.group(0)
                    
                    # Extract properties
                    properties = re.findall(r'^\s+(\w+):\s+', class_body, re.MULTILINE)
                    
                    # Determine type based on naming conventions
                    model_type = self._infer_model_type(class_name, class_body)
                    
                    self.models.append(DomainModel(
                        name=class_name,
                        type=model_type,
                        file_path=str(py_file.relative_to(self.src_dir.parent)),
                        language="python",
                        properties=properties,
                        methods=[]
                    ))
            except Exception:
                continue
    
    def _map_rust_models(self):
        """Map Rust domain models"""
        rust_files = list(self.rust_dir.rglob("*.rs"))
        
        for rs_file in rust_files:
            try:
                content = rs_file.read_text()
                
                # Find structs (likely aggregates, entities, or value objects)
                struct_matches = re.finditer(
                    r'pub\s+struct\s+(\w+)\s*\{([^}]+)\}',
                    content,
                    re.DOTALL
                )
                
                for match in struct_matches:
                    struct_name = match.group(1)
                    struct_body = match.group(2)
                    
                    # Extract fields
                    fields = re.findall(r'pub\s+(\w+):\s+', struct_body)
                    
                    # Determine type
                    model_type = self._infer_model_type(struct_name, content)
                    
                    self.models.append(DomainModel(
                        name=struct_name,
                        type=model_type,
                        file_path=str(rs_file.relative_to(self.rust_dir.parent)),
                        language="rust",
                        properties=fields,
                        methods=[]
                    ))
            except Exception:
                continue
    
    def _infer_model_type(self, name: str, content: str) -> str:
        """Infer domain model type from name and context"""
        name_lower = name.lower()
        content_lower = content.lower()
        
        # Aggregate root indicators
        if any(x in name_lower for x in ["aggregate", "root", "portfolio", "case", "document"]):
            return "aggregate"
        
        # Value object indicators
        if any(x in name_lower for x in ["id", "value", "address", "money", "email"]):
            return "value_object"
        
        # Domain service indicators
        if any(x in name_lower for x in ["service", "manager", "handler", "processor"]):
            return "domain_service"
        
        # Default to entity
        return "entity"
    
    def _generate_report(self) -> Dict[str, Any]:
        """Generate DDD mapping report"""
        aggregates = [m for m in self.models if m.type == "aggregate"]
        entities = [m for m in self.models if m.type == "entity"]
        value_objects = [m for m in self.models if m.type == "value_object"]
        services = [m for m in self.models if m.type == "domain_service"]
        
        return {
            "total_models": len(self.models),
            "aggregates": len(aggregates),
            "entities": len(entities),
            "value_objects": len(value_objects),
            "domain_services": len(services),
            "models": [asdict(m) for m in self.models]
        }


def main():
    parser = argparse.ArgumentParser(description="Map DDD domain models")
    parser.add_argument("--src-dir", required=True, help="Source directory (Python)")
    parser.add_argument("--rust-dir", help="Rust source directory (optional)")
    parser.add_argument("--output", required=True, help="Output JSON file")
    args = parser.parse_args()
    
    mapper = DDDMapper(Path(args.src_dir), Path(args.rust_dir) if args.rust_dir else None)
    report = mapper.map_all()
    
    # Write report
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2))
    
    print(f"✓ DDD mapping complete: {report['total_models']} models found")
    print(f"  - Aggregates: {report['aggregates']}")
    print(f"  - Entities: {report['entities']}")
    print(f"  - Value Objects: {report['value_objects']}")
    print(f"  - Domain Services: {report['domain_services']}")
    print(f"✓ Report saved to: {args.output}")


if __name__ == "__main__":
    main()

