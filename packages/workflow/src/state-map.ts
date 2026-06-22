const ENCODED_SEPARATOR = '_';

export function encodeStateName(nodePath: string): string {
  return nodePath
    .replace(/\//g, ENCODED_SEPARATOR)
    .replace(/\./g, ENCODED_SEPARATOR)
    .replace(/-/g, ENCODED_SEPARATOR);
}

export function decodeStateName(encoded: string, originalPaths: string[]): string {
  const match = originalPaths.find((p) => encodeStateName(p) === encoded);
  return match ?? encoded;
}
