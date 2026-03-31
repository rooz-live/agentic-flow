#!/bin/bash
# =============================================================================
# Validation Core Library v1.0.0
# Pure functions for validation (no I/O, no state)
# =============================================================================
#
# This library provides pure, reusable validation functions extracted from
# the AQE Validator Template (70+ validators in MAA directory).
#
# DESIGN PRINCIPLES:
#   - Pure functions: No I/O operations, no global state mutation
#   - Composable: Functions can be combined and reused
#   - Predictable: Same input always produces same output
#   - Well-documented: Clear contracts for each function
#
# USAGE:
#   source /path/to/validation-core.sh
#
#   # Check if command exists
#   if command_exists "jq"; then
#     echo "jq is available"
#   fi
#
#   # Validate JSON syntax
#   if validate_json "$file"; then
#     echo "Valid JSON"
#   fi
#
#   # Extract JSON field value
#   value=$(json_get "$file" ".status")
#
#   # Count array elements
#   count=$(json_count "$file" ".findings")
#
# EXTRACTED FROM:
#   - Template: /MAA/.claude/skills/.validation/templates/validate.template.sh
#   - Library: /MAA/.claude/skills/.validation/templates/validator-lib.sh
#
# =============================================================================

# Prevent multiple inclusion
if [[ -n "${_VALIDATION_CORE_LOADED:-}" ]]; then
  return 0 2>/dev/null || true
fi
export _VALIDATION_CORE_LOADED=1

# =============================================================================
# VERSION & EXIT CODES
# =============================================================================
export VALIDATION_CORE_VERSION="1.0.0"

# Exit codes
export EXIT_PASS=0
export EXIT_FAIL=1
export EXIT_SKIP=2

# =============================================================================
# TOOL DETECTION FUNCTIONS (Pure - No I/O)
# =============================================================================

# -----------------------------------------------------------------------------
# command_exists: Check if a command is available in PATH
#
# DESCRIPTION:
#   Pure function to test command availability without executing it.
#   Uses `command -v` which is POSIX-compliant and portable.
#
# PARAMETERS:
#   $1 - Command name to check (string)
#
# RETURNS:
#   0 - Command exists in PATH
#   1 - Command not found
#
# EXAMPLES:
#   command_exists "jq"           # Check if jq is installed
#   command_exists "node"         # Check if node is available
#   command_exists "nonexistent"  # Returns 1
#
# NOTES:
#   - Does NOT execute the command, only checks existence
#   - Suppresses all output (stdout and stderr)
#   - Works with shell builtins, functions, and external commands
# -----------------------------------------------------------------------------
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# JSON VALIDATION FUNCTIONS (Pure - Read-only I/O)
# =============================================================================

# -----------------------------------------------------------------------------
# validate_json: Validate that a file contains valid JSON syntax
#
# DESCRIPTION:
#   Validates JSON syntax using multiple fallback parsers (jq, python3, node).
#   Does NOT validate against a schema, only checks well-formedness.
#
# PARAMETERS:
#   $1 - Path to JSON file (string)
#
# RETURNS:
#   0 - File contains valid JSON
#   1 - File is invalid JSON or not found
#   2 - No JSON parser available (graceful degradation)
#
# EXAMPLES:
#   validate_json "/path/to/data.json"
#   validate_json "$OUTPUT_FILE"
#
# FALLBACK CHAIN:
#   1. jq (preferred) - Fast and widely available
#   2. python3 - Uses json.load() for validation
#   3. node - Uses JSON.parse() for validation
#
# NOTES:
#   - Checks file exists before validation
#   - Returns 2 (skip) if no parser available (graceful degradation)
#   - Suppresses parser error messages
# -----------------------------------------------------------------------------
validate_json() {
  local file="$1"

  # Guard: File must exist
  if [[ ! -f "$file" ]]; then
    return 1
  fi

  # Fallback 1: jq (preferred)
  if command_exists "jq"; then
    if jq empty "$file" 2>/dev/null; then
      return 0
    else
      return 1
    fi
  # Fallback 2: python3
  elif command_exists "python3"; then
    if python3 -c "import json; json.load(open('$file'))" 2>/dev/null; then
      return 0
    else
      return 1
    fi
  # Fallback 3: node
  elif command_exists "node"; then
    if node -e "JSON.parse(require('fs').readFileSync('$file'))" 2>/dev/null; then
      return 0
    else
      return 1
    fi
  # No parser available
  else
    return 2
  fi
}

# -----------------------------------------------------------------------------
# validate_json_schema: Validate data against JSON Schema
#
# DESCRIPTION:
#   Validates JSON data against a JSON Schema using multiple validators.
#   Supports Draft 2020-12 schemas with fallback to older drafts.
#   Implements graceful degradation through multiple validator backends.
#
# PARAMETERS:
#   $1 - Path to JSON Schema file (string)
#   $2 - Path to data file to validate (string)
#
# RETURNS:
#   0 - Data conforms to schema
#   1 - Data violates schema or validation error
#   2 - No schema validator available (graceful degradation)
#
# EXAMPLES:
#   validate_json_schema "schemas/output.json" "data.json"
#   validate_json_schema "$SCHEMA_PATH" "$OUTPUT_FILE"
#
# FALLBACK CHAIN:
#   1. ajv (preferred) - Fast, modern, supports all drafts
#   2. jsonschema CLI - Python-based validator
#   3. python3 + jsonschema module - Programmatic validation
#
# NOTES:
#   - Both schema and data must be valid JSON (pre-validated)
#   - Returns 2 (skip) if no validator available
#   - Supports Draft 2020-12, Draft-07, and older schemas
#   - Error messages are suppressed in this pure function
# -----------------------------------------------------------------------------
validate_json_schema() {
  local schema_path="$1"
  local data_path="$2"

  # Guard: Files must exist
  if [[ ! -f "$schema_path" ]] || [[ ! -f "$data_path" ]]; then
    return 1
  fi

  # Pre-validation: Both must be valid JSON
  if ! validate_json "$schema_path" || ! validate_json "$data_path"; then
    return 1
  fi

  # Fallback 1: ajv (preferred)
  if command_exists "ajv"; then
    local result
    result=$(ajv validate -s "$schema_path" -d "$data_path" 2>&1)
    local status=$?
    return $status
  # Fallback 2: jsonschema CLI
  elif command_exists "jsonschema"; then
    local result
    result=$(jsonschema -i "$data_path" "$schema_path" 2>&1)
    local status=$?
    return $status
  # Fallback 3: python3 + jsonschema module
  elif command_exists "python3"; then
    local result
    result=$(python3 -c "
import json
import sys
try:
    from jsonschema import validate, ValidationError, Draft202012Validator
    with open('$schema_path') as f:
        schema = json.load(f)
    with open('$data_path') as f:
        data = json.load(f)
    # Use Draft 2020-12 for modern schemas
    try:
        Draft202012Validator.check_schema(schema)
        validate(instance=data, schema=schema, cls=Draft202012Validator)
    except:
        # Fallback to default validator
        validate(instance=data, schema=schema)
    sys.exit(0)
except ImportError:
    sys.exit(2)
except ValidationError as e:
    sys.exit(1)
except Exception as e:
    sys.exit(1)
" 2>&1)
    local status=$?
    return $status
  # No validator available
  else
    return 2
  fi
}

# =============================================================================
# JSON PARSING FUNCTIONS (Pure - Read-only I/O)
# =============================================================================

# -----------------------------------------------------------------------------
# json_get: Extract a value from JSON file using a path expression
#
# DESCRIPTION:
#   Extracts a value from JSON using JSONPath notation.
#   Supports nested objects and arrays with fallback parsers.
#
# PARAMETERS:
#   $1 - Path to JSON file (string)
#   $2 - JSONPath expression (string, e.g., ".status", ".output.findings[0]")
#
# RETURNS:
#   stdout - The extracted value (string, number, or JSON fragment)
#   exit 0 - Success
#   exit 1 - Extraction failed or no parser available
#
# EXAMPLES:
#   status=$(json_get "output.json" ".status")
#   summary=$(json_get "$file" ".output.summary")
#   first_finding=$(json_get "$file" ".output.findings[0]")
#
# FALLBACK CHAIN:
#   1. jq (preferred) - Full JSONPath support
#   2. python3 - Basic path traversal
#
# PATH SYNTAX:
#   .field         - Access top-level field
#   .obj.nested    - Access nested field
#   .array[0]      - Access array element
#   .obj.arr[1].id - Complex path
#
# NOTES:
#   - Returns raw value (use -r flag with jq for unquoted strings)
#   - Python fallback has limited path support (no complex queries)
#   - Returns empty string for null or missing fields
# -----------------------------------------------------------------------------
json_get() {
  local json_file="$1"
  local path="$2"

  # Fallback 1: jq (preferred)
  if command_exists "jq"; then
    jq -r "$path" "$json_file" 2>/dev/null
  # Fallback 2: python3 (limited)
  elif command_exists "python3"; then
    python3 -c "
import json
import sys
with open('$json_file') as f:
    data = json.load(f)
path = '$path'.strip('.')
for key in path.split('.'):
    if key.startswith('[') and key.endswith(']'):
        idx = int(key[1:-1])
        data = data[idx]
    else:
        data = data.get(key, '')
print(data)
" 2>/dev/null
  else
    return 1
  fi
}

# -----------------------------------------------------------------------------
# json_count: Count elements in a JSON array
#
# DESCRIPTION:
#   Counts the number of elements in a JSON array field.
#   Returns 0 for non-array fields or missing paths.
#
# PARAMETERS:
#   $1 - Path to JSON file (string)
#   $2 - JSONPath to array field (string)
#
# RETURNS:
#   stdout - Number of elements (integer)
#   exit 0 - Success
#   exit 1 - Count failed or no parser available
#
# EXAMPLES:
#   count=$(json_count "output.json" ".output.findings")
#   num_errors=$(json_count "$file" ".errors")
#
# FALLBACK CHAIN:
#   1. jq (preferred) - Use "| length" operator
#   2. python3 - Use len() function
#
# NOTES:
#   - Returns 0 for null or non-array values
#   - Returns 0 for missing paths
#   - Works with nested array paths
# -----------------------------------------------------------------------------
json_count() {
  local json_file="$1"
  local path="$2"

  # Fallback 1: jq (preferred)
  if command_exists "jq"; then
    jq "$path | length" "$json_file" 2>/dev/null
  # Fallback 2: python3
  elif command_exists "python3"; then
    python3 -c "
import json
with open('$json_file') as f:
    data = json.load(f)
path = '$path'.strip('.')
for key in path.split('.'):
    if key:
        data = data.get(key, [])
print(len(data) if isinstance(data, list) else 0)
" 2>/dev/null
  else
    return 1
  fi
}

# =============================================================================
# OUTPUT FORMATTING FUNCTIONS (Pure - Generates JSON strings)
# =============================================================================

# -----------------------------------------------------------------------------
# output_validation_report: Generate standardized validation report as JSON
#
# DESCRIPTION:
#   Creates a structured JSON report of validation results.
#   Includes skill name, status for each validation category, and timestamp.
#   Determines overall status based on individual validation results.
#
# PARAMETERS:
#   $1 - Skill name (string)
#   $2 - Schema validation status (string: "passed", "failed", "skipped")
#   $3 - Content validation status (string: "passed", "failed", "skipped")
#   $4 - Tool validation status (string: "passed", "failed", "skipped")
#
# RETURNS:
#   stdout - JSON report (formatted or compact depending on jq availability)
#   exit 0 - Always succeeds (generates report even if validations failed)
#
# EXAMPLES:
#   output_validation_report "security-testing" "passed" "passed" "passed"
#   output_validation_report "$SKILL_NAME" "$schema_status" "$content_status" "$tool_status"
#
# OUTPUT FORMAT (with jq):
#   {
#     "skillName": "security-testing",
#     "overallStatus": "passed",
#     "validations": {
#       "schema": "passed",
#       "content": "passed",
#       "tools": "passed"
#     },
#     "timestamp": "2026-02-26T12:00:00Z"
#   }
#
# OVERALL STATUS LOGIC:
#   - "failed" if ANY validation failed
#   - "partial" if ANY validation skipped (but none failed)
#   - "passed" if ALL validations passed
#
# NOTES:
#   - Timestamp is ISO 8601 UTC format
#   - Falls back to heredoc JSON if jq not available
#   - Always generates valid JSON regardless of validation results
# -----------------------------------------------------------------------------
output_validation_report() {
  local skill_name="$1"
  local schema_status="$2"
  local content_status="$3"
  local tool_status="$4"

  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Determine overall status
  local overall_status="passed"
  if [[ "$schema_status" == "failed" ]] || [[ "$content_status" == "failed" ]] || [[ "$tool_status" == "failed" ]]; then
    overall_status="failed"
  elif [[ "$schema_status" == "skipped" ]] || [[ "$content_status" == "skipped" ]] || [[ "$tool_status" == "skipped" ]]; then
    overall_status="partial"
  fi

  # Generate JSON (with jq if available)
  if command_exists "jq"; then
    jq -n \
      --arg skill "$skill_name" \
      --arg overall "$overall_status" \
      --arg schema "$schema_status" \
      --arg content "$content_status" \
      --arg tools "$tool_status" \
      --arg timestamp "$timestamp" \
      '{
        skillName: $skill,
        overallStatus: $overall,
        validations: {
          schema: $schema,
          content: $content,
          tools: $tools
        },
        timestamp: $timestamp
      }'
  else
    # Fallback: heredoc JSON
    cat <<EOF
{
  "skillName": "$skill_name",
  "overallStatus": "$overall_status",
  "validations": {
    "schema": "$schema_status",
    "content": "$content_status",
    "tools": "$tool_status"
  },
  "timestamp": "$timestamp"
}
EOF
  fi
}

# =============================================================================
# LIBRARY METADATA
# =============================================================================

# -----------------------------------------------------------------------------
# validation_core_info: Display library information and function list
#
# DESCRIPTION:
#   Prints library version, extracted source, and available functions.
#   Useful for debugging and documentation.
#
# RETURNS:
#   stdout - Library information
#   exit 0 - Always succeeds
#
# EXAMPLE:
#   validation_core_info
# -----------------------------------------------------------------------------
validation_core_info() {
  cat <<EOF
=============================================================================
Validation Core Library v${VALIDATION_CORE_VERSION}
=============================================================================

DESCRIPTION:
  Pure functions for validation (no I/O side effects, no state mutation).
  Extracted from 70+ validators in MAA directory.

SOURCE:
  - Template: /MAA/.claude/skills/.validation/templates/validate.template.sh
  - Library: /MAA/.claude/skills/.validation/templates/validator-lib.sh

FUNCTIONS:
  Tool Detection:
    - command_exists         Check if command is in PATH

  JSON Validation:
    - validate_json          Validate JSON syntax (jq/python3/node)
    - validate_json_schema   Validate against JSON Schema (ajv/jsonschema/python3)

  JSON Parsing:
    - json_get              Extract value from JSON using path
    - json_count            Count elements in JSON array

  Output Formatting:
    - output_validation_report  Generate standardized validation report

  Metadata:
    - validation_core_info   Display this information

USAGE:
  source /path/to/validation-core.sh

  if command_exists "jq"; then
    echo "jq is available"
  fi

  if validate_json "\$file"; then
    status=\$(json_get "\$file" ".status")
    count=\$(json_count "\$file" ".findings")
  fi

=============================================================================
EOF
}

# =============================================================================
# SELF-TEST (Run if executed directly)
# =============================================================================

# Run info if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  validation_core_info
  exit 0
fi
