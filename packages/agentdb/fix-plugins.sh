#!/bin/bash

# Fix TypeScript errors in plugin implementations

echo "Fixing plugin implementation errors..."

# List of plugin files to fix
PLUGINS=(
  "adversarial-training"
  "curriculum-learning"
  "federated-learning"
  "multi-task-learning"
)

for plugin in "${PLUGINS[@]}"; do
  FILE="src/plugins/implementations/${plugin}.ts"

  if [ -f "$FILE" ]; then
    echo "Fixing $FILE..."

    # Fix selectAction return type (id: number -> id: string)
    sed -i 's/id: 0,/id: '\''0'\'',/g' "$FILE"
    sed -i 's/id: actionId,/id: String(actionId),/g' "$FILE"

    # Fix retrieveSimilar signature
    sed -i 's/async retrieveSimilar(state: Vector, limit: number): Promise<Experience\[\]>/async retrieveSimilar(state: number[], k: number): Promise<import('\''..\/..\'\'').SearchResult<Experience>[]>/g' "$FILE"

    # Add type annotations for implicit any
    sed -i 's/\.map(x =>/\.map((x: number) =>/g' "$FILE"
    sed -i 's/\.map(wi =>/\.map((wi: number) =>/g' "$FILE"
    sed -i 's/\.map(a =>/\.map((a: any) =>/g' "$FILE"
    sed -i 's/\.map(b =>/\.map((b: any) =>/g' "$FILE"
    sed -i 's/\.reduce(sum =>/\.reduce((sum: number) =>/g' "$FILE"
    sed -i 's/, i)/,  (i: number))/g' "$FILE"

  fi
done

echo "✅ Plugin fixes applied"
