const { resolvePreset, listPresets } = require('../../utils/railPresets');

describe('railPresets', () => {
  test('resolve known preset and list includes it', () => {
    const p = resolvePreset('Home_Hero');
    expect(p).toBeTruthy();
    expect(p.tactic).toBe('Curated');
    expect(Array.isArray(p.allowed)).toBe(true);
    const presets = listPresets();
    expect(presets.find(x=>x.name==='Home_Hero')).toBeTruthy();
  });
  test('resolve unknown returns null', () => {
    expect(resolvePreset('NoSuch')).toBeNull();
  });
});
