/**
 * DDD Layer Detection Utilities
 * 
 * Clean Architecture layer dependencies must flow inward:
 * Presentation → Application → Domain ← Infrastructure
 * 
 * Domain layer must NEVER depend on Application or Infrastructure.
 */

export enum DddLayer {
  Domain = 'domain',
  Application = 'application',
  Infrastructure = 'infrastructure',
  Presentation = 'presentation',
  Unknown = 'unknown'
}

/**
 * Detect DDD layer from file path
 */
export function detectLayer(filePath: string): DddLayer {
  const normalized = filePath.toLowerCase().replace(/\\/g, '/');
  
  // Domain layer patterns
  if (
    normalized.includes('/domain/') ||
    normalized.includes('/domains/') ||
    normalized.includes('/entities/') ||
    normalized.includes('/value-objects/') ||
    normalized.includes('/aggregates/')
  ) {
    return DddLayer.Domain;
  }
  
  // Application layer patterns
  if (
    normalized.includes('/application/') ||
    normalized.includes('/use-cases/') ||
    normalized.includes('/usecases/') ||
    normalized.includes('/services/') ||
    normalized.includes('/commands/') ||
    normalized.includes('/queries/')
  ) {
    return DddLayer.Application;
  }
  
  // Infrastructure layer patterns
  if (
    normalized.includes('/infrastructure/') ||
    normalized.includes('/adapters/') ||
    normalized.includes('/repositories/') ||
    normalized.includes('/persistence/')
  ) {
    return DddLayer.Infrastructure;
  }
  
  // Presentation layer patterns
  if (
    normalized.includes('/presentation/') ||
    normalized.includes('/controllers/') ||
    normalized.includes('/api/') ||
    normalized.includes('/ui/') ||
    normalized.includes('/views/')
  ) {
    return DddLayer.Presentation;
  }
  
  return DddLayer.Unknown;
}

/**
 * Check if a layer dependency is allowed
 */
export function isAllowedDependency(
  fromLayer: DddLayer,
  toLayer: DddLayer
): boolean {
  // Unknown layers are allowed (we can't enforce what we don't recognize)
  if (fromLayer === DddLayer.Unknown || toLayer === DddLayer.Unknown) {
    return true;
  }
  
  // Same layer dependencies are always allowed
  if (fromLayer === toLayer) {
    return true;
  }
  
  // Domain layer can only depend on itself
  if (fromLayer === DddLayer.Domain) {
    return toLayer === DddLayer.Domain;
  }
  
  // Application layer can depend on Domain
  if (fromLayer === DddLayer.Application) {
    return toLayer === DddLayer.Domain;
  }
  
  // Infrastructure layer can depend on Domain and Application
  if (fromLayer === DddLayer.Infrastructure) {
    return toLayer === DddLayer.Domain || toLayer === DddLayer.Application;
  }
  
  // Presentation can depend on Application and Domain (but not Infrastructure directly)
  if (fromLayer === DddLayer.Presentation) {
    return toLayer === DddLayer.Application || toLayer === DddLayer.Domain;
  }
  
  return false;
}

/**
 * Get human-readable layer name
 */
export function getLayerName(layer: DddLayer): string {
  return layer.charAt(0).toUpperCase() + layer.slice(1);
}
