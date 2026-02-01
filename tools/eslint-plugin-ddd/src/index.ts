/**
 * @fileoverview ESLint plugin to enforce Domain-Driven Design architecture
 * @author Agentic Flow
 */

import noDomainInfrastructureImports from './rules/no-domain-infrastructure-imports';
import noApplicationDomainMutation from './rules/no-application-domain-mutation';
import repositoryInterfacesInDomain from './rules/repository-interfaces-in-domain';

const plugin = {
  meta: {
    name: '@agentic-flow/eslint-plugin-ddd',
    version: '0.1.0',
  },
  rules: {
    'no-domain-infrastructure-imports': noDomainInfrastructureImports,
    'no-application-domain-mutation': noApplicationDomainMutation,
    'repository-interfaces-in-domain': repositoryInterfacesInDomain,
  },
  configs: {
    recommended: {
      plugins: ['@agentic-flow/ddd'],
      rules: {
        '@agentic-flow/ddd/no-domain-infrastructure-imports': 'error',
        '@agentic-flow/ddd/no-application-domain-mutation': 'error',
        '@agentic-flow/ddd/repository-interfaces-in-domain': 'warn',
      },
    },
    strict: {
      plugins: ['@agentic-flow/ddd'],
      rules: {
        '@agentic-flow/ddd/no-domain-infrastructure-imports': 'error',
        '@agentic-flow/ddd/no-application-domain-mutation': 'error',
        '@agentic-flow/ddd/repository-interfaces-in-domain': 'error',
      },
    },
  },
};

export = plugin;
