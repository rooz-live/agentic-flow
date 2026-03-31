/**
 * @fileoverview Tests for DDD layer detection utilities
 */

import {
  DddLayer,
  detectLayer,
  isAllowedDependency,
  getLayerName,
} from '../../src/utils/ddd-layers';

describe('detectLayer', () => {
  describe('Domain layer detection', () => {
    it('should detect /domain/ paths', () => {
      expect(detectLayer('/src/domain/entities/user.ts')).toBe(DddLayer.Domain);
      expect(detectLayer('/project/domain/value-objects/email.ts')).toBe(DddLayer.Domain);
    });

    it('should detect /entities/ paths', () => {
      expect(detectLayer('/src/entities/user.ts')).toBe(DddLayer.Domain);
    });

    it('should detect /value-objects/ paths', () => {
      expect(detectLayer('/src/value-objects/email.ts')).toBe(DddLayer.Domain);
    });

    it('should detect /aggregates/ paths', () => {
      expect(detectLayer('/src/aggregates/order.ts')).toBe(DddLayer.Domain);
    });

    it('should be case insensitive', () => {
      expect(detectLayer('/src/Domain/Entities/User.ts')).toBe(DddLayer.Domain);
      expect(detectLayer('/src/DOMAIN/user.ts')).toBe(DddLayer.Domain);
    });
  });

  describe('Application layer detection', () => {
    it('should detect /application/ paths', () => {
      expect(detectLayer('/src/application/services/user-service.ts')).toBe(DddLayer.Application);
    });

    it('should detect /use-cases/ paths', () => {
      expect(detectLayer('/src/use-cases/create-user.ts')).toBe(DddLayer.Application);
      expect(detectLayer('/src/usecases/update-user.ts')).toBe(DddLayer.Application);
    });

    it('should detect /services/ paths', () => {
      expect(detectLayer('/src/services/user-service.ts')).toBe(DddLayer.Application);
    });

    it('should detect /commands/ and /queries/ paths', () => {
      expect(detectLayer('/src/commands/create-user.ts')).toBe(DddLayer.Application);
      expect(detectLayer('/src/queries/get-user.ts')).toBe(DddLayer.Application);
    });
  });

  describe('Infrastructure layer detection', () => {
    it('should detect /infrastructure/ paths', () => {
      expect(detectLayer('/src/infrastructure/database/connection.ts')).toBe(DddLayer.Infrastructure);
    });

    it('should detect /adapters/ paths', () => {
      expect(detectLayer('/src/adapters/email-adapter.ts')).toBe(DddLayer.Infrastructure);
    });

    it('should detect /repositories/ paths', () => {
      expect(detectLayer('/src/repositories/user-repository.ts')).toBe(DddLayer.Infrastructure);
    });

    it('should detect /persistence/ paths', () => {
      expect(detectLayer('/src/persistence/models/user.ts')).toBe(DddLayer.Infrastructure);
    });
  });

  describe('Presentation layer detection', () => {
    it('should detect /presentation/ paths', () => {
      expect(detectLayer('/src/presentation/controllers/user-controller.ts')).toBe(DddLayer.Presentation);
    });

    it('should detect /controllers/ paths', () => {
      expect(detectLayer('/src/controllers/user-controller.ts')).toBe(DddLayer.Presentation);
    });

    it('should detect /api/ paths', () => {
      expect(detectLayer('/src/api/routes/users.ts')).toBe(DddLayer.Presentation);
    });

    it('should detect /ui/ and /views/ paths', () => {
      expect(detectLayer('/src/ui/components/user-list.tsx')).toBe(DddLayer.Presentation);
      expect(detectLayer('/src/views/user-profile.html')).toBe(DddLayer.Presentation);
    });
  });

  describe('Unknown layer detection', () => {
    it('should return Unknown for unrecognized paths', () => {
      expect(detectLayer('/src/utils/helpers.ts')).toBe(DddLayer.Unknown);
      expect(detectLayer('/src/config/database.ts')).toBe(DddLayer.Unknown);
      expect(detectLayer('/lib/shared/types.ts')).toBe(DddLayer.Unknown);
    });
  });

  describe('Windows path support', () => {
    it('should handle Windows paths with backslashes', () => {
      expect(detectLayer('C:\\project\\src\\domain\\entities\\user.ts')).toBe(DddLayer.Domain);
      expect(detectLayer('C:\\project\\src\\application\\services\\user-service.ts')).toBe(DddLayer.Application);
    });
  });
});

describe('isAllowedDependency', () => {
  describe('Domain layer dependencies', () => {
    it('should allow domain → domain', () => {
      expect(isAllowedDependency(DddLayer.Domain, DddLayer.Domain)).toBe(true);
    });

    it('should forbid domain → application', () => {
      expect(isAllowedDependency(DddLayer.Domain, DddLayer.Application)).toBe(false);
    });

    it('should forbid domain → infrastructure', () => {
      expect(isAllowedDependency(DddLayer.Domain, DddLayer.Infrastructure)).toBe(false);
    });

    it('should forbid domain → presentation', () => {
      expect(isAllowedDependency(DddLayer.Domain, DddLayer.Presentation)).toBe(false);
    });
  });

  describe('Application layer dependencies', () => {
    it('should allow application → domain', () => {
      expect(isAllowedDependency(DddLayer.Application, DddLayer.Domain)).toBe(true);
    });

    it('should allow application → application', () => {
      expect(isAllowedDependency(DddLayer.Application, DddLayer.Application)).toBe(true);
    });

    it('should forbid application → infrastructure', () => {
      expect(isAllowedDependency(DddLayer.Application, DddLayer.Infrastructure)).toBe(false);
    });

    it('should forbid application → presentation', () => {
      expect(isAllowedDependency(DddLayer.Application, DddLayer.Presentation)).toBe(false);
    });
  });

  describe('Infrastructure layer dependencies', () => {
    it('should allow infrastructure → domain', () => {
      expect(isAllowedDependency(DddLayer.Infrastructure, DddLayer.Domain)).toBe(true);
    });

    it('should allow infrastructure → application', () => {
      expect(isAllowedDependency(DddLayer.Infrastructure, DddLayer.Application)).toBe(true);
    });

    it('should allow infrastructure → infrastructure', () => {
      expect(isAllowedDependency(DddLayer.Infrastructure, DddLayer.Infrastructure)).toBe(true);
    });

    it('should forbid infrastructure → presentation', () => {
      expect(isAllowedDependency(DddLayer.Infrastructure, DddLayer.Presentation)).toBe(false);
    });
  });

  describe('Presentation layer dependencies', () => {
    it('should allow presentation → application', () => {
      expect(isAllowedDependency(DddLayer.Presentation, DddLayer.Application)).toBe(true);
    });

    it('should allow presentation → domain', () => {
      expect(isAllowedDependency(DddLayer.Presentation, DddLayer.Domain)).toBe(true);
    });

    it('should allow presentation → presentation', () => {
      expect(isAllowedDependency(DddLayer.Presentation, DddLayer.Presentation)).toBe(true);
    });

    it('should forbid presentation → infrastructure', () => {
      expect(isAllowedDependency(DddLayer.Presentation, DddLayer.Infrastructure)).toBe(false);
    });
  });

  describe('Unknown layer dependencies', () => {
    it('should allow unknown → any', () => {
      expect(isAllowedDependency(DddLayer.Unknown, DddLayer.Domain)).toBe(true);
      expect(isAllowedDependency(DddLayer.Unknown, DddLayer.Application)).toBe(true);
      expect(isAllowedDependency(DddLayer.Unknown, DddLayer.Infrastructure)).toBe(true);
      expect(isAllowedDependency(DddLayer.Unknown, DddLayer.Presentation)).toBe(true);
    });

    it('should allow any → unknown', () => {
      expect(isAllowedDependency(DddLayer.Domain, DddLayer.Unknown)).toBe(true);
      expect(isAllowedDependency(DddLayer.Application, DddLayer.Unknown)).toBe(true);
      expect(isAllowedDependency(DddLayer.Infrastructure, DddLayer.Unknown)).toBe(true);
      expect(isAllowedDependency(DddLayer.Presentation, DddLayer.Unknown)).toBe(true);
    });
  });
});

describe('getLayerName', () => {
  it('should capitalize layer names', () => {
    expect(getLayerName(DddLayer.Domain)).toBe('Domain');
    expect(getLayerName(DddLayer.Application)).toBe('Application');
    expect(getLayerName(DddLayer.Infrastructure)).toBe('Infrastructure');
    expect(getLayerName(DddLayer.Presentation)).toBe('Presentation');
    expect(getLayerName(DddLayer.Unknown)).toBe('Unknown');
  });
});
