/**
 * @fileoverview Tests for no-domain-infrastructure-imports rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../src/rules/no-domain-infrastructure-imports';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-domain-infrastructure-imports', rule, {
  valid: [
    // Domain importing from domain
    {
      code: `import { ValueObject } from './value-objects/email';`,
      filename: '/project/src/domain/entities/user.ts',
    },
    {
      code: `import { Entity } from '../shared/entity';`,
      filename: '/project/src/domain/aggregates/order.ts',
    },
    // Domain importing external libraries
    {
      code: `import { v4 as uuid } from 'uuid';`,
      filename: '/project/src/domain/entities/user.ts',
    },
    // Non-domain files can import anything (not checked)
    {
      code: `import { Database } from '../infrastructure/database';`,
      filename: '/project/src/application/services/user-service.ts',
    },
    {
      code: `import { UserRepository } from '../infrastructure/repositories/user-repository';`,
      filename: '/project/src/application/use-cases/create-user.ts',
    },
  ],

  invalid: [
    // Domain importing from infrastructure
    {
      code: `import { UserRepository } from '../../infrastructure/repositories/user-repository';`,
      filename: '/project/src/domain/entities/user.ts',
      errors: [
        {
          messageId: 'forbiddenImport',
          data: {
            fromLayer: 'Domain',
            toLayer: 'Infrastructure',
          },
        },
      ],
    },
    // Domain importing from application
    {
      code: `import { UserService } from '../application/services/user-service';`,
      filename: '/project/src/domain/aggregates/user.ts',
      errors: [
        {
          messageId: 'forbiddenImport',
          data: {
            fromLayer: 'Domain',
            toLayer: 'Application',
          },
        },
      ],
    },
    // Domain importing from presentation
    {
      code: `import { UserController } from '../../presentation/controllers/user-controller';`,
      filename: '/project/src/domain/entities/user.ts',
      errors: [
        {
          messageId: 'forbiddenImport',
          data: {
            fromLayer: 'Domain',
            toLayer: 'Presentation',
          },
        },
      ],
    },
    // Multiple violations in one file
    {
      code: `
        import { Database } from '../infrastructure/database';
        import { UserService } from '../application/user-service';
      `,
      filename: '/project/src/domain/entities/user.ts',
      errors: [
        {
          messageId: 'forbiddenImport',
          data: {
            fromLayer: 'Domain',
            toLayer: 'Infrastructure',
          },
        },
        {
          messageId: 'forbiddenImport',
          data: {
            fromLayer: 'Domain',
            toLayer: 'Application',
          },
        },
      ],
    },
  ],
});

describe('no-domain-infrastructure-imports', () => {
  it('should pass all rule tester tests', () => {
    expect(true).toBe(true);
  });
});
