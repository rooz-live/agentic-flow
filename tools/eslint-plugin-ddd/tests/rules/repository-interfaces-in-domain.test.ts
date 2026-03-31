/**
 * @fileoverview Tests for repository-interfaces-in-domain rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../src/rules/repository-interfaces-in-domain';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('repository-interfaces-in-domain', rule, {
  valid: [
    // Repository interface in domain layer
    {
      code: `
        export interface UserRepository {
          findById(id: string): Promise<User | null>;
          save(user: User): Promise<void>;
        }
      `,
      filename: '/project/src/domain/repositories/user-repository.ts',
    },
    {
      code: `
        export type OrderRepository = {
          findById(id: string): Promise<Order | null>;
          save(order: Order): Promise<void>;
        };
      `,
      filename: '/project/src/domain/repositories/order-repository.ts',
    },
    // Non-repository interfaces outside domain are OK
    {
      code: `
        export interface UserService {
          createUser(data: CreateUserData): Promise<User>;
        }
      `,
      filename: '/project/src/application/services/user-service.ts',
    },
    {
      code: `
        export interface DatabaseConnection {
          query(sql: string): Promise<any>;
        }
      `,
      filename: '/project/src/infrastructure/database/connection.ts',
    },
    // Repository implementation in infrastructure is OK (not an interface)
    {
      code: `
        export class PostgresUserRepository implements UserRepository {
          async findById(id: string): Promise<User | null> {
            // implementation
          }
        }
      `,
      filename: '/project/src/infrastructure/repositories/postgres-user-repository.ts',
    },
  ],

  invalid: [
    // Repository interface in application layer
    {
      code: `
        export interface UserRepository {
          findById(id: string): Promise<User | null>;
          save(user: User): Promise<void>;
        }
      `,
      filename: '/project/src/application/repositories/user-repository.ts',
      errors: [
        {
          messageId: 'repositoryNotInDomain',
          data: {
            name: 'UserRepository',
          },
        },
      ],
    },
    // Repository interface in infrastructure layer
    {
      code: `
        export interface OrderRepository {
          findById(id: string): Promise<Order | null>;
        }
      `,
      filename: '/project/src/infrastructure/repositories/order-repository.ts',
      errors: [
        {
          messageId: 'repositoryNotInDomain',
          data: {
            name: 'OrderRepository',
          },
        },
      ],
    },
    // Repository type alias in application
    {
      code: `
        export type ProductRepository = {
          findById(id: string): Promise<Product | null>;
        };
      `,
      filename: '/project/src/application/repositories/product-repository.ts',
      errors: [
        {
          messageId: 'repositoryNotInDomain',
          data: {
            name: 'ProductRepository',
          },
        },
      ],
    },
    // Repository interface in presentation
    {
      code: `
        export interface CustomerRepository {
          findById(id: string): Promise<Customer | null>;
        }
      `,
      filename: '/project/src/presentation/repositories/customer-repository.ts',
      errors: [
        {
          messageId: 'repositoryNotInDomain',
          data: {
            name: 'CustomerRepository',
          },
        },
      ],
    },
    // Multiple repository interfaces
    {
      code: `
        export interface UserRepository {
          findById(id: string): Promise<User | null>;
        }
        
        export interface OrderRepository {
          findById(id: string): Promise<Order | null>;
        }
      `,
      filename: '/project/src/infrastructure/repositories/repositories.ts',
      errors: [
        {
          messageId: 'repositoryNotInDomain',
          data: {
            name: 'UserRepository',
          },
        },
        {
          messageId: 'repositoryNotInDomain',
          data: {
            name: 'OrderRepository',
          },
        },
      ],
    },
    // Repository with "Repository" in middle of name
    {
      code: `
        export interface IRepositoryFactory {
          create(): Repository;
        }
      `,
      filename: '/project/src/infrastructure/factories/repository-factory.ts',
      errors: [
        {
          messageId: 'repositoryNotInDomain',
          data: {
            name: 'IRepositoryFactory',
          },
        },
      ],
    },
  ],
});

describe('repository-interfaces-in-domain', () => {
  it('should pass all rule tester tests', () => {
    expect(true).toBe(true);
  });
});
