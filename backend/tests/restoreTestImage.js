// restoreTestImage.js
// Ensures test-image.jpg is present in fixtures before tests run
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const backupDir = path.join(__dirname, 'fixtures_backup');
  const imageName = 'test-image.jpg';
  const imagePath = path.join(fixturesDir, imageName);
  const backupPath = path.join(backupDir, imageName);

  // If backup does not exist, create it from the current image (if present)
  if (!fs.existsSync(backupDir)) {
    try {
      fs.mkdirSync(backupDir, { recursive: true });
    } catch (_) {}
  }
  if (fs.existsSync(imagePath) && !fs.existsSync(backupPath)) {
    try {
      fs.copyFileSync(imagePath, backupPath);
    } catch (e) {
      // Fallback: read and write if copy fails (EPERM on OneDrive)
      try {
        const buf = fs.readFileSync(imagePath);
        fs.writeFileSync(backupPath, buf);
      } catch (_) {}
    }
  }

  // Always restore the image from backup before tests
  if (fs.existsSync(backupPath)) {
    try {
      // Ensure fixtures dir exists
      if (!fs.existsSync(fixturesDir)) {
        try { fs.mkdirSync(fixturesDir, { recursive: true }); } catch (_) {}
      }
      fs.copyFileSync(backupPath, imagePath);
    } catch (e) {
      try {
        const buf = fs.readFileSync(backupPath);
        fs.writeFileSync(imagePath, buf);
      } catch (_) {}
    }
    // eslint-disable-next-line no-console
    console.log('✅ Restored test-image.jpg from backup.');
  } else {
    // eslint-disable-next-line no-console
    console.warn('⚠️  Backup test-image.jpg not found. Please add it to fixtures_backup.');
  }
};
