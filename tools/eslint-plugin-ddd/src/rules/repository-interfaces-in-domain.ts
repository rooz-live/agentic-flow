/**
 * @fileoverview Ensure repository interfaces are defined in domain layer
 * @author Agentic Flow
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { detectLayer, DddLayer } from '../utils/ddd-layers';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/agentic-flow/eslint-plugin-ddd/blob/main/docs/rules/${name}.md`
);

type MessageIds = 'repositoryNotInDomain';
type Options = [];

export default createRule<Options, MessageIds>({
  name: 'repository-interfaces-in-domain',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure repository interfaces are defined in domain layer',
      recommended: 'recommended',
    },
    messages: {
      repositoryNotInDomain:
        'Repository interface "{{name}}" should be defined in the domain layer. ' +
        'Per Dependency Inversion Principle, domain defines interfaces that infrastructure implements.',
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    const filename = context.filename ?? context.getFilename();
    const sourceLayer = detectLayer(filename);

    // Only flag interfaces outside domain layer
    if (sourceLayer === DddLayer.Domain || sourceLayer === DddLayer.Unknown) {
      return {};
    }

    return {
      TSInterfaceDeclaration(node) {
        const interfaceName = node.id.name;

        // Check if this looks like a repository interface
        const isRepositoryInterface =
          interfaceName.endsWith('Repository') ||
          interfaceName.includes('Repository');

        if (isRepositoryInterface) {
          context.report({
            node: node.id,
            messageId: 'repositoryNotInDomain',
            data: {
              name: interfaceName,
            },
          });
        }
      },

      TSTypeAliasDeclaration(node) {
        const typeName = node.id.name;

        // Check if this looks like a repository type
        const isRepositoryType =
          typeName.endsWith('Repository') ||
          typeName.includes('Repository');

        if (isRepositoryType) {
          context.report({
            node: node.id,
            messageId: 'repositoryNotInDomain',
            data: {
              name: typeName,
            },
          });
        }
      },
    };
  },
});
