#!/usr/bin/env node
/**
 * Build a PDF from docs/MarketingManager_Manual.md into docs/MarketingManager_Manual.pdf
 * Uses marked to render HTML and Puppeteer to print to PDF. Cross-platform (Windows-friendly).
 */
const fs = require('fs');
const path = require('path');

async function main(){
  const manualMdPath = path.resolve(__dirname, '..', 'docs', 'MarketingManager_Manual.md');
  const manualPdfPath = path.resolve(__dirname, '..', 'docs', 'MarketingManager_Manual.pdf');

  if (!fs.existsSync(manualMdPath)){
    console.error('Manual not found at', manualMdPath);
    process.exit(1);
  }

  // Lazy-load dependencies, provide helpful error if missing
  let marked, puppeteer;
  try { marked = require('marked'); } catch (e) {
    console.error('Missing dependency: marked. Run: npm install --save-dev marked');
    process.exit(1);
  }
  try { puppeteer = require('puppeteer'); } catch (e) {
    console.error('Missing dependency: puppeteer. Run: npm install --save-dev puppeteer');
    process.exit(1);
  }

  const md = fs.readFileSync(manualMdPath, 'utf8');
  const htmlBody = marked.parse(md);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Marketing Manager Manual</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5; color: #0f172a; padding: 24px; }
  h1,h2,h3 { color: #0b1220; }
  code, pre { background: #0f172a; color: #e2e8f0; padding: 2px 4px; border-radius: 4px; }
  pre { padding: 12px; overflow: auto; }
  blockquote { border-left: 3px solid #94a3b8; padding-left: 12px; color: #334155; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({ path: manualPdfPath, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } });
  await browser.close();

  console.log('PDF generated at', manualPdfPath);
}

main().catch((err) => { console.error(err); process.exit(1); });
