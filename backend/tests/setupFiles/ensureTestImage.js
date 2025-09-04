// Ensure test-image.jpg exists in tests/fixtures by copying from fixtures_backup if available,
// otherwise fallback to the repository-root test-image.jpg.
const fs = require('fs');
const path = require('path');

try {
  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  const backupDir = path.join(__dirname, '..', 'fixtures_backup');
  const imageName = 'test-image.jpg';
  const imagePath = path.join(fixturesDir, imageName);
  const backupPath = path.join(backupDir, imageName);
  const repoRootFallback = path.resolve(__dirname, '..', '..', '..', imageName);

  if (!fs.existsSync(fixturesDir)) {
    try { fs.mkdirSync(fixturesDir, { recursive: true }); } catch (_) {}
  }

  const tryCopy = (src, dest) => {
    try {
      fs.copyFileSync(src, dest);
      return true;
    } catch (_) {
      try {
        const buf = fs.readFileSync(src);
        fs.writeFileSync(dest, buf);
        return true;
      } catch (_) {
        return false;
      }
    }
  };

  if (fs.existsSync(backupPath) && tryCopy(backupPath, imagePath)) {
    // eslint-disable-next-line no-console
    console.log('✅ ensureTestImage: Copied test-image.jpg to fixtures (from backup).');
  } else if (fs.existsSync(repoRootFallback) && tryCopy(repoRootFallback, imagePath)) {
    // eslint-disable-next-line no-console
    console.log('✅ ensureTestImage: Copied test-image.jpg to fixtures (from repo root).');
  } else {
    // eslint-disable-next-line no-console
    console.warn('⚠️ ensureTestImage: No source image found at', backupPath, 'or', repoRootFallback);
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('⚠️ ensureTestImage: failed to prepare test image:', e && e.message);
}

module.exports = {};
