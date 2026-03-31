/**
 * @fileoverview Prevent application layer from directly mutating domain entities
 * @author Agentic Flow
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { detectLayer, DddLayer } from '../utils/ddd-layers';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/agentic-flow/eslint-plugin-ddd/blob/main/docs/rules/${name}.md`
);

type MessageIds = 'directMutation';
type Options = [];

export default createRule<Options, MessageIds>({
  name: 'no-application-domain-mutation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent application layer from directly mutating domain entities',
      recommended: 'recommended',
    },
    messages: {
      directMutation:
        'Application layer should not directly mutate domain entities. ' +
        'Use domain methods (e.g., entity.updateStatus()) instead of direct assignment (e.g., entity.status = ...).',
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    const filename = context.filename ?? context.getFilename();
    const sourceLayer = detectLayer(filename);

    // Only check files in application layer
    if (sourceLayer !== DddLayer.Application) {
      return {};
    }

    return {
      AssignmentExpression(node) {
        // Check for direct property assignments: entity.property = value
        if (
          node.left.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
          !node.left.computed
        ) {
          const object = node.left.object;
          const property = node.left.property;

          // Detect if we're assigning to an entity property
          // This is a heuristic - we look for patterns like:
          // - entity.status = 'active'
          // - user.email = 'new@email.com'
          // - order.items = []
          if (
            object.type === TSESTree.AST_NODE_TYPES.Identifier &&
            property.type === TSESTree.AST_NODE_TYPES.Identifier
          ) {
            const objectName = object.name.toLowerCase();
            const propertyName = property.name;

            // Common entity naming patterns
            const isLikelyEntity =
              objectName.endsWith('entity') ||
              objectName.endsWith('aggregate') ||
              ['user', 'order', 'product', 'customer', 'item'].includes(objectName);

            // Skip if assigning to private/protected fields (starts with _)
            const isPrivateField = propertyName.startsWith('_');

            // Skip constructor assignments (this.property = value)
            const isConstructorAssignment =
              object.type === TSESTree.AST_NODE_TYPES.ThisExpression;

            if (isLikelyEntity && !isPrivateField && !isConstructorAssignment) {
              context.report({
                node,
                messageId: 'directMutation',
              });
            }
          }
        }
      },
    };
  },
});
