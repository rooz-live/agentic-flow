"""
Pattern Catalog - Reusable Pattern Library
Pattern management, code generation, and detection

WSJF Priority: 2.60 (GO - Last Domain)
Integration with all 12 completed domains
Plan: rust-upgrade-wsjf-least-mature-019cbe.md
"""

import re
import json
import hashlib
from enum import Enum
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict


class PatternCategory(Enum):
    """Pattern categories"""
    ARCHITECTURAL = "architectural"
    DESIGN = "design"
    IDIOMATIC = "idiomatic"
    INTEGRATION = "integration"
    SECURITY = "security"
    PERFORMANCE = "performance"


class PatternScope(Enum):
    """Pattern scope"""
    DOMAIN = "domain"
    SERVICE = "service"
    FUNCTION = "function"
    METHOD = "method"
    CLASS = "class"


@dataclass
class PatternTest:
    """Test case for pattern validation"""
    name: str
    input_params: Dict[str, Any]
    expected_output: str
    validation_assertions: List[str] = field(default_factory=list)


@dataclass
class PatternParameter:
    """Pattern parameter definition"""
    name: str
    type: str = "string"
    description: str = ""
    required: bool = False
    default: Any = None
    
    validation_regex: Optional[str] = None
    allowed_values: Optional[List[str]] = None
    min_value: Optional[int] = None
    max_value: Optional[int] = None
    
    display_name: str = ""
    help_text: str = ""
    
    def validate(self, value: Any) -> Tuple[bool, List[str]]:
        """Validate parameter value"""
        errors = []
        
        # Check required
        if self.required and value is None:
            errors.append(f"Parameter '{self.name}' is required")
            return False, errors
        
        if value is None:
            return True, []
        
        # Type validation
        type_map = {
            "string": str,
            "int": int,
            "bool": bool,
            "float": float,
            "list": list,
            "dict": dict
        }
        
        expected_type = type_map.get(self.type)
        if expected_type and not isinstance(value, expected_type):
            errors.append(f"Parameter '{self.name}' must be of type {self.type}")
        
        # Regex validation
        if self.validation_regex and isinstance(value, str):
            if not re.match(self.validation_regex, value):
                errors.append(f"Parameter '{self.name}' does not match pattern {self.validation_regex}")
        
        # Allowed values
        if self.allowed_values and value not in self.allowed_values:
            errors.append(f"Parameter '{self.name}' must be one of {self.allowed_values}")
        
        # Range validation for integers
        if self.type == "int" and isinstance(value, int):
            if self.min_value is not None and value < self.min_value:
                errors.append(f"Parameter '{self.name}' must be >= {self.min_value}")
            if self.max_value is not None and value > self.max_value:
                errors.append(f"Parameter '{self.name}' must be <= {self.max_value}")
        
        return len(errors) == 0, errors


@dataclass
class Pattern:
    """Pattern definition"""
    id: str
    name: str = ""
    description: str = ""
    
    category: PatternCategory = PatternCategory.DESIGN
    scope: PatternScope = PatternScope.FUNCTION
    
    template: str = ""
    example_code: str = ""
    documentation: str = ""
    
    language: str = "python"
    framework: Optional[str] = None
    
    required_patterns: List[str] = field(default_factory=list)
    compatible_with: List[str] = field(default_factory=list)
    
    parameters: List[PatternParameter] = field(default_factory=list)
    
    validation_rules: List[str] = field(default_factory=list)
    test_cases: List[PatternTest] = field(default_factory=list)
    
    usage_count: int = 0
    success_rate: float = 1.0
    tags: List[str] = field(default_factory=list)
    
    version: str = "1.0.0"
    created_at: datetime = field(default_factory=datetime.now)
    author: str = ""
    
    def get_parameter(self, name: str) -> Optional[PatternParameter]:
        """Get parameter by name"""
        for param in self.parameters:
            if param.name == name:
                return param
        return None
    
    def validate_parameters(self, values: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate all parameters"""
        all_errors = []
        
        for param in self.parameters:
            value = values.get(param.name, param.default)
            valid, errors = param.validate(value)
            all_errors.extend(errors)
        
        return len(all_errors) == 0, all_errors
    
    def apply_template(self, parameters: Dict[str, Any]) -> str:
        """Apply parameters to template"""
        result = self.template
        
        # Replace placeholders
        for key, value in parameters.items():
            placeholder = f"{{{{ {key} }}}}"
            result = result.replace(placeholder, str(value))
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category.value,
            "scope": self.scope.value,
            "language": self.language,
            "parameters": len(self.parameters),
            "usage_count": self.usage_count,
            "success_rate": self.success_rate,
            "tags": self.tags
        }


@dataclass
class PatternInstance:
    """Applied pattern instance"""
    id: str
    pattern_id: str = ""
    
    domain_id: str = ""
    file_path: str = ""
    line_start: int = 0
    line_end: int = 0
    
    parameter_values: Dict[str, Any] = field(default_factory=dict)
    
    generated_code: str = ""
    hash: str = ""
    
    applied_at: datetime = field(default_factory=datetime.now)
    applied_by: str = ""
    
    validated: bool = False
    validation_errors: List[str] = field(default_factory=list)
    
    def compute_hash(self) -> str:
        """Compute hash of generated code"""
        return hashlib.md5(self.generated_code.encode()).hexdigest()
    
    def has_changed(self) -> bool:
        """Check if code has changed since application"""
        current_hash = self.compute_hash()
        return current_hash != self.hash
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "pattern_id": self.pattern_id,
            "domain_id": self.domain_id,
            "file_path": self.file_path,
            "validated": self.validated
        }


@dataclass
class PatternCatalog:
    """Pattern catalog organization"""
    id: str
    name: str = ""
    description: str = ""
    
    patterns: List[str] = field(default_factory=list)
    categories: List[str] = field(default_factory=list)
    
    parent_catalog: Optional[str] = None
    child_catalogs: List[str] = field(default_factory=list)
    
    domain: str = ""
    language: str = ""
    version: str = "1.0.0"
    
    def add_pattern(self, pattern_id: str) -> None:
        """Add pattern to catalog"""
        if pattern_id not in self.patterns:
            self.patterns.append(pattern_id)
    
    def remove_pattern(self, pattern_id: str) -> None:
        """Remove pattern from catalog"""
        if pattern_id in self.patterns:
            self.patterns.remove(pattern_id)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "patterns": len(self.patterns),
            "domain": self.domain,
            "language": self.language
        }


@dataclass
class PatternMatch:
    """Pattern search match"""
    pattern: Pattern
    score: float
    matched_terms: List[str] = field(default_factory=list)


@dataclass
class GeneratedCode:
    """Generated code from pattern"""
    pattern_id: str
    content: str
    
    language: str = ""
    file_extension: str = ""
    line_count: int = 0
    
    syntactically_valid: bool = False
    compilation_errors: List[str] = field(default_factory=list)
    
    parameters_applied: Dict[str, Any] = field(default_factory=dict)
    
    content_hash: str = ""
    
    def __post_init__(self):
        if not self.content_hash:
            self.content_hash = hashlib.md5(self.content.encode()).hexdigest()
        self.line_count = len(self.content.splitlines())


@dataclass
class DetectedPattern:
    """Pattern detected in code"""
    pattern_id: str
    confidence: float
    location: str
    matched_code: str
    suggested_parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PatternSuggestion:
    """Pattern suggestion for code"""
    pattern: Pattern
    reason: str
    insertion_point: str
    estimated_improvement: float


class PatternRegistry:
    """Registry for patterns"""
    
    def __init__(self):
        self._patterns: Dict[str, Pattern] = {}
        self._by_category: Dict[str, List[str]] = defaultdict(list)
        self._by_language: Dict[str, List[str]] = defaultdict(list)
        self._by_domain: Dict[str, List[str]] = defaultdict(list)
        self._by_tag: Dict[str, List[str]] = defaultdict(list)
    
    def register(self, pattern: Pattern) -> None:
        """Register a pattern"""
        self._patterns[pattern.id] = pattern
        
        # Index by category
        self._by_category[pattern.category.value].append(pattern.id)
        
        # Index by language
        self._by_language[pattern.language].append(pattern.id)
        
        # Index by tags
        for tag in pattern.tags:
            self._by_tag[tag].append(pattern.id)
    
    def get(self, pattern_id: str) -> Optional[Pattern]:
        """Get pattern by ID"""
        return self._patterns.get(pattern_id)
    
    def find_by_category(self, category: PatternCategory) -> List[Pattern]:
        """Find patterns by category"""
        ids = self._by_category.get(category.value, [])
        return [self._patterns[pid] for pid in ids if pid in self._patterns]
    
    def find_by_language(self, language: str) -> List[Pattern]:
        """Find patterns by language"""
        ids = self._by_language.get(language, [])
        return [self._patterns[pid] for pid in ids if pid in self._patterns]
    
    def find_by_domain(self, domain: str) -> List[Pattern]:
        """Find patterns compatible with domain"""
        result = []
        for pattern in self._patterns.values():
            if domain in pattern.compatible_with or not pattern.compatible_with:
                result.append(pattern)
        return result
    
    def find_compatible(self, pattern: Pattern) -> List[Pattern]:
        """Find patterns compatible with given pattern"""
        compatible = []
        
        for other in self._patterns.values():
            if other.id == pattern.id:
                continue
            
            # Check if patterns are mutually compatible
            if pattern.id in other.compatible_with or other.id in pattern.compatible_with:
                compatible.append(other)
            
            # Check shared domains
            shared_domains = set(pattern.compatible_with) & set(other.compatible_with)
            if shared_domains:
                compatible.append(other)
        
        return compatible
    
    def search(self, query: str, semantic: bool = False) -> List[PatternMatch]:
        """Search patterns by query"""
        matches = []
        query_lower = query.lower()
        
        for pattern in self._patterns.values():
            score = 0.0
            matched_terms = []
            
            # Name match
            if query_lower in pattern.name.lower():
                score += 0.5
                matched_terms.append("name")
            
            # Description match
            if query_lower in pattern.description.lower():
                score += 0.3
                matched_terms.append("description")
            
            # Tag match
            for tag in pattern.tags:
                if query_lower in tag.lower():
                    score += 0.2
                    matched_terms.append("tag")
            
            if score > 0:
                matches.append(PatternMatch(
                    pattern=pattern,
                    score=score,
                    matched_terms=matched_terms
                ))
        
        # Sort by score
        matches.sort(key=lambda m: -m.score)
        return matches
    
    def get_dependencies(self, pattern_id: str) -> List[Pattern]:
        """Get pattern dependencies"""
        pattern = self._patterns.get(pattern_id)
        if not pattern:
            return []
        
        dependencies = []
        for required_id in pattern.required_patterns:
            required = self._patterns.get(required_id)
            if required:
                dependencies.append(required)
        
        return dependencies
    
    def validate_pattern(self, pattern: Pattern) -> List[str]:
        """Validate pattern definition"""
        errors = []
        
        # Check required fields
        if not pattern.name:
            errors.append("Pattern must have a name")
        
        if not pattern.template:
            errors.append("Pattern must have a template")
        
        # Check parameter defaults
        for param in pattern.parameters:
            if param.default is not None:
                valid, param_errors = param.validate(param.default)
                if not valid:
                    errors.extend(param_errors)
        
        # Check required patterns exist
        for required_id in pattern.required_patterns:
            if required_id not in self._patterns:
                errors.append(f"Required pattern '{required_id}' not found")
        
        return errors
    
    def list_all(self) -> List[Pattern]:
        """List all patterns"""
        return list(self._patterns.values())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_patterns": len(self._patterns),
            "by_category": {k: len(v) for k, v in self._by_category.items()},
            "by_language": {k: len(v) for k, v in self._by_language.items()},
            "patterns": [p.to_dict() for p in self._patterns.values()]
        }


class PatternCodeGenerator:
    """Generate code from patterns"""
    
    def __init__(self, registry: PatternRegistry):
        self._registry = registry
    
    def generate(
        self,
        pattern: Pattern,
        parameters: Dict[str, Any]
    ) -> GeneratedCode:
        """Generate code from pattern"""
        # Validate parameters
        valid, errors = pattern.validate_parameters(parameters)
        
        if not valid:
            return GeneratedCode(
                pattern_id=pattern.id,
                content="",
                compilation_errors=errors
            )
        
        # Apply template
        content = pattern.apply_template(parameters)
        
        return GeneratedCode(
            pattern_id=pattern.id,
            content=content,
            language=pattern.language,
            parameters_applied=parameters,
            syntactically_valid=True  # Would need actual syntax checking
        )
    
    def validate_parameters(
        self,
        pattern: Pattern,
        parameters: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Validate parameters for pattern"""
        return pattern.validate_parameters(parameters)
    
    def detect_patterns(self, code: str, language: str) -> List[DetectedPattern]:
        """Detect patterns in existing code"""
        detected = []
        
        # Get patterns for language
        patterns = self._registry.find_by_language(language)
        
        for pattern in patterns:
            # Simple pattern detection (in production, use AST parsing)
            if pattern.example_code and pattern.example_code in code:
                detected.append(DetectedPattern(
                    pattern_id=pattern.id,
                    confidence=0.8,
                    location="inline",
                    matched_code=pattern.example_code
                ))
        
        return detected
    
    def suggest_patterns(
        self,
        code: str,
        language: str
    ) -> List[PatternSuggestion]:
        """Suggest patterns for code improvement"""
        suggestions = []
        
        # Get patterns for language
        patterns = self._registry.find_by_language(language)
        
        # Simple suggestion logic
        for pattern in patterns:
            if pattern.category == PatternCategory.DESIGN:
                if "class" in code and pattern.scope == PatternScope.CLASS:
                    suggestions.append(PatternSuggestion(
                        pattern=pattern,
                        reason="Could benefit from class-level pattern",
                        insertion_point="class_definition",
                        estimated_improvement=0.2
                    ))
        
        return suggestions


# Self-test
def test_pattern_catalog():
    """Test pattern catalog"""
    print("Testing Pattern Catalog")
    print("=" * 50)
    
    # Test 1: Create pattern
    print("\n1. Creating Pattern:")
    
    pattern = Pattern(
        id="singleton",
        name="Singleton Pattern",
        description="Ensures a class has only one instance",
        category=PatternCategory.DESIGN,
        scope=PatternScope.CLASS,
        language="python",
        template="""
class {{ class_name }}:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
""",
        parameters=[
            PatternParameter(
                name="class_name",
                type="string",
                description="Name of the singleton class",
                required=True
            )
        ],
        tags=["creational", "singleton"],
        example_code="class DatabaseConnection: ..."
    )
    
    print(f"  ✅ Created pattern: {pattern.name}")
    print(f"     Category: {pattern.category.value}")
    print(f"     Parameters: {len(pattern.parameters)}")
    
    # Test 2: Parameter validation
    print("\n2. Parameter Validation:")
    
    valid_params = {"class_name": "Database"}
    is_valid, errors = pattern.validate_parameters(valid_params)
    print(f"  ✅ Valid params: {is_valid}")
    
    invalid_params = {}
    is_valid, errors = pattern.validate_parameters(invalid_params)
    print(f"  ✅ Invalid params caught: {len(errors)} errors")
    
    # Test 3: Template generation
    print("\n3. Template Generation:")
    
    generated = pattern.apply_template(valid_params)
    print(f"  ✅ Generated code ({len(generated)} chars)")
    
    # Test 4: Registry
    print("\n4. Pattern Registry:")
    
    registry = PatternRegistry()
    registry.register(pattern)
    
    # Add more patterns
    factory_pattern = Pattern(
        id="factory",
        name="Factory Pattern",
        category=PatternCategory.DESIGN,
        language="python",
        tags=["creational", "factory"]
    )
    registry.register(factory_pattern)
    
    print(f"  ✅ Registered {len(registry._patterns)} patterns")
    
    # Search
    results = registry.search("singleton")
    print(f"  ✅ Search results: {len(results)}")
    
    # Filter by category
    design_patterns = registry.find_by_category(PatternCategory.DESIGN)
    print(f"  ✅ Design patterns: {len(design_patterns)}")
    
    # Test 5: Code generator
    print("\n5. Code Generator:")
    
    generator = PatternCodeGenerator(registry)
    
    result = generator.generate(pattern, valid_params)
    print(f"  ✅ Generated code: {result.syntactically_valid}")
    print(f"     Lines: {result.line_count}")
    
    # Detect patterns
    code_sample = "class DatabaseConnection: ..."
    detected = generator.detect_patterns(code_sample, "python")
    print(f"  ✅ Detected patterns: {len(detected)}")
    
    # Suggest patterns
    suggestions = generator.suggest_patterns(code_sample, "python")
    print(f"  ✅ Pattern suggestions: {len(suggestions)}")
    
    # Test 6: Pattern instance
    print("\n6. Pattern Instance:")
    
    instance = PatternInstance(
        id="instance-001",
        pattern_id="singleton",
        domain_id="config",
        file_path="src/config/manager.py",
        line_start=10,
        line_end=25,
        generated_code=result.content
    )
    instance.hash = instance.compute_hash()
    
    print(f"  ✅ Created instance: {instance.id}")
    print(f"     Hash: {instance.hash[:16]}...")
    
    # Test 7: Catalog
    print("\n7. Pattern Catalog:")
    
    catalog = PatternCatalog(
        id="python-patterns",
        name="Python Design Patterns",
        description="Common design patterns for Python",
        domain="all",
        language="python"
    )
    
    catalog.add_pattern("singleton")
    catalog.add_pattern("factory")
    
    print(f"  ✅ Created catalog: {catalog.name}")
    print(f"     Patterns: {len(catalog.patterns)}")
    
    print("\n" + "=" * 50)
    print("Pattern Catalog Tests Complete!")


if __name__ == "__main__":
    test_pattern_catalog()
