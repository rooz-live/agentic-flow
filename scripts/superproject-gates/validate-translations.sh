#!/bin/bash
# Translation validation script for expanded localization

set -e

LOCALES_DIR="locales"
PRIMARY_LOCALE="en"

echo "Validating translation files for 21+ locales..."

# Check if primary locale exists
if [ ! -f "$LOCALES_DIR/$PRIMARY_LOCALE/quantum.json" ]; then
    echo "Error: Primary locale file not found: $LOCALES_DIR/$PRIMARY_LOCALE/quantum.json"
    exit 1
fi

# Get all keys from primary locale
PRIMARY_KEYS=$(jq -r 'paths | join("\n")' "$LOCALES_DIR/$PRIMARY_LOCALE/quantum.json")

# Validate each locale
for locale_dir in "$LOCALES_DIR"/*; do
    if [ -d "$locale_dir" ]; then
        locale=$(basename "$locale_dir")
        echo "Validating locale: $locale"

        locale_file="$locale_dir/quantum.json"

        if [ ! -f "$locale_file" ]; then
            echo "Warning: Translation file not found: $locale_file (using placeholder)"
            continue
        fi

        # Validate JSON syntax
        if ! jq empty "$locale_file" > /dev/null 2>&1; then
            echo "Error: Invalid JSON in $locale_file"
            exit 1
        fi

        # Check for missing keys
        locale_keys=$(jq -r 'paths | join("\n")' "$locale_file")
        for key in $PRIMARY_KEYS; do
            if ! echo "$locale_keys" | grep -q "^$key$"; then
                echo "Error: Missing key '$key' in locale $locale"
                exit 1
            fi
        done

        # Validate Ampel cultural lens structure
        if ! jq -e '.quantum.ampel.culturalLens' "$locale_file" > /dev/null 2>&1; then
            echo "Error: Missing Ampel culturalLens in locale $locale"
            exit 1
        fi

        # Validate AISP integration structure
        if ! jq -e '.quantum.ampel.aispIntegration' "$locale_file" > /dev/null 2>&1; then
            echo "Error: Missing AISP integration in locale $locale"
            exit 1
        fi

        # Validate placeholder syntax
        if grep -r '{{[^}]*{{' "$locale_file"; then
            echo "Error: Invalid placeholder syntax in $locale_file"
            exit 1
        fi

        echo "✓ Locale $locale validated"
    fi
done

echo "All translation files validated successfully!"
echo "Supported locales: $(ls "$LOCALES_DIR" | tr '\n' ' ')"