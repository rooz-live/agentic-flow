import * as path from 'path';

export function resolveStreamSocketPath(goalieDir?: string, overridePath?: string): string | undefined {
  const trimmedOverride = overridePath?.trim();
  if (trimmedOverride) {
    return trimmedOverride;
  }
  if (!goalieDir) {
    return undefined;
  }
  return path.join(goalieDir, 'af_stream.sock');
}
