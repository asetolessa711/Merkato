#!/usr/bin/env node
/* Waits for CRA dev server to be reachable on configured PORT and then opens browser. */
const http = require('http');
const { setTimeout: sleep } = require('timers/promises');
const { exec } = require('child_process');

const port = Number(process.env.PORT || 3000);
const url = `http://localhost:${port}`;
const deadlineMs = Date.now() + 120000; // 2 minutes timeout

function openWindows(u) {
  exec(`cmd /c start "" "${u}"`);
}
function openMac(u) { exec(`open "${u}"`); }
function openLinux(u) { exec(`xdg-open "${u}"`); }

async function waitForServer() {
  while (Date.now() < deadlineMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, res => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(3000, () => { req.destroy(new Error('timeout')); });
      });
      return true;
    } catch (_) {
      await sleep(1000);
    }
  }
  return false;
}

(async () => {
  const ok = await waitForServer();
  if (!ok) {
    console.error(`[open-when-ready] Dev server not reachable at ${url} within timeout.`);
    process.exit(1);
  }
  const platform = process.platform;
  if (platform === 'win32') openWindows(url);
  else if (platform === 'darwin') openMac(url);
  else openLinux(url);
})();
