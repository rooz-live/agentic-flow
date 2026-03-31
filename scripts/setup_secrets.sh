#!/bin/bash
# Prompt user for secrets defined in env.catalog.json
# Usage: ./scripts/setup_secrets.sh

CATALOG="config/env.catalog.json"
ENV_FILE=".env"

# Ensure jq is installed
if ! command -v jq &> /dev/null; then
    echo "This script requires jq. Please install it: brew install jq"
    exit 1
fi

echo "--- Agentic Flow Secrets Setup ---"
echo "Reading from $CATALOG..."

# Get list of secret keys
SECRETS=$(jq -r 'to_entries[] | select(.value.secret == true) | .key' "$CATALOG")

# Read existing .env into memory to check if set
if [ -f "$ENV_FILE" ]; then
    echo "Loading existing $ENV_FILE..."
    source "$ENV_FILE"
fi

for key in $SECRETS; do
    current_val="${!key}"

    if [ -z "$current_val" ]; then
        echo ""
        echo "Enter value for $key:"
        read -s input_val

        if [ -n "$input_val" ]; then
            # Append or replace in .env
            if grep -q "^$key=" "$ENV_FILE"; then
                # Replace (careful with sed on secrets, but simple implementation for now)
                # Using a temp file is safer
                sed -i.bak "s/^$key=.*/$key=$input_val/" "$ENV_FILE"
                rm "$ENV_FILE.bak"
            else
                echo "$key=$input_val" >> "$ENV_FILE"
            fi
            echo "updated $key"
        else
            echo "skipped $key"
        fi
    else
        echo "✅ $key is set."
    fi
done

echo ""
echo "Setup complete. specific secrets can be manually edited in .env"
