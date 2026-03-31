/**
 * @fileoverview Prevent domain layer from importing infrastructure concerns
 * @author Agentic Flow
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import { detectLayer, isAllowedDependency, getLayerName, DddLayer } from '../utils/ddd-layers';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/agentic-flow/eslint-plugin-ddd/blob/main/docs/rules/${name}.md`
);

type MessageIds = 'forbiddenImport';
type Options = [];

export default createRule<Options, MessageIds>({
  name: 'no-domain-infrastructure-imports',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent domain layer from importing infrastructure concerns',
      recommended: 'recommended',
    },
    messages: {
      forbiddenImport:
        'Domain layer ({{fromLayer}}) cannot import from {{toLayer}} layer. ' +
        'Domain must only depend on other domain code. ' +
        'Consider using dependency inversion (interfaces in domain, implementations in infrastructure).',
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    const filename = context.filename ?? context.getFilename();
    const sourceLayer = detectLayer(filename);

    // Only check files in domain layer
    if (sourceLayer !== DddLayer.Domain) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        
        // Skip external dependencies (node_modules)
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          return;
        }

        // Resolve import path relative to source file
        const targetLayer = detectLayer(importPath);

        // Check if dependency is allowed
        if (!isAllowedDependency(sourceLayer, targetLayer)) {
          context.report({
            node: node.source,
            messageId: 'forbiddenImport',
            data: {
              fromLayer: getLayerName(sourceLayer),
              toLayer: getLayerName(targetLayer),
            },
          });
        }
      },
    };
  },
});
