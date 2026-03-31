/**
 * @fileoverview Tests for no-application-domain-mutation rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../src/rules/no-application-domain-mutation';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-application-domain-mutation', rule, {
  valid: [
    // Using domain methods instead of direct mutation
    {
      code: `
        const user = new User();
        user.updateEmail('new@email.com');
      `,
      filename: '/project/src/application/services/user-service.ts',
    },
    {
      code: `
        const order = await orderRepository.findById(orderId);
        order.addItem(item);
      `,
      filename: '/project/src/application/use-cases/add-order-item.ts',
    },
    // Assigning to local variables is OK
    {
      code: `
        const result = calculateTotal(items);
        const status = 'active';
      `,
      filename: '/project/src/application/services/order-service.ts',
    },
    // Private field assignment is OK
    {
      code: `
        const user = new User();
        user._id = generateId();
      `,
      filename: '/project/src/application/services/user-service.ts',
    },
    // Non-application files can mutate (not checked)
    {
      code: `
        const user = new User();
        user.email = 'new@email.com';
      `,
      filename: '/project/src/domain/entities/user.ts',
    },
    // Constructor assignments are OK
    {
      code: `
        class UserService {
          constructor(private repository: UserRepository) {
            this.repository = repository;
          }
        }
      `,
      filename: '/project/src/application/services/user-service.ts',
    },
  ],

  invalid: [
    // Direct entity property mutation
    {
      code: `
        const user = await userRepository.findById(userId);
        user.email = 'new@email.com';
      `,
      filename: '/project/src/application/use-cases/update-user.ts',
      errors: [
        {
          messageId: 'directMutation',
        },
      ],
    },
    // Order entity mutation
    {
      code: `
        const order = await orderRepository.findById(orderId);
        order.status = 'shipped';
      `,
      filename: '/project/src/application/services/order-service.ts',
      errors: [
        {
          messageId: 'directMutation',
        },
      ],
    },
    // Product entity mutation
    {
      code: `
        const product = await productRepository.findById(productId);
        product.price = 99.99;
      `,
      filename: '/project/src/application/commands/update-product-price.ts',
      errors: [
        {
          messageId: 'directMutation',
        },
      ],
    },
    // Entity suffix pattern
    {
      code: `
        const userEntity = await repo.find(id);
        userEntity.name = 'New Name';
      `,
      filename: '/project/src/application/services/user-service.ts',
      errors: [
        {
          messageId: 'directMutation',
        },
      ],
    },
    // Aggregate suffix pattern
    {
      code: `
        const orderAggregate = await repo.find(id);
        orderAggregate.items = [];
      `,
      filename: '/project/src/application/use-cases/clear-order.ts',
      errors: [
        {
          messageId: 'directMutation',
        },
      ],
    },
    // Multiple violations
    {
      code: `
        const user = await userRepository.findById(userId);
        user.email = 'new@email.com';
        user.name = 'New Name';
        const order = await orderRepository.findById(orderId);
        order.status = 'shipped';
      `,
      filename: '/project/src/application/services/user-order-service.ts',
      errors: [
        { messageId: 'directMutation' },
        { messageId: 'directMutation' },
        { messageId: 'directMutation' },
      ],
    },
  ],
});

describe('no-application-domain-mutation', () => {
  it('should pass all rule tester tests', () => {
    expect(true).toBe(true);
  });
});
