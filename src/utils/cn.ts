/**
 * Utility function for merging class names
 * Stub implementation - can be replaced with clsx or classnames library
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default cn;
