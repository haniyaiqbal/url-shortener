import {
  CODE_LENGTH,
  generateShortCode,
  isReservedCode,
} from './short-code.js';

describe('generateShortCode', () => {
  it('makes a base62 code of the default length', () => {
    const code = generateShortCode();
    expect(code).toHaveLength(CODE_LENGTH);
    expect(code).toMatch(/^[0-9A-Za-z]+$/);
  });

  it('respects a custom length', () => {
    expect(generateShortCode(12)).toHaveLength(12);
  });

  it('does not repeat itself', () => {
    const codes = new Set(
      Array.from({ length: 10_000 }, () => generateShortCode()),
    );
    expect(codes.size).toBe(10_000);
  });
});

describe('isReservedCode', () => {
  it.each(['api', 'docs', 'health', 'API', 'Docs'])('blocks "%s"', (code) => {
    expect(isReservedCode(code)).toBe(true);
  });

  it('allows normal aliases', () => {
    expect(isReservedCode('my-link')).toBe(false);
  });
});
