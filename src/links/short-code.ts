import { randomInt } from 'node:crypto';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** 62^7 ≈ 3.5 trillion possible codes, so random collisions are very rare. */
export const CODE_LENGTH = 7;

/**
 * Paths the app already uses. A custom alias can't take one of these, or the
 * short link would hide a real page.
 */
export const RESERVED_CODES = new Set([
  'api',
  'docs',
  'docs-json',
  'health',
  'favicon.ico',
  'robots.txt',
]);

/** A random base62 code, using a cryptographically secure generator. */
export function generateShortCode(length = CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

export function isReservedCode(code: string): boolean {
  return RESERVED_CODES.has(code.toLowerCase());
}
