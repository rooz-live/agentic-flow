#!/bin/bash
find agentic-flow-core/src -name "*.ts" -type f -exec sed -i 's/from '\''\([^'\'']*\)\.js'\''/from '\''\1'\''/g' {} \;