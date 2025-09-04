// Ensure test-image.jpg exists in tests/fixtures by copying from fixtures_backup if needed
const fs = require('fs');
const path = require('path');

try {
  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  const backupDir = path.join(__dirname, '..', 'fixtures_backup');
  const imageName = 'test-image.jpg';
  const imagePath = path.join(fixturesDir, imageName);
  const backupPath = path.join(backupDir, imageName);

  if (!fs.existsSync(fixturesDir)) {
    try { fs.mkdirSync(fixturesDir, { recursive: true }); } catch (_) {}
  }

  if (fs.existsSync(backupPath)) {
    try {
      fs.copyFileSync(backupPath, imagePath);
    } catch (e) {
      try {
        const buf = fs.readFileSync(backupPath);
        fs.writeFileSync(imagePath, buf);
      } catch (_) {}
    }
    // eslint-disable-next-line no-console
    console.log('✅ ensureTestImage: Copied test-image.jpg to fixtures.');
  } else {
    // eslint-disable-next-line no-console
    console.warn('⚠️ ensureTestImage: Backup not found at', backupPath);
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('⚠️ ensureTestImage: failed to prepare test image:', e?.message);
}

module.exports = {};
