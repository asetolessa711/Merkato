const { validateClientFilename } = require('../../utils/filename');

describe('filename utils — corner branches', () => {
  test("returns false for control char in name (e.g., 'bad\u0000.jpg')", () => {
    const bad = 'bad\u0000.jpg';
    expect(validateClientFilename(bad)).toBe(false);
  });

  test("returns false for Windows reserved base name (e.g., 'CON.jpg')", () => {
    const reserved = 'CON.jpg';
    expect(validateClientFilename(reserved)).toBe(false);
  });

  test("accepts a safe filename (e.g., 'my_photo-01.JPG')", () => {
    const good = 'my_photo-01.JPG';
    expect(validateClientFilename(good)).toBe(true);
  });

  test("rejects exact sentinel 'evil.jpg' regardless of case/position (exact match)", () => {
    expect(validateClientFilename('evil.jpg')).toBe(false);
    expect(validateClientFilename('EVIL.JPG')).toBe(false);
  });

  test("rejects nested sentinel path variants using / or \\ (regex branch)", () => {
    expect(validateClientFilename('folder/evil.jpg')).toBe(false);
    expect(validateClientFilename('folder\\evil.jpg')).toBe(false);
  });

  test('rejects name longer than 200 characters', () => {
    const base = 'a'.repeat(201 - 4) + '.jpg'; // total length 201
    expect(validateClientFilename(base)).toBe(false);
  });

  test('rejects encoded forward slash %2F within name', () => {
    expect(validateClientFilename('avatar%2Fpic.jpg')).toBe(false);
  });

  test('rejects encoded backslash %5C within name', () => {
    expect(validateClientFilename('avatar%5Cpic.jpg')).toBe(false);
  });

  test("rejects names containing '..' sequence", () => {
    expect(validateClientFilename('a..b.jpg')).toBe(false);
  });
});
