const { validateClientFilename } = require('../../utils/filename');

describe('utils/filename.validateClientFilename', () => {
  test('rejects empty or whitespace-only', () => {
    expect(validateClientFilename('')).toBe(false);
    expect(validateClientFilename('   ')).toBe(false);
  });

  test('rejects traversal sequences and path separators', () => {
    expect(validateClientFilename('../evil.jpg')).toBe(false);
    expect(validateClientFilename('..\\evil.jpg')).toBe(false);
    expect(validateClientFilename('a/b.jpg')).toBe(false);
    expect(validateClientFilename('a\\b.jpg')).toBe(false);
  });

  test('rejects encoded traversal and separators', () => {
    expect(validateClientFilename('%2E%2E%2Fevil.jpg')).toBe(false);
    expect(validateClientFilename('..%2Fevil.jpg')).toBe(false);
    expect(validateClientFilename('%5Cevil.jpg')).toBe(false);
  });

  test('rejects Windows reserved device names', () => {
    expect(validateClientFilename('CON')).toBe(false);
    expect(validateClientFilename('NUL.txt')).toBe(false);
    expect(validateClientFilename('COM1.jpg')).toBe(false);
  });

  test('rejects control characters', () => {
    expect(validateClientFilename('bad\x00name.jpg')).toBe(false);
    expect(validateClientFilename('bad\x1Fname.jpg')).toBe(false);
  });

  test('rejects overly long names', () => {
    const longName = 'a'.repeat(201) + '.jpg';
    expect(validateClientFilename(longName)).toBe(false);
  });

  test('accepts simple safe filenames', () => {
    expect(validateClientFilename('hello.jpg')).toBe(true);
    expect(validateClientFilename('image_123.PNG')).toBe(true);
    expect(validateClientFilename('nice-name.webp')).toBe(true);
  });
});
