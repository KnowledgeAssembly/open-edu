const DOT_ESCAPE = '\u0000';
const DOT_ESCAPE_REGEX = new RegExp(DOT_ESCAPE, 'g');

export function encodeStateName(nodePath: string): string {
  return nodePath.replace(/\./g, DOT_ESCAPE);
}

export function decodeStateName(encoded: string): string {
  return encoded.replace(DOT_ESCAPE_REGEX, '.');
}
